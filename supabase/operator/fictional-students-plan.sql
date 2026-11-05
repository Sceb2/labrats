-- READ ONLY. Review all student accounts before running the rename script.
select p.user_id,p.username,p.active,p.must_change_password,
 (select count(*) from public.learning_attempts a where a.student_id=p.user_id) as question_events,
 (select count(*) from public.flashcard_attempts a where a.student_id=p.user_id) as flashcard_events
from public.account_profiles p where p.role='student' order by p.created_at,p.user_id;
