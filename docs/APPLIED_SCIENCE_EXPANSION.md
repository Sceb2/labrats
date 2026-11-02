# Publishing Forces and Electricity

The approved question banks add 124 Forces and 120 Electricity/Energy questions to the existing 110 Waves questions: 354 in total. All use the normal topic picker, adaptive/random sessions, marking, equation sheet, progress views and subject-scoped account sync. The existing Waves question objects, bank/scoring identifiers and lesson IDs are retained so this additive release does not reset their history.

## Required hosted step

Apply `supabase/migrations/202611020011_applied_science_forces_electricity_catalog.sql` in the Supabase SQL Editor before publishing the expanded practice bank. Run the whole file, including `begin;` and `commit;`, in a new query. Expected result: **Success. No rows returned.**

It registers the approved question identifiers, lesson memberships, types and maximum marks. It contains no student data or answer keys. Existing entries are retained using `on conflict do nothing`. Existing attempts, accounts, roles, RLS policies, flashcard packs and Edge Functions are unchanged. No account setting changes or Edge Function redeployment are required. New-question attempts require these catalogue rows to be accepted by account sync. This step must be performed by the project owner; it is not automatically run by pushing to GitHub.

After applying, check:

```sql
select count(*) as registered_questions
from public.learning_question_versions
where subject_id = 'applied-science'
  and bank_version = 'applied-science-0.4.0'
  and scoring_version = 'applied-1';
```

Expected count: **354**.

## Source and builds

`node scripts/build-applied-bank.cjs` adapts the approved draft sources to the production question schema and writes their SVG diagrams into `applied-science/assets/`. It is run by `npm run build`. Waves remains authored in `Pilot_Question_Bank.json`; its existing question objects are preserved. Forces and Electricity remain authored in their `content-drafts/` banks, which also supply the review previews. Do not edit their generated production copies independently. Future scoring changes need question versioning and a new catalogue migration.

Existing lesson codes remain valid, including teacher flashcard pack assignments. The Forces picker groups related lessons to match the approved question-bank sections. Electricity uses the existing electrical and thermal lesson headings. Each section's Select all and Clear selection controls preserve selections in other sections.

The publication builder checks hashes of the two approved source packs. Future draft edits must be reviewed and their publication hashes explicitly updated; simply rebuilding a new draft does not silently publish it. The question schema also describes the existing teacher metadata and numerical marking features (alternate rounded values and supported follow-through operations).

## Verification for this release

- All 354 question objects validate against the question schema.
- Existing Waves objects match the published baseline exactly; all prior catalogue rows remain unchanged.
- `npm test`: 308 software checks and 42 unit tests passed.
- `node tests/applied-expansion-browser.cjs`: all 244 promoted cards fully scored through the production renderer; diagrams and topic controls checked at mobile and desktop widths; standalone preview checked.
- `node --test tests/design-browser.cjs`: six workflow/design checks passed, including Chemistry, Waves follow-through/self-assessment and offline previews.
- The hosted migration is a separate owner-operated step; local tests do not establish that it has been applied.
