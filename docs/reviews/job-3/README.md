# Job 3 — feedback actions and session completion

Development only; main and hosted Supabase unchanged.

- Applied Science finish/exit controls now use the shared approved brown colour.
- Next question/View summary remain primary; Try again is a compact outlined action.
- Chemistry summary removes duplicated totals, moves detailed scoring into optional
  help and places Choose topics before the answer-review list.
- Applied Science summary leads with automatically marked answers, keeps self-assessed
  marks separate and distinguishes scored, revealed and unfinished questions. Revealed
  automatic answers no longer contribute to the displayed scored denominator. Stored
  session totals, attempts, marks and grading calculations are unchanged.
- Method-mark breakdowns remain available under Scoring details; detailed question
  feedback still displays all earned method marks and the worked corrections.
- Continue unfinished questions is primary when needed, above Choose topics on mobile.
- Both subjects use Review your answers for the expandable review list.

Build/unit checks passed; six design tests passed at mobile/desktop sizes, including
revealed-only summaries and unchanged first-attempt records. Seven flashcard checks
passed. Screenshots are local guest renders at 390×844; deployed/account workflows
and real phone keyboards were not re-tested during this presentation-only update.
