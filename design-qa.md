# UBL Schedule design QA

## Comparison target

- Source visual truth: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-selected-concept.png`
- Desktop implementation: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-build-desktop-v2.png`
- Mobile implementation: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-build-mobile-full.png`
- Full-view comparison: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-design-comparison.png`
- Focused comparison: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\ubl-schedule-focused-comparison.png`
- Viewports: 1440 × 1024 desktop and 390 × 844 mobile.
- State: Opening Week, All Games, bundled production schedule loaded.

## Findings

- No actionable P0, P1, or P2 differences remain.
- The implementation preserves the selected concept's shared header, wide Schedule banner, preliminary-season treatment, navy week panel, accessible week/division controls, strong date rail, rectangular matchup rows, team logos, Teko time/date numerals, and red/blue UBL hierarchy.
- The implementation intentionally shows the two commissioner-published opening-week games rather than the three illustrative games in the generated mock. Recent Results and Schedule Updates are conditional and remain hidden until real final, postponed, or cancelled data exists. This is an expected data-honesty constraint, not design drift.
- Mobile controls are slightly taller than the generated mock so every interactive target remains at least 44px. This is an intentional accessibility constraint.

## Required fidelity surfaces

- Fonts and typography: passed. Barlow Condensed remains the display face, IBM Plex Sans remains the operational UI face, and the supplied local Teko variable font is used for broadcast numerals. Heading hierarchy, uppercase treatment, tabular numerals, and wrapping match the source direction.
- Spacing and layout rhythm: passed. Desktop and mobile preserve the source's header-to-banner-to-week-panel sequence. The final mobile banner was reduced from the first implementation so the Upcoming Games bar reaches the first viewport without clipping controls.
- Colors and visual tokens: passed. Midnight navy, league blue, UBL red, white, and light canvas map directly to `DESIGN.md`; contrast and active-state emphasis remain clear.
- Image quality and asset fidelity: passed. The implementation uses the supplied optimized UBL and team logo assets with `object-fit: contain`; no logos or icons were approximated in code.
- Copy and content: passed. Key Schedule labels match the selected design while production teams, dates, venues, results, and status sections remain source-backed.

## Interaction and browser verification

- Mobile menu opened and closed with the correct `aria-expanded` state.
- Week selection changed the heading and game groups.
- Boys, Girls, and All Games filters updated rows and `aria-pressed` states.
- Confirmed venue controls opened the map dialog and exposed Apple Maps, Google Maps, and Waze actions.
- Previous/next controls disable correctly at season boundaries.
- No horizontal page overflow at mobile width.
- Browser console errors checked: none.
- Automated WCAG A/AA browser checks passed on desktop and mobile.

## Comparison history

### Iteration 1

- Earlier evidence: `ubl-schedule-build-desktop-v1.png` and `ubl-schedule-build-mobile-v1.png`.
- [P2] The first mobile banner and setup stack pushed the game slate below the initial viewport, weakening the selected broadcast-slate pacing.
- Fix: reduced Schedule-only banner height and spacing, compacted the panel heading and planning notice, tightened the date rail and mobile matchup rows, and kept 44px controls.

### Iteration 2

- Post-fix evidence: `ubl-schedule-build-desktop-v2.png`, `ubl-schedule-build-mobile-full.png`, and both comparison images listed above.
- Result: the hero/panel proportions now follow the selected concept closely; the Upcoming Games bar reaches the first mobile viewport; no actionable P0/P1/P2 differences remain.

## Implementation checklist

- [x] Shared header unchanged on desktop and mobile.
- [x] Responsive broadcast slate implemented with production schedule data.
- [x] Week, division, menu, and map interactions verified.
- [x] Focus, reduced-motion, contrast, and touch targets preserved.
- [x] Desktop and mobile source-to-build comparisons completed.
- [x] Full browser regression and WCAG checks passed.

## Follow-up polish

- [P3] Revisit row density after the league publishes additional opening-week games; the current two-game slate correctly leaves more open canvas than the illustrative mock.

final result: passed
