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
- School contact and proposed cleanup-alert recipient: **sceb2@crispins.co.uk**.
- Keep two fictional students, each in its own subject's test class. Remove the
  other explicitly reviewed fictional students and test classes before launch.
- Review and publish the short student privacy notice before real accounts are
  distributed. Draft: `docs/STUDENT_PRIVACY_NOTICE_DRAFT.md`. Publication is still
  an outstanding launch task; the signed DPIA should use the same retention rule.

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

## Cleanup alerts — proposal only, not configured by this work

Use the school's IT-managed Power Automate flow or equivalent HTTPS receiver to
send an email to sceb2@crispins.co.uk (plus an approved backup recipient). Keep
the monitor outside Supabase so it can detect a stopped database scheduler.

The existing monitor checks daily for failed or missing cleanup runs, cleanup
being disabled and a last successful run more than eight days old. It sends
status/timestamps/counts, not student details. The receiver must accept its JSON
payload (`title`, `reason`, `checked_at`, `last_finished_at`, `failures`).

Before configuration, agree the school-managed receiver, its access controls,
owner and backup recipient with IT. The supplied GitHub monitor currently uses
a broad server-only Supabase credential: ask IT to approve that credential
placement or choose a narrower monitoring design before enabling it. Put any
approved credentials and endpoint only in private GitHub Actions secrets, never
in chat, browser code or committed files. Scheduled Actions require the workflow
on the default branch. Trigger a controlled failure, check delivery, then a
successful recovery; enable the monitor and retention only after those checks
and the reviewed test cleanup. GitHub schedules are best-effort: IT must also
know how to notice a monitor that itself stops running.

No alert provider, webhook, secret, repository variable or retention-enable
setting has been changed here. Database backup/restore planning is a separate
launch task from student password recovery.

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
runtime or hosted configuration was validated in this pass. Alerts, privacy
publication, and the hosted cleanup remain operator launch actions.
