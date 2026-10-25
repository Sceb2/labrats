# Shared Chemistry and Applied Science prototype

Development branch: `LabRats-Online` (renamed from `feature/subject-hub`). The original Chemistry `main`, Applied Science `main`, and `feature/student-logins` branches are not changed by this work. No hosted Supabase migrations have been run.

Screenshots: [subject selector](previews/subject-hub.png), [Applied Science question](previews/applied-science.png), and [mobile grade tooltip](previews/grade-tooltip-mobile.png).

## What is shared

The LabRats landing page (`index.html`) offers compact Applied Science and Chemistry buttons with newly generated transparent illustrations: a hand pouring into a test tube and an ethanol ball-and-stick model. `chemistry.html` opens the existing 236-question Chemistry tool; `applied-science.html` opens the imported 110-question AAQ Applied Science Waves tool. Both use the shared visual stylesheet, student login, account client, metadata sync, adaptive rating/ordering, tooltip and celebration implementations. Subject-specific renderers and marking engines preserve their different question formats.

`subjects.json` registers the two subjects. Applied Science's separate `learning-bank.json` adapts its existing question metadata for shared services, without converting or replacing its questions. One school account works across both subjects in the same browser tab. Auth remains tab-scoped, as in the original prototype. Guest practice remains available separately.

The subject menu identifies Applied Science accurately as Pearson AAQ Unit 3 physics/Waves. This does not add a separate A-level Physics subject or imply that the current Applied Science bank covers all its other units.

## Separate progress and private account data

- Chemistry and Applied Science have distinct bank/scoring namespaces, browser preference/progress keys, account caches, pending queues and reports. Applied Science question identities include their content version, such as `W01@2`.
- Teacher access requires an administrator subject grant **and** assignment to a class in that subject. Each class has one subject; the same student can join several classes across either subject, retaining one identity.
- Learning history is protected by server policies. A teacher assigned to a Chemistry class cannot read Applied Science results for the same student, including through the activity-count RPC.
- Applied Science retains its calculation tolerances, units, method marks, optional final-answer routes and written self-assessment. Adaptive selection preserves lesson prerequisites, the 20-mark budget and question-family restrictions.
- Account requests/cache store only the existing thirteen attempt-metadata fields. The server derives the subject from its catalogue. Raw numeric entries, selected options and written responses are not uploaded or retained in account storage. Working remains in memory for the current account session. Guest practice keeps its existing browser-only working separately.
- Account history stores total marks, so detailed direct/method-mark breakdowns remain in the current session. Written marks are student self-assessments, not teacher-verified grades. The shared adaptive guidance uses those reported mark fractions after an unaided answer; hints, reveals and retries cannot improve it.
- Switching subjects does not discard pending account metadata. Sign-out warns about waiting attempts across the account's subject queues. Explicitly confirmed sign-out clears account caches for both subjects, without deleting guest progress.
- There is no import of historical Applied Science browser progress, as requested. Existing Chemistry records and account tables are preserved for compatibility.

## N and A–E explanations

Badges use one shared implementation in `src/rating-badges.cjs`. They are buttons with a floating tooltip, available on pointer hover, keyboard focus, or a tap. Tap outside or press Escape to close it. Tooltips stay inside the viewport.

| Rating | Approximate meaning | Student tooltip |
|---|---|---|
| N — New | No qualifying unaided scored attempt | No unaided scored attempt yet. Try this question to start building a revision rating. |
| A — Strong recall | Strong recall evidenced across several days | You have recalled this well across several days. It usually needs less frequent practice. |
| B — Good recall | Usually successful; periodic revision | You usually answer this well. Revisit it periodically to keep it secure. |
| C — Developing recall | Mixed performance or limited evidence across days | Your answers are mixed, or there is not enough practice across different days yet. Keep practising. |
| D — Needs practice | Low marks or older recall needing refresh | Recent unaided marks are low, or earlier recall needs refreshing. Practise this soon. |
| E — Priority practice | Very little secure recent recall | Very little recent unaided recall is secure. Revisit the explanation and practise this more often. |

N replaces the old `E · new` presentation without treating new questions as failures. It has a non-zero practice weight. An assisted attempt alone can leave a question at N because it provides no unaided rating evidence. A first perfect answer can be C: confidence caps allow C after one UTC practice date, B after two, and A after three. Time since practice can lower a rating. These are revision priorities, not predicted examination grades or a validated mastery measure.

## Required Supabase steps

Keep using the existing development Supabase project. No administrative credentials need to be shared with the agent.

For an existing project with migrations 001–006 already installed:

1. If not already applied, run [007 — Chemistry v7 catalogue](../supabase/migrations/202610240007_mechanism_recognition_catalog.sql).
2. In a **new SQL Editor query**, run the entire [008 — subject separation](../supabase/migrations/202610240008_subject_separation.sql), including `begin;` and `commit;`.
3. In another **new query**, run the entire [009 — Applied Science catalogue](../supabase/migrations/202610240009_applied_science_catalog.sql).

Do not rerun earlier schema migrations against an existing project. A fresh disposable/project installation uses all migrations 001–009 in filename order. Migration 008 adds subject-aware tables, constraints, server-side event classification and access policies. Migration 009 adds 110 Applied Science catalogue entries. Old Chemistry catalogue rows remain intact. The existing staff-management Edge Function does not require redeployment for this change; subject administration uses the database RPC.

Verify catalogue rows with:

```sql
select subject_id, bank_version, scoring_version, count(*) as questions
from public.learning_question_versions
where (subject_id = 'chemistry' and bank_version = 'v7-236-questions-2026-10-24')
   or subject_id = 'applied-science'
group by subject_id, bank_version, scoring_version
order by subject_id;
```

Expected current rows: Chemistry v7/scoring `2` has **236**; Applied Science `applied-science-0.4.0`/scoring `applied-1` has **110**.

In the staff dashboard, select a subject, grant a teacher access under **Teacher subject access**, then assign them to a class for that subject. Revoking the subject also removes their class assignments in it. Existing teachers retain Chemistry authority only; new teachers need explicit grants. Administrators can manage both subjects.

## Review without deploying

The downloadable preview pack contains `subject-hub-preview.html`, `student-site-preview.html`, `applied-science-preview.html`, `staff-preview.html` and the mechanism-card preview. Extract the files together and open `subject-hub-preview.html`. The subject previews embed their question banks and images; no local server is needed. Guest practice works without database changes. Account features use the development Supabase project and require its migrations above.

For normal local site development, run a static HTTP server from the repository root and open `index.html`. No live-site deployment is required. The shared account relies on a common origin; do not host the two subject pages on unrelated domains and expect tab storage to transfer.

## Source provenance

Imported from https://github.com/Sceb2/appliedscience, `main`, commit `164239042f3e22e8085b34dd24197bc52d312fba`. Its question bank and lesson map are byte-for-byte unchanged:

- `Pilot_Question_Bank.json`: SHA-256 `b9448f8f89b278fc8957c7ecf20b06a0d561a82a66b2d9ef2ab811c27cc7285a`.
- `Physics_Lesson_Map.json`: SHA-256 `82121dda59b580f2cac61217b2fb03c43100a1f85dec441d1ade470b05dc5d0e`.

The bank contains 78 selected-answer, 19 calculation, 12 answer-completion and one written-self-assessment question, using 29 referenced diagrams. The shared app adapts the source UI/state and adds an optional priority input to session selection. Its scoring functions are retained. Original source assets are kept under `applied-science/assets/`; runtime calls use the common platform services instead of copied Auth/adaptive implementations.

## Developer checks

```sh
npm ci
npm run build
npm test
npm run test:mechanism-preview
npm run test:auth-local
```

The last command uses only a disposable local PostgreSQL/Auth/PostgREST stack, enforces local-only URLs, applies migrations in order and removes its fictional users/services afterwards. If installed, a trusted native Deno executable can be selected using `OCR_DENO_EXECUTABLE`. The new checks cover cross-subject access, immediate revocation, shared sign-in, separate progress, N, tooltip input methods, the downloadable Applied Science preview and exclusion of a unique written-response marker from account requests and browser storage.

Validated for this prototype: build, 308 Chemistry software checks, 33 unit tests, the mechanism-preview browser check and all 70 local backend/browser integration checks passed. The 109 automatically marked Applied Science questions accepted their authored answers, including enabled final-answer routes. These checks do not replace teacher content review or verify hosted configuration.

Catalogue generation is shared too. For a future bank update, generate a **new** migration using `node scripts/build-question-catalog.cjs --subject applied-science --output supabase/migrations/NEW_TIMESTAMP_question_catalog.sql`. Use `--subject chemistry` for Chemistry (also the default). Existing migration files cannot be overwritten. The current 009 file can be verified with the same command and `--check`.

## LabRats interface update — 25 October 2026

Topic tiles are shorter, with checkboxes beside their labels and the existing green selected state. Select all / Clear topics are directly available without a disclosure. The setup-only pink Choose subject button is in the topic heading; it is absent during questions, reviews and progress. The session count and Start practice controls precede Practice settings in both subjects. Foundation behaviour and eligibility rules are unchanged; explanatory preview/setup text has been removed. Student Login uses the LabRats brand and retains operational errors and password-replacement help.

[Download the current review ZIP](../downloads/labrats-preview-2026-10-25.zip), extract it and open `subject-hub-preview.html`. This is a fixed snapshot; subsequent source builds do not update the ZIP automatically. This interface update changes no question content, grading, database schema or hosted Supabase settings.

## Account controls and design review — 25 October 2026

Sign Out now shares the main action group in each subject, beside Finish session, Choose subject or Choose topics. The single existing sign-out control is moved between rendered screens; its sync/discard safeguards are retained. It stays in the account bar if a sign-in error hides the main content. Guest sessions have no Sign Out button. The subject menu now contains only Practice, Mistakes and Progress. Student Login is available on the subject hub. Sidebar version metadata is reduced to `v1.13.0`; automatic footer chatter is removed while update checking, storage failures and pending-attempt warnings remain.

The [design review](UI_DESIGN_REVIEW.md) records the online sources, findings and alternatives. [Mobile previews](design/labrats-mobile-previews.html) show actual fictional-account renders and the current subject page. [Visual options](design/labrats-ui-options.html) provide three separate mockups. No broader redesign or scoring changes have been applied.

[Download the current working preview and review pack](../downloads/labrats-ui-review-2026-10-25.zip). No new database setup is needed for this UI update.
