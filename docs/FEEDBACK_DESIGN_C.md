# Feedback design C — expanded previews

**Historical preview:** C has now been implemented alongside A and B. See [the unified design guide](UNIFIED_DESIGN.md) for the working update.

A and B are recorded as the preferred design direction. This change expands C for review; it does not apply any of the proposed redesigns to the student tool.

Open [the interactive feedback preview](design/labrats-feedback-options.html). Choose one example, switch between Mobile and Desktop, or show all six. The preview is self-contained and never contacts Supabase or stores answers. The screenshots show proposed UI, not the current student feedback renderer.

| Example | Proposed display | Behaviour preserved |
|---|---|---|
| Full marks | `2 of 2 marks`, a short confirmation, expandable marking points | Both earned points remain available; no scoring changes |
| Partial marks | `1 of 2 marks`, the earned mark, selected incorrect answer and correction | Partial credit remains visible |
| Incorrect answer | `0 of 2 marks` with specific corrections | No generic praise or misleading success state |
| Correct on retry | `2 of 2 on retry`, with original `1 of 2` clearly retained | Retry does not improve unaided adaptive evidence |
| Revealed answer | `Answer revealed — Not scored`, with model points | Reveals do not become scored zero-mark submissions or improve unaided evidence |
| Applied Science calculation | `3 of 4 marks`, split into 1 direct mark and 2 method marks | The initial numerical error remains visible; valid error-carried-forward credit is retained |

The Chemistry examples use RC01, converting propan-1-ol to propanal. The Applied Science example uses W03: 85 kHz, wave speed 340 m/s, correct wavelength 4 mm. Its fictional response uses 85 Hz, the correct rearrangement, 4 m and 4,000 mm. The existing marking engine awards 1 direct mark and 2 error-carried-forward marks. The calculation preview explicitly distinguishes the method credit from the incorrect final number.

Scores are verified by `core.js` and `applied-science/pilot-core.mjs` when building the preview. Example ratings and practice histories are illustrative. No official exam tariff is claimed for these original practice questions.

The question and original Chemistry diagrams remain expandable. Full-mark detail is collapsed by default; corrective detail is visible immediately for errors. Additional explanation stays available below. Actual implementation would retain accessible live feedback/focus and the existing grade tooltips. The preview uses a native tooltip on illustrative grades. Celebration settings are unchanged by this proposal.

Selected answers already available during the live session can be shown in feedback without adding them to account storage. No additional storage or Supabase schema is proposed here.

## Review artifacts

- [Mobile comparison](previews/feedback-c-mobile-overview.png)
- [Desktop partial-mark layout](previews/feedback-c-partial-desktop.png)
- [Applied Science method marks](previews/feedback-c-method-mobile.png)
- [Download the standalone preview ZIP](../downloads/labrats-feedback-c-preview-2026-10-25.zip)

Rebuild the HTML and verified example-score manifest with:

```sh
node scripts/build-feedback-design-preview.cjs
```

The checked browser interactions cover all six scenarios, expandable question diagrams, marking points, retry navigation, 320/390px layouts, desktop and zero backend requests. Screenshots and the ZIP are fixed review snapshots.
