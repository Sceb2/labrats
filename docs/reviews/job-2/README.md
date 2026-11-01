# Job 2 — mobile topic-selection workflow

Development-only update on top of job 1. Main and hosted Supabase are unchanged.

- Learning mode links sit immediately below the topic-page heading in both subjects.
- Selected topics and explicit guest mode still pass to flashcards. With no topics,
  tapping Flashcards focuses the first topic instead of opening an empty catalogue.
- On screens below 900px, the existing summary and Start/Resume controls remain
  visible above the bottom navigation. Their actual heights are measured; the page
  reserves scroll space and focus margins, including when the text wraps.
- A substantially shrunken visual viewport while a typing control is focused hides
  the dock to avoid covering the keyboard; it returns when the viewport recovers.
- Unexplained per-topic totals are removed. The summary reports eligible questions
  from the current topic/filter selection. Applied Science also identifies the
  planned session question/mark count; Chemistry describes the approximate marks.
- No changes to eligibility, prerequisites, session selection, marks or persistence.
- Existing resume controls are preserved inside the panel. Desktop retains normal
  in-flow Start controls rather than adding a floating mobile-style panel.

Verification: build, unit checks and mobile/desktop design checks. Design tests
cover 320/390/1280px widths, mode placement, disabled/enabled Start state, empty
Flashcards selection focus and panel geometry above bottom navigation. Flashcard
browser tests also exercise selected-topic navigation and bounded sessions.

Screenshots are 390×900 viewport crops of local guest pages. Real phone keyboard
and browser-toolbar behaviour still need device testing; emulation cannot establish
those results. Jobs 3 and scoring/report changes are outside this update.
