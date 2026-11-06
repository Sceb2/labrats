# Real-student launch preparation — development

Work in `Combined-Drafts`; do not issue real accounts yet. The hosted database is
shared by any site configured to use it: these SQL writes are not isolated by a
Git branch. Preparing these files has not changed hosted Supabase or main.

## Confirmed decisions, 6 November 2026

- Student retention remains **two calendar years from first successful login**,
  with weekly completion within seven days; unused accounts are scheduled after
  90 days from creation. No retention migration or clock reset is needed.
- Preserve an explicitly chosen guest session through learning-mode and subject
  changes. Signing in deliberately enables account progress again. Question
  guest history stays local; guest flashcard history stays in page memory.
- Student recovery is in person: **Mr Wormstone**, not an email-password flow.
- School contact: **sceb2@crispins.co.uk**. Cleanup alerts stay in the admin
  dashboard for now; email configuration is deferred.
- Keep two fictional students, each in its own subject's test class. Remove the
  other explicitly reviewed fictional students and test classes before launch.
- The school approved `docs/STUDENT_PRIVACY_NOTICE.md`. It is generated as
  `privacy.html` with links on student sign-in and subject choice in development.
  Publishing these development changes to main remains a launch task. The signed
  DPIA should use the same first-login retention rule.

## Two test students and classes — operator steps

These replace the previous full fictional-class demonstration. **Do not rerun
the old fictional-week seed or all-student rename after this cleanup.**

1. If fewer than two fictional students exist, generate replacements through the
   connected administrator dashboard. Keep their passwords privately. Choose
   one account to retain for each subject; do not select a staff account.
2. Sign out student test browsers and pause account creation/reset work.
3. Run all of `supabase/operator/launch-test-accounts-plan.sql` in SQL Editor. It
   is read-only. Review the student and class lists: every row must be fictional
   test data. If real data appears, stop; do not use this all-test cleanup.
4. Open a new query with all of `supabase/operator/launch-test-accounts.sql`.
   Copy the plan's `reviewed_sql` statements into the marked area. In exactly
   one student INSERT change `delete` to `keep_chemistry`; in another change it
   to `keep_applied`. Leave only the other confirmed fictional students as
   `delete`. Include the reviewed INSERT for every test class. Never commit
   your filled-in manifest, account UUIDs or credentials to GitHub.
5. Check the two keeper rows, then run the whole query including begin/commit.
   Missing, changed or unreviewed rows cause a rollback. This is a one-off,
   destructive operation; it is **not** a new schema migration.
6. Expect exactly these two rows/classes:

   | Student username | Class | Subject |
   | --- | --- | --- |
   | fictional-chemistry | TEST CLASS — Chemistry | Chemistry |
   | fictional-applied | TEST CLASS — Applied Science | Applied Science |

   Passwords, retained history and retention dates are unchanged. Old usernames
   stop working; sessions are revoked. Reset forgotten passwords using normal
   staff controls. No preset/shared test password is added to the repository.
7. In the connected dashboard, check each subject separately and sign in as each
   fictional student. Check the mandatory-password-change flow if applicable.
   Assign teachers to the two new classes and relevant subjects if needed using
   normal administrator controls. Student accounts can still choose either
   subject; their test-class memberships are separate, not subject login locks.

Staff accounts, subject grants, published/draft teaching packs and retained
students' results are preserved. Old class memberships and teacher assignments
to deleted test classes are removed. Historical retention-exclusion flags are
preserved; this cleanup does not enrol accounts in retention or enable deletion.

## Supabase updates now — replacing the earlier 12-student demonstration

The operator previously confirmed migrations 013–015 and the Sunday Cron job
were installed. Do not rerun them. The guest fix, privacy notice and dashboard
alerts require **no new SQL migration, API keys or Edge Function deployment**.

Do not create 12 students, run the old all-student rename, or seed the fictional
week. Use the two-account review/cleanup steps above instead. In SQL Editor,
run the plan's student SELECT and class SELECT separately and keep both results;
some editors show only the last result if both are submitted at once. If at least
two students already exist, no additional test accounts need to be created.

After cleanup and checking both logins on connected development, check the
installed Sunday schedule. Enable retention in **Retention & health** only after
the reviewed account cleanup and schedule checks. This enables real deletion of
managed expired accounts. Verify the first successful run; the operator can run
`select public.run_retention_cleanup();` for that acceptance check when ready.

## Cleanup alerts — dashboard now, email later

School overview and Retention & health display failed, missing or overdue cleanup
runs, the disabled setup state, deletion/failure counts and recent run history.
Status loads on opening/refreshing the dashboard. Check it after each Sunday
run; there is no notification while the dashboard is closed. An unavailable
status check is reported rather than treated as success.

Leave `LABRATS_RETENTION_MONITOR_ENABLED` unset/false and do not configure webhook
or service-key secrets for email monitoring now. The optional external monitor
remains available for a later school-owned email setup. No email/webhook or
hosted retention-enable setting has been changed by this work. Database
backup/restore planning remains separate from student password recovery.

## Verification of these development changes

On 6 November 2026, `npm run build`, `npm test` (308 software checks and 55
unit tests), and the complete `npm run test:auth-local` suite passed. The latter
used disposable PostgreSQL, Supabase Auth, PostgREST and Chromium, not hosted
Supabase. It verified a valid student session can choose guest practice, switch
learning modes and subjects without account attempt uploads, and deliberately
return to account practice afterwards. Existing offline-sync, password-change,
account-switching, reporting and retention integration checks also passed.

The new operator cleanup test verified missing/stale inventories and non-student
targets are rejected; an error after deletion rolls the transaction back;
the two retained passwords, dates and history survive; staff/content survive;
the two new usernames can sign in; and ordinary student-identity protection is
restored. The same operator test passed on its own as well. No native Deno
runtime or hosted configuration was validated in this pass. Those original checks preceded the dashboard-only alert decision. Main
publication, enabling/checking hosted retention and the hosted test cleanup remain
operator launch actions; email alerts are deferred.

The approved notice is now generated from `docs/STUDENT_PRIVACY_NOTICE.md` into
`privacy.html`, with links on subject choice and student sign-in. Standalone
downloads embed the same notice. It is available on development; main remains
unchanged. Desktop/mobile browser checks passed at 320, 390 and 1280 pixels,
including guest-mode preservation and reading the notice without sign-in.
Dashboard checks at 390 and 1440 pixels verified failed, missing, stale,
healthy and unavailable states, in addition to the existing staff workflow.
`npm test` passed 308 software checks and 56 unit tests. No SQL migration,
Edge Function update, hosted cleanup or email setup accompanies these UI changes.
The complete disposable `npm run test:auth-local` suite also passed after these
changes; hosted Supabase, native Deno and the actual hosted Cron job were not tested.
