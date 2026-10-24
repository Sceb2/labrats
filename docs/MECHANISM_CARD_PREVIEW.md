# Automatically scored mechanism cards — review preview

The review branch adds **20 cards (MC25–MC44)** and **64 original SVG diagrams** to the prototype. Four combined cards and sixteen focused cards assess the sixteen source marking groups from the [original question pack](MECHANISM_MARKPOINT_PACK.md). The prototype bank now contains 236 questions. The live site and hosted Supabase project have not been updated.

## Try the questions

Download [mechanism-cards-preview.html](../mechanism-cards-preview.html), save the raw file and open it in a normal browser. GitHub's source viewer shows HTML code rather than running it; use **Download raw file**. No neighbouring files or login are required.

Screenshots of the actual preview: [desktop](previews/mechanism-cards-desktop.png) and [mobile](previews/mechanism-cards-mobile.png). They show the bromine first-stage focused card; the interactive preview contains all twenty cards.

Updated examples after chemistry review: [cyanide attack](previews/mechanism-cyanide-corrected.png), [restoring the aromatic ring](previews/aromatic-restoration-corrected.png), and [displayed organic products](previews/displayed-products.png).

1. Choose a card from **Question to preview**, or use **Previous card / Next card**.
2. Select a diagram for each part, and a mechanism name when requested.
3. Use **Check answer** for the actual tool's automatic marking and feedback.
4. Use **Enlarge diagram** to inspect a choice at full size in another tab. This does not select the choice.
5. Try an incorrect answer, retry it, or reveal the model answer. The first-attempt mark remains separate.

**Reset preview marks** clears this preview's temporary results. Closing/reloading the page also discards them. The preview uses an in-memory storage adapter, does not load the account sync code, and blocks network connections. It leaves real browser progress and school accounts untouched. Its renderer, component scorer, question controls, feedback and review behaviour are the actual app code, rather than a screenshot mockup.

The full `student-site-preview.html` also contains the new bank, but it retains the existing account-testing features. Use the dedicated mechanism preview above for a review that cannot write account attempts.

## Cards and scoring

| Reaction | Combined card | Focused cards | Combined marks |
|---|---|---|---:|
| HCN + methanal | MC25 | MC26–MC30 | 5 |
| HBr + 2-methylpropene | MC31 | MC32–MC35 | 4 |
| Br₂ + ethene, specified open-chain representation | MC36 | MC37–MC39 | 3 |
| Benzene chlorination with a halogen carrier | MC40 | MC41–MC44 | 4 |

Each part presents a complete feature group as a choice, so all features must be correct before that part earns its **single mark**. Combined cards award partial credit between parts. The focused cards repeat the same groups, rather than adding new independent coverage. Options are shuffled without changing their stored answer identities.

Examples:

- Carbonyl dipole **and** C=O-to-O arrow are one group. An arrow without the dipole earns zero for that group.
- Bromine's induced dipole **and both opening arrows** are one group, not three marks.
- A carbocation **and** the nucleophile's attack arrow are one group. A δ+ label in place of the formal + charge loses the group.
- Electrophile-generation **and** catalyst-regeneration equations are one group. A missing equation loses the group.
- The protonation group accepts either the supplied H⁺ or water pathway; the catalyst group accepts either a complete AlCl₃/AlCl₄⁻ or FeCl₃/FeCl₄⁻ pair.

These are **recognition exercises**. They assess selection of the source marking features, rather than unaided drawing. Each part is scored independently; they do not reproduce examiner error-carried-forward judgement. Selecting the wrong major-route carbocation does not change the correct-product option in the HBr card. The bromonium alternative is chemically valid and is not used as a wrong-answer distractor; the bromine prompt explicitly specifies the open-chain representation. The benzene analogue does not assess the source arene's positional restrictions. The reactant context does not pre-fill the assessed charges or intermediate. All ring-restoration choices show the complete aromatic intermediate, including its partial π-system and positive charge. This supplies later-stage context in the combined card; its marks measure scaffolded recognition.

The original source PDFs and scheme exceptions are recorded in the drawing-pack documentation. The source files informed the content; the new SVGs are original, not crops of OCR diagrams. Chemistry review is still pending, and passing software checks does not confer OCR approval or establish exam-equivalent performance.

## Compatibility and eventual release

- Original 216 question records and their scores are unchanged. Bank version is now `v7-236-questions-2026-10-24`; scoring version remains `2`. Versions v5 and v6 remain listed as compatible so existing guest progress is retained.
- The account event format is unchanged: question/version, timing, marks and reveal/retry metadata. New diagram selections are not added to account event payloads.
- New migration [007](../supabase/migrations/202610240007_mechanism_recognition_catalog.sql) adds the v7 catalogue rows for all 236 questions and leaves old versions intact. It contains no answer keys. **It has been tested locally only and has not been applied to the hosted project. No migration is needed to review the dedicated preview.**
- Catalogue generation now requires an explicit new migration filename and refuses to overwrite an existing file. Migrations 001–006 remain unchanged.
- Do not publish this branch or apply the hosted migration until the preview and chemistry have been reviewed. Eventual release needs the catalogue migration before using the new bank for account practice; the existing frontend will continue using its old catalogue in the meantime.

## Rebuild and verification

```sh
npm run build:mechanisms
npm run build
npm test
npm run test:mechanism-preview
node scripts/build-question-catalog.cjs --output supabase/migrations/202610240007_mechanism_recognition_catalog.sql --check
```

`build:mechanisms` regenerates the new card records, SVGs, coverage map and dedicated preview. It preserves the original records and requires their expected IDs/count. Normal `npm run build` also refreshes the dedicated preview alongside the existing prototype bundles. The checked-in mapping is [mechanism-card-map.json](../content-drafts/mechanism-card-map.json).

Validation on 24 October 2026:

- Build passed; 308/308 software checks and 27 unit tests passed after the diagram corrections.
- The Chromium preview test exercised all twenty cards through their real controls and feedback, full/partial marks, retry/reveal behaviour, diagram enlargement, SVG bounds, mobile layout, unchanged native browser storage, ephemeral results and absence of external network requests.
- Dedicated marking tests verified every offered answer and distractor, grouped zero-credit cases, accepted alternatives, coverage, original-record integrity, progress compatibility, generated-file consistency and catalogue overwrite protection.
- All 64 disposable local PostgreSQL/Auth/PostgREST integration and browser checks passed, including migration 007 and the generated Edge Function under native Deno. The populated migration-006 upgrade fixture also preserved existing account, class, history and pending-reset records. No hosted configuration or hosted account writes were used for these checks.

An older browser-test expectation hard-coded `244/244` checks. Adding 64 SVGs increased the asset checks to 308, so that assertion now waits for a positive equal pass/total count instead. This changes the assertion, not the checks being run.

## Corrections following chemistry review

- The cyanide carbon and nitrogen lone pairs lie along the C≡N axis, outside their respective atoms. Attack-arrow tails and curves have been repositioned with them.
- Wording throughout the new pack uses **aromatic intermediate** and **halogen carrier**.
- All ring-restoration choices show the horseshoe partial π-system and formal positive charge. Bonds to H and Cl connect exactly to the ring vertex.
- All twelve organic-product choices use displayed formulae with explicit atoms and bonds, including C–H and O–H bonds. The generator validates atom valences; tests also check the correct products' elemental compositions.

These changes are in the generator and have been rebuilt into the SVGs, question bank and downloadable previews. They do not change the card IDs, mark-group allocations or accepted answer choices, and require no additional database migration. The dedicated preview remains temporary and account-free.
