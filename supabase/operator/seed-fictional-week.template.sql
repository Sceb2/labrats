-- Generated with scripts/build-fictional-week.cjs. OPERATOR-ONLY fictional fixture.
-- Run after reviewing/renaming accounts. No Auth users/passwords are created here.
begin;
create temporary table demo_questions(subject_id text,question_id text,bank_version text,scoring_version text,maximum_marks integer,topic text) on commit drop;
insert into demo_questions values
-- QUESTION_ROWS

do $checks$
begin
 if (select count(*) from public.account_profiles where role='student')<6 then raise exception 'Create at least six test students first (12 recommended), then run the rename script';end if;
 if exists(select 1 from public.account_profiles where role='student' and username !~ '^fictional-[a-z]{2,20}$') then raise exception 'Rename/review all student accounts first';end if;
 if exists(select 1 from demo_questions q left join public.learning_question_versions v
  on v.subject_id=q.subject_id and v.question_id=q.question_id and v.bank_version=q.bank_version and v.scoring_version=q.scoring_version
  where v.question_id is null or v.maximum_marks<>q.maximum_marks) then raise exception 'Current question catalogue migrations are missing';end if;
end;$checks$;
-- These deterministic class IDs also hold the fixture's original week anchor.
insert into public.school_classes(id,label,subject_id,created_at) values
(md5('labrats-fictional-chemistry-week')::uuid,'Fictional Chemistry — example week','chemistry',date_trunc('hour',now())-interval '6 days 12 hours'),
(md5('labrats-fictional-applied-week')::uuid,'Fictional Applied Science — example week','applied-science',date_trunc('hour',now())-interval '6 days 12 hours')
on conflict(id) do nothing;
insert into public.class_students(class_id,student_id)
 select c.id,p.user_id from public.school_classes c cross join public.account_profiles p
 where c.id in(md5('labrats-fictional-chemistry-week')::uuid,md5('labrats-fictional-applied-week')::uuid) and p.role='student'
on conflict do nothing;
create temporary table demo_students on commit drop as
 select user_id,username,((row_number() over(order by username))-1)%6 as persona
 from public.account_profiles where role='student';
create temporary table demo_events on commit drop as
with numbered as (select q.*,dense_rank() over(partition by subject_id order by topic) as topic_number,
 row_number() over(partition by subject_id,topic order by question_id) as question_number from demo_questions q),
 encounters as (
 select s.*,q.*,d.day,
  c.created_at+d.day*interval '1 day'+interval '10 hours'+q.question_number*interval '1 minute' as answered_at,
  md5('labrats-fictional-week/'||s.user_id||'/'||q.subject_id||'/'||q.question_id||'/'||d.day) as key
 from demo_students s cross join numbered q cross join generate_series(0,6) as d(day)
 join public.school_classes c on c.id=md5(case when q.subject_id='chemistry' then 'labrats-fictional-chemistry-week' else 'labrats-fictional-applied-week' end)::uuid
 where s.persona<>5 and q.question_number<=2
 and (s.persona in(0,1) and (q.topic_number<=3 or q.topic_number<=17 and (q.topic_number-4)%7=d.day) or s.persona=2 and d.day in(1,3,5) and q.topic_number<=2
   or s.persona=3 and d.day in(0,2,3,5,6) and (q.topic_number<=3 or q.topic_number<=17 and (q.topic_number-4)%7=d.day) or s.persona=4 and d.day=6 and q.topic_number<=3)
), marked as (
 select *,case when persona=0 then case when question_number=4 then greatest(0,maximum_marks-1) else maximum_marks end
 when persona=1 then case when day<2 then 0 when day<4 then maximum_marks/2 else maximum_marks end
 when persona=2 or persona=4 then maximum_marks
 else case when question_number%2=0 then maximum_marks/3 else 0 end end as earned
 from encounters where answered_at<=now()
)
select * from marked;
-- Initial unaided submissions; some struggling encounters start with a reveal.
insert into public.learning_attempts(student_id,event_id,encounter_id,sequence,question_id,bank_version,scoring_version,kind,earned_marks,maximum_marks,is_retry,answer_revealed,attempted_at,session_mode,subject_id)
 select user_id,md5(key||'/first')::uuid,md5(key)::uuid,1,question_id,bank_version,scoring_version,
 case when persona=3 and question_number=1 then 'reveal' else 'submit' end,
 case when persona=3 and question_number=1 then null else earned end,maximum_marks,false,
 persona=3 and question_number=1,answered_at,'practice',subject_id from demo_events
on conflict(student_id,event_id) do nothing;
-- Retries earn full marks but do not inflate unaided A–E evidence.
insert into public.learning_attempts(student_id,event_id,encounter_id,sequence,question_id,bank_version,scoring_version,kind,earned_marks,maximum_marks,is_retry,answer_revealed,attempted_at,session_mode,subject_id)
 select user_id,md5(key||'/retry')::uuid,md5(key)::uuid,2,question_id,bank_version,scoring_version,'submit',maximum_marks,maximum_marks,
 not(persona=3 and question_number=1),persona=3 and question_number=1,answered_at+interval '30 seconds','practice',subject_id
 from demo_events where persona in(1,3) and earned<maximum_marks and answered_at+interval '30 seconds'<=now()
on conflict(student_id,event_id) do nothing;
-- Use existing published teaching packs only: never publish demo content to guests.
with selected_packs as (select p.*,row_number() over(partition by subject_id order by id) as pack_number from public.flashcard_packs p where status='published'),
selected_cards as (select c.*,row_number() over(partition by pack_id order by card_id) as card_number from public.flashcard_cards c where is_current)
insert into public.flashcard_attempts(student_id,event_id,encounter_id,sequence,question_id,subject_id,bank_version,scoring_version,kind,earned_marks,maximum_marks,is_retry,answer_revealed,attempted_at,session_mode)
select s.user_id,md5('fictional-flash/'||s.user_id||'/'||c.question_id||'/'||d.day)::uuid,
 md5('fictional-flash-encounter/'||s.user_id||'/'||c.question_id||'/'||d.day)::uuid,1,c.question_id,p.subject_id,
 'flashcards-1','flashcards-1','submit',case when s.persona in(0,2,4) or s.persona=1 and d.day>=3 then 1 else 0 end,
 1,false,false,cl.created_at+d.day*interval '1 day'+interval '10 hours','practice'
from demo_students s cross join selected_packs p join selected_cards c on c.pack_id=p.id and c.is_current
 join public.school_classes cl on cl.id=md5(case when p.subject_id='chemistry' then 'labrats-fictional-chemistry-week' else 'labrats-fictional-applied-week' end)::uuid
 cross join generate_series(0,6) as d(day)
where p.pack_number<=2 and c.card_number<=4 and s.persona<>5 and (s.persona in(0,1,3) or s.persona=2 and d.day in(1,3,5) or s.persona=4 and d.day=6)
 and cl.created_at+d.day*interval '1 day'+interval '10 hours'<=now()
on conflict(student_id,event_id) do nothing;
select s.username,case s.persona when 0 then 'Regular practice; strong recall' when 1 then 'Regular practice; improving marks'
 when 2 then 'Selective practice in two topics' when 3 then 'Frequent practice; needs support; reveals/retries'
 when 4 then 'Single recent burst; limited spaced evidence' else 'No practice yet' end as fictional_scenario,
 count(e.key) as generated_encounters
from demo_students s left join demo_events e on e.user_id=s.user_id group by s.username,s.persona order by s.username;
select label,created_at::date as sample_week_start,(created_at+interval '6 days')::date as sample_week_end
from public.school_classes where id in(md5('labrats-fictional-chemistry-week')::uuid,md5('labrats-fictional-applied-week')::uuid);
commit;
