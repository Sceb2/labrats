-- Generated with scripts/build-fictional-week.cjs. OPERATOR-ONLY fictional fixture.
-- Run after reviewing/renaming accounts. No Auth users/passwords are created here.
begin;
create temporary table demo_questions(subject_id text,question_id text,bank_version text,scoring_version text,maximum_marks integer,topic text) on commit drop;
insert into demo_questions values
('chemistry','RC01','v7-236-questions-2026-10-24','2','2','basic'),
('chemistry','RC02','v7-236-questions-2026-10-24','2','2','basic'),
('chemistry','RC03','v7-236-questions-2026-10-24','2','1','basic'),
('chemistry','RC04','v7-236-questions-2026-10-24','2','2','basic'),
('chemistry','RC05','v7-236-questions-2026-10-24','2','1','basic'),
('chemistry','RC06','v7-236-questions-2026-10-24','2','2','basic'),
('applied-science','W01@2','applied-science-0.4.0','applied-1','1','WA02'),
('applied-science','W02@2','applied-science-0.4.0','applied-1','2','WA01'),
('applied-science','W03@1','applied-science-0.4.0','applied-1','4','WA02'),
('applied-science','W04@4','applied-science-0.4.0','applied-1','3','WA02'),
('applied-science','W05@2','applied-science-0.4.0','applied-1','3','WA07'),
('applied-science','W06@2','applied-science-0.4.0','applied-1','2','WA02'),
('applied-science','W07@1','applied-science-0.4.0','applied-1','4','WA02'),
('applied-science','W08@2','applied-science-0.4.0','applied-1','1','WA10'),
('applied-science','W09@1','applied-science-0.4.0','applied-1','3','WA10'),
('applied-science','W10@3','applied-science-0.4.0','applied-1','2','WA15'),
('applied-science','W11@1','applied-science-0.4.0','applied-1','3','WA13'),
('applied-science','W12@2','applied-science-0.4.0','applied-1','4','WA16'),
('applied-science','W13@2','applied-science-0.4.0','applied-1','2','WA02'),
('applied-science','W15@2','applied-science-0.4.0','applied-1','1','WA04'),
('applied-science','W16@2','applied-science-0.4.0','applied-1','1','WA01'),
('applied-science','W17@2','applied-science-0.4.0','applied-1','1','WA05'),
('applied-science','W18@2','applied-science-0.4.0','applied-1','1','WA05'),
('applied-science','W19@3','applied-science-0.4.0','applied-1','1','WA08'),
('applied-science','W20@3','applied-science-0.4.0','applied-1','1','WA08'),
('applied-science','W21@2','applied-science-0.4.0','applied-1','2','WA11'),
('applied-science','W22@2','applied-science-0.4.0','applied-1','2','WA15'),
('applied-science','W23@2','applied-science-0.4.0','applied-1','1','WA14'),
('applied-science','W25@2','applied-science-0.4.0','applied-1','4','WA01'),
('applied-science','W26@1','applied-science-0.4.0','applied-1','1','WA14'),
('applied-science','W27@1','applied-science-0.4.0','applied-1','3','WA10'),
('applied-science','W28@1','applied-science-0.4.0','applied-1','1','WA10'),
('applied-science','W29@1','applied-science-0.4.0','applied-1','1','WA01'),
('applied-science','W30@1','applied-science-0.4.0','applied-1','1','WA01'),
('applied-science','W31@2','applied-science-0.4.0','applied-1','2','WA01'),
('applied-science','W40@1','applied-science-0.4.0','applied-1','1','WA04'),
('applied-science','W43@1','applied-science-0.4.0','applied-1','2','WA05'),
('applied-science','W45@2','applied-science-0.4.0','applied-1','1','WA05'),
('applied-science','W47@1','applied-science-0.4.0','applied-1','1','WA06'),
('applied-science','W48@1','applied-science-0.4.0','applied-1','1','WA06'),
('applied-science','W50@1','applied-science-0.4.0','applied-1','3','WA05'),
('applied-science','W51@1','applied-science-0.4.0','applied-1','1','WA07'),
('applied-science','W52@1','applied-science-0.4.0','applied-1','1','WA07'),
('applied-science','W53@1','applied-science-0.4.0','applied-1','2','WA07'),
('applied-science','W54@2','applied-science-0.4.0','applied-1','3','WA07'),
('applied-science','W55@2','applied-science-0.4.0','applied-1','1','WA05'),
('applied-science','W57@2','applied-science-0.4.0','applied-1','3','WA08'),
('applied-science','W58@1','applied-science-0.4.0','applied-1','2','WA08'),
('applied-science','W59@2','applied-science-0.4.0','applied-1','2','WA08'),
('applied-science','W60@2','applied-science-0.4.0','applied-1','2','WA08'),
('applied-science','W61@1','applied-science-0.4.0','applied-1','3','WA04'),
('applied-science','W62@1','applied-science-0.4.0','applied-1','3','WA04'),
('applied-science','W63@1','applied-science-0.4.0','applied-1','2','WA10'),
('applied-science','W64@2','applied-science-0.4.0','applied-1','3','WA10'),
('applied-science','W65@1','applied-science-0.4.0','applied-1','1','WA11'),
('applied-science','W66@1','applied-science-0.4.0','applied-1','2','WA11'),
('applied-science','W67@1','applied-science-0.4.0','applied-1','2','WA12'),
('applied-science','W68@1','applied-science-0.4.0','applied-1','3','WA11'),
('applied-science','W69@1','applied-science-0.4.0','applied-1','2','WA13'),
('applied-science','W70@1','applied-science-0.4.0','applied-1','2','WA13'),
('applied-science','W71@1','applied-science-0.4.0','applied-1','3','WA13'),
('applied-science','W72@2','applied-science-0.4.0','applied-1','2','WA04'),
('applied-science','W73@1','applied-science-0.4.0','applied-1','1','WA15'),
('applied-science','W74@1','applied-science-0.4.0','applied-1','3','WA16'),
('applied-science','W75@1','applied-science-0.4.0','applied-1','3','WA16'),
('applied-science','W76@1','applied-science-0.4.0','applied-1','1','WA04'),
('applied-science','W89@1','applied-science-0.4.0','applied-1','2','WA06'),
('applied-science','W94@1','applied-science-0.4.0','applied-1','1','WA14'),
('applied-science','W95@1','applied-science-0.4.0','applied-1','1','WA14'),
('applied-science','W96@1','applied-science-0.4.0','applied-1','1','WA14'),
('applied-science','W97@1','applied-science-0.4.0','applied-1','1','WA14'),
('applied-science','W101@1','applied-science-0.4.0','applied-1','1','WA16'),
('applied-science','W102@1','applied-science-0.4.0','applied-1','1','WA16'),
('applied-science','W103@1','applied-science-0.4.0','applied-1','1','WA16'),
('applied-science','F01R@3','applied-science-0.4.0','applied-1','1','FO01'),
('applied-science','F01A@2','applied-science-0.4.0','applied-1','2','FO01'),
('applied-science','F01R2@3','applied-science-0.4.0','applied-1','1','FO01'),
('applied-science','F01R3@3','applied-science-0.4.0','applied-1','1','FO01'),
('applied-science','F01R4@2','applied-science-0.4.0','applied-1','1','FO01'),
('applied-science','F01R5@3','applied-science-0.4.0','applied-1','1','FO01'),
('applied-science','F02R@3','applied-science-0.4.0','applied-1','1','FO03'),
('applied-science','F02A@2','applied-science-0.4.0','applied-1','3','FO03'),
('applied-science','F02R2@3','applied-science-0.4.0','applied-1','1','FO03'),
('applied-science','F02R3@2','applied-science-0.4.0','applied-1','1','FO03'),
('applied-science','F02R4@3','applied-science-0.4.0','applied-1','1','FO03'),
('applied-science','F02A2@3','applied-science-0.4.0','applied-1','2','FO03'),
('applied-science','F03R@2','applied-science-0.4.0','applied-1','1','FO04'),
('applied-science','F03A@2','applied-science-0.4.0','applied-1','4','FO04'),
('applied-science','F03R2@3','applied-science-0.4.0','applied-1','1','FO04'),
('applied-science','F03R3@3','applied-science-0.4.0','applied-1','1','FO04'),
('applied-science','F03R4@2','applied-science-0.4.0','applied-1','1','FO04'),
('applied-science','F03R5@3','applied-science-0.4.0','applied-1','1','FO04'),
('applied-science','F04R@3','applied-science-0.4.0','applied-1','1','FO06'),
('applied-science','F04A@2','applied-science-0.4.0','applied-1','3','FO06'),
('applied-science','F04R2@2','applied-science-0.4.0','applied-1','1','FO06'),
('applied-science','F04R3@2','applied-science-0.4.0','applied-1','1','FO06'),
('applied-science','F04R4@2','applied-science-0.4.0','applied-1','1','FO06'),
('applied-science','F04A2@3','applied-science-0.4.0','applied-1','2','FO06'),
('applied-science','F05R@4','applied-science-0.4.0','applied-1','1','FO08'),
('applied-science','F05A@3','applied-science-0.4.0','applied-1','4','FO08'),
('applied-science','F05R2@3','applied-science-0.4.0','applied-1','1','FO08'),
('applied-science','F05R3@3','applied-science-0.4.0','applied-1','1','FO08'),
('applied-science','F05R4@4','applied-science-0.4.0','applied-1','1','FO08'),
('applied-science','F05A2@3','applied-science-0.4.0','applied-1','2','FO08'),
('applied-science','F06R@2','applied-science-0.4.0','applied-1','1','FO09'),
('applied-science','F06A@2','applied-science-0.4.0','applied-1','3','FO09'),
('applied-science','F06R2@2','applied-science-0.4.0','applied-1','1','FO09'),
('applied-science','F06R3@2','applied-science-0.4.0','applied-1','1','FO09'),
('applied-science','F06R4@4','applied-science-0.4.0','applied-1','1','FO09'),
('applied-science','F06A2@2','applied-science-0.4.0','applied-1','2','FO09'),
('applied-science','F07R@2','applied-science-0.4.0','applied-1','1','FO10'),
('applied-science','F07A@3','applied-science-0.4.0','applied-1','2','FO10'),
('applied-science','F07R2@2','applied-science-0.4.0','applied-1','1','FO10'),
('applied-science','F07R3@2','applied-science-0.4.0','applied-1','1','FO10'),
('applied-science','F07R4@2','applied-science-0.4.0','applied-1','1','FO10'),
('applied-science','F07A2@2','applied-science-0.4.0','applied-1','2','FO10'),
('applied-science','F08R@2','applied-science-0.4.0','applied-1','1','FO11'),
('applied-science','F08A@2','applied-science-0.4.0','applied-1','3','FO11'),
('applied-science','F08R2@2','applied-science-0.4.0','applied-1','1','FO11'),
('applied-science','F08R3@3','applied-science-0.4.0','applied-1','1','FO11'),
('applied-science','F08R4@2','applied-science-0.4.0','applied-1','1','FO11'),
('applied-science','F08A2@2','applied-science-0.4.0','applied-1','2','FO11'),
('applied-science','F09R@2','applied-science-0.4.0','applied-1','1','FO12'),
('applied-science','F09A@2','applied-science-0.4.0','applied-1','3','FO12'),
('applied-science','F09R2@2','applied-science-0.4.0','applied-1','1','FO12'),
('applied-science','F09R3@2','applied-science-0.4.0','applied-1','1','FO12'),
('applied-science','F09R4@2','applied-science-0.4.0','applied-1','1','FO12'),
('applied-science','F09A2@2','applied-science-0.4.0','applied-1','2','FO12'),
('applied-science','F10R@2','applied-science-0.4.0','applied-1','1','FO13'),
('applied-science','F10A@3','applied-science-0.4.0','applied-1','3','FO13'),
('applied-science','F10R2@2','applied-science-0.4.0','applied-1','1','FO13'),
('applied-science','F10R3@2','applied-science-0.4.0','applied-1','1','FO13'),
('applied-science','F10R4@3','applied-science-0.4.0','applied-1','1','FO13'),
('applied-science','F10A2@3','applied-science-0.4.0','applied-1','2','FO13'),
('applied-science','F11R@3','applied-science-0.4.0','applied-1','1','FO14'),
('applied-science','F11A@3','applied-science-0.4.0','applied-1','4','FO14'),
('applied-science','F11R2@2','applied-science-0.4.0','applied-1','1','FO14'),
('applied-science','F11R3@2','applied-science-0.4.0','applied-1','1','FO14'),
('applied-science','F11R4@3','applied-science-0.4.0','applied-1','1','FO14'),
('applied-science','F11R5@3','applied-science-0.4.0','applied-1','1','FO14'),
('applied-science','F12R@2','applied-science-0.4.0','applied-1','1','FO16'),
('applied-science','F12A@3','applied-science-0.4.0','applied-1','3','FO16'),
('applied-science','F12R2@2','applied-science-0.4.0','applied-1','1','FO16'),
('applied-science','F12R3@2','applied-science-0.4.0','applied-1','1','FO16'),
('applied-science','F12R4@2','applied-science-0.4.0','applied-1','1','FO16'),
('applied-science','F12A2@2','applied-science-0.4.0','applied-1','2','FO16'),
('applied-science','F13R@2','applied-science-0.4.0','applied-1','1','FO17'),
('applied-science','F13A@2','applied-science-0.4.0','applied-1','4','FO17'),
('applied-science','F13R2@3','applied-science-0.4.0','applied-1','1','FO17'),
('applied-science','F13R3@3','applied-science-0.4.0','applied-1','1','FO17'),
('applied-science','F13R4@3','applied-science-0.4.0','applied-1','1','FO17'),
('applied-science','F13A2@2','applied-science-0.4.0','applied-1','2','FO17'),
('applied-science','E009@2','applied-science-0.4.0','applied-1','2','EL01'),
('applied-science','E010@3','applied-science-0.4.0','applied-1','2','EL01'),
('applied-science','E015@1','applied-science-0.4.0','applied-1','1','EL01'),
('applied-science','E016@2','applied-science-0.4.0','applied-1','1','EL01'),
('applied-science','E018@1','applied-science-0.4.0','applied-1','1','EL01'),
('applied-science','E024@2','applied-science-0.4.0','applied-1','1','EL01'),
('applied-science','E001@1','applied-science-0.4.0','applied-1','3','EL11'),
('applied-science','E002@1','applied-science-0.4.0','applied-1','3','EL11'),
('applied-science','E003@1','applied-science-0.4.0','applied-1','1','EL11'),
('applied-science','E005@1','applied-science-0.4.0','applied-1','1','EL11'),
('applied-science','E006@1','applied-science-0.4.0','applied-1','1','EL11'),
('applied-science','E007@1','applied-science-0.4.0','applied-1','1','EL11'),
('applied-science','E011@2','applied-science-0.4.0','applied-1','1','EL02'),
('applied-science','E012@2','applied-science-0.4.0','applied-1','2','EL02'),
('applied-science','E023@2','applied-science-0.4.0','applied-1','1','EL02'),
('applied-science','E029@3','applied-science-0.4.0','applied-1','1','EL02'),
('applied-science','E030@3','applied-science-0.4.0','applied-1','1','EL02'),
('applied-science','E031@3','applied-science-0.4.0','applied-1','1','EL02'),
('applied-science','E017@1','applied-science-0.4.0','applied-1','1','EL03'),
('applied-science','E034@1','applied-science-0.4.0','applied-1','1','EL03'),
('applied-science','E039@1','applied-science-0.4.0','applied-1','1','EL03'),
('applied-science','E040@1','applied-science-0.4.0','applied-1','1','EL03'),
('applied-science','E041@1','applied-science-0.4.0','applied-1','1','EL03'),
('applied-science','E042@1','applied-science-0.4.0','applied-1','1','EL03'),
('applied-science','E014@1','applied-science-0.4.0','applied-1','1','EL05'),
('applied-science','E052@2','applied-science-0.4.0','applied-1','1','EL05'),
('applied-science','E055@1','applied-science-0.4.0','applied-1','2','EL05'),
('applied-science','E056@1','applied-science-0.4.0','applied-1','1','EL05'),
('applied-science','E013@1','applied-science-0.4.0','applied-1','1','EL06'),
('applied-science','E051@1','applied-science-0.4.0','applied-1','1','EL06'),
('applied-science','E053@1','applied-science-0.4.0','applied-1','1','EL06'),
('applied-science','E054@1','applied-science-0.4.0','applied-1','1','EL06'),
('applied-science','E059@2','applied-science-0.4.0','applied-1','1','EL06'),
('applied-science','E060@1','applied-science-0.4.0','applied-1','1','EL06'),
('applied-science','E004@1','applied-science-0.4.0','applied-1','1','EL08'),
('applied-science','E068@1','applied-science-0.4.0','applied-1','1','EL08'),
('applied-science','E069@1','applied-science-0.4.0','applied-1','1','EL08'),
('applied-science','E070@1','applied-science-0.4.0','applied-1','1','EL08'),
('applied-science','E071@1','applied-science-0.4.0','applied-1','1','EL08'),
('applied-science','E072@1','applied-science-0.4.0','applied-1','1','EL08'),
('applied-science','E020@1','applied-science-0.4.0','applied-1','1','EL12'),
('applied-science','E021@1','applied-science-0.4.0','applied-1','2','EL12'),
('applied-science','E022@1','applied-science-0.4.0','applied-1','1','EL12'),
('applied-science','E102@2','applied-science-0.4.0','applied-1','1','EL12'),
('applied-science','E105@2','applied-science-0.4.0','applied-1','1','EL12'),
('applied-science','E106@1','applied-science-0.4.0','applied-1','1','EL12'),
('applied-science','E019@1','applied-science-0.4.0','applied-1','2','EL13'),
('applied-science','E090@1','applied-science-0.4.0','applied-1','1','EL13'),
('applied-science','E091@1','applied-science-0.4.0','applied-1','1','EL13'),
('applied-science','E092@2','applied-science-0.4.0','applied-1','1','EL13'),
('applied-science','E093@1','applied-science-0.4.0','applied-1','1','EL13'),
('applied-science','E094@1','applied-science-0.4.0','applied-1','1','EL13'),
('applied-science','E099@2','applied-science-0.4.0','applied-1','1','EL15'),
('applied-science','E100@2','applied-science-0.4.0','applied-1','1','EL15'),
('applied-science','E101@1','applied-science-0.4.0','applied-1','1','EL15'),
('applied-science','E103@2','applied-science-0.4.0','applied-1','3','EL15'),
('applied-science','E104@2','applied-science-0.4.0','applied-1','2','EL15'),
('applied-science','E117@3','applied-science-0.4.0','applied-1','2','EL15');

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
