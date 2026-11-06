# Class progress

Implemented on development (`Combined-Drafts`), 6 November 2026. Main is unchanged.
This report uses existing account practice data. Guest activity is not included.

## Staff workflow

Open **Class progress** in staff/admin navigation (**Progress** in the mobile
tabs). Choose the subject and class. Compact class buttons become a searchable
picker for longer lists, as on Students & classes.

- **Topic averages:** current A–E ratings for graded questions, with contributing
  students and questions reached. Topics without graded attempts are listed
  separately in a collapsed section, not assigned E.
- **Questions students struggle with:** up to 12 automatically marked questions,
  ranked by the proportion whose latest unaided answer lost marks. Incorrect
  and partial answers are distinguished; below three contributors, a limited-data
  label is shown. Single-student test classes can therefore still show results.
- **Every question:** expandable, searchable and filterable by topic. Clicking
  a topic opens its question list. Unattempted questions show no grade.
- **Flashcards:** a separate tab for current cards in published packs. It shows
  self-reported recall and cards marked Not yet, distinct from automatic marks.

Use **Refresh** for new results. Reports load on demand; there is no periodic
full-class history download. Mobile topic rows keep participation visible without
sideways scrolling. The complete question table can scroll within its own panel.

## Agreed calculations

The school chose **equal student weighting**. Convert A=5, B=4, C=3, D=2, E=1;
average each student's graded questions in a topic, then average those students
equally. Round the result to the nearest letter. N and students without graded
attempts are excluded, with participation shown separately. For example, one
student averaging A over 20 questions and another averaging E over one question
produce C (3/5). A third student with no grades does not lower that average.
These are revision ratings, not exam grades or estimates for unattempted work.

Per-question ratings reuse the student calculation: day-balanced, recency-weighted
unaided accuracy, partial marks, distributed-evidence caps and elapsed time.
The final grade calculation is shared in `src/adaptive.cjs`; adaptive rules and
question selection are unchanged.

The revisit list uses **each student's latest independent unaided answer** rather
than adding every historical mistake. Frequent practice does not give a student
extra weight, and later success can remove an old difficulty. It sorts by the
proportion not fully correct, lower average latest marks, more contributors, then
question code. Written self-assessment contributes to topic ratings as in existing
reports, but is labelled and excluded from automatically marked priorities.

Topics follow the existing bank's topic/prerequisite mapping; a question can
contribute to several topics. Only enabled compatible question versions and
current published flashcard versions contribute. Archived/superseded flashcard
history remains stored but is excluded from the current view. The report uses
current class membership and members' shared subject progress, including practice
before joining that class. It does not save longitudinal class snapshots.

## Supabase installation

Apply **only migration 016**, with 001–015 already installed:

`supabase/migrations/202611060016_class_progress.sql`

Copy the whole file into a **new SQL Editor query**, including begin/commit, and
run once. Expected: **Success. No rows returned.** It creates a read-only reporting
RPC without creating/deleting/renaming accounts, writing learning data or enabling
retention. No Edge Function redeployment, API key change or Supabase GitHub
integration is required. It can be installed before main without changing
existing practice flows.

The connected `staff-preview.html` then supports real class reports. Before
migration 016, the new page explains that it needs the migration; existing staff
pages remain available. The isolated `staff-showcase-preview.html` works without
Supabase and uses fictional data. Neither preview changes hosted data by opening
the report.

## Permissions, privacy and performance

`public.class_progress_summary` requires a live session and active, password-ready
invited staff account. Teachers need both the selected class assignment and its
subject grant. Administrators can choose any class. Students and guests cannot
call it. The server derives the subject from the class. This definer RPC performs
explicit authorisation before queries restricted to the class's current members
and subject. Revocations apply on each request; the staff scope verifier clears
reports when access changes.

The server returns compact evidence per student/question: weighted accuracy,
evidence-day count, last time and latest fractional marks. It does not return raw
attempt events, selected answers, written responses or card backs. Flashcards
include published current fronts for the catalogue. No persistent table or browser
storage record is added. View-local memory is discarded on navigation, logout or
refresh. Late results cannot overwrite a different class, channel or subject.

The server still reads underlying attempts to calculate a report. This reduces
response bandwidth compared with downloading histories; it is not a materialised
rollup or a year-scale load-test claim.

## Validation

- `npm run build` and `npm test`: 308 software checks and 59 unit tests passed.
- Full `npm run test:auth-local`: passed on disposable PostgreSQL, Supabase Auth,
  PostgREST and Chromium. New tests check grade parity with student calculations;
  day balancing, retries, reveals, duplicates and clock handling; current versus
  archived flashcards; class/subject grants; student/guest rejection; password
  gates; revoked sessions; and delayed class/subject navigation. Browser requests
  use the compact RPC rather than raw history endpoints.
- `npm run test:staff-layout`: teacher/admin flows at 320, 390 and 1440 pixels,
  both subjects/channels, filtering, empty flashcard catalogues, participation
  visibility and no whole-page horizontal overflow.

Hosted migration application, hosted Supabase and production deployment have not
been changed or verified here. Retention remains off pending main release and
checks; email alerts remain deferred.
