# Review follow-up — 3 November 2026

Scope: requested fixes 2, 6 and 8. Development branch `Combined-Drafts` only;
no hosted Supabase changes, main update or sync redesign in this pass.

## Changes

- Chemistry question-browser previews preserve the suspended practice session
  instead of finishing it. Returning to topics, opening another preview and
  reloading retain the original draft, inputs, option ordering and marked
  feedback. Starting a genuinely new session keeps the existing replacement
  behaviour. Preview marking and guest progress rules otherwise remain unchanged.
- Applied Science flashcard imports now recognise the 13 selectable Forces
  groups and 10 selectable Electricity groups. Each group uses its first lesson
  ID, matching the existing selection/navigation grouping. Existing Waves and
  Chemistry registrations are unchanged. No packs or question content were added.
- The full account integration suite now finds celebration settings inside the
  combined Practice Settings disclosure. No assertions or workflows were removed.

## Supabase step

After migrations 001–012, run the complete contents of
`supabase/migrations/202611030013_forces_electricity_flashcard_topics.sql`
in a new SQL Editor query. The additive, transactional migration updates only
`flashcard_topics`; it preserves existing accounts, packs and history and can
be rerun. No Edge Function redeployment or new secrets are required.

Teachers still need Applied Science permission and must import/publish a pack
before students will receive cards for these topics.

## Verification

Passed:

- `npm run build` and `git diff --check`.
- `npm test`: 308 software checks plus 44 Node tests.
- `npm run test:practice-preview`: new Chemistry regression at mobile/desktop
  widths, including marking a preview and restoring an already marked session.
- `npm run test:settings`, `npm run test:design`, `npm run test:flashcards`.
- `npm run test:auth-local`: complete disposable PostgreSQL/Auth/PostgREST and
  browser suite. All migrations, including 013, applied locally. Each of the
  23 new topics was imported and published by an authorised teacher; publication
  content was readable anonymously and imports by an unauthorised teacher failed.

The initial restricted unit run could not complete its subprocess-based build
checks; the complete suite passed with those local process permissions enabled.
No hosted configuration was verified. Native Deno execution was not run; the
local account suite exercised its existing Node service adapter instead.

## Deferred

Per the request: guest-mode navigation, Module 6 bulk selection, rapid staff
subject switching and differentiation of written self-assessment in totals.

Sync still downloads full subject histories on each periodic check. A future
change should load history initially, then fetch only newer receipts using a
stable `(received_at, event_id)` cursor and an appropriate index scoped to the
student and subject. Receipt time matters: an old attempt uploaded after offline
practice must not be missed. Advance the cursor only after safely merging and
persisting a complete page; preserve duplicate handling, queue acknowledgements,
account isolation and reconnect recovery. Backing off idle/background polling can
reduce traffic further. This needs dedicated pagination, offline and concurrent
upload tests; it has deliberately not been implemented here.
