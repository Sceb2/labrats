begin;

-- Only active staff who have chosen a password can use staff permissions.
create function app_private.staff_role(actor uuid, session uuid) returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.account_profiles p where p.user_id = actor
    and p.active and not p.must_change_password and p.role in ('teacher','admin')
    and exists(select 1 from auth.sessions s where s.id = session and s.user_id = actor);
$$;
revoke all on function app_private.staff_role(uuid,uuid) from public,anon,authenticated;

create or replace function app_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(app_private.staff_role(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid) = 'admin',false);
$$;
create or replace function app_private.teaches_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(app_private.staff_role(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid) = 'teacher',false)
    and exists(select 1 from public.class_teachers t join public.class_students s using(class_id)
      where t.teacher_id = auth.uid() and s.student_id = target);
$$;
create or replace function app_private.can_read_class(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_live_session() and exists(select 1 from public.account_profiles p
    where p.user_id = auth.uid() and p.active and not p.must_change_password and
    (p.role = 'admin' or (p.role = 'teacher' and exists(select 1 from public.class_teachers t
       where t.teacher_id = p.user_id and t.class_id = target))
     or (p.role = 'student' and exists(select 1 from public.class_students s
       where s.student_id = p.user_id and s.class_id = target))));
$$;

create table public.school_policy (
  singleton boolean primary key default true check(singleton),
  retention_days integer check(retention_days between 30 and 3650),
  updated_at timestamptz not null default now()
);
insert into public.school_policy(singleton) values(true);
create table app_private.pending_password_resets (
  target uuid primary key references auth.users(id) on delete cascade,
  actor uuid not null,
  operation uuid not null,
  started_at timestamptz not null default now()
);
revoke all on app_private.pending_password_resets from public,anon,authenticated;
-- A service password replacement is not the student's/teacher's own choice.
-- Keep the password gate closed throughout the whole reset operation.
create or replace function app_private.track_student_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password
    and not exists(select 1 from app_private.pending_password_resets r where r.target=new.id) then
    update public.account_profiles set must_change_password=false where user_id=new.id;
  end if;
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.account_profiles set last_login_at=new.last_sign_in_at where user_id=new.id;
  end if;
  return new;
end;
$$;
create table public.staff_actions (
  actor uuid not null references public.account_profiles(user_id) on delete cascade,
  request_id uuid not null,
  action text not null,
  target uuid,
  created_at timestamptz not null default now(),
  primary key(actor,request_id)
);
create index staff_actions_rate on public.staff_actions(actor,created_at);
alter table public.school_policy enable row level security;
alter table public.staff_actions enable row level security;
create policy policy_admin_read on public.school_policy for select to authenticated using(app_private.is_admin());
create policy actions_admin_read on public.staff_actions for select to authenticated using(app_private.is_admin());
revoke all on public.school_policy,public.staff_actions from public,anon,authenticated;
grant select on public.school_policy,public.staff_actions to authenticated;
grant all on public.school_policy,public.staff_actions to service_role;

create function public.staff_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r text; s uuid := nullif(auth.jwt()->>'session_id','')::uuid;
begin
  r := app_private.staff_role(auth.uid(),s);
  if r is null then raise exception 'Active staff session and chosen password required' using errcode='42501'; end if;
  return jsonb_build_object('user_id',auth.uid(),'role',r,'session_id',s);
end;
$$;
revoke all on function public.staff_context() from public,anon;
grant execute on function public.staff_context() to authenticated;

-- Service-only authorization also checks the live session on every privileged step.
create function public.staff_authorize(actor uuid, session uuid, action text, target uuid default null) returns text
language plpgsql stable security definer set search_path = '' as $$
declare r text;
begin
  r := app_private.staff_role(actor,session);
  if r is null then raise exception 'Staff session unavailable' using errcode='42501'; end if;
  if action in ('invite_teacher','reset_staff','delete_student') and r <> 'admin' then
    raise exception 'Administrator required' using errcode='42501';
  elsif action = 'create_students' then
    if not exists(select 1 from public.school_classes c where c.id=target and (r='admin' or exists(
      select 1 from public.class_teachers t where t.class_id=c.id and t.teacher_id=actor))) then
      raise exception 'Class unavailable' using errcode='42501'; end if;
  elsif action in ('reset_student','delete_student') then
    if not exists(select 1 from public.account_profiles p where p.user_id=target and p.role='student'
      and (r='admin' or exists(select 1 from public.class_teachers t join public.class_students s using(class_id)
        where t.teacher_id=actor and s.student_id=target))) then
      raise exception 'Student unavailable' using errcode='42501'; end if;
  elsif action = 'reset_staff' then
    if target=actor or not exists(select 1 from public.account_profiles p where p.user_id=target and p.role='teacher') then
      raise exception 'Teacher unavailable' using errcode='42501'; end if;
  elsif action <> 'invite_teacher' then
    raise exception 'Unknown staff action';
  end if;
  return r;
end;
$$;
-- Every HTTP mutation has a caller-owned request ID; retries cannot create a second batch.
create function public.staff_start_action(actor uuid, session uuid, action text, request_id uuid, target uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.staff_authorize(actor,session,action,target);
  perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
  if (select count(*) from public.staff_actions a where a.actor=staff_start_action.actor
      and a.action in ('invite_teacher','create_students','reset_student','reset_staff','delete_student')
      and a.created_at>now()-interval '1 minute') >= 10 then
    raise exception 'Wait a minute before trying again' using errcode='54000'; end if;
  insert into public.staff_actions(actor,request_id,action,target) values(actor,request_id,action,target);
end;
$$;
create function public.staff_provision_student(actor uuid, session uuid, target_class uuid, student uuid, username text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.staff_authorize(actor,session,'create_students',target_class);
  insert into public.account_profiles(user_id,role,username) values(student,'student',username);
  insert into public.class_students(class_id,student_id) values(target_class,student);
end;
$$;
create function public.staff_provision_teacher(actor uuid, session uuid, teacher uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.staff_authorize(actor,session,'invite_teacher');
  insert into public.account_profiles(user_id,role,username) values(teacher,'teacher',null);
end;
$$;
create function public.staff_prepare_reset(actor uuid, session uuid, target uuid, operation uuid, staff boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare name text;
begin
  perform public.staff_authorize(actor,session,case when staff then 'reset_staff' else 'reset_student' end,target);
  perform 1 from public.account_profiles p where p.user_id=target for update;
  if exists(select 1 from app_private.pending_password_resets r where r.target=staff_prepare_reset.target
    and r.started_at>now()-interval '2 minutes') then
    raise exception 'Password reset already in progress' using errcode='55006'; end if;
  insert into app_private.pending_password_resets(target,actor,operation) values(target,actor,operation)
    on conflict on constraint pending_password_resets_pkey do update set actor=excluded.actor,operation=excluded.operation,started_at=now();
  update public.account_profiles set active=false,must_change_password=true where user_id=target returning username into name;
  delete from auth.sessions where user_id=target;
  return name;
end;
$$;
create function public.staff_finish_reset(actor uuid, session uuid, target uuid, operation uuid, staff boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.staff_authorize(actor,session,case when staff then 'reset_staff' else 'reset_student' end,target);
  perform 1 from public.account_profiles p where p.user_id=target for update;
  delete from app_private.pending_password_resets r where r.target=staff_finish_reset.target
    and r.actor=staff_finish_reset.actor and r.operation=staff_finish_reset.operation;
  if not found then raise exception 'Password reset operation unavailable' using errcode='42501'; end if;
  delete from auth.sessions where user_id=target;
  update public.account_profiles set active=true,must_change_password=true where user_id=target;
end;
$$;
revoke all on function public.staff_authorize(uuid,uuid,text,uuid),public.staff_start_action(uuid,uuid,text,uuid,uuid),
  public.staff_provision_student(uuid,uuid,uuid,uuid,text),public.staff_provision_teacher(uuid,uuid,uuid),
  public.staff_prepare_reset(uuid,uuid,uuid,uuid,boolean),public.staff_finish_reset(uuid,uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.staff_authorize(uuid,uuid,text,uuid),public.staff_start_action(uuid,uuid,text,uuid,uuid),
  public.staff_provision_student(uuid,uuid,uuid,uuid,text),public.staff_provision_teacher(uuid,uuid,uuid),
  public.staff_prepare_reset(uuid,uuid,uuid,uuid,boolean),public.staff_finish_reset(uuid,uuid,uuid,uuid,boolean) to service_role;

create function public.staff_directory() returns table(user_id uuid,role text,email text,username text,active boolean,must_change_password boolean,last_login_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  return query select p.user_id,p.role,case when p.role<>'student' then u.email::text else null end,
    p.username,p.active,p.must_change_password,p.last_login_at from public.account_profiles p
    join auth.users u on u.id=p.user_id where p.role in ('teacher','admin') order by p.created_at limit 500;
end;
$$;
revoke all on function public.staff_directory() from public,anon;
grant execute on function public.staff_directory() to authenticated;

-- Small scoped writes stay in PostgreSQL; no browser ever receives a service key.
create function public.staff_manage(action text, payload jsonb) returns jsonb
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
      update public.school_classes set label=staff_manage.label where id=cls; result:=cls;
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
revoke all on function public.staff_manage(text,jsonb) from public,anon;
grant execute on function public.staff_manage(text,jsonb) to authenticated;
commit;
