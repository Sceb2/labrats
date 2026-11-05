# Task-led staff workspace — 5 November 2026

Development-only UI change. No database migration, Edge Function deployment,
permission change or learner scoring/sync change is required for this update.
The existing retention migration and activation procedures remain separate.

## Pages and workflow

Teachers land on Classes. Administrators land on Overview, using real available
retention status and counts. External scheduler/alert delivery is not inferred
or presented as verified. School-wide pages say All subjects; Classes, student
reports and packs have the relevant subject selector.

- Classes: up to six compact class buttons; above six, a searchable class picker.
  The selected class is labelled above its roster. Username search filters the
  roster without another server request. Create-class and batch-account forms
  are revealed only when needed. Each student has View progress and an Actions
  disclosure for password resets.
- Student progress: a dedicated, scoped page, with Active Learning / Flashcards
  tabs. Question priorities and topic marks are visible before expandable
  individual question details. Flashcard self-assessments have separate priorities,
  topic coverage and expandable version-level results. They are fetched lazily
  when that tab is first opened. Ratings and existing marking rules are unchanged.
  Administrator account controls are available only on the chosen student's page.
- Staff & access (administrator): invitations, staff state, subject grants and
  staff-leaver handover. Class assignments remain with Classes so their class and
  subject scope stay visible.
- Flashcard packs: list of permitted packs, topic and actual publication state,
  with an explicit import/edit section. Existing CSV parsing, preview, private
  draft, versioning, publication and archive RPCs are reused. Unsaved imports warn
  before page/subject navigation or closing the tab.
- Retention & health (administrator): policy, extensions, activation and recent
  real cleanup records. Staff handover is on Staff & access instead of repeated
  on this page. Monitoring delivery still needs separate school configuration.
- My account: own-password change and sign-out. Private credentials are cleared
  when moving between pages; nothing from rosters/reports is persisted by this UI.

Desktop shows the full page navigation. Mobile shows primary tabs, with More
for additional administrator pages and My account. Report tabs support arrow,
Home and End keys; native disclosures support keyboard activation and Escape
closes Actions/More disclosures. Existing server role gates remain authoritative.
Scope changes remove old controls and reports; in-flight report responses check
that their page/subject/generation is still current before rendering.

## Authored source and preview

`src/staff-views.cjs` holds page templates; `src/staff-app.cjs` retains the account
and operation controller. `src/staff-entry.cjs` boots the real connection.
`staff.css` scopes the task layout to staff; student styles and question content
are unchanged. Generated bundles/previews are produced by `npm run build`.

The downloadable **staff-showcase-preview.html** uses the same controller,
views, CSS, report renderers and forms with a separately compiled fictional
adapter (`src/staff-demo.cjs`). Role controls reload fictional teacher/admin
views; there is no live Auth session or real API key and CSP disallows network
connections. It is not evidence of hosted permissions. CSV import preview,
navigation and fictional credential displays work locally; publication, deletion,
access changes and offboarding are not performed against any real system.

`staff-preview.html` remains the different, existing downloadable **connected**
staff preview: it uses public configuration and real staff sign-in. Do not confuse
that file with the isolated showcase when sharing a demonstration.

## Verification

Passed: build; 308 software checks and 54 maintained Node unit tests; the new
`npm run test:staff-layout` suite at 320/390/1440 px; shared `test:design`; and the
complete disposable `test:auth-local` suite. Browser checks exercise the new
page boundaries for invitation, provisioning, reports, reset, access changes,
retention extensions and staff handover. Pack tests use the list/import entry
and verify real local publication. The isolated preview makes no external
requests and has no page errors or mobile horizontal overflow in these checks.
Native Deno and hosted configuration were not tested by this change.
