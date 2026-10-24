-- Subject separation: accounts are shared; class authority and learning results are scoped.
begin;
create table public.learning_subjects(id text primary key, label text not null);
insert into public.learning_subjects values ('chemistry','Chemistry'),('applied-science','Applied Science');
alter table public.learning_subjects enable row level security;
revoke all on public.learning_subjects from public,anon,authenticated;
grant select on public.learning_subjects to authenticated;
grant all on public.learning_subjects to service_role;
create policy subjects_read on public.learning_subjects for select to authenticated using(app_private.has_live_session());

alter table public.school_classes add column subject_id text not null default 'chemistry' references public.learning_subjects(id);
create table public.staff_subjects(teacher_id uuid not null references public.account_profiles(user_id) on delete cascade,subject_id text not null references public.learning_subjects(id),primary key(teacher_id,subject_id));
insert into public.staff_subjects select user_id,'chemistry' from public.account_profiles where role in ('teacher','admin');
alter table public.staff_subjects enable row level security;
revoke all on public.staff_subjects from public,anon,authenticated;
grant select on public.staff_subjects to authenticated;
grant all on public.staff_subjects to service_role;
create policy staff_subjects_read on public.staff_subjects for select to authenticated using(app_private.has_live_session() and (teacher_id=auth.uid() or app_private.is_admin()));

create function app_private.check_teacher_subject() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.account_profiles p join public.school_classes c on c.id=new.class_id
  where p.user_id=new.teacher_id and (p.role='admin' or exists(select 1 from public.staff_subjects s where s.teacher_id=p.user_id and s.subject_id=c.subject_id))) then
  raise exception 'Assign this teacher to the class subject first' using errcode='42501';
 end if;return new;
end;$$;
revoke all on function app_private.check_teacher_subject() from public,anon,authenticated;
create trigger check_teacher_subject before insert or update on public.class_teachers for each row execute function app_private.check_teacher_subject();

create function app_private.teaches_subject_student(target uuid, subject text) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.staff_role(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid)='teacher' and exists(
  select 1 from public.class_teachers t join public.school_classes c on c.id=t.class_id join public.class_students s using(class_id)
  join public.staff_subjects a on a.teacher_id=t.teacher_id and a.subject_id=c.subject_id
  where t.teacher_id=auth.uid() and s.student_id=target and c.subject_id=subject);
$$;
revoke all on function app_private.teaches_subject_student(uuid,text) from public,anon;
grant execute on function app_private.teaches_subject_student(uuid,text) to authenticated;

alter table public.learning_question_versions add column subject_id text not null default 'chemistry' references public.learning_subjects(id);
alter table public.learning_question_versions add unique(subject_id,bank_version,scoring_version,question_id);
alter table public.learning_attempts add column subject_id text not null default 'chemistry' references public.learning_subjects(id);
alter table public.learning_attempts add foreign key(subject_id,bank_version,scoring_version,question_id) references public.learning_question_versions(subject_id,bank_version,scoring_version,question_id);
create index learning_attempts_subject_history on public.learning_attempts(student_id,subject_id,attempted_at,event_id);
drop policy attempts_read on public.learning_attempts;
create policy attempts_read on public.learning_attempts for select to authenticated using(
 (student_id=auth.uid() and app_private.can_sync_learning()) or app_private.is_admin() or app_private.teaches_subject_student(student_id,subject_id));
create or replace function public.sync_learning_attempts(events jsonb, expected_student uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  student uuid := auth.uid();
  item jsonb;
  accepted jsonb := '[]'::jsonb;
  row_data public.learning_attempts;
  existing public.learning_attempts;
  account_created timestamptz;
  maximum integer;
begin
  select created_at into account_created from public.account_profiles
    where user_id = student and role = 'student' and active and not must_change_password for share;
  if not found or expected_student is distinct from student or not app_private.has_live_session() then
    raise exception 'Active student session and a changed password required' using errcode = '42501';
  end if;
  if events is null or jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 100 then
    raise exception 'Expected at most 100 learning events';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(student::text, 0));
  for item in select value from jsonb_array_elements(events) loop
    if jsonb_typeof(item) <> 'object' or (select count(*) from jsonb_object_keys(item)) <> 13
      or exists(select 1 from jsonb_object_keys(item) k where k not in (
        'event_id','encounter_id','sequence','question_id','bank_version','scoring_version',
        'kind','earned_marks','is_retry','answer_revealed','attempted_at','session_mode','maximum_marks')) then
      raise exception 'Unexpected learning event fields';
    end if;
    if jsonb_typeof(item->'is_retry') <> 'boolean' or jsonb_typeof(item->'answer_revealed') <> 'boolean'
      or jsonb_typeof(item->'sequence') <> 'number' or jsonb_typeof(item->'maximum_marks') <> 'number'
      or (item->>'sequence') !~ '^[0-9]+$' or (item->>'maximum_marks') !~ '^[0-9]+$'
      or (item->'earned_marks' <> 'null'::jsonb and (jsonb_typeof(item->'earned_marks') <> 'number' or (item->>'earned_marks') !~ '^[0-9]+$')) then
      raise exception 'Invalid learning event values';
    end if;
    row_data := null;
    row_data.student_id := student;
    row_data.event_id := (item->>'event_id')::uuid;
    row_data.encounter_id := (item->>'encounter_id')::uuid;
    row_data.sequence := (item->>'sequence')::integer;
    row_data.question_id := item->>'question_id';
    row_data.bank_version := item->>'bank_version';
    row_data.scoring_version := item->>'scoring_version';
    row_data.kind := item->>'kind';
    row_data.earned_marks := (item->>'earned_marks')::integer;
    row_data.maximum_marks := (item->>'maximum_marks')::integer;
    row_data.is_retry := (item->>'is_retry')::boolean;
    row_data.answer_revealed := (item->>'answer_revealed')::boolean;
    row_data.attempted_at := (item->>'attempted_at')::timestamptz;
    row_data.session_mode := item->>'session_mode';
    row_data.received_at := now();
    select maximum_marks,subject_id into maximum,row_data.subject_id from public.learning_question_versions
      where bank_version = row_data.bank_version and scoring_version = row_data.scoring_version
      and question_id = row_data.question_id;
    if not found or maximum <> row_data.maximum_marks then raise exception 'Unknown question version or maximum mark'; end if;
    if row_data.attempted_at < account_created - interval '5 minutes'
      or row_data.attempted_at > now() + interval '5 minutes' then raise exception 'Check the device clock'; end if;
    select * into existing from public.learning_attempts where student_id = student and event_id = row_data.event_id;
    if found then
      if (to_jsonb(existing) - 'received_at') is distinct from (to_jsonb(row_data) - 'received_at') then
        raise exception 'Event ID already exists with different data';
      end if;
    else
      insert into public.learning_attempts select (row_data).*;
    end if;
    accepted := accepted || jsonb_build_array(row_data.event_id);
  end loop;
  return accepted;
end;
$$;
revoke all on function public.sync_learning_attempts(jsonb,uuid) from public, anon;
grant execute on function public.sync_learning_attempts(jsonb,uuid) to authenticated;


-- Existing chemistry-only clients retain their activity-window meaning.
create or replace function public.student_activity_windows(target uuid)
returns table(days integer,correct_attempts bigint,distinct_questions bigint)
language sql stable security invoker set search_path='' as $$
 select w.days,count(a.event_id),count(distinct(a.bank_version,a.scoring_version,a.question_id))
 from (values(1),(7),(30)) w(days) left join public.learning_attempts a on a.student_id=target and a.subject_id='chemistry'
 and a.kind='submit' and not a.is_retry and not a.answer_revealed and a.earned_marks=a.maximum_marks
 and a.attempted_at>=now()-make_interval(days=>w.days) and a.attempted_at<=now() group by w.days order by w.days;
$$;
create function public.student_subject_activity_windows(target uuid,subject text)
returns table(days integer,correct_attempts bigint,distinct_questions bigint)
language sql stable security invoker set search_path='' as $$
 select w.days,count(a.event_id),count(distinct(a.bank_version,a.scoring_version,a.question_id))
 from (values(1),(7),(30)) w(days) left join public.learning_attempts a on a.student_id=target and a.subject_id=subject
 and a.kind='submit' and not a.is_retry and not a.answer_revealed and a.earned_marks=a.maximum_marks
 and a.attempted_at>=now()-make_interval(days=>w.days) and a.attempted_at<=now() group by w.days order by w.days;
$$;
revoke all on function public.student_subject_activity_windows(uuid,text) from public,anon;
grant execute on function public.student_subject_activity_windows(uuid,text) to authenticated;

-- Keep the existing staff actions, but subject creation/grants are handled here.
alter function public.staff_manage(text,jsonb) set schema app_private;
alter function app_private.staff_manage(text,jsonb) rename to staff_manage_legacy;
revoke all on function app_private.staff_manage_legacy(text,jsonb) from public,anon,authenticated;
create or replace function app_private.staff_manage_legacy(action text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ctx jsonb; r text; actor uuid; cls uuid; target uuid; label text; result uuid;
begin
  ctx := public.staff_context(); r:=ctx->>'role'; actor:=(ctx->>'user_id')::uuid;
  if jsonb_typeof(payload)<>'object' then raise exception 'Expected form fields'; end if;
  cls:=nullif(payload->>'class_id','')::uuid; target:=nullif(payload->>'user_id','')::uuid;
  if action in ('create_class','rename_class') then
    label:=btrim(payload->>'label');
    if label is null or length(label) not between 1 and 100 then raise exception 'Class label must be 1–100 characters'; end if;
    if action='create_class' then
      insert into public.school_classes(label) values(label) returning id into result;
      insert into public.class_teachers(class_id,teacher_id) values(result,actor);
    else
      if not app_private.can_read_class(cls) then raise exception 'Class unavailable' using errcode='42501'; end if;
      update public.school_classes set label=btrim(payload->>'label') where id=cls; result:=cls;
    end if;
  elsif action in ('assign_teacher','remove_teacher','enrol_student','remove_student') then
    if r<>'admin' then raise exception 'Administrator required' using errcode='42501'; end if;
    if action='assign_teacher' then insert into public.class_teachers(class_id,teacher_id) values(cls,target) on conflict do nothing;
    elsif action='remove_teacher' then delete from public.class_teachers where class_id=cls and teacher_id=target;
    elsif action='enrol_student' then insert into public.class_students(class_id,student_id) values(cls,target) on conflict do nothing;
    else delete from public.class_students where class_id=cls and student_id=target; end if;
  elsif action='set_active' then
    if r<>'admin' or target=actor then raise exception 'Another administrator-managed account required' using errcode='42501'; end if;
    if jsonb_typeof(payload->'active')<>'boolean' then raise exception 'Choose account state'; end if;
    update public.account_profiles set active=(payload->>'active')::boolean where user_id=target;
    if not found then raise exception 'Account unavailable'; end if;
    if not (payload->>'active')::boolean then delete from auth.sessions where user_id=target; end if;
  elsif action='set_retention' then
    if r<>'admin' then raise exception 'Administrator required' using errcode='42501'; end if;
    update public.school_policy set retention_days=(payload->>'days')::integer,updated_at=now() where singleton;
  else raise exception 'Unknown staff operation'; end if;
  insert into public.staff_actions(actor,request_id,action,target) values(actor,gen_random_uuid(),action,coalesce(target,result,cls));
  return jsonb_build_object('id',result);
end;
$$;

create function public.staff_manage(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb; actor uuid; role text; subject text; target uuid; result uuid; label text;
begin
 ctx:=public.staff_context();actor:=(ctx->>'user_id')::uuid;role:=ctx->>'role';
 if jsonb_typeof(payload)<>'object' then raise exception 'Expected form fields';end if;
 subject:=coalesce(payload->>'subject_id','chemistry');
 if not exists(select 1 from public.learning_subjects where id=subject) then raise exception 'Unknown subject';end if;
 if action='create_class' then
  if role<>'admin' and not exists(select 1 from public.staff_subjects s where s.teacher_id=actor and s.subject_id=subject) then raise exception 'Subject not assigned' using errcode='42501';end if;
  label:=btrim(payload->>'label');if label is null or length(label) not between 1 and 100 then raise exception 'Class label must be 1–100 characters';end if;
  insert into public.school_classes(label,subject_id) values(label,subject) returning id into result;
  insert into public.class_teachers(class_id,teacher_id) values(result,actor);
 elsif action in ('grant_subject','revoke_subject') then
  if role<>'admin' then raise exception 'Administrator required' using errcode='42501';end if;
  target:=(payload->>'user_id')::uuid;
  if not exists(select 1 from public.account_profiles p where p.user_id=target and p.role='teacher') then raise exception 'Choose a teacher';end if;
  if action='grant_subject' then insert into public.staff_subjects values(target,subject) on conflict do nothing;
  else
   delete from public.class_teachers t using public.school_classes c where t.class_id=c.id and c.subject_id=subject and t.teacher_id=target;
   delete from public.staff_subjects where teacher_id=target and subject_id=subject;
  end if;
 else return app_private.staff_manage_legacy(action,payload);
 end if;
 insert into public.staff_actions(actor,request_id,action,target) values(actor,gen_random_uuid(),action,coalesce(target,result));
 return jsonb_build_object('id',result);
end;$$;
revoke all on function public.staff_manage(text,jsonb) from public,anon;
grant execute on function public.staff_manage(text,jsonb) to authenticated;
commit;
