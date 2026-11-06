# Image and font delivery

Development update, 6 November 2026. The approved artwork, typefaces, font roles,
weights, colours and layout are unchanged. No backend or database change is needed.

## Runtime assets

- `assets/subjects/*.png`: transparent 256 × 256 PNGs, displayed at 64 × 64 CSS
  pixels. This supports a device pixel ratio of four at that display size.
- `fonts.css`: the existing Liberation Sans, DejaVu Serif and Open Sans fonts in
  WOFF2, hosted locally with `font-display: swap`. All original character maps,
  glyph outlines, hints, metrics and positioning tables are retained; no font
  subsetting was performed. Licence files remain in `assets/fonts/`.
- `scripts/font-css.cjs`: embeds the same WOFF2 files in self-contained previews.
  Normal website pages request external fonts; they do not embed font binaries.
- Font CSS links use the release identifier on each current student/staff page,
  including Applied Science and Student Login, to avoid reusing an older stylesheet
  after a format change. `scripts/prepare-site-release.cjs` fingerprints the assets.

## Measured file sizes

| Assets | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Both subject illustrations | 1,165,191 bytes | 91,696 bytes | 92% |
| All five font faces | 1,787,308 bytes | 636,940 bytes | 64% |
| Subject-hub standalone preview | 4,045,635 bytes | 1,080,482 bytes | 73% |
| Flashcard standalone preview | 2,845,424 bytes | 1,311,595 bytes | 54% |

These are file sizes, not production bandwidth measurements. The browser requests
only the font faces it uses, and HTTP compression/caching affects transferred bytes.
Other optional standalone previews save about 1.53 MB each. Historical ZIPs and
design-review snapshots are no longer kept in the current tree.

## Reproducing conversions

Original TTFs and 1,254-pixel PNGs are available in Git at `90ff406`. Conversion
used ImageMagick 7, FontTools 4.61.1 and Brotli 1.2.0 as development tools only;
normal builds require none of these additional packages.

For each original PNG, resize with Lanczos filtering to 256 × 256, strip metadata,
and save a 32-bit PNG with compression level 9. Preserve transparency and verify
the result at the actual 64-pixel display size, rather than introducing new art.

For each TTF, use `fontTools.ttLib.TTFont(input, recalcTimestamp=False)`, set
`font.flavor = 'woff2'`, and save it under the corresponding name in `assets/fonts/`.
Keep full glyph coverage and licence notices. Check character maps, glyph order,
outlines/instructions, horizontal metrics, and layout tables against the original.
Build the website with `npm run build`. Generate ignored standalone copies only
when needed with `npm run build:previews`; see [preview guidance](PREVIEWS.md).

## Verification

The conversion passed full font-data comparisons and 90 Chromium comparisons of
scientific text across all five faces at 14, 20 and 32 pixels: rendered pixels and
text widths matched exactly. Mobile/desktop screenshots retained heading and
question dimensions; resized icons preserve the approved appearance.

`npm test` covers the build/release consistency checks. `npm run test:design`
explicitly loads every bundled font face, including scientific sample text, on
the subject selector, both subjects, account pages and self-contained subject
previews. This catches silent fallback fonts as well as missing external files or
broken preview embedding. Flashcard, staff-layout and privacy browser checks also
passed for this update.
