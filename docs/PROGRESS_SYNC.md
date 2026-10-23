# Progress sync pilot

New signed-in attempts sync to the development Supabase project. Guest practice
remains available, and existing guest browser history is never imported or
assigned to an account automatically. The live Pages publishing branch must
remain unchanged until the hosted pilot is validated.

## New Supabase queries

The original account migration has already been applied. **Do not rerun it.**
In SQL Editor, use a new query for each of these files, in order:

1. `supabase/migrations/202610230002_progress_sync.sql`: learning tables, access
   policies, append-only upload RPC and 1/7/30-day activity-count RPC.
2. `supabase/migrations/202610230003_question_catalog.sql`: published question
   IDs, bank/scoring versions, maximum marks, topics and types. No answer keys.

Both are versioned, one-time migrations. Run the entire file, including its
transaction. They do not create accounts, change passwords, alter the question
bank, or import browser history. An error rolls back that file's transaction;
report the error without credentials. The website stays on its development
branch while these queries are applied and hosted tests are arranged.

## Data and security

`learning_attempts` contains the authenticated student UUID, a random event UUID,
a random encounter UUID and sequence, question/bank/scoring IDs, earned/maximum
marks, reveal/retry flags, practice mode, device-reported attempt time and
server receipt time. There are no selected-answer, raw-response or free-text
columns. The upload RPC rejects extra keys, invalid marks, unknown versions,
timestamps outside the account lifetime/far in the future, and conflicting
reuses of an event ID. The caller's user ID must match the queue's intended owner.

Only an active student with a live Auth session and a completed first password
change can upload or read their learning history. Students cannot update or
delete history directly or read another student's records. Assigned teachers
and administrators can read the students allowed by the existing class policies.
The public teacher bank editor is still not an account/reporting dashboard.

Scoring remains in the browser so selected answers are not sent or retained by
the learning API. These are **client-reported practice scores**, bounded by the
question catalogue, not tamper-proof exam results. Device-reported attempt times
are also not independently verified. Provider Auth/operational logs remain
separate from the application learning history and are part of DPO review.

## Offline and shared-device behaviour

The account's metadata history and pending uploads live in **sessionStorage for
that browser tab**, with an in-memory fallback when storage is unavailable.
Current answer inputs exist only in page memory in account mode. Session drafts,
response details, report text, completed-session snapshots and challenge bests
are not persisted or uploaded for accounts. Topic preferences and celebration
settings may be kept in the account's tab storage.

Practice can continue when the connection drops. The account bar shows waiting
attempts and a retry button; an online event and a 15-second retry/pull interval
resume syncing. Each event keeps its UUID across retries, including when the
server accepted an upload but the acknowledgement was lost. The server returns
acknowledged IDs; the client removes only those events from the queue.

Keep the tab open until attempts are saved: closing a tab, clearing its storage,
or browser/device failure can lose unsaved events. Navigation with pending work
shows the browser's unsaved-work warning. Sign-out specifically warns before
discarding pending events; cancel keeps the queue. Confirmed sign-out clears
account credentials and caches even if the server is unreachable. Guest local
history remains intact. Reauthentication with a different account clears the
previous account's cached learning data; queued events cannot be sent as the new
student because the RPC checks the expected owner against Auth.

Cross-device history is merged using event IDs, attempt times and per-encounter
sequence. Late offline uploads converge with existing history without replacing
events. The original first-attempt outcome stays separate from later retries and
the current outstanding-mistake state. Reveals alone never clear a mistake.
As with all offline ordering, incorrect device clocks can affect historical
ordering; the server rejects implausible times and keeps a separate receipt time.

Question-level marks, retry/reveal history and mistakes follow the account across
devices. Full session playback, unfinished answer drafts and challenge personal
bests remain local to the current page visit. Importing old browser history,
A–E scheduling, teacher-facing reports and automated retention/deletion are
separate milestones. Use fictional data until the school's retention policy and
production arrangements are configured.

## Developer checks and release

```sh
npm ci
npm run build
npm test
npm run test:auth-local
```

The local stack now applies all migrations, then runs Auth and learning API and
browser tests. It uses only disposable local accounts; it refuses a hosted URL.
Tests cover permissions, password/session gates, rejected extra fields,
idempotent retry, teacher scope, offline queues, separate browser contexts,
account switching, sign-out warnings and keeping guest history untouched.

`progress-sync.js` and the auth/pilot files are generated. Commit them with their
sources and lockfile. The release script fingerprints served code/data and
refreshes asset query strings and `CHEM_BUILD`/`version.json`, retaining actual
SHA-256 digests of the bank/assets/resources. This prevents old cached app code
from silently missing the new account-saving hooks.

The initial question catalogue was generated with
`node scripts/build-question-catalog.cjs`. Future bank changes need a **new**
catalogue migration retaining old versions; do not rewrite an applied migration.
### Downloadable hosted-backend check

After applying the two queries, download `student-progress-pilot.html` from the
development branch using GitHub's **Download raw file** button. Open it in a
normal Chrome/Edge window and sign in with a fictional student account. Choose
**Open progress test**, answer the single RC01 question, and wait for **All
progress saved to your account**. Sign out, sign back in and open the test again:
the first unaided mark and number of submissions must return from Supabase.
Opening the same download on another device with that login checks account sync
without sharing browser storage. Disconnecting the network after opening the
test checks the waiting queue; reconnect before signing out or closing the tab.

The download uses the real login, marking and sync modules, shares their memory
fallback, embeds public configuration and question data, and needs no neighbouring
files/server. Its only network requests are Auth/API calls to the configured
project. It stores real test results for RC01; use a fictional account only. It
does not deploy the full practice site. Managed cloud Chromium blocks `file:`;
automated checks serve the exact download over HTTP with real local Auth, and
also test blocked storage. Direct downloaded-file opening remains a manual check.

The hosted backend check and full signed-in practice on a development deployment
are required before publishing. Do not merge to the publishing branch as a way
to perform the first hosted test.
