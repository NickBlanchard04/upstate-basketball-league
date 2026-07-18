# Standings labels, tooltips, and lower graphic design QA

- Source visual truth: `C:/Users/lblan/AppData/Local/Temp/codex-clipboard-7083d0ed-8579-408c-8988-d4c766008e21.png`
- Lower graphic source detail: `C:/Users/lblan/AppData/Local/Temp/codex-clipboard-92bb8728-4fbd-4e9b-859d-eb1074587398.png`
- Desktop implementation screenshot: `C:/Users/lblan/.codex/visualizations/2026/07/18/019f72d0-0f51-7990-b928-97ea0fba6bc6/ubl-standings-latest-desktop-tooltip.jpg`
- Mobile implementation screenshot: `C:/Users/lblan/.codex/visualizations/2026/07/18/019f72d0-0f51-7990-b928-97ea0fba6bc6/ubl-standings-latest-mobile.jpg`
- Combined comparison: `C:/Users/lblan/.codex/visualizations/2026/07/18/019f72d0-0f51-7990-b928-97ea0fba6bc6/ubl-standings-removal-comparison.png`
- Viewports: 1440 × 950 desktop and 390 × 844 mobile.
- State: Standings page with league data loaded; Girls W–L tooltip focused for the desktop interaction capture; mobile menu closed.

## Full-view comparison evidence

The before/after comparison shows that both visible `Varsity standings` subtitles are absent from the division title bars. It also shows that the lower court labels, centered UBL logo, and data-sync label no longer appear below the final standings row. The red/blue division split and postseason note remain intact.

## Focused region comparison evidence

The desktop capture isolates the table header at readable scale. W–L, PCT, PF, PA, and Diff keep their compact scoreboard labels, add a restrained dotted help affordance on desktop, and reveal a navy, white-bordered explanation on pointer activation or keyboard focus. The Girls Diff tooltip was measured against its panel and remains fully inside the right edge. The mobile capture confirms tooltip bubbles and dotted help styling are not rendered at 390 px.

## Findings

- No remaining P0/P1/P2 mismatches.
- Typography: Existing Barlow Condensed and IBM Plex Sans roles remain unchanged. Tooltip copy uses the current UI font while scoreboard abbreviations remain compact.
- Spacing and layout: Removing the subtitles leaves balanced title bars. Removing the lower graphic creates a clean red/blue field below the final row without overlapping the postseason note.
- Colors: Tooltips reuse midnight navy, white borders, and the existing shadow language. No new color token was introduced.
- Assets: No logo or team asset was replaced or redrawn. The lower duplicate UBL logo was removed; navigation and seed-rail marks remain unchanged.
- Copy: Tooltip explanations are `Wins–losses record`, `Winning percentage`, `Points for (scored)`, `Points against (allowed)`, and `Point differential (PF minus PA)`.
- Responsive behavior: Desktop tooltips stay inside their panels. At 390 px the explanations are hidden, abbreviations remain visible, and no horizontal page overflow was detected.
- Interaction and accessibility: Each abbreviation is keyboard focusable and references a real `role="tooltip"` element with `aria-describedby`. Mobile navigation opened and closed correctly. Browser console errors: none.

## Comparison history

1. Initial source capture: both division subtitles and the full lower court/logo/sync graphic were present.
2. First implementation: removed those elements and added desktop explanations. Accessibility inspection showed pseudo-element tooltip copy could duplicate table-header text.
3. Fix: replaced generated copy with uniquely identified tooltip elements, hid them on mobile, added `aria-describedby`, and advanced the stylesheet cache key. Post-fix desktop and mobile captures show the requested removals, clean headers, working focus state, and no overflow.

## Implementation checklist

- [x] Remove both visible division subtitles
- [x] Remove the lower court labels, centered logo, and sync label
- [x] Add all five desktop tooltip definitions to both divisions
- [x] Support pointer activation and keyboard focus
- [x] Keep tooltips visually hidden on mobile
- [x] Preserve the postseason note and league data behavior
- [x] Verify desktop and mobile layouts, mobile navigation, and console

final result: passed
