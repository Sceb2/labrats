# LabRats codebase review

Reviewed 26 October 2026. Baseline: `ef46e6382eeebcdb8744c66435f1d0e049b01ec5`
on `LabRats-Online` in `Sceb2/ocr-organic-revision`. The checkout was clean and
matched the remote branch at the start. No project-level `AGENTS.md` was present;
dependency packages' instructions were outside the authored code being changed.

## Assessment

The application has a usable shared foundation for a small flashcard prototype.
Accounts, attempt metadata, adaptive calculations, rating badges and subject
registration already have distinct modules. A framework migration or wholesale
rewrite is not justified by this review. The main risks are state transitions,
work repeated over the full event history, and manually maintained release and
preview assembly. These are specific engineering issues, not evidence about who
or what authored the code.

Two application fixes and a timing-sensitive test correction were made in this
pass. Remaining medium findings below should be planned explicitly. In
particular, fix silent account-to-guest fallback before extending signed-in
practice. A fictional-data flashcard demonstration can follow that work; this
review does not establish readiness for real-student use.

`main`, both live sites, hosted Supabase, question content, marking rules,
adaptive mathematics and SQL migrations were not changed. The rat illustrations
remain in their separate review artifacts only. Historical ZIP downloads and
design snapshots were not rebuilt.

## Research and review checklist

The following primary engineering sources were actually retrieved and read.
Rendered Google/GitHub documentation addresses were blocked by this environment;
their public Markdown source was accessible. This was a targeted source review,
not an exhaustive literature survey or a measurement of AI-generated defect rates.

1. [GitHub: Best practices for using Copilot](https://github.com/github/docs/blob/main/content/copilot/get-started/best-practices.md).
   Review functionality, security, readability and maintainability; understand
   suggestions and verify them with tests and tooling.
2. [GitHub: Application card for Copilot Agents](https://github.com/github/docs/blob/main/content/copilot/responsible-use/agents.md),
   especially limitations and responsible development: plausible code can be
   semantically incorrect; review feedback can be mistaken; generated changes
   still need verification. This is vendor guidance, not independent prevalence evidence.
3. [Google Engineering Practices: What to look for in a code review](https://github.com/google/eng-practices/blob/master/review/reviewer/looking-for.md).
   Check design, actual functionality, concurrency, overengineering, useful tests,
   context and documentation. Avoid mixing broad stylistic changes with fixes.
4. [Google Engineering Practices: Small CLs](https://github.com/google/eng-practices/blob/master/review/developer/small-cls.md).
   Prefer self-contained changes, related verification and reversible scope.

Those sources motivate the following checklist. The individual pitfalls are
ordinary software risks worth checking in AI-assisted development; the sources
do not establish that they are exclusive to AI or equally frequent.

| Check | Assessment in this repository |
| --- | --- |
| Duplicated behaviour and drift | Shared adaptive/feedback helpers are useful. Staff foreground/background loading had drifted; fixed below. Guest and account storage intentionally differ. |
| Unnecessary abstractions, dependencies and configuration | One direct runtime dependency, Supabase JS; esbuild and Playwright serve demonstrated build/testing needs. No dependency removal or new framework is warranted. |
| Coupled responsibilities and oversized modules | Subject controllers mix rendering, navigation and state. Staff has several mutable scope variables. These deserve small boundaries when modified, not arbitrary file-size targets. |
| Conflicting sources of truth | Ratings are derived from events, which avoids a second stored grade table. Subject selection and its loaded bank could become inconsistent. Release inputs are maintained separately from preview inputs. |
| Dead code and obsolete compatibility | `app.js:17`'s `topicCountLabel` has no other reference in tracked authored code. Small optional cleanup; not consequential bloat. Legacy username support and reset rejection wrappers are deliberate compatibility/security boundaries and should stay. |
| Broad error handling | Account setup's catch-all guest fallback is material. Generic staff errors intentionally avoid exposing credentials. Optional sound/storage fallbacks are generally reasonable, not automatically defects. |
| Meaningful tests | Real Auth/PostgREST/browser tests exercise permission and offline failures. Unit/string checks alone cannot cover those. New regressions reproduced two defects; one existing cross-view assertion needed a common clock. |
| Authored versus generated code | Maintain `src/*`, subject sources and builders; regenerate bundles. Standalone previews and ZIPs are separate delivery/review artifacts, not multiple independent implementations. |

## Architecture and representative flows

| Area | Implementation and observations |
| --- | --- |
| Entry and subjects | `index.html` is the hub; `subjects.json` and `src/subjects.cjs` register Chemistry and Applied Science. Subject routes remain separate static pages. |
| Guest practice | Chemistry `app.js` uses `core.js` browser storage helpers. Applied Science `app.js` uses `state.mjs`. Guests retain local drafts/responses; no automatic account import occurs. |
| Accounts | `src/account-client.cjs` owns the Supabase client, tab/memory storage, profile checks and clearing. `student-login.cjs` handles initial/reset password gates. Staff uses a separate audience/storage namespace. |
| Signed-in attempts | `src/progress-sync.cjs` supplies account-scoped storage and record callbacks. `learning-events.cjs` projects an allowlist of 13 event fields. Account storage ignores answer/session drafts. Applied Science's account bridge adapts these events to its native progress view. |
| Marking and feedback | Chemistry's components/arrows/multistep scorer is `core.js`; Applied Science's units, numerical tolerances, method marks and self-assessment are `pilot-core.mjs`. `feedback.js` shares presentation, not scoring. Keeping these marking engines separate is justified. |
| Adaptive practice | `src/adaptive.cjs` supplies the same N/A–E derivation, assistance exclusion and weighted ordering to student and staff views. Chemistry reuses its whole-question mark budget; Applied Science preserves prerequisite/family constraints through its own selector. |
| Offline, logout and switching | Pending events keep their UUIDs across retries; only acknowledgements remove them. Definite validation failures are separated for review. Owner checks prevent uploading another account's queue; logout confirms discard and clears tab account caches while retaining guest history. |
| Staff authority | Browser controls are backed by RLS and RPC checks. `src/staff-service.mjs` is server-only and checks staff identity/live session before privileged operations. Migration 006 coordinates password resets and session revocation; 008 scopes results by subject as well as class. |
| Build and preview | `build-subjects` adapts the Applied Science catalogue/bundle; `build-auth` bundles login/sync and historical pilots; `build-staff` builds staff UI/server function/preview. Release preparation updates hashes/cache keys; site/mechanism preview builders embed source assets and CSP hashes. |

The local suites exercised representative guest and signed-in flows in both
subjects, forced password changes, invitations/resets, role escalation attempts,
cross-student/class/subject reads, offline queues, lost acknowledgements,
account changes and metadata-only persistence. They also exercised calculations,
self-assessment and mechanism cards. This is not a line-by-line audit of every
diagram, every educational answer or every possible browser state.

## Findings, ordered by severity

### 1. Medium — account-client setup errors silently select guest storage

**Status:** Deferred. **Confidence:** High; source tracing and a browser fault fixture.

**References:** [sync startup](../src/progress-sync.cjs#L14),
[config fetching and validation](../src/account-client.cjs#L17),
[Chemistry boot](../app.js#L394), [Applied Science boot](../applied-science/app.js#L366).

If a previously signed-in tab receives an invalid `auth-config.json` with HTTP
200, validation throws and `open()` returns `null`. Both subject controllers
then use guest storage without an account-unavailable explanation. The valid
cached configuration is used for fetch failures, but not this validation failure.
An account student could consequently practise without syncing and retain
responses under guest storage rules.

A Chromium fixture with a fictional cached profile/session, invalid public
configuration and all external requests blocked produced: setup available,
zero account bars, cached account still present, `accountSync === null`. This
verifies the fallback path; it does not claim a real Auth session was verified
in that fixture. This is not a server authorization bypass.

**Smallest reasonable fix:** Distinguish intentional guest mode from account
initialization failure. Preserve the existing queue and show a recoverable
account error; let the student explicitly choose guest practice. Add tests for
valid/invalid/missing configuration with and without prior account state.
**Scope/risk:** Small-to-medium; affects boot/storage ownership in both subjects.
**Timing:** Before extending signed-in practice or a real-student pilot. Left
out of this pass because a blanket change to the fallback can break legitimate
guest/offline startup; the error-state contract needs its own complete change.

### 2. Medium — background permission refresh could use the wrong subject bank

**Status:** Fixed. **Confidence:** High; reproduced against disposable real Auth.

**References:** [scope application and foreground load](../src/staff-app.cjs#L30),
[background verification](../src/staff-app.cjs#L104),
[regression scenario](../tests/staff-browser.cjs#L71).

A teacher can have both subject grants. If Chemistry is revoked while their
dashboard is open, `applyScope()` selects Applied Science. Previously the
background verifier rendered without fetching the new bank. An Applied Science
report therefore displayed Chemistry's 236-question catalogue and omitted the
correct Applied Science topic/rating projection. The new test failed with
237 table rows instead of 111, including the heading row. Database subject
policies continued to protect actual event reads; this was a reporting defect,
not demonstrated disclosure of unauthorized learning events.

**Fix:** Clear previous reports/private controls, then reuse the normal guarded
`load()` path for the new subject and catalogue. This removes the second,
incomplete refresh path rather than inventing another loader.
**Scope/risk:** Small; browser staff loading. Covered through both refresh and
reporting in the staff workflow. **Timing:** Completed before flashcards.

### 3. Medium — diagram-only edits do not invalidate the release fingerprint

**Status:** Deferred. **Confidence:** High; reproduced in a disposable file copy.

**References:** [release file list/fingerprint](../scripts/prepare-site-release.cjs#L5),
[update comparison](../updates.js#L31),
[standalone image embedding](../scripts/build-site-preview.cjs#L20).

The fingerprint includes `assets.json` but not its SVG file contents, nor the
Applied Science question SVGs. Correcting a diagram without changing its path
or question JSON can leave the release ID and image cache key unchanged. Existing
tabs need not be told that a new release exists even though a freshly generated
standalone preview contains the changed diagram. In an isolated copy, changing
`assets/ethane.svg` bytes and rerunning the actual release script left the ID
unchanged. The repository's real diagram files were not edited.

**Smallest reasonable fix:** Include sorted, validated referenced asset paths
and bytes in release hashing, and add a test that changing only a diagram
changes the ID while identical rebuilds remain stable. Keep authored source,
generated previews and database question versions conceptually distinct.
**Scope/risk:** Small-to-medium; release IDs, cache invalidation and artifact
regeneration. **Timing:** Before publishing further diagram-only corrections;
include flashcard media dependencies when that format is introduced. Deferred
to a focused release change so asset coverage and compatibility are tested together.

### 4. Medium — every sync cycle downloads the entire subject attempt history

**Status:** Deferred scaling concern, not a demonstrated loss of records.
**Confidence:** High about the code path; deployment cost/latency unmeasured.

**References:** [full paginated pull](../src/progress-sync.cjs#L102),
[flush](../src/progress-sync.cjs#L112), [15-second timer](../src/progress-sync.cjs#L169).

Even with no new attempts, each online interval rechecks the account and pages
through all historical attempts, then merges/projects them again. Exactly
10,000 rows require 21 history requests at the current page size, including the
empty final page. More cards and longer retention increase cost and browser
work even when the student is idle. No school-scale load test was performed.

**Smallest reasonable fix:** First measure a representative history. Then add
incremental fetching with a server-safe cursor/reconciliation design, retaining
an initial full load and authorization checks. A naive device-time cursor can
lose late offline events; paging/concurrent commits also need explicit tests.
Consider visibility-aware polling separately from upload retries.
**Scope/risk:** Medium; synchronization correctness is involved.
**Timing:** Before a sizeable flashcard rollout; not a blocker for a small
fictional-data prototype. Do not replace the sync system wholesale.

### 5. Medium — Applied Science recalculated all ratings for every progress badge

**Status:** Fixed. **Confidence:** High; browser call count and synthetic benchmark.

**References:** [badge helper](../applied-science/app.js#L18),
[progress rendering](../applied-science/app.js#L316),
[regression](../tests/design-browser.cjs#L52).

Rendering 110 badges previously called the complete event-sorting/rating
calculation 110 times. A synthetic Node run with 10,000 valid metadata events
took about 2.75 seconds for 110 calculations versus 30 ms for one calculation
on this machine. These are diagnostic timings, not student-device performance
guarantees. Chemistry already computes a shared snapshot for its progress list.

**Fix:** Calculate once for the Applied Science progress render and pass the
result to each badge. No persistent cache or invalidation scheme was added;
the single-question helper still calculates when called normally. The browser
regression first failed with 110 calls and now passes with one and all 110 badges.
**Scope/risk:** Small; calculation reuse, no grading/selection change.
**Timing:** Completed before flashcards.

### 6. Low — the Applied Science account projection repeatedly sorts the same events

**Status:** Deferred optimization. **Confidence:** High from source inspection;
its isolated runtime impact was not benchmarked.

**References:** [native projection](../applied-science/account-bridge.mjs#L5),
[merge/sort](../src/learning-events.cjs#L5),
[records projection](../src/learning-events.cjs#L10).

For every attempted question, `nativeProgress()` calls `mergeEvents(events)`
again and filters the same complete history. `recordsFor()` has already done
another merge. This compounds the full-history work as more questions are tried.

**Smallest reasonable fix:** Merge once and group by question outside the loop;
index native questions once. Preserve first/reveal/retry semantics and version
filtering with late/out-of-order-event fixtures.
**Scope/risk:** Small-to-medium because the adapter's progress semantics differ
from the native guest model. **Timing:** Can wait until profiling or flashcard
adapter work; do not reuse this subject-specific projection for flashcards.

### 7. Low — a cross-view rating test compared different wall-clock instants

**Status:** Fixed in the test; adaptive behaviour unchanged.
**Confidence:** High; observed during verification.

**References:** [cross-view browser check](../tests/staff-browser.cjs#L58),
[continuous decay and thresholds](../src/adaptive.cjs#L35).

The test compared the student's rendered grade with the teacher's grade fetched
later. A half-credit result can sit exactly on the C/D boundary, so milliseconds
of decay can legitimately make them differ. One run failed `D !== C` before
reaching the new permission-refresh test.

**Fix:** Give both browser pages the same fixed Date during this comparison;
browser timers continue. Keep the actual rendered-grade comparison and the
existing separate decay tests. Do not weaken the assertion to accept any grade
or change the production algorithm to satisfy the test.
**Scope/risk:** Small; test-only timing control. **Timing:** Completed.

## Remaining maintenance opportunities

These are lower-priority recommendations, not additional proven runtime defects:

- **Controller readability:** `src/staff-app.cjs:57` onward and the subject
  controllers contain dense inline templates and handlers with mutable shared
  state. The catalogue bug demonstrates why loading one coherent subject scope
  matters. When changing those areas, keep a clear load/commit boundary and move
  specific pure report calculations into named helpers if reused. Do not split
  files merely to reach a line-count target or reformat the whole repository.
- **Preview/build duplication:** Several builders separately enumerate styles,
  scripts, embedded resources and CSP hashes. They currently pass browser checks,
  but adding flashcards to one list and not another is a credible future failure.
  Add a small shared manifest only when a concrete second consumer needs it;
  preserve exact CSP checks rather than replacing them with permissive policy.
- **Test entry points:** `npm test` does not run the real Auth/browser suites.
  No tracked GitHub Actions workflow enforces them. Keep the documented separate
  commands explicit; consider a local verification command or non-deploying CI
  once the intended runner/Docker environment is settled. A green unit command
  alone is insufficient release evidence.
- **Documentation drift:** `docs/DPO_PROTOTYPE_REVIEW.md:3` describes the deleted
  `feature/student-logins` branch and migration 006 stage; the current combined
  tool has two subjects and migrations through 009. `docs/SUBJECT_HUB.md` describes
  the current development architecture. Package metadata is 1.9.1 while the
  displayed product version is 1.13.0. Reconcile the active operational/DPO entry
  points before presenting them as current; historical design records can stay
  clearly historical. This pass does not invent hosted migration verification.
- **Account copy drift:** `applied-science/app.js:323` still says progress belongs
  to the browser even for signed-in accounts, unlike Chemistry's account-specific
  text. Align that explanation when next updating storage/error UI.

No additional runtime dependency, generalized service layer or new database
schema was needed for the changes made here. Legacy username validation and the
old reset RPC that deliberately rejects obsolete clients have live compatibility
reasons. Deleting them to reduce file count would introduce risk.

## Generated files and repository size

The maintained sources are `src/*`, the root Chemistry scripts, Applied Science
modules, CSS, banks and builder scripts. `student-login.js`, `progress-sync.js`,
`staff.js`, `applied-app.js`, the generated Edge Function and standalone HTML
previews are outputs. Bundling the same dependency into separate standalone
documents is intentional; do not refactor those generated files independently.

The baseline `downloads/` and `docs/` folders were approximately 18 MiB each on
disk. Much of that is historical ZIPs, PNG previews and review snapshots. Normal
student pages do not request those archives; these sizes do not establish a
student page-load problem. Moving future large review downloads to release
attachments is optional repository housekeeping. No historical assets were
deleted, no ZIPs were repackaged, and the shelved rat gallery remains separate.

## Verification and limits

- `npm ci --cache /tmp/labrats-review-npm-cache`: passed with the existing lockfile.
  The first plain `npm ci` attempt failed because the default cache under
  `/home/agent/.npm` was unwritable; using a writable temporary cache resolved it.
- Baseline `npm run build` and `npm test`: passed; repeat build produced no changes.
- Post-fix `npm run build`: passed; affected artifacts were generated by the
  normal builders. Unrelated historical previews/downloads were not rebuilt.
- Post-fix `npm test`: 308/308 software checks and 35 Node tests passed.
- Post-fix `npm run test:design`: 6 tests including the parent, all passed; both
  subjects, 320/390/1280 px layouts, shared feedback and standalone CSP checks.
- Post-fix `npm run test:mechanism-preview`: passed, exercising all 20 added cards.
- Disposable `npm run test:auth-local` with native Deno: all 71 tests passed
  across the runner's suites, including parent tests. The runner applies migrations 001–009 locally and
  disposes test accounts/containers. No hosted credentials or data are used.
- New regressions failed on the original implementation for the wrong staff
  catalogue and repeated rating calculations, then passed after the fixes.
  Intermediate test runs also exposed the clock-sensitive assertion and a new
  fixture's outdated W01 version assumption; those test issues were corrected.
- Supplemental browser fault fixture verified silent guest fallback without
  contacting a backend; an isolated-copy probe verified incomplete asset hashing.

The final local Auth run completed successfully and disposed of its test accounts
and services. Logs showed zero failed or skipped tests.

Not verified: hosted Supabase configuration/deployment parity, provider logs and
processing locations, school-device/browser coverage, large concurrent loads,
all educational content or a complete security/privacy audit. Local GoTrue,
PostgREST and PostgreSQL with the generated Deno function exercise real service
behaviour, but do not reproduce every managed Supabase/gateway configuration.

## Flashcard readiness and recommended next work

Reuse the existing account client, staff authorization patterns, subject registry,
topic identifiers, badge UI and pure adaptive calculation/weighted-ordering
functions. Keep topic eligibility and selection policy explicit; the current
question selectors fill a mark budget, whereas a flashcard session will probably
use a card count. Do not force cards through Chemistry's marking engine or the
Applied Science native progress adapter.

Give packs/cards stable identities and content versions. Keep self-assessed
flashcard events, ratings, attempts and reports separate from automatically
marked question progress, even when they share an account and topic. The current
event catalogue is question-oriented; a shared algorithm does not by itself make
its database/report contract suitable for cards. Design that contract and the
minimum necessary migration separately, without editing deployed migration files.

Before implementation, address finding 1 and decide the new practice-kind/storage
boundary. Before publishing content/media, address finding 3. Before expanding
usage, measure and address findings 4/6 as needed. Then prototype one pack and
one complete reveal/right/wrong flow before adding CSV management. CSV work needs
bounded sizes, explicit topic mapping, useful row errors, safe text rendering,
duplicate/reimport rules and preview-before-import behaviour.

The existing documented real-student prerequisites still apply: an agreed
retention/deletion process, verified hosted access and registration/password
settings, controlled staff/credential distribution, suitable hosting/origins,
and school review of provider processing and optional external/reporting routes.
Passing these local tests does not establish GDPR compliance or production readiness.
