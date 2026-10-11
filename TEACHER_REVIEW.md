# Teacher chemistry review — separate from software tests

Every question starts as `teacher-review-required`. Software validation proves neither chemical accuracy nor assessment quality. Use `teacher.html` to inspect each record, then record your own approval only after completing the relevant checks below.

## Question-level checklist

- Read the exact learning outcomes and additional guidance in H432 Version 3.1 (May 2026); verify the reference and the recall/drawing/application distinction.
- Confirm all prerequisites, including those needed to understand structures and reject distractors. Routes also require each individual step's topics.
- Read the prompt without the answer. Does it name every marked component? Are optional details identified without hidden marks?
- Verify each complete accepted method. Is a rejected combination genuinely unsuitable for the stated task, rather than merely less familiar?
- Check synonyms and formulae resolve to a shared chemical identity. Ensure aqueous/ethanolic, distillation/reflux, reagent/catalyst and relevant cations remain distinct.
- Check whether alternative products, regioisomers, stereoisomers or mixtures should be accepted or the context narrowed.
- Check names against the stated IUPAC convention. Wrong locants or a shorter parent chain are rule errors; accepted synonyms must not be distractors.
- Verify every diagram's connectivity, bond orders, valence, formal charge, relevant hydrogen count, partial charge and accessible description. Confirm the original structure matches the name/product in the answer data.
- Read feedback for both correct and incorrect components. Is it scientifically precise and useful to a student?
- Assess question independence and variety. Decide which near-family examples help scaffold learning and which should be replaced for your class.

## Mechanism-specific checks

For each interactive drawing, use the teacher preview's `reviewChecks` and inspect both the initial and completed SVGs.

- **Valence/connectivity:** substrate, intermediate and product must have sensible bonds and connect through the intended atoms.
- **Atom conservation:** retain leaving groups and coproducts; cyanide attacks through carbon; water protonation retains the remaining hydroxide.
- **Charge conservation:** OH⁻ substitution: −1 → −1; first alkene/HX stage: 0 → cation + anion; carbonyl addition: −1 → −1; water protonation: −1 → −1.
- **Arrow origin:** bond pair, lone pair or negative charge. An atom label alone is not an identified pair.
- **Destination/direction:** attack the electrophilic atom; send the breaking bond's pair to the appropriate atom. Match arrows to the visual anchor positions.
- **Relevant dipoles:** Cδ+–Xδ−, Hδ+–Xδ−, Cδ+=Oδ− where assessed.
- **Scope:** first-step and protonation scaffolds ask for that displayed step, not a full unseen mechanism. Full aromatic nitration, NO₂⁺ generation and further mechanisms need additional coverage.
- **OCR conventions:** 4.1.1(i) permits a bond, lone pair or negative-charge origin. 4.1.2(f) uses radical equations; half curly arrows are not required. 6.1.2(c) permits the stated hydride model and protonation from water; HCN protonation may use water or H⁺, but MC09 explicitly asks for water.

## Priority records to check

- **RC04/MS05:** the prompt confines hydration to the direct industrial steam route, rather than indirect hydration using concentrated sulfuric acid.
- **RC10:** iron and bromide carriers are stored as alternative complete methods.
- **RC12/MS07:** alkaline work-up is supplied; free phenylamine must not be claimed as the immediate species in acidic reduction conditions.
- **RC15/PP06:** sodium salt is explicitly assessed where appropriate; potassium hydroxide is a chemically different counterion choice for that target.
- **RC16:** the alumina protocol is **supplied application information**, not an OCR recall requirement. Check the protocol descriptions and the rule that only the two stated complete protocols answer this question. Pressure is optional.
- **MS06:** the shown alkene is identified as one possible member of a mixture; the route does not assert a unique dehydration product.
- **MI09/MI10:** these ask for reaction descriptions; OCR explicitly says the alcohol dehydration and alcohol-to-haloalkane drawing mechanisms are not required. They are additional to the 12 named-mechanism tasks.
- **MI12:** interpretation of a supplied phenol substitution pattern is separated from the prescribed arene nitration/halogenation drawing outcome.
- **MC03:** methyl iodide uses H–CH₂–I as an explicit compact representation of CH₃I.
- **ST02/ST04/ST10:** distinguish the requested lone pair or hydroxide charge from other visible pairs/charges; verify spectator-site wording.
- **NM07/NM08/NM13:** distractors test longest parent chain and minimum locants, under systematic IUPAC conventions. Reject only naming-rule errors, never accepted names.
- **NM14/PP01/PP05:** E/Z is assessed only with a clear spatial diagram; major-product/connectivity questions do not silently mark optical stereochemistry.

## Record and publish approval

1. Inspect the question in `teacher.html` and try it using the preview button.
2. Update its review notes and ambiguity resolution to record your judgement; change status to `teacher-approved` only when satisfied.
3. If an issue remains, keep `teacher-review-required` or change to `draft`. Draft items are excluded from normal student queues.
4. Apply the record, validate, download and upload `questions.json` to GitHub.
5. Asset metadata initially remains `teacher-review-required`. When you separately approve a reused SVG, record that decision in `assets.json`; approval of an asset must not automatically approve every question using it.

For a short classroom release, approve a coherent subset first and have students use the approved-only filter. The CSV review register supplies one row per question.
