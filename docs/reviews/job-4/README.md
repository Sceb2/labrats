# Job 4 — advanced settings organisation

Development-only update. Main and hosted Supabase are unchanged.

Both subjects now separate Practice settings from a collapsed Effects and sound
section. Practice settings keeps learning mode, question-type filters, Chemistry
 difficulty and optional session/adaptive explanations. Effects preferences and
sound controls retain their existing preference values and handlers.

Applied Science now exposes the existing sound preference on setup as well as in
sessions. Question browser and Celebration previews are independent collapsed
sections, rather than mixed together inside Practice settings. Existing disclosure
preferences for the question browser are retained; new groups default to closed.

No question selection, marking, saving or account-boundary changes. Timed challenge
and resume controls remain in place. The mobile Start panel from job 2 is preserved.

Build, unit suite, six responsive design checks and seven flashcard checks passed.
Design checks exercise effects/sound persistence and moved-control accessibility.
Existing local account test journeys were adjusted to open Effects and sound
before changing the checkbox; the full backend suite was not rerun for this UI move.

Screenshots show local guest renders at 390×844 and 1280×900; effects images use
390×900. Real phone keyboard behaviour remains a separate device check.
