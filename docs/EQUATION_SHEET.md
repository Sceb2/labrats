# Applied Science equation sheet

Every Applied Science question has an **Equation sheet** button below the question introduction. This includes Waves practice and the separate Forces and Electricity draft previews, including their feedback screens. It opens a native modal dialog within the same tab. The complete sheet scrolls below a fixed Close button; Escape and clicking outside the desktop window also close it. Closing restores focus to the button and preserves the student's current answers.

The reference follows the full formulae sheet on page 20 of Pearson's BTEC AAQ Applied Science Unit 3 Physics sample assessment material, Issue 3, May 2026, supplied for this review. It retains the equation order, constants and all four kinematic equations. Attribution is included at the bottom. No equation is selected or highlighted for the current question. Other relationships are not added to the examination reference.

The sheet is a static learning resource: opening or closing it does not record a hint, reveal, retry or attempt, modify storage, or change scoring/adaptive ratings. Its content and styles are embedded in the downloadable previews, with no PDF viewer or external requests required. No Supabase migration or configuration is needed.

The repeated question-level mark line has been removed. Marks beside individual parts, marking feedback, session totals and review/mistake mode labels are retained.

## Maintenance

- Shared content and dialog behaviour: `applied-science/equation-sheet.mjs`.
- Shared presentation: equation-sheet section of `applied-science/physics.css`.
- Main practice integration: `applied-science/app.js`.
- Forces/Electricity preview integration: `content-drafts/forces/preview.js`.

Regenerate with `npm run build`, `node scripts/build-forces-preview.cjs` and `node scripts/build-electricity-preview.cjs`. Run `npm test` and `npm run test:equations`. The browser check covers 320px, 390px and desktop widths in Waves practice and the three standalone previews, retained answers, unchanged stored progress/hints, keyboard access, close/focus behaviour, scrolling, all 20 reference entries and removal of repeated totals.
