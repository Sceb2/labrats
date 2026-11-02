# Forces draft question set

Open or download `forces-draft.html`. It embeds all questions, scripts, styles, fonts and branding, so it needs no supporting requests. If an attachment viewer blocks scripts, download and open it in a browser.

124 original practice questions across the agreed 13 topics: 55 one-mark recall questions and 69 scaffolded applications. All are automatically marked with the existing Waves marking engine. Numerical steps have fixed unit labels; explanation and equation steps use selected answers. Each question has an optional hint, a worked answer shown after submission, an overall mark total and per-step marks. Revealing an answer locks it without awarding a score. Configured calculation steps support error carried forward. Responses stay in memory; reloading clears them. This preview does not use school accounts or saved Waves progress.

## Assessment basis

The uploaded Pearson AAQ Applied Science Certificate specification, Issue 5 (May 2026), printed p48 defines AO1 knowledge and understanding, AO2 application, and AO3 analysis and interpretation; pp50–52 specify the Forces content. The supplied sample assessment is labelled Extended Certificate, Issue 1 (2024), and the supplied paper is 6 May 2026 (60318T). It gives no numerical Unit 3 AO weighting. The supplied sample assessment materials, May 2026 question paper and examiner report inform question styles and context. Delivery guides and teacher materials inform language and difficulty; the specification sets the scope.

The following is an authored approximate practice distribution by available marks, not an official Pearson percentage or examination tariff. A short scaffolded practice bank cannot reproduce the demands of an unscaffolded extended exam response. Each marking point has its own AO tag, allowing the balance to be reviewed without inferring AO from input style. The original 55 recall and 55 application questions were balanced by count; the 14 additional application questions bring the current draft to 55 recall and 69 application questions. This is a teaching choice, not an official exam weighting.

| Outcome | Available marks | Percentage |
|---|---:|---:|
| AO1 | 59 | 26.5% |
| AO2 | 123 | 55.2% |
| AO3 | 41 | 18.4% |

## Coverage

| Topic | Questions | Spec content |
|---|---:|---|
| Describing motion and speed | 10 | B1.1–B1.3.2 |
| Displacement–time graphs | 11 | B1.3.3 |
| Velocity–time graphs and acceleration | 11 | B1.3.4–B1.3.6 |
| Equations of motion | 8 | B1.3.8 |
| Measuring acceleration and accelerometers | 10 | B1.3.7; B1.4 |
| Resultant forces and Newton’s first law | 8 | B2.1; B2.7 |
| Mass, weight and inertia | 8 | B2.2 |
| Friction | 9 | B2.3 |
| Newton’s second law | 8 | B2.5 |
| Momentum | 8 | B2.4; B2.5.2 |
| Impact forces and safety | 15 | B2.5; B2.5.3 |
| Newton’s third law | 8 | B2.6 |
| Drag and terminal velocity | 10 | B2.7.1 |

## Build and validation

```sh
node scripts/build-forces-preview.cjs
node tests/forces-preview-browser.cjs
npm test
```

The browser check blocks supporting requests and checks full/blank scoring across all 124 questions; mobile and desktop flows; hints; fixed units; partial credit; invalid numbers; follow-through; and unscored reveal. Build the standalone HTML after any source change.

Source content is in `questions.json`, presentation in `preview.js`, `preview.css` and `template.html`. Work is intended for `Combined-Drafts` only. The shared Applied Science marking engine and its generated bundle support this draft’s rounding and follow-through rules. Teacher review of the expanded draft is pending.

## November review amendments

Airbag, crumple-zone, graph, trolley, friction and resistance questions were added. F13A3’s hint, F07A rounding, F01A2 follow-through, momentum magnitude wording, F05A practical choice and misleading shared hints were corrected. Counts and AO labels describe the draft, not Pearson exam proportions. All questions remain teacher-review drafts; the main site and hosted Supabase are unchanged.

## 2 November teacher-feedback pass

The marked Forces questions in `LabRats-Applied-Science-Question-Review.xlsx` were revised. Displacement–time and velocity–time diagrams now accompany the indicated graph questions, including a shaded area under the velocity–time line. SUVAT and momentum equations appear where requested. Distractors about measuring acceleration and Newton’s laws are more plausible, and the crumple-zone question uses familiar car-part language. A swimmer force diagram accompanies F12A. These changes keep all 124 question IDs, mark totals and scoring rules. The separate Waves bank received the requested W13 context sentence; this wording-only edit retains its existing bank and question version identifiers so saved progress remains compatible. Electricity was left for a separate review.
