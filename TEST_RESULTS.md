# Software test results — Version 0.2

Run date: **11 October 2026**. Bank: `0.2.0-2026-10-11`. Scoring version: `2`.

**143/143 software checks passed:** 36 shared behavioural tests plus 107 actual SVG-file checks. The hosted `tests.html` page also passed **143/143**, fetching the assets rather than checking only their metadata.

**19/19 Chromium browser test groups passed.** The recorded group results are in `tests/browser-results.json`. No unhandled browser JavaScript errors were observed.

## Original pilot

The supplied `tests.html` did not execute: literal newlines inside quoted JavaScript strings caused **Invalid or unexpected token**, leaving “Running…” on screen. Running its check logic with only those newline escapes repaired in memory passed its limited checks: 36 unique questions, six per original family, prerequisite/specification/options/answers present and dichromate aliases present. See `tests/original-results.txt` and `AUDIT.md`. The original archive was preserved during inspection.

## Shared software checks

| Area | Verified behaviour |
|---|---|
| Data consistency | Minimum bank distribution; duplicate question IDs; absent/unknown topics and prerequisites; absent/unknown exact references; unknown asset metadata; invalid option/method IDs; complete-answer acceptance. |
| Stable identities | Shuffling leaves original arrays unchanged and marking stable across the bank. “Acidified potassium dichromate(VI)” and “K₂Cr₂O₇/H⁺” resolve to `dichromate-acid`. Equivalent identities cannot compete within a control. |
| Chemical distinctions in software | Aqueous and ethanolic hydroxide remain distinct. Distillation and reflux remain distinct. This verifies identity/marking rules, rather than proving that the chemistry content is correct. |
| Eligibility | Every prerequisite must be selected; missing one excludes a route. Type, difficulty and review-status selections apply together. |
| Components and routes | Both complete RC16 supplied protocols accepted; crossed hybrids receive only defensible partial marks. Essential components marked independently, optional detail excluded from the maximum. Synthesis steps marked separately. |
| Arrows | Correct direction accepted; reversed direction rejected. Electron-pair origins required. Equivalent lone-pair/negative-charge origins and arrow order accepted. Incomplete sets earn partial marks; an extra incorrect arrow prevents full marks. |
| Progress | Correct/partial/incorrect/not-attempted distinguished. Retry cannot change first marks. Reveal before submission prevents a first-attempt result; reveal after submission preserves it. |
| Challenges | Configuration separates topic/type/difficulty/duration/bank/scoring versions, with canonical selection order. Timestamp expiry handles background time. Queue contains no duplicate questions. |
| Storage | Unavailable, corrupt or throwing storage is nonfatal. Incompatible bank/scoring progress resets safely. |
| Assets | All 107 referenced SVG files exist; hosted checks successfully fetch all 107. |

## Browser interaction checks

The browser runner verified correct/partial marking and retry protection; pointer and selector arrow entry; undo/clear; separate synthesis panels retaining responses without early answers; site buttons and labelled selectors; four distinct product diagrams; reveals and completed-session review; the mistake queue; delayed challenge feedback; refresh submission protection; background deadline expiry/restoration; summary reveals; blocked local storage; teacher filters, accepted answers and JSON export.

All **98 question screens** were checked for horizontal overflow at **320 px, 360 px and 640 px** (294 screens). The last width also checks a layout equivalent to a 1280 px window at 200% browser zoom. Eight representative question types were additionally checked with **200% CSS zoom**. Mobile site controls and keyboard selectors were exercised. Desktop/mobile diagrams were visually inspected during development.

This does **not** establish support for every browser, screen reader or mobile device. CSS zoom is an additional stress check, not identical to every browser's native zoom implementation. Teacher checks should still include the classroom devices and assistive technology actually used.

## Run the checks yourself

No terminal: after GitHub Pages deployment, open `tests.html`; checks run automatically. Initially expect **143/143**. Adding assets can increase the total. Read warnings in `teacher.html`; the 98 review-status warnings are intentional, not software failures.

Optional developer tools: with Node installed, run `node tests/run.cjs` from the project folder. For browser checks, install Playwright and its Chromium browser, then run `node tests/browser.cjs`; an alternative executable can be selected with `CHROMIUM_EXECUTABLE`. These tools are optional and are not needed by the deployed website.

## Chemistry review is separate

Automated checks verify data consistency, deterministic marking and interface behaviour. They **do not prove** chemical accuracy, specification appropriateness, diagram correctness, absence of ambiguity or distractor quality.

All **98 questions remain teacher-review-required**, and the 107 SVG assets carry review notes. Use `TEACHER_REVIEW.md`, the public teacher preview, `AMBIGUITY_REPORT.md` and `QUESTION_REVIEW.csv` for chemistry approval before classroom use. No question has been automatically promoted to teacher-approved.
