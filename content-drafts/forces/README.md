# Forces draft question set

Open or download `forces-draft.html`. It embeds all questions, scripts, styles, fonts and branding, so it needs no supporting requests. If an attachment viewer blocks scripts, download and open it in a browser.

110 original practice questions across the agreed 13 topics: 55 one-mark recall questions and 55 scaffolded applications. All are automatically marked with the existing Waves marking engine. Numerical steps have fixed unit labels; explanation and equation steps use selected answers. Each question has an optional hint, a worked answer shown after submission, an overall mark total and per-step marks. Revealing an answer locks it without awarding a score. Configured calculation steps support error carried forward. Responses stay in memory; reloading clears them. This preview does not use school accounts or saved Waves progress.

## Assessment basis

The uploaded Pearson AAQ Applied Science Extended Certificate specification, Issue 5 (December 2025), p51 defines AO1 knowledge and understanding, AO2 application, and AO3 analysis and interpretation; pp53–55 specify the Forces content. It gives no numerical Unit 3 AO weighting. The supplied sample assessment materials, June 2026 question paper and examiner report inform question styles and context. Delivery guides and teacher materials inform language and difficulty; the specification sets the scope.

The following is an authored approximate practice distribution by available marks, not an official Pearson percentage or examination tariff. A short scaffolded practice bank cannot reproduce the demands of an unscaffolded extended exam response. Each marking point has its own AO tag, allowing the balance to be reviewed without inferring AO from input style. The 50/50 recall/application split is by question count, matching the existing Waves practice bank.

| Outcome | Available marks | Percentage |
|---|---:|---:|
| AO1 | 59 | 30.9% |
| AO2 | 103 | 53.9% |
| AO3 | 29 | 15.2% |

## Coverage

| Topic | Questions | Spec content |
|---|---:|---|
| Describing motion and speed | 10 | B1.1–B1.3.2 |
| Displacement–time graphs | 8 | B1.3.3 |
| Velocity–time graphs and acceleration | 10 | B1.3.4–B1.3.6 |
| Equations of motion | 8 | B1.3.8 |
| Measuring acceleration and accelerometers | 8 | B1.3.7; B1.4 |
| Resultant forces and Newton’s first law | 8 | B2.1; B2.7 |
| Mass, weight and inertia | 8 | B2.2 |
| Friction | 8 | B2.3 |
| Newton’s second law | 8 | B2.5 |
| Momentum | 8 | B2.4; B2.5.2 |
| Impact forces and safety | 10 | B2.5; B2.5.3 |
| Newton’s third law | 8 | B2.6 |
| Drag and terminal velocity | 8 | B2.7.1 |

## Build and validation

```sh
node scripts/build-forces-preview.cjs
node tests/forces-preview-browser.cjs
npm test
```

The browser check blocks supporting requests and checks full/blank scoring across all 110 questions; mobile and desktop flows; hints; fixed units; partial credit; invalid numbers; follow-through; and unscored reveal. Build the standalone HTML after any source change.

Source content is in `questions.json`, presentation in `preview.js`, `preview.css` and `template.html`. Work is intended for `Combined-Drafts` only. The main Waves bank and generated application bundles are unchanged. Teacher review of the expanded draft is pending.
