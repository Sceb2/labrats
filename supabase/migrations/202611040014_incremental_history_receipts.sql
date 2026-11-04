-- Apply before deploying incremental history clients. No history is rewritten.
begin;

create index learning_attempts_receipts
  on public.learning_attempts(student_id,subject_id,received_at,event_id);
-- flashcard_attempts_history already has these four columns in this order.

create function app_private.order_attempt_receipt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous timestamptz;
begin
  -- Match the existing upload RPC locks. Take the lock before reading the last
  -- receipt, so transactions that started earlier but waited cannot be missed.
  if tg_table_name = 'learning_attempts' then
    perform pg_advisory_xact_lock(hashtextextended(new.student_id::text,0));
    select a.received_at into previous from public.learning_attempts a
      where a.student_id=new.student_id and a.subject_id=new.subject_id
      order by a.received_at desc,a.event_id desc limit 1;
  elsif tg_table_name = 'flashcard_attempts' then
    perform pg_advisory_xact_lock(hashtextextended(new.student_id::text,1));
    select a.received_at into previous from public.flashcard_attempts a
      where a.student_id=new.student_id and a.subject_id=new.subject_id
      order by a.received_at desc,a.event_id desc limit 1;
  else
    raise exception 'Unexpected receipt table';
  end if;
  -- clock_timestamp(), unlike now(), is read after any lock wait. The maximum
  -- also handles a clock adjustment and legacy receipts with future timestamps.
  new.received_at := greatest(clock_timestamp(),previous + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function app_private.order_attempt_receipt() from public,anon,authenticated;

create trigger learning_attempt_receipt before insert on public.learning_attempts
  for each row execute function app_private.order_attempt_receipt();
create trigger flashcard_attempt_receipt before insert on public.flashcard_attempts
  for each row execute function app_private.order_attempt_receipt();

commit;
