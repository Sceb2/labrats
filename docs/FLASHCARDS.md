# Flashcard prototype — local review

Status: flashcard implementation and the reviewed practice UI are included in
`LabRats-Online` for development use. This does not deploy either live site or
apply the hosted Supabase migration. Guest-only review ZIPs are also available
on the development branch.
The reference sample is the OCR-aligned 33-card Organic names and formulae CSV.

## Practice screen review — 26 October 2026

The practice screen uses one warm-white card with two faces. Tap/click, Enter or
Space flips it sideways in 300 ms. Reduced-motion preference removes animation.
Students can flip back; both assessment buttons remain enabled after the first
reveal. Disabled buttons reserve their space before reveal. The topic, session
count and grade sit above the card. All question and answer content uses the same centred 1.5rem serif type,
with formulae and line breaks preserved as escaped text. Question/Answer labels
use dark purple/green; the faces contain no extra instructional text. Both
assessment buttons use pastel backgrounds (pink/green).
The two faces share a height, avoiding layout jumps on reveal. Each new card
starts on its question face with a short arrival transition. Only the active
face is exposed to assistive technology. Setup/import screens are unchanged.

Verification for this UI pass: build, 308 software checks, 41 Node tests, and
all 7 flashcard unit/browser checks passed. Browser coverage includes 320/390/
1280px layouts, keyboard flip-back, reduced motion, stable assessment positions,
long multiline scientific content, escaped markup, guest isolation and bounded
20-card/Open sessions. Screenshots use the real sample content. No hosted
configuration or database changes are needed for this UI pass; the earlier
flashcard storage migration remains a separate, unapplied hosted change.

## Student flow

Choose a subject and the existing topics. Active Learning remains the primary
mode. The Flashcards link carries those selected topic IDs to the flashcard
session page; there is no extra pack selector. Only published packs for the
subject and selected topics are used. There is one published pack per topic.

- **20 cards:** up to 20 distinct initial cards, plus permitted retries.
- **Open Mode:** all available cards, ordered by adaptive weights. It ends; it
  does not run repeated rounds indefinitely.
- Reveal the answer, then choose **Got it** or **Not yet**. No third option.
- A missed initial card returns once, normally after three other assessments.
  Due retries take priority over remaining fresh cards. When only recently seen
  retries remain, the longest available gap is used; a one-card pool cannot
  provide intervening cards. No card is presented more than twice per session.
- Only the initial self-assessment contributes to the long-term N/A–E rating.
  A normal reveal of the back is required, not treated as question-answer help.
- Sessions can finish early. Unassessed cards create no scored event.
- Flashcard progress and tooltip wording explicitly describe self-assessed recall.
  They stay separate from automatically marked Active Learning results.

The pure adaptive calculation/weighted ordering is shared; flashcards use a card
count rather than the existing question mark-budget selectors. Confidence across
UTC dates and time decay are unchanged. A first successful day can give C, not A.

Guest results live only in page memory. The notice says to log in to remember
progress. No guest flashcard results or session drafts are written to browser
storage or uploaded. Leaving/reloading starts fresh. There is no guest import.

## Accounts and offline work

The existing student account/password gate, session verification and tab storage
are reused. The learning channel is explicitly `flashcards`, with separate
history, pending and rejected metadata keys per owner and subject. Flashcard and
question channels use the same upload acknowledgement/rejection implementation.
Each checks the expected owner server-side. Signing out clears both channels and
warns about waiting/rejected work across subjects/modes.

A reconnect or retry flushes waiting queues for this same account in other
subjects/modes too; question and flashcard events use their own RPCs. Validation
failures are isolated rather than silently dropping other events. Open the
relevant subject/mode to review rejected attempts. The account bar also shows
waiting work outside the current channel.

Account initialization errors now fail visibly instead of silently selecting
guest question storage. Active Learning provides an explicit browser-only choice
on that error page. Invalid public credentials are still rejected; network
failures can use an already validated tab-cached configuration.

Queued/saved history is metadata only: event/encounter IDs and sequence, versioned
card identity, bank/scoring identifiers, binary recall, timestamps and retry/mode
flags. No card front/back, selected answer or free-text response is added to
student attempt requests or caches. Internal field names match the shared
learning-event adapter, but the records live in `flashcard_attempts` only.
`answer_revealed=false` means no assistance penalty; normal back reveal is part
of the flashcard workflow and does not generate a separate reveal event.

Keep the tab open until work saves. Browser failure, tab closure or clearing
storage can lose unsynced work. Current session position is not persisted. This
is practice data reported by the student, not tamper-proof assessment evidence.

## Teacher tools

The existing staff dashboard has a Flashcard packs section for the selected
subject. Teachers manage their own packs in subjects granted to them;
administrators manage all packs. Students cannot create/import packs.

1. Select a new or existing pack, title and topic.
2. Download a CSV template for the selected topic if needed, then upload a UTF-8
   CSV or paste its content. The topic dropdown shows the required ID. Columns, in order:
   `card_id,topic,front,back`.
3. Preview the complete front/back table and row errors. The parser supports BOM,
   quoted commas, doubled quotes and multiline fields. Text is escaped for display;
   it is never interpreted as HTML or a spreadsheet formula.
4. Choose **Minor correction** or **New learning requirement**. Minor edits retain
   the content version/rating. A meaningful changed front/back creates a new version
   when published. Unchanged cards retain their versions in either case.
5. Save the private draft, then explicitly publish. The published pack stays
   available while the draft is prepared. Publication applies the replacement
   atomically. Stable IDs support reimports; omitted cards leave practice on
   publication but retain their history.
6. Archive a pack to withdraw it. History and previous versions are retained.

The Chemistry editor includes **Use Organic names sample** to preview/import the
33-card pack. The sample is not automatically published into any database.
Imports are bounded to 1 MB/1,000 cards, 80-character IDs, 2,000-character fronts
and 4,000-character backs. Each import must contain exactly one registered topic.
Optimistic revisions reject stale edits. A unique database index enforces one
published pack per subject/topic, including competing publication requests.

Teacher student reports include separate flashcard attempt counts, Got it counts
for 1/7/30-day windows and adaptive priorities (including N for current new cards).
Historical versions remain in reporting totals; withdrawn versions are excluded
from current practice priorities. Student progress on the flashcard page is for
current cards in its selected topics. Teachers require class membership and
subject authority to read student history, including for shared student accounts.

## Database draft — do not run during local review

New file: `supabase/migrations/202610260010_flashcards.sql`. It builds on 001–009;
it does not rewrite them. All migrations were applied only to disposable local
PostgreSQL/Auth/PostgREST during this work.

New tables: `flashcard_topics`, `flashcard_packs`, `flashcard_pack_drafts`,
`flashcard_cards` and `flashcard_attempts`. Draft content and pack-owner identifiers
are private. Guests can read the published catalogue/card content, not drafts or
learning results. Public pack column grants exclude owner IDs. The authenticated
staff listing RPC verifies a live, active staff session before returning ownership.
Card identities include pack UUID, stable card ID and content version.

New RPCs: `manage_flashcard_pack`, `staff_flashcard_packs` and
`sync_flashcard_attempts`. All mutation uses server authorization and a fixed
search path. No browser service-role key or new administrative connection is
required. No Edge Function redeployment is required for these RPCs.

The subject/topic registry is `flashcards/topics.json`, checked against the
existing UI's topics. Applied Science uses its existing grouped Waves topic IDs.
Adding future topics requires a deliberate registry/database addition, rather
than accepting arbitrary teacher-supplied subject/topic strings.

Before hosted testing, review this migration and deployment files together.
Existing rows are not imported or converted. Retention remains the school's
existing unresolved policy; this feature does not add automated deletion.

## Build and preview

`npm run build` generates the flashcard bundle and a guest-only standalone
`flashcards-preview.html`, along with the normal subject/staff previews. The
standalone sample makes no backend connection and can be opened from a file.
The sample JSON is generated from the reviewed CSV, not independently authored.
Only Chemistry has test content; Applied Science supports the same feature but
has no sample pack yet. Normal pages read the published database catalogue with an anonymous public
client; student tokens are used only for account checks and private progress.

The release fingerprint now covers referenced Chemistry/Applied Science SVG
bytes and the new flashcard assets. Diagram-only corrections invalidate a release.
Generated artifacts must be rebuilt rather than edited individually.

Checks:

```sh
npm run build
npm test
npm run test:flashcards
npm run test:design
npm run test:mechanism-preview
OCR_DENO_EXECUTABLE=/path/to/trusted/deno npm run test:auth-local
```

The local Auth runner includes publishing/draft/version/RLS tests, guest sessions,
CSV preview, real sample publication, account practice, offline sync, cross-mode
queue draining and sign-out. Existing account/subject/question integration tests
remain in the same runner. Native Deno validates the existing generated staff
Edge Function too. Hosted settings, school devices, workload scale and production
privacy arrangements still require their own review.

## Verification recorded on 26 October 2026

- Build passed; release regression checks stable rebuilds and diagram-only changes.
- 308 software checks and 41 Node tests passed.
- Guest flashcard/browser checks, both-subject design checks and all 20 mechanism
  cards passed their browser suites.
- 80 tests across the disposable local Auth/backend/browser suites passed with
  native Deno; all test services were disposed afterwards.
- The packaged guest review was checked from its extracted folder over localhost,
  including topic navigation and the displayed CH₃CH₂CH₃ answer, with no outside
  requests. Direct file navigation is blocked by this environment's managed
  Chromium policy, so a double-click run could not be independently verified here.
- No hosted configuration or hosted migration was modified during verification.
  Review ZIPs were subsequently shared on the development branch.

Storage separation and preserving published cards during draft editing were
explicitly approved. The user approved pushing the functionality and refined UI to `LabRats-Online`
on 28 October; the flip duration was restored to 300 ms.

## Development branch verification — 28 October 2026

The user requested the complete flashcard implementation and reviewed UI be
pushed to `LabRats-Online`, with the flip restored to 300 ms. The downloadable
flip preview was rebuilt to match.

- Build, 308 software checks and 41 Node tests passed.
- All 7 flashcard unit/guest-browser checks passed.
- All 6 design checks and the 20-card mechanism browser check passed. The first
  concurrent design run timed out opening a setup page; an isolated rerun passed.
- All 80 disposable local Auth/backend/browser tests passed; services cleaned up.
  Native Deno was unavailable for this rerun; the earlier native-Deno results
  above are historical evidence, not a fresh native-runtime check.
- This branch update does not apply migration 010 to hosted Supabase, publish
  a sample pack there, or deploy a live site. Hosted flashcard use requires the
  migration and a teacher-published pack; the standalone preview embeds the sample.
