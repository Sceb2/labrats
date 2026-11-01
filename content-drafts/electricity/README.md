# Electrical circuits and the transfer of energy: teacher-review draft

120 original questions, 164 automatically marked one-mark subparts. Coverage follows the agreed 120-item outline and Pearson AAQ Applied Science Unit 3 section C, Certificate specification Issue 5 (May 2026), printed pp52–53. The uploaded Extended Certificate Physics sample assessment (Issue 1, 2024) and 6 May 2026 Unit 3 paper informed language and difficulty; questions are newly authored and not reproduced from those papers.

Source: questions.json. Each question has stable E001–E120 identifiers, specification references, feedback, an optional hint and worked answers. Calculations use fixed units and explicit numerical tolerances. Selected answers scaffold explanations and practical evaluations. Selected linked calculations support error carried forward using the existing marking engine. Practice marks and provisional AO tags are not official examination tariffs or proportions.

The standalone preview reuses the Forces draft renderer and styles. The electricity build script supplies its own content and labels without duplicating the renderer. No accounts, network calls or saved attempts are needed; reload clears responses. The live bank and Supabase are not modified.

Thermistors use supplied temperature–resistance behaviour. Heater calculations state ideal energy-transfer assumptions where needed. Fuse choices state available ratings and starting-current assumptions. Experiments distinguish supplied electrical energy from energy actually heating or vaporising the sample. Original diagrams support selected questions; remaining diagram/construction tasks use explicit written arrangements. Review whether additional visual circuit-choice variants are useful before live integration.

Build: `node scripts/build-electricity-preview.cjs`

Check: `node tests/electricity-preview-browser.cjs` (Chromium and localhost access required), plus `npm test`.

Teacher review is required before the questions join the student bank. In particular, practical explanations are deliberately scaffolded for automatic scoring and do not reproduce every demand of a free-response examination question.
