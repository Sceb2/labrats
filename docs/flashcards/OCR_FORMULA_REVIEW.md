# Formula conventions checked against OCR Chemistry A

Checked 26 October 2026. This records a revision of the existing 33-card draft;
card identities and the `basic` topic mapping are retained. There are no live
flashcard attempts to migrate. No app, question-bank or Supabase change is made.

## Sources read

- User-supplied OCR H432 specification, Version 3.1 (May 2026), section
  4.1.1(a–c), printed pages 30–31 (PDF pages 36–37), and 2.1.3(b), printed
  page 15. The formula page was inspected visually as well as extracted as text.
  [Official specification](https://www.ocr.org.uk/Images/171720-specification-accredited-a-level-gce-chemistry-a-h432.pdf#page=36).
- User-supplied [2020 H432/02 paper, question 9, printed page 5](https://www.ocr.org.uk/Images/643572-question-paper-synthesis-and-analytical-techniques.pdf#page=5).
  It explicitly asks for a structural formula and uses condensed formulae,
  including `(CH₃)₂CHCH₂COOCH₂CH₃`, with subscripts and grouping brackets.
- User-supplied [2021 H432/02 paper, questions 6 and 8, pages 4–5](https://www.ocr.org.uk/Images/667279-question-paper-synthesis-and-analytical-techniques.pdf#page=4).
  Examples include `CH₃CH₂COOCH₃`, `CH₃CH₂CN` and `CH₃CH(OH)CH₃`.
- User-supplied [2020 mark scheme, printed page 12](https://www.ocr.org.uk/Images/643577-mark-scheme-synthesis-and-analytical-techniques.pdf#page=13).
  The relevant task permits combinations of skeletal, structural or displayed
  formulae when unambiguous. This is task-specific guidance, not permission to
  ignore an explicit request for a particular representation.

## Decisions applied

Section 4.1.1(b) describes a structural formula as the minimal detail showing
the arrangement of atoms in a molecule. It explicitly represents the carboxyl
group as COOH and the ester group as COO. It illustrates condensed structural
formulae rather than requiring every bond to be drawn.

Accordingly:

- Card 006 uses `CH₃CH₂CH₃` for propane's structural formula.
- Card 007 uses `C₆H₁₂` for hex-1-ene's molecular formula.
- Card 011 uses `RCOOR′` rather than the earlier expanded inline carbonyl notation.
- Card 020 follows the same-functional-group/successive-CH₂ definition of a
  homologous series in 4.1.1(c)(i).
- Card 021 uses the relative-positioning description of a displayed formula,
  with every atom and bond shown. It does not claim a true three-dimensional shape.
- Card 024 follows the additional guidance allowing R for alkyl groups and
  other organic fragments not involved in a reaction.
- Card 027 uses condensed `–COCl` notation for the acyl chloride group.
- Card 030 uses `CₙH₂ₙ₊₂` for alkanes, including subscripts for the algebraic expression.
- Card 033 uses OCR's minimal-detail description of a structural formula,
  illustrated by ethanol, `CH₃CH₂OH`.
- Other chemical atom counts throughout the cards have proper subscripts,
  including `–CH₃` and `–NH₂`.

The specification requires interpretation and use of formula terminology;
4.1.1(b) and 2.1.3(b) do not require verbatim memorised definitions. The pack
therefore keeps formula examples as well as short terminology cards. This is
not a claim that the pack exhaustively assesses formula interpretation or all
of section 4.1.1.

The earlier decision to remove subscripts was a spreadsheet workaround, not
an OCR convention. The CSV now preserves Unicode with a UTF-8 encoding marker,
and the workbook explicitly stores each cell as text. Formulae are not Excel
formula expressions or HTML. File round-trip checks do not substitute for
visual verification in Microsoft Excel or for teacher content review.
