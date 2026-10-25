# Rat illustration placement previews

These are preview-only page snapshots on `LabRats-Online`. The normal student pages, working subject previews, logo and Supabase setup are unchanged.

[Download the gallery](../downloads/labrats-rat-placement-previews-2026-10-25.zip), extract it and open `index.html`. Choose a placement, switch Mobile/Desktop and toggle Illustrations on to compare. Native question/explanation disclosures remain available; page buttons do not start sessions, sign out or save progress.

| Original picture | Suggested location | Context shown | Mobile display box |
|---|---|---|---|
| Curiosity | Beside Choose your topics | Chemistry topic selection, before practice starts | 48 × 58 px |
| Approval | Beside the score in positive feedback | Correct two-mark Chemistry answer | 48 × 58 px |
| Thoughtfulness | Inside an opened worked answer | Applied Science calculation review, after the student opens the explanation | 48 × 58 px |
| Celebration | Beside an existing session milestone | A perfect-session summary, replacing the static trophy in this example | 64 × 77 px |

The same placement rules can apply in either subject. Keep one static illustration per page, in a supporting position. Text, marks, controls and scientific diagrams remain the main content. The pictures are decorative (`alt=""`, hidden from assistive technology); all information is conveyed in the existing text. Thoughtfulness belongs in study/explanation content, not as a label for a low grade. Approval does not change the revision rating, and Celebration uses the existing milestone context.

Desktop boxes are 56 × 67 px for the first three and 72 × 86 px for Celebration. The original transparent PNGs are displayed with their proportions preserved, without animation, speech bubbles, extra containers or floating widgets. Before implementing approved placements, small web exports can be prepared; the source originals have been preserved byte for byte.

## Assets and provenance

The four original pictures from the user-uploaded `Rat_Assets.zip` are stored under `docs/design/rat-assets/`. `Logo.png` is deliberately unused while the wordmark is being developed. SHA-256 checksums are recorded in [the placement manifest](design/rat-placement/placements.json).

The context pages were produced from the actual current standalone subject renderer using fictional guest attempts. Chemistry uses RC01 (2/2 marks); the Applied Science example uses W03 (3/4, including method marks). The summary is an actual completed one-question perfect-session example. Snapshots include the existing question diagrams and current readonly selections where relevant. No additional marking logic or production feature has been introduced.

## Files and verification

- [Gallery](design/rat-placement/index.html)
- [Mobile comparison](previews/rat-mobile-overview.png)
- Full mobile/desktop screenshots: `docs/previews/rat-*.png`
- Rebuild snapshots and screenshots: `node scripts/build-mascot-previews.cjs`

The builder checks all four generated context pages at 320, 390 and 1280 px, enforces one small decorative picture per page, checks image-off mode, and checks for browser/CSP errors and outside requests. The gallery’s placement selector, mobile/desktop controls and on/off comparison were also checked. The preview pages have no account connection and make no requests to hosted Supabase.
