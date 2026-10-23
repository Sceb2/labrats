-- Staff and trusted operators share a reset lease and revoke sessions at both
-- boundaries. Existing accounts, memberships and learning history are preserved.
begin;

-- A null actor identifies a trusted service operator, rather than a staff user.
alter table app_private.pending_password_resets alter column actor drop not null;

create function app_private.begin_password_reset(target uuid, operation uuid, reset_actor uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare name text;
begin
  if operation is null then raise exception 'Reset operation required'; end if;
  select username into name from public.account_profiles p where p.user_id=target for update;
  if not found then raise exception 'Account unavailable' using errcode='42501'; end if;
  if exists(select 1 from app_private.pending_password_resets r where r.target=begin_password_reset.target
    and r.started_at>now()-interval '2 minutes') then
    raise exception 'Password reset already in progress' using errcode='55006'; end if;
  insert into app_private.pending_password_resets(target,actor,operation) values(target,reset_actor,operation)
    on conflict on constraint pending_password_resets_pkey do update
      set actor=excluded.actor,operation=excluded.operation,started_at=now();
  update public.account_profiles set active=false,must_change_password=true where user_id=target;
  delete from auth.sessions where user_id=target;
  return name;
end;
$$;

create function app_private.complete_password_reset(target uuid, operation uuid, reset_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.account_profiles p where p.user_id=target for update;
  delete from app_private.pending_password_resets r where r.target=complete_password_reset.target
    and r.actor is not distinct from reset_actor and r.operation=complete_password_reset.operation;
  if not found then raise exception 'Password reset operation unavailable' using errcode='42501'; end if;
  delete from auth.sessions where user_id=target;
  update public.account_profiles set active=true,must_change_password=true where user_id=target;
end;
$$;

revoke all on function app_private.begin_password_reset(uuid,uuid,uuid),
  app_private.complete_password_reset(uuid,uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.staff_prepare_reset(actor uuid, session uuid, target uuid, operation uuid, staff boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform public.staff_authorize(actor,session,case when staff then 'reset_staff' else 'reset_student' end,target);
  return app_private.begin_password_reset(target,operation,actor);
end;
$$;

create or replace function public.staff_finish_reset(actor uuid, session uuid, target uuid, operation uuid, staff boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.staff_authorize(actor,session,case when staff then 'reset_staff' else 'reset_student' end,target);
  perform app_private.complete_password_reset(target,operation,actor);
end;
$$;

create function public.operator_prepare_student_reset(target uuid, operation uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.account_profiles p where p.user_id=target and p.role='student') then
    raise exception 'Student unavailable' using errcode='42501'; end if;
  return app_private.begin_password_reset(target,operation,null);
end;
$$;

create function public.operator_finish_student_reset(target uuid, operation uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.account_profiles p where p.user_id=target and p.role='student') then
    raise exception 'Student unavailable' using errcode='42501'; end if;
  perform app_private.complete_password_reset(target,operation,null);
end;
$$;

revoke all on function public.operator_prepare_student_reset(uuid,uuid),
  public.operator_finish_student_reset(uuid,uuid) from public,anon,authenticated;
grant execute on function public.operator_prepare_student_reset(uuid,uuid),
  public.operator_finish_student_reset(uuid,uuid) to service_role;

-- Fail clearly for an old operator tool, rather than bypassing an active lease.
create or replace function public.prepare_student_password_reset(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Update the operator tool: password resets now require a shared reset lease' using errcode='0A000';
end;
$$;

commit;
