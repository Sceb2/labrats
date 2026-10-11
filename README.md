# OCR A Organic Chemistry Revision — Stage 1 pilot

## What is included
A mobile-first static website with 36 original pilot questions: six each for reagents and conditions, multi-step synthesis, mechanism identification, mechanism completion, nucleophilic/electrophilic sites, and nomenclature. Content is separate in `questions.json`.

Authority used: OCR Chemistry A H432 specification, Version 3.1 (May 2026). The OCR 2017 reaction-pathways resource was used only as a pathway starting point. Every item is labelled `teacher-review-required` because software validation cannot replace chemistry review.

## Run on your computer
1. Unzip the folder.
2. Open Terminal/Command Prompt in the folder.
3. Run `python -m http.server 8000` (on Windows, `py -m http.server 8000` may be needed).
4. Visit `http://localhost:8000`.

Do not double-click `index.html`: browsers often block loading `questions.json` from a local file.

## Static hosting
- **GitHub Pages:** create a repository, upload these files to its root, then Settings → Pages → Deploy from branch → `main` / root.
- **Netlify Drop:** drag the unzipped folder to https://app.netlify.com/drop.
- **Microsoft 365/SharePoint:** modern SharePoint pages do not normally run arbitrary JavaScript uploads directly. Host on GitHub Pages/Netlify and add it as a link; embedding may be restricted by your organisation.

No build step, backend, student account or paid API is required.

## Updating questions
Edit `questions.json` in a text editor. Copy an existing item of the same `type`, give it a new stable `id`, and update prerequisites, exact specification references, options, answer index, feedback and status. `answers:[0]` means the first stored option is correct; displayed options are shuffled with their correctness attached, so position does not affect marking. Keep every prerequisite topic needed to answer and to reject distractors.

For an equivalent reagent, add its wording to the vocabulary alias array under the same stable chemical ID. The current pilot uses structured selection rather than typed answers, so equivalent labels are consolidated into one option, e.g. “Acidified potassium dichromate(VI) — K₂Cr₂O₇/H⁺”.

## Known limitations
- The Stage 1 bank is a manageable pilot, not complete H432 organic coverage.
- Mechanism completion assesses chemically anchored source→destination choices rather than free curved-arrow drawing. This is the accessible introductory scaffold requested; free SVG arrow placement is a Stage 2 enhancement.
- Structure displays use condensed formulae in this pilot rather than a complete reviewed SVG asset library.
- Multi-step questions currently select complete valid routes. Per-arrow independent panels are a Stage 2 enhancement.
- Mistakes are summarised, but a dedicated mistake-only queue is not yet implemented.
- All chemistry items need teacher approval before high-stakes use.

See `TEACHER_REVIEW.md`, `COVERAGE.md`, and `tests.html`.
