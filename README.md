# LabRats — Chemistry and Applied Science

LabRats combines Chemistry and Applied Science behind a shared subject selector,
school login and platform services. The combined site is published from `main`.
The separate Applied Science repository remains available during the link transition.
See [the combined release guide](docs/COMBINED_RELEASE.md) for hosted setup and checks.

- **Chemistry:** 236 OCR A Level organic-chemistry questions at `chemistry.html`.
- **Applied Science:** the existing 110 Pearson AAQ Unit 3 Waves questions at
  `applied-science.html`, with their original calculations and self-assessment.
- **Shared:** visual base style, Auth, metadata sync/offline queues, N/A–E ratings,
  accessible grade tooltips, adaptive ordering, flashcard practice, celebrations
  and staff dashboard.
- **Separate:** banks, marking engines, progress, revision priorities, browser
  preferences, account caches and teacher authority by class/subject.

Open `index.html` through a local static server, or download the [latest preview pack](downloads/labrats-unified-design-preview-2026-10-25.zip) and
open `subject-hub-preview.html` after extracting all its files together.
The standalone subject previews embed their banks and diagrams. Account features
use `auth-config.json`; guest Active Learning needs no backend. For a current
guest-only flashcard sample, open `flashcards-preview.html` or download the
[flip preview ZIP](downloads/labrats-flashcard-flip-preview-2026-10-26.zip).

See [the subject-hub setup and review guide](docs/SUBJECT_HUB.md) and
[flashcard implementation guide](docs/FLASHCARDS.md) for source provenance, data
handling and database details. Hosted Supabase must have migrations 001–010
installed in order. For an existing project with 001–009 installed, run only
[010 — flashcards](supabase/migrations/202610260010_flashcards.sql), in a new SQL
Editor query, including `begin;` and `commit;`. Do not rerun schema migrations.
GitHub publication does not execute SQL or publish a flashcard pack.

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

Publishing the combined site does not establish chemistry approval, a validated
mastery score or school data-protection approval. Recorded limitations and school
operating decisions remain documented in [the DPO review](docs/DPO_PROTOTYPE_REVIEW.md).

The [unified design](docs/UNIFIED_DESIGN.md) applies A, B and C across both subjects, login and staff tools. The latest preview includes actual mobile renders. The design layer needs no SQL changes; flashcard storage requires migration 010.
