# Standings shared header restoration design QA

- Source visual truth: `C:/Users/lblan/AppData/Local/Temp/codex-clipboard-ae5d6d78-459a-4bd3-898b-7e5ec54a9912.png`
- Drift reference: `C:/Users/lblan/AppData/Local/Temp/codex-clipboard-563af6b2-89ef-4ea1-9c33-0f5f96fb5d04.png`
- Desktop implementation screenshot: `C:/Users/lblan/.codex/visualizations/2026/07/18/019f72d0-0f51-7990-b928-97ea0fba6bc6/ubl-standings-header-restored-desktop.png`
- Mobile implementation screenshot: `C:/Users/lblan/.codex/visualizations/2026/07/18/019f72d0-0f51-7990-b928-97ea0fba6bc6/ubl-standings-header-restored-mobile.png`
- Reference comparison: `C:/Users/lblan/.codex/visualizations/2026/07/18/019f72d0-0f51-7990-b928-97ea0fba6bc6/ubl-standings-header-reference-vs-restored.png`
- Shared-page comparison: `C:/Users/lblan/.codex/visualizations/2026/07/18/019f72d0-0f51-7990-b928-97ea0fba6bc6/ubl-shared-header-vs-standings.png`
- Viewports: 1440 x 300 desktop and 390 x 844 mobile.
- State: Home and Standings headers captured after fonts loaded; desktop navigation visible; mobile menu tested closed, open, and closed again.

## Full-view comparison evidence

The normalized reference comparison shows the Standings page using the same tall logo lockup, two-line metallic brand wordmark, compact IBM Plex Sans navigation, midnight header field, thin divider, and active red underline as image 1. The shared-page comparison confirms that the Home and Standings header geometry is identical at the same browser viewport; only the correct active navigation item changes.

## Focused region comparison evidence

The header region was inspected independently because the target is a narrow navigation crop. At desktop, Home and Standings both measured a 92.1875px header, a 91.1875px inner row, a 57.59375 x 72px logo, an 11.2px IBM Plex Sans navigation label, and the same 1px translucent divider. At mobile, both measured an 81px header with a 48px menu target and a 46.390625 x 57.59375px logo.

## Findings

- No remaining P0/P1/P2 mismatch.
- Fonts and typography: the Standings header now inherits the shared Barlow Condensed brand lockup and IBM Plex Sans navigation roles. It no longer uses the larger Standings-only navigation treatment.
- Spacing and layout rhythm: desktop and mobile header height, container width, logo placement, navigation spacing, and menu target match the Home page at the same viewport.
- Colors and visual tokens: the shared midnight navy field, metallic white wordmark treatment, red active underline, and thin translucent divider match image 1 and the rest of the site.
- Image quality and asset fidelity: the supplied optimized UBL logo remains the only logo asset; it is not redrawn or replaced.
- Copy and content: brand and navigation labels are unchanged. Standings remains the active destination on the Standings page.
- Responsive behavior: no horizontal overflow was detected at desktop or 390px mobile.
- Interaction and accessibility: the mobile control uses the same three-line hamburger structure as the rest of the site, has a 48px target, updates its accessible name between `Open menu` and `Close menu`, and toggles `aria-expanded` correctly. Browser console errors: none.

## Comparison history

1. Initial P1 mismatch: the Standings page owned a separate header stylesheet and a text-only mobile menu, producing the larger Barlow navigation, thick red bottom border, different logo sizing, and different responsive breakpoint shown in image 2.
2. Fix: loaded the shared site stylesheet on Standings, removed the duplicate header rules from the Standings stylesheet, matched the shared hamburger markup and menu behavior, and aligned the desktop breakpoint to 1024px.
3. Post-fix evidence: desktop and mobile measurements match the Home page, the focused reference comparison matches image 1's design language, the menu works in both states, and no overflow or console errors remain.

## Implementation checklist

- [x] Use the same header stylesheet as the rest of the public site
- [x] Remove Standings-only header and navigation overrides
- [x] Restore the shared desktop logo, wordmark, navigation, underline, and divider
- [x] Restore the shared mobile hamburger button and accessible label behavior
- [x] Add a desktop/mobile regression check against the Home header
- [x] Verify desktop and mobile layouts, menu behavior, overflow, and console

final result: passed
