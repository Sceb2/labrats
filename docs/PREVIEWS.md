# Optional previews and test fixtures

`npm run build` generates the normal website and server bundle. It does not
generate standalone HTML previews or screenshots.

When a downloadable review copy or preview-based browser check is needed, run:

```sh
npm run build:previews
```

This first builds the website, then generates eleven standalone HTML files at the
repository root: the subject hub, both subjects, flashcards, staff tools/showcase,
login/progress pilots, mechanism cards, and Forces/Electricity review fixtures.
The outputs are ignored by Git and are not needed by the live site. Keep the
generators, question sources, licences and preview-specific test coverage.

`subject-hub-preview.html` links the current subject and staff preview files;
copy those together when sharing a complete review pack. `flashcards-preview.html`
is a guest-only sample. Other account previews can contact the configured backend
when signing in; use fictional accounts for review. Generating the files itself
does not contact or modify hosted Supabase.

The npm browser-test commands that need these files generate them first.
`npm test` builds its standalone mechanism fixture in a temporary directory.
When invoking preview browser files directly with Node, run `build:previews`
first. Account integration uses disposable local services only.

Automated screenshots belong in `/tmp`, `test-results/` or another ignored
artifact directory, not in the tracked documentation. Optional legacy design
generators can still create ignored mockups when explicitly invoked.

## Historical review material

The 6 November 2026 cleanup removed historical ZIPs, generated preview HTML,
design mockups and screenshots from the current tree. Written reviews, approval
records, original rat illustrations and all production inputs remain.

The files are recoverable from [the last pre-cleanup commit](https://github.com/Sceb2/labrats/tree/b2243c97400d17a99eaa3ea4822bb4d5b45fea60).
Historical review links point to that commit rather than missing local files.
This did not rewrite Git history or modify the live branch or hosted database.
