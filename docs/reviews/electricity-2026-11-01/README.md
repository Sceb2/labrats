# Electricity draft validation

120 original questions, 164 automatically marked subparts; content remains a teacher-review draft.

- Standalone build passed.
- Browser checks passed all 120 questions with full answers at mobile and desktop widths, plus blank responses, incorrect choices, invalid numbers, follow-through, reveal without scoring, overflow, temporary storage and script errors.
- Final numeric-domain and correct-answer checks passed after tightening physical input boundaries.
- Existing `npm test` passed (308 software checks plus the Node test suite). Initial restricted runs could not start build subprocesses; rerunning with subprocess access passed.
- Screenshots show E023 (meter connections), E043 (unit conversion and follow-through), E097 (electrical heating) and E112 (practical apparatus) at 390 px width.

The shared renderer and marking engine are reused. No migration or live question-catalogue update is included. Numerical-key checks do not independently verify every scientific claim; teacher content review remains pending.

## Revision 2

Revised symbols, circuit placement, scale graph, practical contexts and selected distractors. All 120 questions again passed full-answer marking at mobile/desktop widths; incorrect options, blank/invalid input, follow-through and unscored reveal checks passed. E043 acceptance boundaries tested separately at 199, 200 and 201 Ω (accepted) and 198.9/201.1 Ω (rejected). Photodiode content deliberately omitted per teacher instruction despite C1.4 listing it. Addition follow-through in E085/E103 deferred. Updated screenshots include E009/E010/E029/E032/E111/E113/E117. No hosted changes or shared marking-engine changes.
