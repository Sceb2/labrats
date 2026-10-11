# Teacher maintenance — no terminal for normal edits

## The normal workflow

Open the live site's **Teacher preview & editor** (`teacher.html`). Filter or search for a question. Open **Edit this question**, edit the record, and click **Apply edits**. The editor checks its references and answer data before applying it. Use **Validate bank and asset links**, then **Download edited questions.json**. Upload that file to the same place in your GitHub repository and commit it. Refresh the published site after deployment.

Edits are initially held in the open browser page. Download before leaving it. You may import your downloaded `questions.json` to continue editing. This editor does not save directly to GitHub. Keep a repository backup before large changes.

The editor changes `meta.bankVersion` when you apply edits. This protects students from combining progress on changed questions with old first-attempt scores. If editing files directly on GitHub, also change `bankVersion`. Change `scoringVersion` only when altering scoring rules, not for spelling corrections.

## Files you normally edit

| File | Purpose |
|---|---|
| `questions.json` | Topics, reusable answer vocabulary, exact specification-reference descriptions and question records. |
| `assets.json` | Diagram IDs, paths, neutral structural descriptions and chemistry review metadata. |
| `assets/your-diagram.svg` | Original SVG image. Add through GitHub upload. |

Do not change `app.js` to add normal questions or synonyms. You can edit JSON in the teacher page, or use GitHub's pencil button. JSON needs double quotes, commas between entries, and no trailing comma after the last entry.

## 1. Add a topic

Open **Edit topics and reusable vocabulary**. Add an object to `topics`, for example:

```json
{
  "id": "polymers",
  "module": "Module 6",
  "label": "6.2.3 Polyesters and polyamides"
}
```

Give each topic a unique ID. Applying a topic does not create coverage; add mapped questions separately. If adding outcomes not already listed, add their precise references to `specificationRefs` after reading the current OCR wording. A new reference might be:

```json
"6.2.3(a)(i)": "Condensation polymerisation to form polyesters. p59"
```

Do not classify a newly added topic as covered until actual questions exist.

## 2. Add a complete question — worked example

Find RC05, open its record, replace the JSON in its editor with the complete example below, and click **Add as new question**. This reuses existing reviewed-in-progress structure assets and stable reagent IDs. It adds a carbonyl-reduction example without modifying interface code. Do your chemistry review before approval.

```json
{
  "id": "RC17",
  "type": "reagents",
  "title": "Reduce an aldehyde",
  "prompt": "Select the reducing agent for the shown aldehyde-to-alcohol conversion. Water protonation is supplied; solvent and heating are not assessed.",
  "difficulty": "Foundation recall",
  "prerequisites": ["basic", "carbonyls"],
  "specRefs": ["4.1.1(b)", "6.1.2(b)(i)"],
  "assetRefs": ["ethanal", "ethanol"],
  "display": {"start": "ethanal", "end": "ethanol"},
  "components": [
    {
      "id": "reagent",
      "label": "Reducing agent",
      "options": ["borohydride", "dichromate-acid", "aqueous-hydroxide", "cyanide"],
      "essential": true,
      "marks": 1
    }
  ],
  "validMethods": [
    {"id": "borohydride-route", "answers": {"reagent": ["borohydride"]}}
  ],
  "maxMark": 1,
  "feedback": "NaBH₄ reduces ethanal to ethanol; protonation follows the hydride addition.",
  "misconceptions": {
    "dichromate-acid": "This oxidises the aldehyde rather than reducing it.",
    "aqueous-hydroxide": "This is not the reducing agent for this carbonyl conversion.",
    "cyanide": "Cyanide addition gives a hydroxynitrile, not this alcohol."
  },
  "source": {
    "id": "ocr-spec-3.1",
    "url": "https://www.ocr.org.uk/Images/171720-specification-accredited-a-level-gce-chemistry-a-h432.pdf",
    "version": "3.1 (May 2026)",
    "accessed": "2026-10-11"
  },
  "status": "teacher-review-required",
  "requirement": "reaction-known",
  "reviewNotes": "Check the exact outcome, both structures and the four distinct options before approval.",
  "ambiguity": {
    "issue": "Other reducing systems exist; this question offers four specified choices and supplies protonation.",
    "resolution": "Only reducing-agent identity is scored; no unstated solvent or heating detail is required.",
    "teacherJudgementNeeded": true
  }
}
```

The initial release already has 98 questions; an additional question need not bring the total back to exactly 98. Hosted checks require minimum coverage, not a fixed release total. Keep the original regression-example IDs unless updating the developer tests too.

## 3. Add an option

An option is a vocabulary record referenced by ID. Add this to `vocabulary` in the catalogue editor:

```json
"propanoic-acid-reagent": {
  "id": "propanoic-acid-reagent",
  "label": "Propanoic acid — CH₃CH₂COOH",
  "chemicalId": "propanoic-acid-reagent",
  "category": "reagent",
  "aliases": ["CH3CH2COOH", "propanoic acid"],
  "notation": "",
  "misconception": "Count the acid-derived carbon chain in the target ester."
}
```

Then add `"propanoic-acid-reagent"` to the relevant component's `options` array. Add it to a method's accepted answer only if it is chemically correct for that exact target. If the substance already has a vocabulary record, reuse it; do not create a competing label for the same chemical identity.

Categories include reagent, catalyst, solvent, heating, technique, condition, pressure, functional-group, mechanism, reaction-description, electron-source, electron-destination, site, name, product, error and correction. Display labels do not determine marks. `chemicalId` supplies the canonical marking identity; question-specific site IDs retain their own context.

## 4. Add a valid alternative complete method

In RC08, the component IDs are `catalyst` and `heating`. The existing alternatives illustrate the complete-combination format:

```json
"validMethods": [
  {
    "id": "phosphoric",
    "answers": {"catalyst": ["phosphoric"], "heating": ["heat"]}
  },
  {
    "id": "sulfuric",
    "answers": {"catalyst": ["sulfuric-conc"], "heating": ["heat"]}
  }
]
```

Every essential component must occur in each complete method. All accepted IDs must also be options for their component. Do not maintain separate lists of “all acceptable catalysts” and “all acceptable procedures” when only some combinations work: that would accept hybrids.

RC16 demonstrates two distinct **supplied protocols**, one liquid-acid and one vapour-solid. Either complete protocol earns full marks; mixing its components earns only the matching marks under one complete protocol. The question explicitly asks for one stated protocol. This narrowing matters: do not reject an alternative just because it is not the usual model answer.

Within a single route, an answers array can contain equivalent acceptable choices. Use separate methods when several components need to stay paired.

## 5. Add equivalent notation

Edit the `aliases` array of the existing substance; keep one option and chemical identity:

```json
"dichromate-acid": {
  "id": "dichromate-acid",
  "label": "Acidified potassium dichromate(VI) — K₂Cr₂O₇/H⁺",
  "chemicalId": "dichromate-acid",
  "category": "reagent",
  "aliases": [
    "Acidified potassium dichromate(VI)",
    "K₂Cr₂O₇/H⁺",
    "K2Cr2O7/H+",
    "K2Cr2O7/H2SO4"
  ],
  "notation": "",
  "misconception": "Check whether oxidation is needed and whether the product should be distilled or retained under reflux."
}
```

This does not add a second answer option. Students use structured controls, so alias records document chemical equivalence rather than requiring them to guess a typed format. Aqueous and ethanolic hydroxide, distillation and reflux must keep distinct identities. Sodium/potassium alkali must also remain distinct when a specific salt counterion is assessed.

## 6. Change feedback or review status

Edit `feedback` for the correct explanation. `misconceptions` maps a selected option ID to a targeted explanation, for example:

```json
"misconceptions": {
  "reflux": "Reflux retains propanal in the oxidising mixture and may allow further oxidation."
}
```

Essential component marks come from `components`; optional components have `"essential": false` and `"marks": 0`. `maxMark` is the sum of essential component marks, or the sum across route steps. For interactive arrows it is the number of required arrows.

Use the status selector, or edit `status`: `draft`, `teacher-review-required`, `teacher-approved`. Newly authored questions start as review-required. Draft records are available in teacher preview but excluded from normal student queues. Record the reason for your review decision in `reviewNotes` and update `ambiguity` too.

## 7. Link an SVG

Upload a clear SVG as `assets/reduction-example.svg`. In `assets.json`, add:

```json
"reduction-example": {
  "path": "assets/reduction-example.svg",
  "description": "A carbonyl carbon bonded to oxygen by a double bond, to a methyl group and to hydrogen. Carbon has partial positive charge and oxygen partial negative charge.",
  "status": "teacher-review-required",
  "review": "Check connectivity, valence, charges, hydrogens and description against the intended question."
}
```

Reference `"reduction-example"` in the question's `assetRefs` and its `structure` field. Do not put a systematic name or answer in a student-facing description for a nomenclature question. Describe connectivity instead. Never approve an SVG merely because it renders successfully.

For a product option, set its vocabulary `asset` to the diagram ID. For interactive mechanisms, update **both** the drawing and the anchor coordinates/IDs. This is more technical than adding a normal question; use an existing mechanism record as a template, test the visual alignment and have the chemistry reviewed. Coordinates only position the diagram; scoring uses anchor IDs.

## 8. Validate and upload

1. Apply each editor change; schema errors are shown before export.
2. Click **Validate bank and asset links**. It checks referenced SVG paths on the hosted site.
3. Download `questions.json`. Upload any new SVGs and updated `assets.json` alongside it.
4. Commit in GitHub, wait for deployment, then open `tests.html` on the published site.
5. Run your chemistry checklist separately. A software PASS does not authorise a teacher-approved status.

Advanced developer checks, if someone is helping you: `node tests/run.cjs`. The optional browser suite requires Playwright and a Chromium executable; see `docs/TEST_RESULTS.md`. These are development tools, not requirements for the deployed website.
