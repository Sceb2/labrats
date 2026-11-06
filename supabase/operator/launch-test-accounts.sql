-- OPERATOR ONLY, not a migration. Destructive, reviewed fictional-data cleanup.
-- Run the READ-ONLY plan first. Copy its INSERT statements into the marked area.
-- In exactly TWO student rows replace 'delete' with 'keep_chemistry' and
-- 'keep_applied' respectively. Every other row must be a confirmed test account.
-- Existing passwords, first-login dates and the two keepers' history survive.
-- Staff accounts and teaching packs survive. Student sessions are revoked.
begin;
create temporary table reviewed_students (
 user_id uuid primary key, expected_username text not null,
 action text not null check(action in ('keep_chemistry','keep_applied','delete'))
) on commit drop;
create temporary table reviewed_classes (
 class_id uuid primary key,expected_label text not null,subject_id text not null
) on commit drop;

-- PASTE THE REVIEWED STUDENT AND CLASS INSERT STATEMENTS BELOW THIS LINE.

-- END OF REVIEWED INSERT STATEMENTS. An unfilled script safely fails.
create temporary table fictional_renames(user_id uuid primary key,old_username text,new_username text unique) on commit drop;
do $operator$
declare original_guard text;
 chemistry_class constant uuid:=md5('labrats-launch-test-chemistry')::uuid;
 applied_class constant uuid:=md5('labrats-launch-test-applied')::uuid;
begin
 -- Freeze the reviewed inventory. A new/unreviewed account or changed label
 -- aborts the entire transaction, including any deletion.
 lock table auth.users in share row exclusive mode;
 lock table public.account_profiles,public.school_classes,public.class_students,public.class_teachers in share row exclusive mode;
 if (select count(*) from reviewed_students where action='keep_chemistry')<>1
  or (select count(*) from reviewed_students where action='keep_applied')<>1 then
  raise exception 'Choose exactly one Chemistry and one Applied Science test student in the reviewed manifest';end if;
 if exists(select 1 from public.account_profiles p full join reviewed_students r on r.user_id=p.user_id
   where (p.role='student' and (r.user_id is null or r.expected_username is distinct from p.username))
      or (r.user_id is not null and (p.user_id is null or p.role<>'student'))) then
  raise exception 'Student inventory changed or includes a non-student; rerun the read-only plan';end if;
 if exists(select 1 from public.school_classes c full join reviewed_classes r on r.class_id=c.id
   where c.id is null or r.class_id is null or c.label is distinct from r.expected_label or c.subject_id is distinct from r.subject_id) then
  raise exception 'Class inventory changed; rerun the read-only plan and review every test class';end if;
 if exists(select 1 from app_private.pending_password_resets r join reviewed_students s on s.user_id=r.target
   where r.started_at>now()-interval '2 minutes') then
  raise exception 'A student password reset is in progress; retry later';end if;

 insert into fictional_renames
 select user_id,expected_username,case action when 'keep_chemistry' then 'fictional-chemistry' else 'fictional-applied' end
 from reviewed_students where action<>'delete';
 -- Delete only the explicitly reviewed test users; foreign keys remove their
 -- memberships, learning history and flashcard history. Staff are excluded.
 delete from auth.users u using reviewed_students r where u.id=r.user_id and r.action='delete';

 select pg_get_functiondef('app_private.protect_student_identity()'::regprocedure) into original_guard;
 -- Same transaction-local, exactly restored guard as the previous fictional
 -- rename operator. No committed identity-protection bypass is left behind.
 execute $definition$create or replace function app_private.protect_student_identity() returns trigger
 language plpgsql security definer set search_path='' as $guard$
 begin
  if exists(select 1 from public.account_profiles where user_id=old.id and role='student')
   and (new.email is distinct from old.email or new.phone is distinct from old.phone
    or nullif(new.email_change,'') is not null or nullif(new.phone_change,'') is not null) then
   if not exists(select 1 from pg_temp.fictional_renames m where m.user_id=old.id
     and new.email=m.new_username||'@students.invalid')
    or new.phone is distinct from old.phone or nullif(new.email_change,'') is not null or nullif(new.phone_change,'') is not null then
    raise exception 'Student account identifiers are managed by the school';end if;
  end if;
  return new;
 end;$guard$ $definition$;
 update auth.users u set email=m.new_username||'@students.invalid',updated_at=now()
 from fictional_renames m where u.id=m.user_id and u.email is distinct from m.new_username||'@students.invalid';
 update auth.identities i set identity_data=jsonb_set(coalesce(i.identity_data,'{}'::jsonb),'{email}',to_jsonb(m.new_username||'@students.invalid')),updated_at=now()
 from fictional_renames m where i.user_id=m.user_id and i.provider='email';
 update public.account_profiles p set username=m.new_username from fictional_renames m where p.user_id=m.user_id;
 delete from auth.sessions s using fictional_renames m where s.user_id=m.user_id;
 execute original_guard;
 if pg_get_functiondef('app_private.protect_student_identity()'::regprocedure)<>original_guard then
  raise exception 'Identity protection was not restored';end if;

 delete from public.school_classes c using reviewed_classes r
 where c.id=r.class_id and c.id not in (chemistry_class,applied_class);
 insert into public.school_classes(id,label,subject_id) values
  (chemistry_class,'TEST CLASS — Chemistry','chemistry'),
  (applied_class,'TEST CLASS — Applied Science','applied-science')
 on conflict(id) do update set label=excluded.label,subject_id=excluded.subject_id;
 delete from public.class_students where student_id in(select user_id from fictional_renames);
 insert into public.class_students(class_id,student_id)
 select case action when 'keep_chemistry' then chemistry_class else applied_class end,user_id
 from reviewed_students where action<>'delete';
 if (select count(*) from public.account_profiles where role='student')<>2
  or (select count(*) from public.school_classes)<>2 then
  raise exception 'Unexpected final test inventory; rolling back';end if;
end;$operator$;
select p.user_id,p.username,c.label,c.subject_id,p.active,p.must_change_password
from public.account_profiles p join public.class_students s on s.student_id=p.user_id
join public.school_classes c on c.id=s.class_id where p.role='student' order by c.subject_id;
commit;
