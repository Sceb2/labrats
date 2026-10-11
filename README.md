# OCR A organic chemistry revision — Version 0.2

A replacement for the supplied Stage 1 pilot. Plain HTML, CSS, JavaScript, JSON and SVG; runs directly on GitHub Pages. No build step, framework, account, backend, database or paid service.

## Replace the existing GitHub Pages files

1. Download a backup of your repository: **Code → Download ZIP**.
2. Unzip this replacement ZIP. Open the `ocr-organic-revision-v0.2` folder.
3. In your GitHub repository, open the folder that currently contains the site's `index.html`. Keep this location: it may be the root or `docs`, depending on your existing Pages setting.
4. Choose **Add file → Upload files**. Upload the replacement root files and the `tests` and `docs` folders to this location. Do not upload the outer folder as another level, and do not upload the ZIP itself. GitHub limits each web upload to 100 files.
5. Create/open an `assets` folder at the same level as `index.html`. If needed, use **Add file → Create new file**, name it `assets/README.md`, enter “Chemistry diagram assets”, and commit. Inside `assets`, upload the 107 SVG files in two batches (for example, 80 then 27).
6. Commit the upload with a message such as `Update organic revision to v0.2`. Replace files when prompted. Leave unrelated repository files and any custom `CNAME` file in place.
7. Your existing **Settings → Pages** branch/folder can stay the same. Wait for the Pages deployment check to finish, then refresh your published URL. If old content appears, use Ctrl+F5.
8. Open `tests.html` at the same published location. Expect **143/143** software checks. Open `teacher.html` to inspect chemistry before classroom use.

No terminal is needed for uploading, editing normal question records or running the hosted checks. A double-clicked local `index.html` cannot load JSON in most browsers; use GitHub Pages. Developers can use any static HTTP server for local testing.

## What is included

- **98 original question records**: 16 reagents/conditions, 12 two-to-four-step routes, 14 identification tasks (12 named mechanisms + 2 explicitly separated reaction descriptions), 12 completion tasks, 12 sites, 16 names, 8 products and 8 errors.
- Nine anchored curved-arrow tasks, plus three introductory completion/equation scaffolds. Desktop diagram buttons, large mobile site buttons, and origin/destination selectors all use the same chemical IDs.
- Independent component and pathway-step marks, complete alternative methods, equivalence vocabulary, shuffled stable answer IDs and optional details that do not earn or cost marks.
- Untimed practice, a first-attempt mistake queue, retries, reveal protection, completed-session review, and 5/10-minute personal challenges.
- Teacher filtering, answer/asset inspection, JSON record editing, vocabulary/topic editing, import/export and validation.
- A shared pure marking engine, a hosted test page, Node tests and optional Playwright browser tests.

## Source and chemistry-review status

Authority: **Cambridge OCR Chemistry A H432 specification, Version 3.1 (May 2026)**. Downloaded and read from the official OCR URL on **11 October 2026**. The supplied ZIP contained no specification attachment; the current official document was used instead. See `docs/SOURCES.md` for the precise record and SHA-256 fingerprint.

All 98 questions are **teacher-review-required**. Content has been checked against the stated source and for common ambiguities during development, but no generated question has been assigned teacher approval. The “Teacher-approved only” filter is therefore initially empty. This is a focused bank, not complete H432 organic coverage.

See `COVERAGE.md`, `docs/QUESTION_COVERAGE.csv`, `docs/AMBIGUITY_REPORT.md` and `TEACHER_REVIEW.md`. Software checks do not establish chemical accuracy or teaching quality.

## Use with students

1. Select **Basic concepts and nomenclature** plus every completed topic needed for the chosen questions. Structural literacy is an explicit prerequisite throughout.
2. Select question types and difficulty. The count updates using **all** prerequisites, not any one matching topic.
3. Start normal practice, or review partially correct/incorrect first attempts.
4. For synthesis, open each numbered arrow and fill its separate answer panel. Submit the whole route together; later answers are not disclosed during entry.
5. For mechanisms, select a source then a destination, or use the labelled selectors. Undo/clear as needed. Exact curve shape and arrow order are not marked.
6. Reveal or retry when needed. These cannot increase first-attempt accuracy. The summary reports first-submission results, with unattempted answers only revealed on request.

## Personal challenges

Untimed practice remains the default. Before starting a 5/10-minute challenge, the page explains that partial marks count, speed gives no bonus and feedback appears after the challenge. Accuracy is marks earned divided by marks available on submitted questions. Ties are broken by marks earned. Unsubmitted questions are reported separately. A queue is shuffled once and has no repeats.

Personal bests only compare identical topic/type/difficulty/status selections, duration and bank/scoring versions. The deadline uses `Date.now()` timestamps; refresh and backgrounding do not restart it. A session also ends if its queue is exhausted.

## Maintenance and technical details

See `docs/MAINTENANCE.md` for complete examples. In the hosted teacher editor, apply edits, validate, download `questions.json`, then upload it to the same GitHub location. Nothing is silently written to GitHub. Editing bumps the bank version so incompatible stored scores are safely reset.

`questions.json` owns topics, vocabulary, exact references and questions. `assets.json` links separate SVGs. `core.js` owns scoring/filtering/storage rules, `ui.js` shared display, `app.js` student flow, and `teacher.js` teacher tools. Existing URLs and minimal static hosting remain practical.

Progress is local to a browser, with at most 12 completed sessions retained. It does not sync across devices. Stage 1 scores cannot be fairly compared with component marking and use different storage keys. No leaderboard or passwords are included; all public repository content, including answers, can be inspected.
