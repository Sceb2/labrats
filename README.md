# OCR Chemistry revision — review prototype

236 questions on this review branch: the original 216 and 20 new automatically
scored mechanism-recognition cards. The live site has not been updated.
Download `mechanism-cards-preview.html` and open it in a browser to try all 20 new
cards without sign-in or changes to saved progress. See the
[preview and marking guide](docs/MECHANISM_CARD_PREVIEW.md).

Mistakes lists all outstanding incorrect/partial questions. Review Question opens
one question; Review All Incorrect Questions opens the full backlog. Full marks
clear a mistake; a later wrong answer reopens it. Revealing or skipping does not
clear it. First-attempt scores remain unchanged. Compatible v1.7 progress migrates
automatically; historical errors are conservatively imported for one fresh review.

learning-resources.json is the single resource source: reusable videos/links,
reusable packs, question-specific assignments, and topic/type fallbacks.
All current questions have a video and revision links. Videos load only when the
student chooses Load video. Their external availability cannot be guaranteed.

Existing timed challenges, reports, celebrations, reduced-motion handling, marking
and update checking are preserved. Progress remains in local browser storage.
Browser-only practice keeps progress locally. The development branch also includes
an optional account pilot, described below. Keep the same site URL and avoid
clearing browser storage. This branch adds 64 original mechanism diagrams while
preserving the original 216 question records and their marking.

The release's outer folder includes RELEASE-NOTES.md, RESOURCE-GUIDE.md,
RESOURCE-COVERAGE.csv, START-HERE.txt and developer checks.

## Student login development

The separate `student-login.html` page provides Supabase student sign-in. New
signed-in practice attempts sync as metadata without selected answers or free
text, with an offline queue and separate guest history. Adaptive practice is now
the default, with shared A–E revision guidance and an optional Random mode.

`staff.html` adds invited staff sign-in, administrator/teacher account controls,
classes, batch student credentials, resets and scoped progress reports. Download
`staff-preview.html` and `student-site-preview.html` for fictional-data testing.
See [staff prototype setup](docs/STAFF_PROTOTYPE.md) for the new migration, Edge
Function deployment and first administrator setup, and
[adaptive practice](docs/ADAPTIVE_PRACTICE.md) for the rating/scheduling rules.

See [progress sync setup](docs/PROGRESS_SYNC.md) for the two additional database
queries required after the original account migration. Do not deploy the branch
before applying them and validating hosted signed-in practice.

See [student login setup and deployment](docs/STUDENT_LOGINS.md) for the database
migration, private account-provisioning commands, security model and pilot steps.
Never put administrator keys or credential exports in this repository.

Developer checks: `npm ci`, `npm run build`, `npm test`.
With Docker and Chromium available, `npm run test:auth-local` tests real local
Supabase Auth, database access policies and browser login flows.
