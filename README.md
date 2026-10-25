# LabRats — combined subject prototype

This development branch combines Chemistry and Applied Science behind a shared
subject selector, school login and platform services. Both existing live sites
remain separate and unchanged.

- **Chemistry:** 236 OCR A Level organic-chemistry questions at `chemistry.html`.
- **Applied Science:** the existing 110 Pearson AAQ Unit 3 Waves questions at
  `applied-science.html`, with their original calculations and self-assessment.
- **Shared:** visual base style, Auth, metadata sync/offline queues, N/A–E ratings,
  accessible grade tooltips, adaptive ordering, celebrations and staff dashboard.
- **Separate:** banks, marking engines, progress, revision priorities, browser
  preferences, account caches and teacher authority by class/subject.

Open `index.html` through a local static server, or download the [latest preview pack](downloads/labrats-ui-review-2026-10-25.zip) and
open `subject-hub-preview.html` after extracting all its files together.
The standalone subject previews embed their banks and diagrams. Account features
connect to the development Supabase project; guest practice needs no backend.

See [the subject-hub setup and review guide](docs/SUBJECT_HUB.md) for source
provenance, tooltip wording, data handling and the exact database steps. Migrations
008 and 009 are new and have not been applied to hosted Supabase. Apply 007 first
if its Chemistry v7 catalogue is not yet installed. Existing projects must not
rerun schema migrations 001–006.

The staff dashboard grants teachers a subject before assigning them to its
classes. Results for other subjects remain protected by server access policies,
even where a student belongs to both. One student account can practise both.

Developer checks:

```sh
npm ci
npm run build
npm test
npm run test:mechanism-preview
npm run test:auth-local
```

The local integration suite uses Docker and Chromium with fictional data only.
A trusted Deno executable can be selected using `OCR_DENO_EXECUTABLE`.

Further details: [student accounts](docs/STUDENT_LOGINS.md),
[staff tools](docs/STAFF_PROTOTYPE.md), [progress sync](docs/PROGRESS_SYNC.md),
[adaptive practice](docs/ADAPTIVE_PRACTICE.md), and
[mechanism-card review](docs/MECHANISM_CARD_PREVIEW.md).

This is a review prototype. Passing software checks does not establish chemistry
approval, a validated mastery score or readiness for real-student deployment.

The current [UI review](docs/UI_DESIGN_REVIEW.md) includes real mobile account previews and separate design mockups. This navigation/visual update requires no new Supabase migrations.
