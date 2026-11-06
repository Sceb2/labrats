-- READ ONLY. Run before launch-test-accounts.sql, before issuing real accounts.
-- Review EVERY row privately. Choose one student for each subject; mark all
-- other confirmed fictional students delete. These statements are not run here.
select p.user_id,p.username,p.active,p.first_login_at,
 (select count(*) from public.learning_attempts a where a.student_id=p.user_id) as question_events,
 (select count(*) from public.flashcard_attempts a where a.student_id=p.user_id) as flashcard_events,
 format('insert into reviewed_students values (%L,%L,%L);',p.user_id,p.username,'delete') as reviewed_sql
from public.account_profiles p where p.role='student' order by p.created_at,p.user_id;

-- Confirm these are test classes before copying their reviewed_sql statements.
select c.id,c.label,c.subject_id,
 (select count(*) from public.class_students s where s.class_id=c.id) as students,
 (select count(*) from public.class_teachers t where t.class_id=c.id) as teachers,
 format('insert into reviewed_classes values (%L,%L,%L);',c.id,c.label,c.subject_id) as reviewed_sql
from public.school_classes c order by c.subject_id,c.label,c.id;
