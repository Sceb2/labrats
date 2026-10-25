# LabRats UI review — 25 October 2026

The strongest risk is an inconsistent, assembled appearance. The green selected states, pink exit controls and chemistry diagrams already serve the product well. Keep those recognisable choices. A colour, font or border radius cannot establish AI authorship, and no student-perception study has been run. The recommendations below are a design review, not an “AI detector” result.

## Online sources checked

These are public sources read for this review, not instructions applied to the repository:

- [Anthropic’s published frontend design guidance](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): identifies repeated card/shadow treatments, unnecessary labels and metadata strings, generic motion and subject-independent visual choices as common generated-design defaults. This is practitioner guidance from an AI provider, not independent empirical research into teenagers’ reactions.
- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md): useful practical checks for predictable interactions, keyboard focus, long content, sticky overlays, semantic controls and motion. Its fine-grained stylistic preferences are not universal requirements.
- [W3C: consistent navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html), read from its [published source](https://github.com/w3c/wcag/blob/main/understanding/20/consistent-navigation.html): stable order and predictable position help users find repeated controls.
- [W3C: target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), read from its [published source](https://github.com/w3c/wcag/blob/main/guidelines/sc/22/target-size-minimum.html): WCAG 2.2 AA generally specifies 24×24 CSS pixels with exceptions. LabRats retains a more comfortable 44px minimum for the paired exit buttons.
- [W3C: animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), read from its [published source](https://github.com/w3c/wcag/blob/main/understanding/21/animation-from-interactions.html): reduce unnecessary motion and respect user preferences. LabRats already has reduced-motion support and celebration settings.

Direct access to some editorial websites/search pages was unavailable in this environment. The successfully read sources above support the review; no inaccessible articles or search snippets have been presented as evidence.

## Findings and recommendations

| Priority | What is present in LabRats | Why it can feel generic or unfinished | Suggested change | Visual option |
|---|---|---|---|---|
| 1 | Subject hub uses Arial and bold sans-serif subject labels, a slightly different paper colour and floating shadowed cards; topic pages use system body text and Georgia topic labels. | Adjacent pages look designed independently. | Reuse the practice page’s typography, paper, content margins and selection treatment. Keep the requested illustrations but make them a quieter supporting element. | A |
| 2 | Many areas use rounded white outlined containers: subject choices, topic tiles, start panels and question panels. | Equal visual weight makes every element seem like the same generic component. | Keep clear boundaries for selectable topics. Try flatter rows for long lists and reserve the strongest container for the current question. Do not remove every border simply to follow another trend. | A and B |
| 3 | The interface has accumulated development explanations, storage paragraphs, version strings and dot-separated metadata. | The system explains itself instead of helping the next task. | The requested footer/menu cleanup is implemented. Next, shorten routine sync success to a compact status while keeping pending attempts and errors explicit. Put rare explanations behind Help or the existing disclosures. | B and C |
| 4 | Related actions vary: Choose topics / Change topics, Review Question / Review All Incorrect Questions; subject screens have different progress wording. | Vocabulary and spacing inconsistencies suggest several generated components assembled together. | Choose a small shared vocabulary and component set, then use it across both subjects. Keep real differences in marking explained where they affect students. | A–C |
| 5 | Celebration effects and lengthy feedback can compete with the teaching point. | Generic encouragement and spectacle can overwhelm specific corrective guidance. | For routine answers, prioritise marks earned and the exact correction. Keep the playful effects as an option, with a larger celebration for a session milestone. No celebration behaviour has been changed in this update. | C |
| 6 | The new subject illustrations have different forms and shading, and are large relative to the simple subject-choice task. | A stock-illustration feel can make the page look less deliberately designed. | First try the existing art at a smaller size with consistent placement. If students still dislike it, commission/redraw a coherent illustration pair with a shared stroke and depth treatment. | A |

## What changed now

- Removed the persistent guest-storage explanation and automatic offline/version footer sentence. Important account sync warnings and storage failures still display.
- Removed Student sign-in from each subject’s navigation menu. Student Login remains available on the subject-choice page.
- Reused the existing working Sign Out button beside Finish session, Choose subject or Choose topics. It uses a lighter pink, appears only for an account, and retains the warning before discarding unsynced attempts from either subject.
- Sidebar metadata now reads only `v1.13.0`. Internal build IDs and update checks remain intact.
- New mobile screenshots show actual local fictional-account renders. The alternative designs remain separate mockups; the working subject hub has not been redesigned without review.

## Compare before changing the whole theme

Open [the self-contained visual options](design/labrats-ui-options.html). A is the recommended first change; B and C are alternatives for review, not a commitment to remove the current card layout or celebrations. The mockups use fictional illustrative counts and do not connect to Supabase. They are included in the downloadable review pack.

Show the current hub and option A to a few students in alternating order. Ask which feels like the same tool as the question page, where they would tap next, and what looks unfinished. Do not lead with “which one looks AI-generated?” Record task success and concrete comments. Use that evidence to choose the next design pass.
