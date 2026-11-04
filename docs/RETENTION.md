# Account retention — development implementation

Agreed 4 November 2026. Not activated on hosted Supabase by this change.
Main and existing accounts are unchanged. This document describes the application
policy; the school/DPO must approve its operation and provider arrangements.

## Rules

- Students: two **calendar years** from the first successful Auth login, in UTC.
  That timestamp is set once; password changes/resets and later logins do not
  restart it. A 29 February start expires on 28 February two years later.
- Never-used students: 90 days from creation. Both student deadlines are due
  dates; the Sunday weekly cleanup completes deletion within seven further days
  under normal operation. No student advance-warning UI is included.
- Administrators can extend a managed student's expiry with an explicit later,
  finite date and a reason (1–500 characters). Avoid sensitive information in
  reasons. Earlier student deletion remains available with exact username
  confirmation in the existing account controls.
- A new account is enrolled automatically. Historical accounts present when
  migration 015 is applied are **not enrolled or deleted automatically**. There
  is deliberately no bulk enrolment or guessed first-login date. Review/test
  accounts must be identified and removed by an authorised administrator before
  rollout. Migrate genuine historical users only after agreeing their baseline.
- Staff: use **Staff leaving** in Account retention. Choose another account,
  an active administrator responsible for handover, a reason and confirmation
  that external project/recovery responsibilities were transferred. Pack ownership
  transfers to that administrator, access/sessions are revoked immediately, and
  deletion becomes due after 23 days for weekly completion within 30 days.
  The current administrator cannot retire themselves. Ordinary Disable is still
  temporary suspension and does not schedule deletion. Departed accounts cannot
  be reactivated through account controls or a password reset.
- New teacher invitations have a seven-day maximum acceptance window; the
  Supabase recovery code may expire sooner according to Auth settings. Password
  choice completes acceptance. After expiry, an administrator must delete the
  abandoned account and issue a fresh invitation, rather than reset it to evade
  the deadline. Abandoned account deletion is due after 23 days, completed within
  30. Previously invited accounts are excluded from this new deadline.
- Administrative audit and cleanup records are removed after 12 calendar months
  by the weekly run (up to seven days later). Deleting an account clears audit
  target references. Minimal staff actor UUIDs remain in audit records for that
  period without an FK back to an account. Extension/departure records disappear
  with their account. Teaching content survives staff deletion after handover.

Deletion removes the Auth user (including Auth sessions), account profile,
class/subject memberships and both question and flashcard attempts through
foreign-key cascades. It does not delete shared teaching material or classes.
Active staff accounts are not subject to a two-year clock. Useful teaching packs
must be transferred, not destroyed because their author leaves.

## Hosted installation — separate operator steps

1. Apply migrations through 014, then run the complete
   `supabase/migrations/202611040015_account_retention.sql` in a **new SQL Editor
   query**, including begin/commit. It is one-time, transactional, and starts with
   cleanup disabled. Do not rerun earlier migrations. No Edge Function redeploy
   is required; the existing Auth database trigger enforces invitation deadlines.
2. Review the existing account list. Agree who owns Supabase/GitHub, recovery
   access, incidents, backups and the username mapping. Confirm which historical
   fictional accounts may be deleted; the migration does not choose them.
3. Enable Supabase Cron if necessary. Run `supabase/retention-schedule.sql` using
   an authorised operator connection. It installs/updates the named weekly job
   at **03:00 UTC each Sunday**. Inspect it in Supabase Cron and its run history.
   This step has not been executed against a hosted project. The local disposable
   PostgreSQL image lacks pg_cron; tests invoke the same cleanup function directly.
4. Deploy development and check **Account retention** in the admin dashboard.
   After reviewing the policy and confirming the schedule exists, tick the
   readiness box and enable the policy. This enables real deletion of **managed**
   expired accounts; it is not a preview. No execution occurs just from opening
   the dashboard. An authorised operator can explicitly run
   `select public.run_retention_cleanup();` for an acceptance check when ready.
5. Verify the job's first success and monitor overdue counts. Failures and
   skipped/locked accounts remain as backlog, mark the run failed and must be
   investigated/retried promptly; do not simply wait another week. Transactional
   retries do not delete twice. The last active administrator and untransferred
   teaching packs are protected; blocked cleanup is reported rather than hidden.

The job records only UUID run ID, times, status and aggregate deletion/failure
counts. Students and teachers cannot invoke the worker or read its logs. Admins
can see status and counts; only the server/operator/Cron can run cleanup. A job
that aborts before committing may have no log; stale/missing-run monitoring is
therefore necessary. Normal deadlines assume the database and scheduler operate;
alerts and manual recovery are needed when they do not.

## Failure alerts (inactive until configured)

`src/retention-monitor.cjs` / `scripts/check-retention.cjs` independently detect
missing runs, a policy unexpectedly disabled, runs over eight days old, failed
runs and inability to read status. Tests use fake endpoints; no real alerts were
sent. The admin dashboard also shows status, backlog and stale-run guidance.

An optional `.github/workflows/retention-monitor.yml` checks daily at 09:00 UTC,
with manual dispatch available. It is gated off unless the repository variable
`LABRATS_RETENTION_MONITOR_ENABLED` is `true`. GitHub schedules operate on the
**default branch**, so this development-only addition is not scheduled yet.
Use a protected repository/environment and have IT review this additional
server-side credential placement before activation:

- GitHub Actions secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
  `RETENTION_ALERT_WEBHOOK_URL`. Never paste these into chat or public code.
- The webhook must be an approved HTTPS school automation endpoint (for example,
  an IT-managed flow) that sends to the nominated mailbox and backup contact.
  The app does not assume an email supplier or create a mailbox subscription.
- Alerts contain only reason, check time, last completion time and failure count.
  No student/staff details or Supabase credentials are sent to the webhook.
- Without the webhook, an unhealthy check exits unsuccessfully but **no school
  email delivery is guaranteed**. GitHub failure notices are supplementary.
  Configure school delivery before describing alerts as active.
- Verify a test alert, GitHub scheduling availability/permissions and recipients.
  GitHub may delay/disable scheduled workflows; review provider behaviour and
  monitor the monitor. A school-controlled external scheduler may run the same
  script instead. Deletion itself still runs in Supabase Cron.

## Outside the application

Provider logs/backups, school identity mappings, downloads/credential exports,
email reports, copied screenshots and previously downloaded data require their
own retention procedures. Delete temporary credential exports after secure
handover. Sign-out clears the current tab cache; remote deletion cannot recall
an offline browser immediately. After restoring a database backup, restore the
scheduler and rerun due deletions before reopening student access.

## Verification

`tests/retention-integration.cjs` is included in `npm run test:auth-local` and
uses only disposable services. It covers policy/worker permissions, first login,
calendar expiry, unused accounts, extension validation, legacy exclusions,
complete deletion, staff handover/revocation, invitation expiry, failure logging
and safe retries. Staff browser tests cover extension and retirement forms.
`tests/retention-unit.cjs` checks health detection and minimal alert payloads;
no hosted deletion, hosted schedule or real notification is claimed as tested.

Final local checks passed: `npm run build`, `npm test` (308 software checks plus
54 Node tests), the complete `npm run test:auth-local` suite, and
`git diff --check`. The added retirement/extension browser checks passed. The
one-page DPO PDF was rendered and checked as one A4 page. The first cleanup runs
caught SQL ambiguities and a browser test-ordering error; those were corrected
before the successful final suite. Native Deno execution, pg_cron execution,
GitHub scheduling and school alert delivery were not exercised here.
