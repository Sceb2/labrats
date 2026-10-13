Organic chemistry revision v1.1 — GitHub Pages update

This release changes the student interface. The v1.0 question bank, answer options,
chemistry SVGs, marking code and bank/scoring versions are unchanged.

1. Download and extract ocr-organic-revision-v1.1.zip.

2. Open your existing GitHub repository and go to the folder containing the LIVE
   site's index.html. If Pages publishes from /docs, use that folder; otherwise use
   the same folder you used previously.

3. Choose Add file > Upload files. From the ZIP's PUBLIC-SITE folder, upload these
   FIVE files into that same live-site folder:

   index.html
   app.js
   ui.js
   styles.css
   experience.js  (NEW — this file must be uploaded)

   These are complete replacements, not snippets to paste into old files.

4. Commit the upload with a message such as "Apply Design A interface and feedback".
   Wait for the Pages deployment in GitHub Actions to finish successfully.

5. Open your existing site address and hard-refresh:
   Windows: Ctrl + Shift + R. Mac: Cmd + Shift + R.

6. Check the following:
   - Choose your topics, expand Module 6, change Practice settings and start.
   - Submit a partly correct answer: check its correction and Next question.
   - Retry it: the original first-attempt score should stay unchanged.
   - Try a synthesis route and a mechanism question.
   - Check the Session menu and Resume practice.
   - Try the timed challenge: correctness must appear only at the end.
   - Check the same site on a phone.

Keep core.js, questions.json, assets.json, the assets folder, report-config.json,
any CNAME file and your Pages settings as they are. The supplied PUBLIC-SITE folder
contains the complete site if you need it, but these five UI files are all that
must change when updating the supplied v1.0 installation. Do not replace personal
question edits or your reporting email configuration unnecessarily.

Do not upload the enclosing PUBLIC-SITE folder as a new nested website folder.
Do not upload TEACHER-ONLY, SCREENSHOTS or OPEN-UI-PREVIEW.html to the public site.

OPEN-UI-PREVIEW.html is a self-contained local copy. Double-click it after
extracting the ZIP to inspect the new interface without hosting. It uses the same
questions, diagrams, marking and UI as the public site, with its bank embedded.
It is a separate browser location: its saved progress does not transfer to Pages.

Keep TEACHER-ONLY on your computer. Its existing editing tools are preserved; its
student-preview windows now use Design A.

Screenshots of the implemented interface are in SCREENSHOTS. Confetti screenshots
capture the real animation mid-flight; there is no student-facing replay button.

Celebration effects can be disabled in Practice settings or the Session menu.
Reduced-motion device preferences always prevent animation; a static celebration
remains for perfect sessions when effects are enabled. A perfect session requires
all planned questions fully correct on their first submissions, with no answers
revealed in that session. Partial answers, extra-arrow deductions, early finishes,
reveals and retries cannot turn an imperfect session into a perfect one.

Saved progress uses the existing keys and unchanged bank/scoring versions. A new
separate preference stores the effects toggle. Do not clear browser storage when
updating if you want to retain existing student progress.

To roll back, replace the four existing UI files with their v1.0 copies. The new
experience.js can remain unused; its preference does not affect marking/progress.
