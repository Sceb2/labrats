# Original project inspection and material changes

## Original files and architecture

| Original file | Responsibility |
|---|---|
| `index.html` | Static page shell; stylesheet and app-script loading. |
| `app.js` | One shared state object; topic/type selection; JSON fetch; Fisher–Yates shuffle; single-option marking; browser storage; practice/challenge flow and summary. |
| `questions.json` | Meta, topics, vocabulary and 36 original questions: six per family. Correctness uses stored array positions (`answers: [0]`). |
| `styles.css` | Light background, dark text, teal accent, cards, responsive controls and basic focus/reduced-motion rules. |
| `tests.html` | Short intended schema/count/alias check. The supplied script contains literal newlines inside quoted JavaScript strings and does not parse in a browser. |
| `README.md` | Local server, hosting, editing instructions and pilot limitations. |
| `COVERAGE.md` | Six-family coverage/gap description. |
| `TEACHER_REVIEW.md` | Functional checklist and proposed chemistry review. |

No framework, build process, separate diagram assets, backend or package manager was required. Version 0.2 retains plain static hosting, separate content and the topic-selection → shuffled practice → feedback → summary journey.

## Original automated checks actually run

- The unmodified `tests.html` produces a browser **Invalid or unexpected token** error and stays at “Running…”. Its quoted strings contain unescaped literal newlines.
- The original check logic was also run with only those string-newline escapes repaired **in memory**: **PASS**, 36 unique questions, six per original type, present prerequisites/spec refs/options/answers, dichromate aliases present.
- The original archive was not overwritten during inspection. This limited data check did not prove complete filtering, chemical correctness, route marking or storage invariants.

Evidence is recorded in `tests/original-results.txt`. Version 0.2 replaces the broken runner with executable shared behavioural tests.

## Findings and resolutions

| Finding | Version 0.2 resolution |
|---|---|
| Correctness ultimately depends on question-data option positions, though displayed shuffling attaches correctness correctly. Teacher option insertion/reordering can change intended keys. | Canonical IDs and complete-method answers; UI order independent of marking; shuffling tests across the bank. |
| Reagent/condition answers are bundled strings, scored all-or-nothing. | Labelled component controls; independent essential marks; optional detail excluded; accepted alternatives remain whole combinations. |
| Synthesis selects a complete route instead of individual arrows. | 12 routes of 2–4 steps; shown intermediates; per-arrow panels; saved per-step responses; independent step marks; completed feedback only after whole-route submission. |
| Completion is text/arrow-option selection; structures are mainly condensed strings. | Nine anchored curved-arrow tasks plus three scaffolds; source/destination selectors; separately stored SVGs, descriptions and review notes. |
| Sites and nomenclature have limited diagram/context support. | Explicit selection kinds and clickable sites; original skeletal nomenclature structures; four distinct naming options; E/Z convention stated. |
| No product/error task families. | Eight product-structure and eight two-component error/correction questions. |
| Results array is reset for a new session; no actual retry or reveal flow despite summary claims. | Persistent first-attempt records, correct-after-retry and reveal flags; independent session snapshots; summaries and mistake queue. |
| Challenge currently reveals correctness and completed answers after every submission. | Challenge feedback deferred until the end; first submission locked, including refresh; no retries/reveals in the active challenge. |
| Challenge is only five minutes. Its best-score configuration omits duration, difficulty and explicit scoring/bank versions. | Five or ten minutes; deterministic configuration includes all selections, duration and versions; only matching bests compared. |
| Existing deadline logic already uses timestamps, but no expiry/restoration regression tests exist. | Timestamp calculation retained; visibility/focus expiry checks and stored challenge deadline; exhausted queues end without repeats. |
| Original all-prerequisite filter and safe storage are useful. | Preserved and shared in the pure engine; structural literacy made explicit in prerequisites; negative/blocked/corrupt storage tests. |
| Spec text is recorded but the nitrogen topic says “6.2.2 Amines”. | Corrected: amines are 6.2.1; 6.2.2(b) covers amides. Exact current outcome registry is separate from topic display labels. |
| No teacher preview, browser editor or broad validation. | Public preview/editor and hosted validation, with terminal-free export/upload workflow and worked examples. |

## Limits remaining

The site is a focused practice bank, not a complete organic course or examination simulator. Full freehand drawing, open route planning, spectra, full practical-method assessment and many later organic subtopics remain gaps. All new chemistry/diagrams require teacher review. Local progress does not synchronise. The teacher preview is public; it does not hide answers or protect an assessment. Browser automation primarily covers Chromium, not every device or screen reader.
