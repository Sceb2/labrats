# A–E adaptive-practice prototype

Adaptive practice is the default within the student's chosen topics, question
types and difficulty. Random practice remains selectable in Practice settings.
Both use the existing approximately 20-mark whole-question session budget and
do not repeat a question within the session. Personal challenge stays separate.

The same pure `src/adaptive.cjs` implementation supplies student icons, teacher
reports and selection weights. Ratings are **revision guidance**, not exam grades
or a validated estimate of mastery. This is a transparent prototype rather than
Anki's SM-2 or FSRS implementation.

## Evidence and ratings

Only each encounter's first **unaided** submission contributes its earned/maximum
mark fraction. Partial marks count proportionately. Reveals and retries are kept
separately and never improve the unaided rating. Events are deduplicated and
incompatible bank/scoring versions are excluded. Late offline attempts merge in
attempt-time order; device clocks can still affect ordering.

Daily average fractions are weighted with a 30-day half-life. Many repetitions
on one calendar day therefore cannot outweigh evidence distributed over days.
Base thresholds are A ≥90%, B ≥75%, C ≥50%, D ≥25%, E below 25%. Confidence caps
are C with evidence on one UTC date, B with two dates and A with three or more.
These are dates, not a guarantee of 24 hours between attempts. A new question is
shown explicitly as **E · new**, with no recorded score; it is not a failed answer.

Time since the last unaided submission reduces retained performance exponentially,
with a half-life of four times the base interval. The resulting grade can fall
as recall evidence gets older. Base revisit intervals are A 21 days, B 10 days,
C 4 days, D 1 day and E 6 hours. A question's due time uses its current grade.

Selection weights grow with weaker grades and overdue time. Strong questions
before their due date get small weights; weak D/E questions remain worth revisiting
even before their due date. New questions have a moderate weight so sessions keep
introducing material. A weighted random ordering supplies the existing mark-budget
selector; every eligible question retains some chance and no question repeats
within the session. This changes frequency rather than promising an exact timetable.

## Storage and compatibility

Signed-in ratings are derived from existing metadata history and waiting attempts;
there is no additional table of inferred grades to keep in sync. Teacher/student
views use the same bank, events and current time. Grades can change with elapsed
time; an open page refreshes its icons when rendered/submitted again.

Browser-only practice keeps a metadata-only `adaptiveEvents` history alongside
its existing local progress. Old browser marks remain, but their missing attempt
times cannot establish a spaced history: new ratings build from new practice.
No old browser data is imported into a student account. Selected answers/free
text are not added to account persistence or sent to the learning API.

Pure tests cover partial credit, confidence caps, assisted-answer exclusion,
deduplication, decay, weighted selection frequency and no-repeat/mark budgets.
The full preview browser test checks that Adaptive is the default and a teacher
sees the same grade and first mark as the student. A teacher should review and
tune thresholds, intervals and the treatment of new questions before rollout.
