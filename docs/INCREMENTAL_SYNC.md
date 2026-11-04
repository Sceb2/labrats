# Incremental account history — 4 November 2026

Development-only follow-up to review item 7. No hosted configuration or main
branch changes are part of this work.

## Behaviour

- A new tab/cache loads the complete student/subject/channel history in pages of
  500. Existing ratings, first-attempt rules and teacher reports are unchanged.
- A saved page stores its merged metadata history and a versioned
  `(received_at, event_id)` checkpoint together in one cache entry. Subsequent
  checks, including reloads in the same tab, request only newer receipts.
- Active Learning and flashcards use separate checkpoints in their existing
  account/host/subject-scoped tab caches. Clearing history also clears its
  checkpoint. Missing or invalid checkpoints cause a safe initial download.
- A lost page request resumes after the last successfully stored page. A failed
  cache write cannot advance the checkpoint. The existing atomic in-memory
  storage fallback also works when sessionStorage is blocked; a new page that
  loses that memory starts from history again.
- Offline answers use server receipt time when eventually uploaded, regardless
  of their original attempt time. Duplicate uploads remain idempotent. Upload
  acknowledgements never move the history checkpoint: another device may have
  saved unseen events earlier. Draining another channel's upload queue preserves
  that channel's existing checkpoint, without advancing it.
- Sign-out/account checks and RLS remain in effect. A download finishing after
  sign-out cannot commit history. Check frequency remains 15 seconds.

This reduces history-response payloads; account verification and empty history
requests still use bandwidth and database work. Initial downloads, a fresh tab,
and local history projections still grow with the full history. This change does
not implement retention/deletion or reduced background polling.

## Database prerequisite

Apply `supabase/migrations/202611040014_incremental_history_receipts.sql` after
001–013 **before deploying these clients**. Use a new SQL Editor query and run
the whole file, including `begin;` and `commit;`. It is a one-time migration;
do not rerun it after success. Expected output: success, no rows returned.

It adds the `(student_id, subject_id, received_at, event_id)` index to
`learning_attempts`; the flashcard table already has an equivalent index. It
adds insert triggers sharing the upload RPCs' existing per-student advisory
locks. Under those locks the receipt is the later of the actual server clock
and the preceding receipt plus one microsecond. The read therefore cannot skip
an older transaction that waited and committed later, nor a clock adjustment.
Existing rows and their timestamps, marks, permissions and RPC contracts are
unchanged. The migration takes normal index/trigger creation locks, so schedule
it outside active student sessions. No Edge Function redeployment is needed.

The client keeps full timestamp precision and uses UUIDs to break ties in legacy
receipts. Both index queries and filters are scoped to student and subject.

Rolling the browser code back is safe: previous clients still read complete
histories, use the same upload RPCs and work with the new receipt triggers. A
later incremental client will bootstrap if an old client removed its checkpoint.
Do not remove receipt triggers while incremental clients remain active.

## Verification

The maintained `npm test` suite includes `tests/sync-history-unit.cjs`:
pagination, idle polls, microsecond/timestamp ties, interrupted pages, late offline
answers, upload acknowledgements, failed persistence, malformed/old caches,
unchanged progress/ratings and an in-flight response after sign-out.

`npm run test:auth-local` includes `tests/sync-history-integration.cjs` against
disposable PostgreSQL, Supabase Auth and PostgREST. It exercises 1,201 rows,
legacy tied timestamps, older attempt times, duplicate uploads, old transactions,
concurrent uploads, subject/account isolation and separate flashcard history.
The existing browser suite additionally checks empty incremental polls, reloads,
new-device results, offline/rejected queues, shared browsers, teacher reports,
reset/logout and the blocked-storage fallback.

A local measured fixture downloaded about 598 KB of JSON history bodies for
1,201 attempts, then 2 bytes (`[]`) on an unchanged poll. New-receipt checks
returned only the newly saved rows. These figures exclude HTTP headers, account
checks and other traffic and are not a forecast of a hosted bill.

No hosted tests or native Deno runtime checks are claimed by these local checks.

Passed on the final implementation: `npm run build`, `npm test` (308 software
checks and 51 Node tests), `git diff --check`, and the complete
`npm run test:auth-local` suite. The subsequently added concurrent-upload
regression also passed in a fresh disposable run of the history integration
file (8 tests including its parent suite). No temporary test runner is retained.
