-- Separate self-assessed flashcards. Do not apply to a hosted project until reviewed.
begin;
create table public.flashcard_topics (
 subject_id text not null references public.learning_subjects(id), topic_id text not null,
 label text not null, primary key(subject_id,topic_id)
);
insert into public.flashcard_topics values ('chemistry','basic','4.1.1 Basic concepts and nomenclature');
insert into public.flashcard_topics values ('chemistry','alkanes','4.1.2 Alkane reactions');
insert into public.flashcard_topics values ('chemistry','alkenes','4.1.3 Alkenes');
insert into public.flashcard_topics values ('chemistry','alcohols','4.2.1 Alcohols');
insert into public.flashcard_topics values ('chemistry','haloalkanes','4.2.2 Haloalkanes');
insert into public.flashcard_topics values ('chemistry','synthesis4','4.2.3 Organic synthesis');
insert into public.flashcard_topics values ('chemistry','aromatics','6.1.1 Aromatic compounds');
insert into public.flashcard_topics values ('chemistry','carbonyls','6.1.2 Carbonyl compounds');
insert into public.flashcard_topics values ('chemistry','acids','6.1.3 Acids, esters and acyl chlorides');
insert into public.flashcard_topics values ('chemistry','nitrogen','6.2.1 Amines / 6.2.2 Amides');
insert into public.flashcard_topics values ('chemistry','ccbond','6.2.4 Carbon–carbon bond formation');
insert into public.flashcard_topics values ('chemistry','synthesis6','6.2.5 Organic synthesis');
insert into public.flashcard_topics values ('applied-science','WA01','Types of Waves');
insert into public.flashcard_topics values ('applied-science','WA02','Wave Properties');
insert into public.flashcard_topics values ('applied-science','WA03','Graphing Waves');
insert into public.flashcard_topics values ('applied-science','WA04','Wave Speed');
insert into public.flashcard_topics values ('applied-science','WA05','Phase Difference');
insert into public.flashcard_topics values ('applied-science','WA06','Diffraction');
insert into public.flashcard_topics values ('applied-science','WA07','Emission Spectra');
insert into public.flashcard_topics values ('applied-science','WA08','Standing Waves');
insert into public.flashcard_topics values ('applied-science','WA09','Harmonics');
insert into public.flashcard_topics values ('applied-science','WA12','Optical Fibres');
insert into public.flashcard_topics values ('applied-science','WA13','Inverse Square Law');
insert into public.flashcard_topics values ('applied-science','WA16','Uses of Waves');
create table public.flashcard_packs (
 id uuid primary key default gen_random_uuid(), subject_id text not null, topic_id text not null,
 title text not null check(length(btrim(title)) between 1 and 120),
 owner_id uuid references public.account_profiles(user_id) on delete set null,
 status text not null default 'draft' check(status in ('draft','published','archived')),
 revision integer not null default 1, updated_at timestamptz not null default now(),
 foreign key(subject_id,topic_id) references public.flashcard_topics(subject_id,topic_id)
);
create unique index flashcards_one_published_topic on public.flashcard_packs(subject_id,topic_id) where status='published';
create table public.flashcard_cards (
 pack_id uuid not null references public.flashcard_packs(id), card_id text not null check(card_id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$'),
 content_version integer not null check(content_version>0), is_current boolean not null default true,
 front text not null check(length(btrim(front)) between 1 and 2000), back text not null check(length(btrim(back)) between 1 and 4000),
 question_id text generated always as (pack_id::text||'/'||card_id||'@'||content_version::text) stored unique,
 primary key(pack_id,card_id,content_version)
);
create unique index flashcards_one_current_version on public.flashcard_cards(pack_id,card_id) where is_current;
create table public.flashcard_attempts (
 student_id uuid not null references public.account_profiles(user_id) on delete cascade,
 event_id uuid not null,encounter_id uuid not null,sequence integer not null check(sequence in (1,2)),
 question_id text not null references public.flashcard_cards(question_id),subject_id text not null references public.learning_subjects(id),
 bank_version text not null check(bank_version='flashcards-1'),scoring_version text not null check(scoring_version='flashcards-1'),
 kind text not null check(kind='submit'),earned_marks integer not null check(earned_marks in (0,1)),
 maximum_marks integer not null check(maximum_marks=1),is_retry boolean not null,answer_revealed boolean not null check(not answer_revealed),
 attempted_at timestamptz not null,received_at timestamptz not null default now(),
 session_mode text not null check(session_mode in ('practice','preview')),
 primary key(student_id,event_id),unique(student_id,encounter_id,sequence),check(is_retry=(sequence=2))
);
create index flashcard_attempts_history on public.flashcard_attempts(student_id,subject_id,received_at,event_id);
create function app_private.can_manage_flashcards(subject text, owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(app_private.is_admin() or (owner=auth.uid() and
  app_private.staff_role(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid)='teacher'
  and exists(select 1 from public.staff_subjects where teacher_id=auth.uid() and subject_id=subject)),false);
$$;
revoke all on function app_private.can_manage_flashcards(text,uuid) from public,anon;
grant execute on function app_private.can_manage_flashcards(text,uuid) to authenticated;
alter table public.flashcard_topics enable row level security;
alter table public.flashcard_packs enable row level security;
alter table public.flashcard_cards enable row level security;
alter table public.flashcard_attempts enable row level security;
create policy flashcard_topics_public on public.flashcard_topics for select to anon,authenticated using(true);
create policy flashcard_packs_read on public.flashcard_packs for select to anon,authenticated using(
 status='published' or app_private.can_manage_flashcards(subject_id,owner_id));
create policy flashcard_attempts_read on public.flashcard_attempts for select to authenticated using(
 (student_id=auth.uid() and app_private.can_sync_learning()) or app_private.is_admin()
 or app_private.teaches_subject_student(student_id,subject_id));
revoke all on public.flashcard_topics,public.flashcard_packs,public.flashcard_cards,public.flashcard_attempts from public,anon,authenticated;
grant select on public.flashcard_topics,public.flashcard_cards to anon,authenticated;
-- Public pack content does not expose its teacher's account identifier.
grant select(id,subject_id,topic_id,title,status,revision,updated_at) on public.flashcard_packs to anon,authenticated;
grant select on public.flashcard_attempts to authenticated;
grant all on public.flashcard_topics,public.flashcard_packs,public.flashcard_cards,public.flashcard_attempts to service_role;
-- Anonymous access must not evaluate a helper that its role cannot execute.
grant execute on function app_private.can_manage_flashcards(text,uuid) to anon;
-- Use a helper to avoid requiring anon to call the staff-session helper directly.
create function app_private.can_read_flashcard_version(pack uuid,current_version boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.flashcard_packs p where p.id=pack and
 ((p.status='published' and current_version) or app_private.can_manage_flashcards(p.subject_id,p.owner_id)
 or p.status in ('published','archived') and app_private.staff_role(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid)='teacher'
 and exists(select 1 from public.staff_subjects s where s.teacher_id=auth.uid() and s.subject_id=p.subject_id)));
$$;
revoke all on function app_private.can_read_flashcard_version(uuid,boolean) from public;
grant execute on function app_private.can_read_flashcard_version(uuid,boolean) to anon,authenticated;
create policy flashcard_cards_read on public.flashcard_cards for select to anon,authenticated using(app_private.can_read_flashcard_version(pack_id,is_current));

create table public.flashcard_pack_drafts (
 pack_id uuid primary key references public.flashcard_packs(id),
 title text not null check(length(btrim(title)) between 1 and 120),
 change_kind text not null check(change_kind in ('minor','new_version')),cards jsonb not null
);
alter table public.flashcard_pack_drafts enable row level security;
create function app_private.can_manage_flashcard_pack(pack uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.flashcard_packs p where p.id=pack and app_private.can_manage_flashcards(p.subject_id,p.owner_id));
$$;
revoke all on function app_private.can_manage_flashcard_pack(uuid) from public,anon;
grant execute on function app_private.can_manage_flashcard_pack(uuid) to authenticated;
create policy flashcard_drafts_read on public.flashcard_pack_drafts for select to authenticated using(app_private.can_manage_flashcard_pack(pack_id));
revoke all on public.flashcard_pack_drafts from public,anon,authenticated;
grant select on public.flashcard_pack_drafts to authenticated;
grant all on public.flashcard_pack_drafts to service_role;

create function public.staff_flashcard_packs(subject text) returns setof public.flashcard_packs
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.staff_context();
 return query select * from public.flashcard_packs p where p.subject_id=subject and app_private.can_manage_flashcards(p.subject_id,p.owner_id);
end;$$;
revoke all on function public.staff_flashcard_packs(text) from public,anon;
grant execute on function public.staff_flashcard_packs(text) to authenticated;

create function public.manage_flashcard_pack(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ctx jsonb;p public.flashcard_packs;d public.flashcard_pack_drafts;item jsonb;old public.flashcard_cards;ver integer;subject text;topic text;ids text[]:='{}';newpack boolean;
begin
 ctx:=public.staff_context();
 if jsonb_typeof(payload)<>'object' or octet_length(payload::text)>2000000 then raise exception 'Invalid or oversized pack';end if;
 if action is null or action not in ('import','publish','archive') then raise exception 'Unknown pack operation';end if;
 newpack:=payload->>'pack_id' is null;
 if newpack then
  if action<>'import' then raise exception 'Choose a pack';end if;
  subject:=payload->>'subject_id';topic:=payload->>'topic_id';
  if not app_private.can_manage_flashcards(subject,auth.uid()) then raise exception 'Subject unavailable' using errcode='42501';end if;
  insert into public.flashcard_packs(subject_id,topic_id,title,owner_id) values(subject,topic,payload->>'title',auth.uid()) returning * into p;
 else
  select * into p from public.flashcard_packs where id=(payload->>'pack_id')::uuid for update;
  if not found or not app_private.can_manage_flashcards(p.subject_id,p.owner_id) then raise exception 'Pack unavailable' using errcode='42501';end if;
  if (payload->>'expected_revision')::integer is distinct from p.revision then raise exception 'Pack changed. Reload before editing.' using errcode='PT409';end if;
 end if;
 if action='import' then
  if payload->>'change_kind' not in ('minor','new_version') or payload->>'change_kind' is null
   or jsonb_typeof(payload->'cards')<>'array' or jsonb_array_length(payload->'cards') not between 1 and 1000
   or length(btrim(payload->>'title')) not between 1 and 120 or payload->>'title' is null then raise exception 'Choose a title, change type and 1–1000 cards';end if;
  if payload->>'subject_id' is distinct from p.subject_id or payload->>'topic_id' is distinct from p.topic_id then raise exception 'A pack cannot change subject or topic';end if;
  for item in select value from jsonb_array_elements(payload->'cards') loop
   if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>4
    or not(item?'id' and item?'topic' and item?'front' and item?'back')
    or jsonb_typeof(item->'id')<>'string' or jsonb_typeof(item->'topic')<>'string'
    or jsonb_typeof(item->'front')<>'string' or jsonb_typeof(item->'back')<>'string'
    or (item->>'id') !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$'
    or length(btrim(item->>'front')) not between 1 and 2000 or length(btrim(item->>'back')) not between 1 and 4000
    or item->>'topic' is distinct from p.topic_id then raise exception 'Invalid card fields or topic';end if;
   if item->>'id'=any(ids) then raise exception 'Duplicate card ID';end if;ids:=array_append(ids,item->>'id');
  end loop;
  insert into public.flashcard_pack_drafts(pack_id,title,change_kind,cards) values(p.id,payload->>'title',payload->>'change_kind',payload->'cards')
   on conflict(pack_id) do update set title=excluded.title,change_kind=excluded.change_kind,cards=excluded.cards;
  -- A published pack stays published. Only the private draft changes here.
  update public.flashcard_packs set revision=revision+1,updated_at=now() where id=p.id returning * into p;
 elsif action='publish' then
  if exists(select 1 from public.flashcard_packs where subject_id=p.subject_id and topic_id=p.topic_id and status='published' and id<>p.id) then raise exception 'This topic already has a published pack. Its owner or an administrator must archive it first.';end if;
  select * into d from public.flashcard_pack_drafts where pack_id=p.id;
  if found then
   ids:='{}';
   for item in select value from jsonb_array_elements(d.cards) loop
    ids:=array_append(ids,item->>'id');
    select * into old from public.flashcard_cards where pack_id=p.id and card_id=item->>'id' order by content_version desc limit 1;
    if not found then ver:=1;
    elsif d.change_kind='new_version' and (old.front is distinct from item->>'front' or old.back is distinct from item->>'back') then ver:=old.content_version+1;
    else ver:=old.content_version;end if;
    update public.flashcard_cards set is_current=false where pack_id=p.id and card_id=item->>'id';
    insert into public.flashcard_cards(pack_id,card_id,content_version,front,back) values(p.id,item->>'id',ver,item->>'front',item->>'back')
     on conflict(pack_id,card_id,content_version) do update set front=excluded.front,back=excluded.back,is_current=true;
   end loop;
   update public.flashcard_cards set is_current=false where pack_id=p.id and not(card_id=any(ids));
   update public.flashcard_packs set title=d.title where id=p.id;
   delete from public.flashcard_pack_drafts where pack_id=p.id;
  end if;
  if not exists(select 1 from public.flashcard_cards where pack_id=p.id and is_current) then raise exception 'Pack has no cards';end if;
  update public.flashcard_packs set status='published',revision=revision+1,updated_at=now() where id=p.id returning * into p;
 else
  update public.flashcard_packs set status='archived',revision=revision+1,updated_at=now() where id=p.id returning * into p;
 end if;
 return to_jsonb(p);
end;$$;
revoke all on function public.manage_flashcard_pack(text,jsonb) from public,anon;
grant execute on function public.manage_flashcard_pack(text,jsonb) to authenticated;

create function public.sync_flashcard_attempts(events jsonb,expected_student uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare student uuid:=auth.uid();created timestamptz;item jsonb;r public.flashcard_attempts;old public.flashcard_attempts;accepted jsonb:='[]';
begin
 select created_at into created from public.account_profiles where user_id=student and role='student' and active and not must_change_password for share;
 if not found or student is distinct from expected_student or not app_private.has_live_session() then raise exception 'Active student session required' using errcode='42501';end if;
 if jsonb_typeof(events)<>'array' or events is null or jsonb_array_length(events)>100 then raise exception 'Expected at most 100 learning events';end if;
 perform pg_advisory_xact_lock(hashtextextended(student::text,1));
 for item in select value from jsonb_array_elements(events) loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>13
   or exists(select 1 from jsonb_object_keys(item) k where k not in ('event_id','encounter_id','sequence','question_id','bank_version','scoring_version','kind','earned_marks','maximum_marks','is_retry','answer_revealed','attempted_at','session_mode')) then raise exception 'Unexpected learning event fields';end if;
  if jsonb_typeof(item->'is_retry')<>'boolean' or jsonb_typeof(item->'answer_revealed')<>'boolean'
   or jsonb_typeof(item->'sequence')<>'number' or jsonb_typeof(item->'maximum_marks')<>'number' or jsonb_typeof(item->'earned_marks')<>'number' then raise exception 'Invalid learning event values';end if;
  r:=null;r.student_id:=student;r.event_id:=(item->>'event_id')::uuid;r.encounter_id:=(item->>'encounter_id')::uuid;
  r.sequence:=(item->>'sequence')::integer;r.question_id:=item->>'question_id';r.bank_version:=item->>'bank_version';r.scoring_version:=item->>'scoring_version';
  r.kind:=item->>'kind';r.earned_marks:=(item->>'earned_marks')::integer;r.maximum_marks:=(item->>'maximum_marks')::integer;
  r.is_retry:=(item->>'is_retry')::boolean;r.answer_revealed:=(item->>'answer_revealed')::boolean;
  r.attempted_at:=(item->>'attempted_at')::timestamptz;r.session_mode:=item->>'session_mode';r.received_at:=now();
  select p.subject_id into r.subject_id from public.flashcard_cards c join public.flashcard_packs p on p.id=c.pack_id where c.question_id=r.question_id;
  if not found then raise exception 'Unknown question version or maximum mark';end if;
  if r.attempted_at<created-interval '5 minutes' or r.attempted_at>now()+interval '5 minutes' then raise exception 'Check the device clock';end if;
  select * into old from public.flashcard_attempts where student_id=student and event_id=r.event_id;
  if found then
   if to_jsonb(old)-'received_at' is distinct from to_jsonb(r)-'received_at' then raise exception 'Event ID already exists with different data';end if;
  else
   if exists(select 1 from public.flashcard_attempts a where a.student_id=student and a.encounter_id=r.encounter_id and a.question_id<>r.question_id) then raise exception 'Invalid learning event values';end if;
   if r.sequence=2 and not exists(select 1 from public.flashcard_attempts a where a.student_id=student and a.encounter_id=r.encounter_id and a.sequence=1 and a.earned_marks=0) then raise exception 'Invalid learning event values';end if;
   insert into public.flashcard_attempts select (r).*;
  end if;
  accepted:=accepted||jsonb_build_array(r.event_id);
 end loop;return accepted;
end;$$;
revoke all on function public.sync_flashcard_attempts(jsonb,uuid) from public,anon;
grant execute on function public.sync_flashcard_attempts(jsonb,uuid) to authenticated;
commit;
