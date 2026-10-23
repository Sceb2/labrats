begin;

create table public.learning_question_versions (
  bank_version text not null,
  scoring_version text not null,
  question_id text not null,
  maximum_marks integer not null check (maximum_marks between 1 and 100),
  topic_ids text[] not null,
  question_type text not null,
  primary key (bank_version, scoring_version, question_id)
);

create table public.learning_attempts (
  student_id uuid not null references public.account_profiles(user_id) on delete cascade,
  event_id uuid not null,
  encounter_id uuid not null,
  sequence integer not null check (sequence between 1 and 10000),
  question_id text not null,
  bank_version text not null,
  scoring_version text not null,
  kind text not null check (kind in ('submit', 'reveal')),
  earned_marks integer,
  maximum_marks integer not null,
  is_retry boolean not null,
  answer_revealed boolean not null,
  attempted_at timestamptz not null,
  received_at timestamptz not null default now(),
  session_mode text not null check (session_mode in ('practice','challenge','preview','mistakes')),
  primary key (student_id, event_id),
  unique (student_id, encounter_id, sequence),
  foreign key (bank_version, scoring_version, question_id)
    references public.learning_question_versions(bank_version, scoring_version, question_id),
  check ((kind = 'reveal' and earned_marks is null and answer_revealed)
    or (kind = 'submit' and earned_marks is not null and earned_marks between 0 and maximum_marks))
);
create index learning_attempts_history on public.learning_attempts(student_id, attempted_at, event_id);
create index learning_attempts_windows on public.learning_attempts(student_id, received_at);
alter table public.learning_question_versions enable row level security;
alter table public.learning_attempts enable row level security;

create function app_private.can_sync_learning() returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_live_session() and exists(select 1 from public.account_profiles
    where user_id = auth.uid() and role = 'student' and active and not must_change_password);
$$;
revoke all on function app_private.can_sync_learning() from public, anon;
grant execute on function app_private.can_sync_learning() to authenticated;
create policy catalog_read on public.learning_question_versions for select to authenticated
  using (app_private.can_sync_learning() or app_private.is_admin());
create policy attempts_read on public.learning_attempts for select to authenticated
  using ((student_id = auth.uid() and app_private.can_sync_learning())
    or app_private.is_admin() or app_private.teaches_student(student_id));
revoke all on public.learning_question_versions, public.learning_attempts from public, anon, authenticated;
grant select on public.learning_question_versions, public.learning_attempts to authenticated;
grant all on public.learning_question_versions, public.learning_attempts to service_role;

-- Only this bounded RPC writes history. Unknown keys (including raw answers) are rejected.
-- Marks are client-reported practice results, bounded by the published question catalogue.
create function public.sync_learning_attempts(events jsonb, expected_student uuid) returns jsonb
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
    select maximum_marks into maximum from public.learning_question_versions
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

create function public.student_activity_windows(target uuid)
returns table(days integer, correct_attempts bigint, distinct_questions bigint)
language sql stable security invoker set search_path = '' as $$
  select w.days, count(a.event_id), count(distinct (a.bank_version, a.scoring_version, a.question_id))
  from (values (1), (7), (30)) as w(days)
  left join public.learning_attempts a on a.student_id = target
    and a.kind = 'submit' and not a.is_retry and not a.answer_revealed
    and a.earned_marks = a.maximum_marks
    and a.attempted_at >= now() - make_interval(days => w.days)
    and a.attempted_at <= now()
  group by w.days order by w.days;
$$;
revoke all on function public.student_activity_windows(uuid) from public, anon;
grant execute on function public.student_activity_windows(uuid) to authenticated;
commit;
