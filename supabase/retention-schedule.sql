-- Run separately AFTER migration 015 and acceptance checks. Requires Supabase Cron.
-- This installs the schedule; enable the policy separately in the admin dashboard.
create extension if not exists pg_cron;
select cron.schedule('labrats-retention-weekly','0 3 * * 0',
 $$select public.run_retention_cleanup();$$);
-- 03:00 UTC each Sunday. Reusing the job name updates the existing schedule.
