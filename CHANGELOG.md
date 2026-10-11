# Version 0.2 — file-by-file changes

| File | Change and purpose |
|---|---|
| `index.html` | Retained static student entry point; Version 0.2 header, teacher/test links and shared engine loading. |
| `app.js` | Extended existing topic → shuffled practice → feedback → summary flow; component controls, per-arrow route panels, curved-arrow completion, sites, products/errors, retries, protected reveals, mistake queue, completed sessions, 5/10-minute timestamped challenges and configuration-specific personal bests. |
| `styles.css` | Retained light background/dark text/teal accent; responsive pathways, diagram space, large controls, visible focus, reduced-motion support and mobile site controls. |
| `questions.json` | Expanded 36 pilot items to 98 records with stable answer references, reusable vocabulary, complete methods, per-step mapping, status, sources, marking and question-level review/ambiguity notes. New bank/scoring versions separate incompatible scores. |
| `core.js` | New shared pure engine: filtering, canonical identities, route-consistent component marking, arrow-set marking, progress state, safe storage, timers, configuration IDs and validation. Used by both UI and tests. |
| `ui.js` | New escaped display helpers, responsive chemistry assets, accepted-answer rendering and component feedback. |
| `assets.json` | New metadata for 107 SVG assets; neutral structural descriptions, structure connectivity identifiers, review notes and paths. |
| `assets/*.svg` | Original skeletal structures, charged species, initial/completed mechanism steps, selectable sites and deliberate-error diagrams. Replaces condensed-formula-only displays in important questions. |
| `teacher.html`, `teacher.js` | New public teacher browser/editor: filters, exact specification mapping, accepted methods, marking, linked assets, feedback, review status, editable records/catalogue and validated JSON download. |
| `tests.html` | Replaces the pilot's short data check with the shared behavioural suite plus actual asset-fetch checks. Runs on the hosted site without a terminal. |
| `tests/suite.js` | 36 reusable software tests for requested data/marking/progress/challenge invariants. |
| `tests/run.cjs` | Optional Node runner adds 107 actual asset-file checks. |
| `tests/browser.cjs` | Optional Playwright runner for interaction, storage, challenges, teacher maintenance and every question at narrow/zoom-equivalent widths. Creates a temporary test server only. |
| `tests/browser-results.json` | Recorded final browser results; these are run evidence, not executable chemistry approval. |
| `README.md` | Replacement/upload steps, student use, challenge scoring and honest limitations in plain English. |
| `COVERAGE.md` | Question distribution, represented outcomes and explicit gaps. |
| `TEACHER_REVIEW.md` | Separate chemistry-review checklist and priority ambiguity checks. |
| `docs/AUDIT.md` | Original architecture, checks and defects, with Version 0.2 resolutions. |
| `docs/MAINTENANCE.md` | Terminal-free teacher editing and complete worked question/option/method/alias/asset examples. |
| `docs/SOURCES.md` | Precise authoritative specification version/date/access record and pathway-resource limitation. |
| `docs/AMBIGUITY_REPORT.md` | Every question ID, possible ambiguity, present resolution and outstanding teacher judgement. |
| `docs/QUESTION_COVERAGE.csv`, `docs/QUESTION_REVIEW.csv` | Filterable per-question topic/reference/difficulty/requirement coverage and review register. |
| `docs/TEST_RESULTS.md` | Original and final software results, browser scope and clear separation from chemistry review. |

The original had no build process or separate asset/test folders. These additions keep the same deployable static architecture. Existing repository-specific files, such as a custom `CNAME`, should be preserved when uploading.
