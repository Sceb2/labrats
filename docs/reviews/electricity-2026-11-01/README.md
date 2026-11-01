# Electricity draft validation

120 original questions, 164 automatically marked subparts; content remains a teacher-review draft.

- Standalone build passed.
- Browser checks passed all 120 questions with full answers at mobile and desktop widths, plus blank responses, incorrect choices, invalid numbers, follow-through, reveal without scoring, overflow, temporary storage and script errors.
- Final numeric-domain and correct-answer checks passed after tightening physical input boundaries.
- Existing `npm test` passed (308 software checks plus the Node test suite). Initial restricted runs could not start build subprocesses; rerunning with subprocess access passed.
- Screenshots show E023 (meter connections), E043 (unit conversion and follow-through), E097 (electrical heating) and E112 (practical apparatus) at 390 px width.

The shared renderer and marking engine are reused. No migration or live question-catalogue update is included. Numerical-key checks do not independently verify every scientific claim; teacher content review remains pending.
