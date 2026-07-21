# UBL Schedule dark command center — design QA

## Comparison target

- Source visual truth: `C:\Users\lblan\.codex\generated_images\019f72d0-0f51-7990-b928-97ea0fba6bc6\exec-e72c012d-c7d0-4f5c-8c15-df7d0279fb03.png`
- Desktop implementation: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-qa-desktop-1148x1024.png`
- Mobile implementation: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-qa-mobile-390x1024.png`
- Desktop full-view comparison: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-design-qa-desktop-comparison.png`
- Mobile/focused comparison: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-design-qa-mobile-comparison.png`
- Viewports: 1148 × 1024 desktop and 390 × 1024 mobile.
- State: Opening Week, All Games, mobile menu closed, local production-shaped schedule data loaded.

## Findings

- No actionable P0, P1, or P2 differences remain.
- The implementation matches the selected no-hero direction: midnight court field, season rail, compact week command deck, red active filter, blue slate header, date rail, real team marks, Teko date/time numerals, and dark matchup rows.
- The desktop header is intentionally shorter and uses the existing shared UBL header rather than the concept's taller two-row navigation. This follows the user's explicit requirement that Schedule use the same header as the other pages.
- The implementation shows source-backed venue copy (`Perth home court`) instead of the concept's illustrative `Venue details pending`. This is expected production content, not design drift.

## Required fidelity surfaces

- Fonts and typography: passed. Barlow Condensed provides the display hierarchy, IBM Plex Sans handles operational UI copy, and Teko is limited to scoreboard numerals. Weights, uppercase treatment, wrapping, and tabular number alignment remain consistent across both viewports.
- Spacing and layout rhythm: passed. The season rail, title block, planning notice, controls, filters, and game board preserve the reference hierarchy. The Upcoming Games board begins inside the first mobile viewport, with no clipped or overlapping controls.
- Colors and visual tokens: passed. The implementation maps directly to the UBL midnight navy, league blue, UBL red, white, and muted blue-gray tokens. Selected, disabled, hover, and focus states remain distinct.
- Image quality and asset fidelity: passed. The supplied optimized UBL logo, team logos, and playbook texture are used directly; no logo, team mark, or decorative image was redrawn or approximated in code.
- Copy and content: passed. Static Schedule labels match the selected direction while teams, dates, times, divisions, and venues remain data-driven.
- Icons: passed. Calendar and directional controls use the bundled Material Symbols font. Final directional arrows match the reference's navigation intent without exposing ligature text.
- Accessibility and responsive behavior: passed. Controls retain at least 44px targets, semantic labels and `aria-pressed`/`aria-expanded` states are present, keyboard focus remains visible, reduced motion is supported, and browser measurements found no horizontal overflow.

## Interaction and browser verification

- Mobile menu opened and closed; `aria-expanded`, the visible navigation state, and body scroll lock updated correctly.
- Boys Varsity filtering reduced Opening Week to the boys matchup and set the correct pressed state.
- Next Week advanced the heading to Week 2 and enabled the Previous Week control.
- The native week selector jumped directly to Week 5 and rendered that week's games.
- All Games restored both divisions and the correct pressed state.
- Previous Week is disabled at the opening-week boundary.
- All images and local fonts loaded successfully.
- Browser console warnings/errors checked: none.
- Desktop and mobile browser measurements found no horizontal overflow.

## Comparison history

### Iteration 1

- Evidence: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-design-qa-desktop-pass1.png` and `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-design-qa-mobile-pass1.png`.
- [P2] The previous/next controls used curved undo/redo symbols while the source uses direct left/right navigation arrows. The playoff link also used a start-line arrow, creating visible icon drift.
- Fix: replaced all three with the bundled east-arrow icon and rotated the Previous Week instance 180 degrees.

### Iteration 2

- Post-fix evidence: the final desktop and mobile comparison files listed above.
- The controls now use direct directional arrows, the mobile board remains within the first viewport, and no actionable P0/P1/P2 differences remain.

## Follow-up polish

- [P3] The implementation uses the approved UBL playbook texture more quietly than the concept's dotted halftone clusters. This keeps the page consistent with the existing brand asset library and does not reduce hierarchy or usability.

final result: passed

---

# About Profile Cards design QA

## Comparison target

- Source visual truth: `C:/Users/lblan/AppData/Local/Temp/codex-clipboard-676455ec-b476-425a-bf10-19b9ab68d7dc.png`
- Desktop implementation: `C:/Users/lblan/AppData/Local/Temp/ubl-about-profile-cards-desktop.png`
- Mobile implementation: `C:/Users/lblan/AppData/Local/Temp/ubl-about-profile-cards-mobile.png`
- Combined full-view comparison: `C:/Users/lblan/AppData/Local/Temp/ubl-about-card-design-comparison.png`
- Viewports: 1280 × 720 desktop and 390 × 844 mobile.
- States: all fronts, first and second card backs, hover/focus, exclusive-open behavior, and reduced-motion fallback.

## Full-view comparison evidence

The combined comparison places the reference Teams cards and the implemented About cards in one image. The implementation preserves the reference's three-column rhythm, dark navy court field, rounded outline, top-right action control, centered white graphic stage, condensed display title, supporting line, and full-width bottom action bar. Category icons intentionally replace team logos because these cards explain league identity rather than link to program profiles.

## Focused comparison evidence

A separate crop was not needed because the card faces, typography, borders, controls, and graphic stages are clearly readable in the combined component-level comparison. The mobile screenshot provides the focused single-column check.

## Findings

- No actionable P0, P1, or P2 differences remain.
- The About cards intentionally omit team abbreviations and coach names because those fields do not apply to league-profile content.

## Required fidelity surfaces

- Fonts and typography: passed. Barlow Condensed and IBM Plex Sans match the established UBL card hierarchy, with no clipped or truncated labels.
- Spacing and layout rhythm: passed. Card proportions, framed icon stages, action controls, and bottom bars follow the source. The grid progresses from one to two to three columns at standard project breakpoints.
- Colors and visual tokens: passed. Midnight navy, league blue, UBL red, white, and pink supporting text match the existing Teams component.
- Image quality and asset fidelity: passed. Bundled Material Symbols provide crisp category icons; no fabricated team or league imagery was introduced.
- Copy and content: passed. The three requested titles and full descriptions are preserved exactly on the card backs.

## Interaction and browser verification

- Card fronts and backs flip correctly on desktop and mobile.
- Opening one card closes the previously opened card.
- `aria-pressed`, `aria-hidden`, and accessible labels update with state.
- Card backs are centered and remain fully readable at 390px.
- No horizontal overflow at desktop or mobile widths.
- Automated route checks report no browser console or runtime errors.

## Comparison history

### Iteration 1

- [P2] Inherited Teams mobile rules hid the flip controls.
- [P2] The accessibility heading used a utility class that was not defined in this project and remained faintly visible.
- Fix: restored the controls with scoped About-card rules and changed the heading to the project's existing `sr-only` utility.

### Iteration 2

- Post-fix desktop and mobile evidence confirms visible flip affordances, a properly hidden accessible heading, centered backs, exclusive-open state, and zero horizontal overflow.
- Result: no actionable P0, P1, or P2 differences remain.

## Implementation checklist

- [x] Remove the previous “Built for growing programs” treatment.
- [x] Build three responsive Teams-style cards.
- [x] Add accessible front/back flip behavior.
- [x] Keep only one card flipped at a time.
- [x] Preserve the requested descriptions.
- [x] Verify desktop and mobile layouts and interactions.

final result: passed
