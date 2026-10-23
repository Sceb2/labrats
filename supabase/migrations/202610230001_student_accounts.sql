-- One-school account foundation. Auth owns passwords; public tables contain no credentials.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated, service_role;

create table public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'admin')),
  username text unique,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  constraint student_username check (
    (role = 'student' and username ~ '^student-[a-z2-9]{12}$') or
    (role <> 'student' and username is null)
  )
);

create table public.school_classes (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(label) between 1 and 100),
  created_at timestamptz not null default now()
);
create table public.class_teachers (
  class_id uuid not null references public.school_classes(id) on delete cascade,
  teacher_id uuid not null references public.account_profiles(user_id) on delete cascade,
  primary key (class_id, teacher_id)
);
create index class_teachers_teacher on public.class_teachers(teacher_id);
create table public.class_students (
  class_id uuid not null references public.school_classes(id) on delete cascade,
  student_id uuid not null references public.account_profiles(user_id) on delete cascade,
  primary key (class_id, student_id)
);
create index class_students_student on public.class_students(student_id);

-- Definer helpers avoid recursive RLS. They return only access decisions for auth.uid().
create function app_private.has_live_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.sessions s where s.user_id = auth.uid()
    and s.id::text = (auth.jwt() ->> 'session_id'));
$$;
create function app_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_live_session() and exists(select 1 from public.account_profiles
    where user_id = auth.uid() and active and role = 'admin');
$$;
create function app_private.can_read_class(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_live_session() and exists(select 1 from public.account_profiles p where p.user_id = auth.uid()
    and p.active and (
      p.role = 'admin' or
      (p.role = 'teacher' and exists(select 1 from public.class_teachers t
        where t.class_id = target and t.teacher_id = p.user_id)) or
      (p.role = 'student' and not p.must_change_password and exists(
        select 1 from public.class_students s where s.class_id = target and s.student_id = p.user_id))
    ));
$$;
create function app_private.teaches_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_live_session() and exists(select 1 from public.account_profiles p
    join public.class_teachers t on t.teacher_id = p.user_id
    join public.class_students s on s.class_id = t.class_id
    where p.user_id = auth.uid() and p.role = 'teacher' and p.active and s.student_id = target);
$$;
revoke all on function app_private.has_live_session(), app_private.is_admin(), app_private.can_read_class(uuid),
  app_private.teaches_student(uuid) from public, anon;
grant execute on function app_private.has_live_session(), app_private.is_admin(), app_private.can_read_class(uuid),
  app_private.teaches_student(uuid) to authenticated;

alter table public.account_profiles enable row level security;
alter table public.school_classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_students enable row level security;

create policy profiles_read on public.account_profiles for select to authenticated
  using (app_private.has_live_session() and (user_id = auth.uid() or app_private.is_admin() or
    (role = 'student' and app_private.teaches_student(user_id))));
create policy classes_read on public.school_classes for select to authenticated
  using (app_private.can_read_class(id));
create policy teachers_read on public.class_teachers for select to authenticated
  using ((teacher_id = auth.uid() and app_private.has_live_session()) or app_private.is_admin());
create policy students_read on public.class_students for select to authenticated
  using ((student_id = auth.uid() and app_private.can_read_class(class_id)) or
    app_private.is_admin() or (app_private.teaches_student(student_id) and app_private.can_read_class(class_id)));

-- Deliberate grants also work when automatic table exposure is disabled.
revoke all on public.account_profiles, public.school_classes,
  public.class_teachers, public.class_students from public, anon, authenticated;
grant select on public.account_profiles, public.school_classes,
  public.class_teachers, public.class_students to authenticated;
grant all on public.account_profiles, public.school_classes,
  public.class_teachers, public.class_students to service_role;

-- Never trust user-editable Auth metadata for a role or password-change flag.
create function app_private.check_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'student' and not exists(select 1 from auth.users u
    where u.id = new.user_id and u.email = new.username || '@students.invalid') then
    raise exception 'Student identity must match the generated username';
  end if;
  return new;
end;
$$;
create trigger check_student_profile before insert or update on public.account_profiles
  for each row execute function app_private.check_profile();

create function app_private.check_class_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'class_teachers' then
    if not exists(select 1 from public.account_profiles where user_id = new.teacher_id
      and role in ('teacher', 'admin')) then raise exception 'Teacher role required'; end if;
  else
    if not exists(select 1 from public.account_profiles where user_id = new.student_id
      and role = 'student') then raise exception 'Student role required'; end if;
  end if;
  return new;
end;
$$;
create trigger check_teacher_member before insert or update on public.class_teachers
  for each row execute function app_private.check_class_member();
create trigger check_student_member before insert or update on public.class_students
  for each row execute function app_private.check_class_member();

-- Keep synthetic identities fixed, including pending email changes. Students never need mail.
create function app_private.protect_student_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.account_profiles p where p.user_id = old.id and p.role = 'student')
    and (new.email is distinct from old.email or new.phone is distinct from old.phone
      or nullif(new.email_change, '') is not null or nullif(new.phone_change, '') is not null) then
    raise exception 'Student account identifiers are managed by the school';
  end if;
  return new;
end;
$$;
create trigger protect_student_identity before update on auth.users
  for each row execute function app_private.protect_student_identity();

-- Only an actual password change in Supabase Auth clears the first-login gate.
create function app_private.track_student_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.account_profiles set must_change_password = false where user_id = new.id;
  end if;
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.account_profiles set last_login_at = new.last_sign_in_at where user_id = new.id;
  end if;
  return new;
end;
$$;
create trigger track_student_auth after update on auth.users
  for each row execute function app_private.track_student_auth();
revoke all on function app_private.check_profile(), app_private.check_class_member(),
  app_private.protect_student_identity(), app_private.track_student_auth() from public, anon, authenticated;

-- Reset is deliberately service-only. Deleting sessions immediately denies stale JWTs in RLS.
-- Keep disabled if the subsequent Auth password update fails; the operator can safely retry.
create function public.prepare_student_password_reset(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.account_profiles set active = false, must_change_password = true
    where user_id = target and role = 'student';
  if not found then raise exception 'Student account not found'; end if;
  delete from auth.sessions where user_id = target;
end;
$$;
revoke all on function public.prepare_student_password_reset(uuid) from public, anon, authenticated;
grant execute on function public.prepare_student_password_reset(uuid) to service_role;

commit;
