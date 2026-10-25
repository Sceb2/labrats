# LabRats unified design — A, B and C implemented

Implemented on `LabRats-Online`. Both subjects now use the approved visual direction. The live `main` branch and hosted Supabase are unchanged.

## What changed

- **A — subject choice:** the practice pages’ paper colour, system body type, Georgia display type and spacing, with smaller existing illustrations and simple subject rows.
- **B — topic choice:** one-column checkbox rows in Chemistry and Applied Science, green selected states, compact question counts and the session controls above Practice settings. The small count means questions using that topic; Chemistry counts can overlap where a question requires multiple topics. Eligibility and session selection rules are unchanged.
- **C — feedback:** a shared score-first heading, earned/missed marking points and clear corrections. Full-mark detail is collapsed by default. Question wording, diagrams and submitted responses are available under **View question and your answers**. Replies retain their existing first-attempt history; reveals remain unscored. Applied Science keeps error-carried-forward marks and explicitly labelled self-assessed scores. Generic encouragement panels have been removed from routine question feedback; existing optional celebration settings and session celebrations remain.
- **Shared presentation:** the same controls, typography, palette and flatter supporting panels extend to login and staff tools. The question-navigation bars show the current question position in both subjects. The working Sign Out control and its unsaved-attempt warning are retained.

## Implementation

`design.css` is the common final style layer after the existing subject styles. `feedback.js` supplies the shared display-only heading, marking-point, attempt-note and question-disclosure helpers. It does not score answers or write storage. Chemistry’s renderer is in `ui.js` / `app.js`; Applied Science retains its renderer and scorer in `applied-science/` and uses the shared helpers for presentation.

Build scripts include the shared layer and renderer in the hosted pages and self-contained subject, staff and mechanism previews. Build hashes/cache versions include the new files. The original question banks, diagrams, marking engines, adaptive algorithm and Supabase schema have not changed.

## Verification

- `npm run build`
- `npm test`: 308 existing software checks and 35 unit tests
- `npm run test:design`: real browser checks for both subjects, hub/topic layouts, responsive 320/390/1280px pages, marking/retries/reveals, readonly answer review, mechanisms/synthesis, method marks, self-assessment, and both standalone previews without external requests
- `npm run test:mechanism-preview`: all 20 mechanism cards render and score through the actual interface
- `npm run test:auth-local`: 70 real local Auth/backend/browser checks, including account/subject isolation, offline syncing, metadata-only storage, password/reset gates and staff workflows; native Deno validates the generated Edge Function

Auth tests use disposable local PostgreSQL/Auth services and fictional accounts, never hosted Supabase. The interface tests verify the first-attempt score and compare adaptive results at the same timestamp across retries so elapsed-time decay is not mistaken for a retry effect.

## Review

[Download the updated working preview](../downloads/labrats-unified-design-preview-2026-10-25.zip), extract it and open `subject-hub-preview.html`. The pack includes both subjects, shared staff tools, the mechanism preview, actual mobile screenshots and `mobile-previews.html`.

No new Supabase migration or Edge Function deployment is needed for this visual update. Existing account features still depend on the previously supplied subject setup. Earlier A/B/C mockups and ZIPs are historical review snapshots.
