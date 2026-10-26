# Organic names and formulae: OCR-aligned draft

Rewritten from the owner's original 34 pasted entries on 26 October 2026.
This replaces the earlier draft rather than patching its wording. It is review
material only: no pack has been published and no progress has been imported.
The notation and formula definitions have now been checked against the supplied
OCR specification, Version 3.1 (May 2026), and past papers. See
[the source review](OCR_FORMULA_REVIEW.md).

- Subject: Chemistry.
- Existing topic: basic (4.1.1 Basic concepts and nomenclature).
- Cards: 33. The two original ester-suffix entries have been combined.
- Identifiers: organic-basics-001 through organic-basics-033. These are fresh
  draft identifiers, not an update intended to retain the previous draft's progress.
- CSV columns: card_id,topic,front,back. Subject and pack are selected separately.
- Use organic-names-and-formulae.xlsx for spreadsheet review, or
  organic-names-and-formulae-review.md to read every question and answer without
  a spreadsheet. The CSV is intended for the future importer.

## Content decisions

The original learning points remain the starting point. Questions now ask for
one clear piece of recall, with short answers and examples where useful.

- Distinguish a functional group from the compound class: the carboxylic acid,
  amine and other classification prompts name the class explicitly.
- Describe methyl as a substituent, not a functional group.
- Use RCOOR′ for an ester in condensed structural notation, following OCR's
  explicit convention that the ester group is represented as COO.
- Define aldehydes and ketones by the atoms bonded to the carbonyl carbon.
- Use OCR's homologous-series definition, including the CH₂ difference between
  successive members.
- Describe a displayed formula using the relative positioning of atoms and
  the bonds between them; all atoms and bonds are shown.
- Use OCR's minimal-detail description of a structural formula and retain
  examples of formulae alongside definition cards.
- Allow R to represent alkyl groups and other organic fragments not involved
  in the reaction.
- Restrict the original vague numbering/longest-chain questions to simple branched
  alkanes. They are not universal naming rules for every functional group.
- Replace the vague 'simplest homologous series' prompt with the definition of an alkane.
- Define alkyl groups by removal of H from an alkane.

## File compatibility

Formulae use Unicode subscripts, for example CH₃CH₂CH₃, C₆H₁₂ and CₙH₂ₙ₊₂.
These are condensed structural, molecular and general formulae respectively,
not displayed formulae. There are no HTML tags embedded in the CSV answers.
Excel compatibility is handled by the file encoding and explicit workbook text
cells, rather than removing chemical subscripts.

The CSV has a UTF-8 encoding marker, standard quoted multiline fields and LF
record endings. Answers describing suffixes start with words, not a minus sign.
The workbook stores every cell explicitly as text. No cell contains a formula.

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

## Verification

Read the CSV back and checked all 33 unique IDs, complete columns, unique
prompts, existing topic mapping, correct formula strings, multiline answers and
absence of formula-triggering field prefixes. Reopened the workbook and checked
that all values match the CSV and all cells have text types. Verified the ZIP's
integrity and its contents against the source files.

These checks verify the exported files, not a future importer or a visual run in
Microsoft Excel. The pack remains a draft for teacher content review. No
application code, live question bank, account records or Supabase schema changed.
