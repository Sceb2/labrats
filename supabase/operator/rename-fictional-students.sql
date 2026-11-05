-- OPERATOR ONLY: all existing student accounts are authorised fictional test accounts.
-- Not an automatic migration. Existing passwords/results/UUIDs are retained.
-- Sign out test browsers first; all student sessions are revoked by this operation.
begin;
create temporary table fictional_renames(user_id uuid primary key,old_username text,new_username text unique) on commit drop;
do $operator$
declare v_student record; animals text[]:=array['bear','otter','fox','goat','panda','robin','lynx','hare','owl','seal','tiger','wolf'];
 serial integer:=1; n integer; suffix text; candidate text; original_guard text;
begin
 -- Lock Auth before profiles, matching Auth sign-in's normal lock order.
 perform u.id from auth.users u join public.account_profiles p on p.user_id=u.id
  where p.role='student' order by u.id for update of u;
 if exists(select 1 from app_private.pending_password_resets r join public.account_profiles p on p.user_id=r.target
  where p.role='student' and r.started_at>now()-interval '2 minutes') then raise exception 'A student reset is in progress; retry later';end if;
 for v_student in select * from public.account_profiles where role='student' order by created_at,user_id for update loop
  if v_student.username ~ '^fictional-[a-z]{2,20}$' then candidate:=v_student.username;
  else
   loop
    n:=(serial-1)/array_length(animals,1);suffix:='';
    while n>0 loop suffix:=chr(97+(n-1)%26)||suffix;n:=(n-1)/26;end loop;
    candidate:='fictional-'||animals[(serial-1)%array_length(animals,1)+1]||suffix;serial:=serial+1;
    exit when not exists(select 1 from auth.users where lower(email)=candidate||'@students.invalid')
     and not exists(select 1 from fictional_renames where new_username=candidate);
   end loop;
  end if;
  insert into fictional_renames values(v_student.user_id,v_student.username,candidate);
 end loop;
 select pg_get_functiondef('app_private.protect_student_identity()'::regprocedure) into original_guard;
 -- A transaction-local replacement permits ONLY the mapped synthetic email changes.
 -- The exact original definition is restored before commit. Other transactions
 -- never see a committed identity-protection bypass; any error rolls everything back.
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
 if pg_get_functiondef('app_private.protect_student_identity()'::regprocedure)<>original_guard then raise exception 'Identity protection was not restored';end if;
end;$operator$;
select user_id,old_username,new_username from fictional_renames order by new_username;
commit;
