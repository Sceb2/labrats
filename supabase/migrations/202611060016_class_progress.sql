-- Read-only cohort reporting. No new student data or learning-history writes.
begin;
create function public.class_progress_summary(
 target_class uuid, channel text, compatible_versions text[], scoring text
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 scope_subject text;
 actor_role text:=app_private.staff_role(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid);
 as_of timestamptz:=date_trunc('milliseconds',statement_timestamp());
 result jsonb;
begin
 if actor_role is null or actor_role not in ('admin','teacher') then
  raise exception 'Invited staff session required' using errcode='42501';end if;
 select c.subject_id into scope_subject from public.school_classes c where c.id=target_class;
 if scope_subject is null or (actor_role='teacher' and not exists(
  select 1 from public.class_teachers t join public.staff_subjects s on s.teacher_id=t.teacher_id
  where t.class_id=target_class and t.teacher_id=auth.uid() and s.subject_id=scope_subject
 )) then raise exception 'Class unavailable' using errcode='42501';end if;
 if channel is null or channel not in ('questions','flashcards')
  or compatible_versions is null or cardinality(compatible_versions) not between 1 and 32
  or scoring is null or length(scoring) not between 1 and 150 then
  raise exception 'Choose a learning channel and catalogue' using errcode='22023';end if;

 with roster as (
  select s.student_id from public.class_students s where s.class_id=target_class
 ), cards as (
  select c.question_id,c.front,p.topic_id from public.flashcard_cards c
  join public.flashcard_packs p on p.id=c.pack_id
  where channel='flashcards' and p.subject_id=scope_subject
   and p.status='published' and c.is_current
 ), raw as (
  select e.student_id,e.question_id,e.maximum_marks,e.encounter_id,e.event_id,
   e.sequence,date_trunc('milliseconds',e.attempted_at) as attempted_at,e.earned_marks
  from public.learning_attempts e join roster r on r.student_id=e.student_id
  where channel='questions' and e.subject_id=scope_subject
   and e.bank_version=any(compatible_versions) and e.scoring_version=scoring
   and e.kind='submit' and not e.is_retry and not e.answer_revealed
  union all
  select e.student_id,e.question_id,e.maximum_marks,e.encounter_id,e.event_id,
   e.sequence,date_trunc('milliseconds',e.attempted_at) as attempted_at,e.earned_marks
  from public.flashcard_attempts e join roster r on r.student_id=e.student_id
  join cards c on c.question_id=e.question_id
  where channel='flashcards' and e.subject_id=scope_subject
   and e.bank_version=any(compatible_versions) and e.scoring_version=scoring
   and e.kind='submit' and not e.is_retry and not e.answer_revealed
 ), unaided as (
  -- Match Adaptive.ratings: one valid unaided submission per encounter.
  select distinct on(student_id,question_id,maximum_marks,encounter_id)
   student_id,question_id,maximum_marks,encounter_id,event_id,sequence,
   attempted_at,least(attempted_at,as_of) as evidence_at,
   earned_marks::double precision/maximum_marks as fraction
  from raw where maximum_marks>0 and earned_marks between 0 and maximum_marks
   and attempted_at<=as_of+interval '5 minutes'
  order by student_id,question_id,maximum_marks,encounter_id,attempted_at,sequence,event_id
 ), daily as (
  select student_id,question_id,maximum_marks,
   floor(extract(epoch from evidence_at)/86400) as day,
   avg(fraction) as accuracy,max(evidence_at) as last_at,count(*) as attempts
  from unaided group by student_id,question_id,maximum_marks,day
 ), weighted as (
  select *,power(0.5::double precision,
   extract(epoch from (as_of-last_at))::double precision/(30*86400)) as weight
  from daily
 ), evidence as (
  select student_id,question_id,maximum_marks,
   sum(accuracy*weight)/nullif(sum(weight),0) as accuracy,
   count(*) as evidence_days,max(last_at) as last_at,sum(attempts) as attempts
  from weighted group by student_id,question_id,maximum_marks
 ), latest as (
  select distinct on(student_id,question_id,maximum_marks)
   student_id,question_id,maximum_marks,fraction
  from unaided
  order by student_id,question_id,maximum_marks,attempted_at desc,sequence desc,event_id desc
 )
 select jsonb_build_object(
  'class_id',target_class,'subject_id',scope_subject,'channel',channel,'as_of',as_of,
  'student_count',(select count(*) from roster),
  'cards',coalesce((select jsonb_agg(jsonb_build_object(
   'id',c.question_id,'title',c.front,'topic_id',c.topic_id) order by c.question_id) from cards c),'[]'::jsonb),
  'evidence',coalesce((select jsonb_agg(jsonb_build_object(
   'student_id',e.student_id,'question_id',e.question_id,'maximum_marks',e.maximum_marks,
   'accuracy',e.accuracy,'evidence_days',e.evidence_days,'last_at',e.last_at,
   'attempts',e.attempts,'latest_fraction',l.fraction
  ) order by e.student_id,e.question_id,e.maximum_marks)
  from evidence e join latest l using(student_id,question_id,maximum_marks)),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function public.class_progress_summary(uuid,text,text[],text) from public,anon;
grant execute on function public.class_progress_summary(uuid,text,text[],text) to authenticated;
comment on function public.class_progress_summary(uuid,text,text[],text) is
 'Read-only class-and-subject-scoped evidence; compact summaries, not raw attempt histories. Staff only.';
commit;
