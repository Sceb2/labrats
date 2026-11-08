# LabRats working instructions

## Branches and review

- Work on `Combined-Drafts` by default. Update or deploy `main` only when the user explicitly asks.
- Check the branch and working tree before editing. Once a development task is tested, commit and push it to `Combined-Drafts` without asking again, subject to the review points below.
- For substantial UI or workflow changes, show the user a preview and allow them to review it before pushing to development. Preview files and screenshots need not be committed.
- Propose changes to question wording, answers or marking rules and check with the user before implementing them. Preserve approved content until the user agrees.
- Do not change hosted Supabase, its configuration or real accounts unless explicitly requested. Never test against hosted student data. Use fictional data and disposable local services.

## Project map

- `index.html` is the subject selector; `chemistry.html` and `applied-science.html` are the student practice pages. Both share accounts and platform services while keeping subject progress and permissions separate.
- Chemistry questions and diagrams use `questions.json`, `assets.json` and `assets/`. Applied Science uses `applied-science/` and the approved Forces/Electricity source files in `content-drafts/`; despite the directory name, those files are production build inputs.
- Auth, progress sync, adaptive practice, staff tools and flashcards have authored modules in `src/`. Database migrations and Edge Function sources are under `supabase/`; do not rewrite migrations already applied to a hosted project.
- Browser bundles, release metadata and some question-bank files are generated. Change their authored sources and regenerate them with the build scripts; do not hand-edit generated output.

## Build and verification

- Install dependencies with `npm ci`; run `npm run build` and `npm test` for relevant code changes.
- Use the focused browser checks in `package.json` when relevant. `npm run test:auth-local` uses disposable local services and Chromium; it must not target hosted Supabase.
- `npm run build:previews` generates optional, Git-ignored standalone review files. See `docs/PREVIEWS.md`. Keep historical previews, screenshots and downloads out of Git unless the user asks otherwise.
- Preserve offline queues, account and class/subject boundaries, adaptive scoring and guest practice. Report what was tested, what could not be tested and any relevant limitations.

Keep the interface consistent across both subjects, clear and usable on mobile. Prefer small, justified changes over broad rewrites or extra dependencies. Consult the current README and relevant `docs/` files for details rather than relying on historical review notes.
