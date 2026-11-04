-- Install policy disabled. Review existing accounts and install the separate cron schedule.
begin;
alter table public.account_profiles add column first_login_at timestamptz,
 add column retention_managed boolean not null default false,
 add column staff_invited_at timestamptz,
 add column staff_invitation_accepted_at timestamptz;
-- Never silently enrol historical/test accounts; new accounts are managed.
alter table public.account_profiles alter column retention_managed set default true;
alter table public.school_policy add column retention_enabled boolean not null default false;
create table app_private.retention_extensions (
 student_id uuid primary key references public.account_profiles(user_id) on delete cascade,
 until_at timestamptz not null, reason text not null check(length(btrim(reason)) between 1 and 500),
 actor uuid not null, updated_at timestamptz not null default now()
);
create table app_private.staff_departures (
 user_id uuid primary key references public.account_profiles(user_id) on delete cascade,
 departed_at timestamptz not null default now(), successor uuid not null,
 reason text not null check(length(btrim(reason)) between 1 and 500)
);
create table public.retention_runs (
 id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(),
 finished_at timestamptz, status text not null check(status in ('running','success','failed','disabled')),
 deleted_students integer not null default 0, deleted_staff integer not null default 0,
 failures integer not null default 0
);
alter table public.retention_runs enable row level security;
create policy retention_runs_admin on public.retention_runs for select to authenticated using(app_private.is_admin());
revoke all on app_private.retention_extensions,app_private.staff_departures,public.retention_runs from public,anon,authenticated;
grant select on public.retention_runs to authenticated;
grant all on public.retention_runs to service_role;

-- Audit actor UUIDs remain for the agreed 12-month window after staff deletion.
alter table public.staff_actions drop constraint staff_actions_actor_fkey;

create function app_private.initialise_retention() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.role='teacher' and new.must_change_password then new.staff_invited_at:=clock_timestamp();end if;
 return new;
end;$$;
create trigger initialise_retention before insert on public.account_profiles
 for each row execute function app_private.initialise_retention();
revoke all on function app_private.initialise_retention() from public,anon,authenticated;

create or replace function app_private.track_student_auth() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.account_profiles; choosing boolean;
begin
 select * into p from public.account_profiles where user_id=new.id for update;
 if not found then return new;end if;
 choosing:=new.encrypted_password is distinct from old.encrypted_password
  and not exists(select 1 from app_private.pending_password_resets r where r.target=new.id);
 if p.role<>'student' and p.staff_invited_at is not null and p.staff_invitation_accepted_at is null
  and p.staff_invited_at+interval '7 days'<=clock_timestamp()
  and (choosing or new.last_sign_in_at is distinct from old.last_sign_in_at) then
  raise exception 'Staff invitation has expired; request a new invitation' using errcode='42501';
 end if;
 if choosing then
  update public.account_profiles set must_change_password=false,
   staff_invitation_accepted_at=case when role<>'student' and staff_invited_at is not null
     then coalesce(staff_invitation_accepted_at,clock_timestamp()) else staff_invitation_accepted_at end
   where user_id=new.id;
 end if;
 if new.last_sign_in_at is distinct from old.last_sign_in_at and new.last_sign_in_at is not null then
  update public.account_profiles set last_login_at=new.last_sign_in_at,
   first_login_at=case when role='student' then coalesce(first_login_at,new.last_sign_in_at) else first_login_at end
   where user_id=new.id;
 end if;
 return new;
end;$$;

create function app_private.retention_due(p public.account_profiles) returns timestamptz
language sql stable security definer set search_path='' set timezone='UTC' as $$
 select case when not p.retention_managed then null
 when p.role='student' then greatest(
   case when p.first_login_at is null then p.created_at+interval '90 days' else p.first_login_at+interval '2 years' end,
   (select until_at from app_private.retention_extensions where student_id=p.user_id))
 when exists(select 1 from app_private.staff_departures where user_id=p.user_id)
   then (select departed_at+interval '23 days' from app_private.staff_departures where user_id=p.user_id)
 when p.staff_invited_at is not null and p.staff_invitation_accepted_at is null then p.staff_invited_at+interval '23 days'
 else null end;
$$;
revoke all on function app_private.retention_due(public.account_profiles) from public,anon,authenticated;

-- Also scrub student/target references when an operator uses existing manual deletion.
create function app_private.scrub_deleted_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.staff_actions set target=null where target=old.id;
 return old;
end;$$;
create trigger scrub_deleted_account before delete on auth.users
 for each row execute function app_private.scrub_deleted_account();
revoke all on function app_private.scrub_deleted_account() from public,anon,authenticated;

create function public.retention_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare latest jsonb;
begin
 if not app_private.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 select to_jsonb(r) into latest from public.retention_runs r order by started_at desc limit 1;
 return jsonb_build_object('enabled',(select retention_enabled from public.school_policy where singleton),
  'last_run',latest,'overdue',(select count(*) from public.account_profiles p where app_private.retention_due(p)<=now()),
  'unmanaged',(select count(*) from public.account_profiles where not retention_managed));
end;$$;
create function public.retention_accounts() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not app_private.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'role',p.role,
  'label',case when p.role='student' then p.username else u.email end,'managed',p.retention_managed,
  'first_login_at',p.first_login_at,'due_at',app_private.retention_due(p),
  'extension_until',e.until_at,'extension_reason',e.reason,
  'departed_at',d.departed_at) order by p.created_at)
  from public.account_profiles p join auth.users u on u.id=p.user_id
  left join app_private.retention_extensions e on e.student_id=p.user_id
  left join app_private.staff_departures d on d.user_id=p.user_id),'[]'::jsonb);
end;$$;

create function public.retention_manage(action text,payload jsonb) returns void
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid(); target uuid; v_successor uuid; p public.account_profiles;
 until_at timestamptz; baseline timestamptz; why text;
begin
 if not app_private.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Expected form fields';end if;
 if action='enable' then
  if payload->>'confirmed' is distinct from 'true' then raise exception 'Confirm policy and scheduler readiness';end if;
  update public.school_policy set retention_enabled=true,updated_at=now() where singleton;
 elsif action='extend' then
  target:=(payload->>'user_id')::uuid;
  select * into p from public.account_profiles where user_id=target for update;
  if not found or p.role<>'student' or not p.retention_managed then raise exception 'Choose a managed student';end if;
  until_at:=(payload->>'until_at')::timestamptz;why:=btrim(payload->>'reason');
  baseline:=app_private.retention_due(p);
  if until_at is null or not isfinite(until_at) or until_at<=greatest(baseline,now()) or length(coalesce(why,'')) not between 1 and 500 then
   raise exception 'Give a later expiry date and a reason (1–500 characters)';end if;
  insert into app_private.retention_extensions values(target,until_at,why,actor,now())
   on conflict(student_id) do update set until_at=excluded.until_at,reason=excluded.reason,actor=excluded.actor,updated_at=now();
 elsif action='retire_staff' then
  perform pg_advisory_xact_lock(hashtextextended('labrats-staff-retirement',0));
  if not app_private.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
  target:=(payload->>'user_id')::uuid;v_successor:=(payload->>'successor')::uuid;why:=btrim(payload->>'reason');
  if target=actor or target=v_successor or payload->>'handover_confirmed' is distinct from 'true' or length(coalesce(why,'')) not between 1 and 500 then
   raise exception 'Choose another staff account, document the reason and confirm handover';end if;
  select * into p from public.account_profiles where user_id=target for update;
  if not found or p.role not in ('teacher','admin') then raise exception 'Choose a staff account';end if;
  if not exists(select 1 from public.account_profiles where user_id=v_successor and role='admin' and active and not must_change_password)
   or exists(select 1 from app_private.staff_departures where user_id=v_successor) then
   raise exception 'An active administrator must accept responsibility';end if;
  if p.role='admin' and not exists(select 1 from public.account_profiles where user_id<>target and role='admin' and active and not must_change_password) then
   raise exception 'Keep an active administrator';end if;
  update public.flashcard_packs set owner_id=v_successor where owner_id=target;
  insert into app_private.staff_departures values(target,now(),v_successor,why) on conflict(user_id) do nothing;
  update public.account_profiles set active=false,retention_managed=true where user_id=target;
  delete from auth.sessions where user_id=target;
 else raise exception 'Unknown retention action';end if;
 insert into public.staff_actions(actor,request_id,action,target) values(actor,gen_random_uuid(),'retention_'||action,target);
end;$$;
-- Stop old draft-policy writes and prevent accidental reactivation of leavers.
alter function public.staff_manage(text,jsonb) rename to staff_manage_before_retention;
revoke all on function public.staff_manage_before_retention(text,jsonb) from public,anon,authenticated;
alter function public.staff_manage_before_retention(text,jsonb) set schema app_private;
create function public.staff_manage(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if action='set_retention' then raise exception 'The agreed retention policy replaces the draft period';end if;
 if action='set_active' and exists(select 1 from app_private.staff_departures where user_id=(payload->>'user_id')::uuid) then
  raise exception 'This staff account is scheduled for deletion';end if;
 return app_private.staff_manage_before_retention(action,payload);
end;$$;

create function app_private.protect_departed_staff() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.active and exists(select 1 from app_private.staff_departures where user_id=new.user_id) then
  raise exception 'Departed staff cannot be reactivated' using errcode='42501';end if;
 return new;
end;$$;
create trigger protect_departed_staff before update on public.account_profiles
 for each row execute function app_private.protect_departed_staff();
revoke all on function app_private.protect_departed_staff() from public,anon,authenticated;

create function public.run_retention_cleanup() returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare run_id uuid:=gen_random_uuid(); candidate record; v_profile public.account_profiles;
 students integer:=0; staff integer:=0; v_failures integer:=0; due timestamptz;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('labrats-retention-cleanup',0)) then
  return jsonb_build_object('status','running');end if;
 insert into public.retention_runs(id,status) values(run_id,'running');
 if not (select retention_enabled from public.school_policy where singleton) then
  update public.retention_runs set status='disabled',finished_at=now() where id=run_id;
  return jsonb_build_object('status','disabled');end if;
 begin
  -- Lock Auth before profiles, matching sign-in's lock order. Recheck after locking.
  for candidate in select u.id from auth.users u join public.account_profiles p on p.user_id=u.id
   where app_private.retention_due(p)<=now() order by u.id for update of u skip locked loop
   begin
    select * into v_profile from public.account_profiles where user_id=candidate.id for update;
    due:=app_private.retention_due(v_profile);
    if due is null or due>now() then continue;end if;
    if v_profile.role<>'student' then
     if exists(select 1 from public.flashcard_packs where owner_id=v_profile.user_id) then
      raise exception 'Untransferred teaching content';end if;
     if v_profile.role='admin' and not exists(select 1 from public.account_profiles where user_id<>v_profile.user_id and role='admin' and active and not must_change_password) then
      raise exception 'Last active administrator';end if;
    end if;
    delete from auth.users where id=v_profile.user_id;
    if v_profile.role='student' then students:=students+1;else staff:=staff+1;end if;
   exception when others then v_failures:=v_failures+1;
   end;
  end loop;
  -- Skipped locked accounts remain visible as backlog; do not report false success.
  v_failures:=(select count(*) from public.account_profiles p where app_private.retention_due(p)<=now());
  delete from public.staff_actions where created_at<now()-interval '12 months';
  delete from public.retention_runs where started_at<now()-interval '12 months';
 exception when others then students:=0;staff:=0;v_failures:=v_failures+1;
 end;
 update public.retention_runs set finished_at=clock_timestamp(),status=case when v_failures=0 then 'success' else 'failed' end,
  deleted_students=students,deleted_staff=staff,failures=v_failures where id=run_id;
 return (select to_jsonb(r) from public.retention_runs r where id=run_id);
end;$$;
revoke all on function public.retention_status(),public.retention_accounts(),public.retention_manage(text,jsonb),public.staff_manage(text,jsonb),public.run_retention_cleanup() from public,anon,authenticated;
grant execute on function public.retention_status(),public.retention_accounts(),public.retention_manage(text,jsonb),public.staff_manage(text,jsonb) to authenticated;
grant execute on function public.run_retention_cleanup() to service_role;
commit;
