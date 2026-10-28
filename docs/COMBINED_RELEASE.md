# Combined LabRats release — 28 October 2026

The user authorised publishing the combined Chemistry/Applied Science tool to
`main`. The reviewed application is commit `844977d`; this release retains its
300 ms card flip, coloured face labels, centred text and pastel assessment buttons.
The remote development branch was renamed from `LabRats-Online` to
`Combined-Drafts` and points to that same application commit. No separate Applied
Science repository is modified by this release.

## Student routes

- `index.html`: choose Applied Science or Chemistry.
- `chemistry.html`: Chemistry topic selection and Active Learning (236 questions).
- `applied-science.html`: Applied Science topic selection and Active Learning
  (110 Waves questions).
- `student-login.html`: optional account sign-in; guest practice remains available.
- `flashcards.html`: published flashcards for the selected subject and topics.
- `staff.html`: staff accounts, classes, subject grants, reports and pack management.

Both subject pages share accounts, but retain separate question banks, marking,
progress, adaptive guidance and class/subject permissions. Flashcard history is
separate from automatically marked question history. Existing compatible Chemistry
guest progress stays in the same browser; old Applied Science repository browser
progress is not transferred to the combined site.

## Hosted Supabase steps

Git publication does not apply migrations or change Supabase configuration.

1. If migrations 001–009 are already installed, open a new Supabase SQL Editor query
   and paste the complete `supabase/migrations/202610260010_flashcards.sql` file.
   Include `begin;` and `commit;` and run once. Do not append it to an earlier
   migration and do not rerun earlier schema migrations. If prerequisites are
   absent, follow `SUBJECT_HUB.md` to install only the missing migrations in order.
2. Verify the five new tables exist with the read-only SQL below. The topic count
   should be 24. No packs or student history are inserted by this migration.
3. In Staff dashboard, choose Chemistry, use **Use Organic names sample**, preview
   its 33 cards, save the private draft, then explicitly publish it. Applied Science
   needs a teacher-imported pack. Guests read published content; private history
   remains account- and class/subject-scoped.
4. If staff invitations, account creation or password resets fail from the hosted
   page, check the existing `staff-management` function's `STAFF_ALLOWED_ORIGINS`
   setting. It must include the site's exact origin (scheme plus hostname, with no
   repository path), e.g. `https://sceb2.github.io` for that GitHub Pages host.
   Keep `null` only if downloaded staff previews still need to work. Never use `*`.
   Migration 010 itself does not require Edge Function redeployment.

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('flashcard_topics', 'flashcard_packs', 'flashcard_cards',
                     'flashcard_pack_drafts', 'flashcard_attempts')
order by table_name;
select count(*) as flashcard_topics from public.flashcard_topics;
```

## Release verification

The exact application commit passed the build, 308 software checks, 41 Node tests,
7 flashcard unit/guest-browser checks, all 6 design checks, the 20-card mechanism
browser check and 80 disposable local Auth/backend/browser tests. One concurrent
design run timed out; its isolated rerun passed. Native Deno was unavailable for
that rerun; historical native-runtime results are recorded in `FLASHCARDS.md`.
No hosted project was used for those tests. Release-only changes are documentation.

After GitHub Pages publishes `main`, check the subject menu, guest practice in both
subjects, sign-in/sign-out, separate progress and teacher subject permissions on
the actual school device/browser. After applying 010 and publishing a pack, check
flashcard reveal/assessment and saving too. A failed flashcard load before those
Supabase steps does not mean GitHub has run the SQL.

GitHub Pages settings and deployment status could not be read through the available
GitHub API connection during this release. A successful Git push verifies source
publication, not that Pages is configured to deploy `main` from the repository root.
The public Pages URL also could not be fetched from this environment (network
403), so the deployed page could not be independently checked. Check Settings →
Pages if the old site persists.

Previous development-review documents are historical and contain statements that
`main` was unchanged. This release guide records the new publication decision;
privacy/retention limitations described there remain unresolved unless separately
addressed by the school. Nothing here changes the separate Applied Science site.
