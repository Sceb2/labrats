# Electrical circuits and the transfer of energy: teacher-review draft

120 original questions, 164 automatically marked one-mark subparts. Coverage follows the agreed 120-item outline and Pearson AAQ Applied Science Unit 3 section C, Certificate specification Issue 5 (May 2026), printed pp52–53. The uploaded Extended Certificate Physics sample assessment (Issue 1, 2024) and 6 May 2026 Unit 3 paper informed language and difficulty; questions are newly authored and not reproduced from those papers.

Source: questions.json. Each question has stable E001–E120 identifiers, specification references, feedback, an optional hint and worked answers. Calculations use fixed units and explicit numerical tolerances. Selected answers scaffold explanations and practical evaluations. Selected linked calculations support error carried forward using the existing marking engine. Practice marks and provisional AO tags are not official examination tariffs or proportions.

The standalone preview reuses the Forces draft renderer and styles. The electricity build script supplies its own content and labels without duplicating the renderer. No accounts, network calls or saved attempts are needed; reload clears responses. The live bank and Supabase are not modified.

Thermistors use supplied temperature–resistance behaviour. Heater calculations state ideal energy-transfer assumptions where needed. Fuse choices state available ratings and the classroom selection rule. Experiments distinguish supplied electrical energy from energy actually heating or vaporising the sample. Original diagrams support selected questions; remaining diagram/construction tasks use explicit written arrangements. Review whether additional visual circuit-choice variants are useful before live integration.

Build: `node scripts/build-electricity-preview.cjs`

Check: `node tests/electricity-preview-browser.cjs` (Chromium and localhost access required), plus `npm test`.

Teacher review is required before the questions join the student bank. In particular, practical explanations are deliberately scaffolded for automatic scoring and do not reproduce every demand of a free-response examination question.

## Review revision

Unlabelled symbols replace answer-labelled illustrations in E009/E010. E011 now tests meter placement. New circuit illustrations support E028–E033, and E111 has numbered axes in V and A. E027/E032 assess specified variable-resistor/meter skills instead of explicit short-circuit identification; short circuits are not explicitly named in section C. Photodiode contexts were removed at the teacher's request, although photodiodes remain explicitly listed in C1.4; full coverage of that named component is therefore intentionally deferred.

E043 accepts 199–201 Ω, not an unrestricted prefix-based acceptance rule. Other questions retain their existing tolerances. E085/E103 addition follow-through is deferred: this engine has no addition follow-through operation, and no shared-engine change was made for this review. No Supabase schema change is required for the current question amendments. E087/E089 keep direct fuse-choice marking. Practical contexts and selected distractors have been expanded; all questions remain automatically marked.

## Context and diagram review

The teacher-selected recommendations were applied to the draft. E029–E033 diagrams have separate wires and component terminals. E010 options name components, E036/E037 practise unit conversion, E058 states conventional current, and E099 identifies the energy needed to melt ice. E116 asks how insulation and a lid improve a specific heat capacity estimate. Later practical contexts and other selected wording were clarified.

E099, E103 and E119 now explicitly accept the reviewed rounded values 67 000 J, 33 000 J and 36 000 J, and 2.3 × 10⁶ J kg⁻¹, respectively, in addition to their existing exact-answer tolerances. This does not introduce a blanket rounding rule. E085/E103 addition follow-through is still deferred. E024/E052 no longer contain a photodiode distractor, per teacher instruction; photodiodes remain an intentional C1.4 coverage gap.
