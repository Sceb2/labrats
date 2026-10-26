# First flashcard sample: Organic names and formulae

Prepared 26 October 2026 from the owner's pasted Quizlet terms and definitions.
No Quizlet content was fetched: direct access was blocked. This folder contains
review material for the proposed feature, not an implemented importer or published pack.

- Subject: Chemistry (`chemistry`).
- Pack: Organic names and formulae.
- Proposed stable pack identifier: `organic-names-and-formulae`.
- Cards: 34, numbered in the source's original order.
- Existing topic: `basic`, 4.1.1 Basic concepts and nomenclature.
- CSV: `organic-names-and-formulae.csv`, UTF-8 with a BOM for Excel recognition, columns
  `card_id,topic,front,back`. Subject/pack are selected separately during import.
- Multiline answers use standard quoted CSV fields; line count is not card count.
- Formulae use plain Unicode text and do not depend on HTML interpretation.
- For spreadsheet review, open `organic-names-and-formulae.xlsx`. All cells are
  explicitly stored as text, with wrapped answers. Suffix definitions begin
  `Suffix:`, so their leading minus signs are not interpreted as formulas in CSV.
  The first export lacked the encoding marker and these labels; that export
  could display garbled symbols and `#NAME?` errors when opened directly in Excel.

This is a reviewed draft, not a verbatim transcription. All source entries have
a corresponding card. The following substantive changes need the teacher's
review; smaller spelling, punctuation and capitalisation changes are omitted.

| Card ID suffix | Change and reason |
| --- | --- |
| 001–004, 012, 028 | Distinguish a compound class (carboxylic acid/alcohol/nitrile/amine/ether/acyl chloride) from the name of a group. The alcohol prompt specifies saturated carbon; the –NH₂ prompt specifies a primary alkyl amine. |
| 005 | Methyl is an alkyl substituent; do not teach it as a functional group. |
| 007 | Specify acyclic hexene with one C=C bond for C₆H₁₂. |
| 009, 019 | The source repeats ester suffix recall. Keep suffix recall in 009; use 019 to interpret the two parts of an ester name. An ester name needs an alkyl part, e.g. ethyl propanoate. This is an intentional prompt change. |
| 010 | Explain when hydroxy- is used instead of the suffix -ol. Preserve the source's multiline answer as a quoted CSV field. |
| 011 | Replace the incorrect ester notation R-COOC-R with R–C(=O)–O–R′. |
| 013 | Define aldehydes and ketones by atoms bonded to the carbonyl carbon. This also handles methanal without relying on “end versus middle of a chain.” |
| 021 | Include a common general formula, similar chemical properties and a CH₂ difference between successive homologues. |
| 022 | A displayed formula shows all atoms and bonds; it does not necessarily show actual three-dimensional positions. |
| 023–024 | The source's “smallest number” and “longest carbon chain” rules lack a context. Restrict these prompts to simple branched alkanes; use lowest locants at the first point of difference. Other functional groups need their own naming rules. |
| 025–027 | Clarify R notation, derive an alkyl group by removing H from an alkane, and define haloalkanes by replacement of H with halogen. |
| 029 | Replace the vague “simplest homologous series” prompt with a specific saturated, acyclic hydrocarbon classification. |
| 031–034 | Tighten formula definitions, including atoms of each element and a structural-formula example. |

Keeping these cards under `basic` preserves the source pack's nomenclature
purpose rather than requiring students to select later reaction topics simply
to recall a group name. Reassignments remain a teacher content decision.

## Confirmed session requirement

The owner confirmed that Open Mode ends when the available initial attempts and
permitted retries are exhausted. A card can be attempted at most twice in one
session: once initially and, if marked **Not yet**, once on retry. It does not
continue in repeated rounds. Cards marked **Got it** initially need not return.
Retries should be separated by other cards where possible and must not improve
the long-term unaided rating. A normal front-to-back reveal is intrinsic to
self-assessed flashcard use, rather than the existing question-answer reveal penalty.

The proposed interpretation of 20-card mode is 20 distinct initial cards (or all
available if fewer), plus their permitted retries. This counting detail has not
yet been explicitly confirmed by the owner. No session logic is implemented here.

## Checks

The CSV was read back with Python's standard CSV reader: 34 rows, unique stable
IDs, four complete columns, valid existing topic IDs and preserved Unicode and
multiline answers. The corrected CSV includes an encoding marker and has no
formula-triggering field prefixes. The XLSX was reopened to verify matching
values and explicit text cell types; Microsoft Excel itself was not available
for a visual check. No application code, question bank, progress or Supabase
schema/data was changed. The CSV has not been tested through an importer because
that feature does not exist yet. Teacher content approval remains outstanding.
