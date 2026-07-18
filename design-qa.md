# Standings Lockup Design QA

## Scope

- Source reference: `C:\Users\lblan\AppData\Local\Temp\codex-clipboard-c110c932-f51d-4966-b9d5-f3f7b51d302c.png`
- Desktop implementation capture: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\standings-lockup-viewport-desktop-v2.png`
- Phone implementation capture: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\standings-lockup-mobile-v2.png`
- Focused comparison: `C:\Users\lblan\.codex\visualizations\2026\07\18\019f72d0-0f51-7990-b928-97ea0fba6bc6\standings-lockup-comparison-v2.png`
- Viewports and state: desktop at a 1440 x 950 responsive cap and phone at 390 x 844, default Standings page with league data loaded and the mobile menu closed.

## Fidelity surfaces

- Typography: the editable HTML title uses the site's existing condensed display family at weight 900, white fill, a restrained dark outline, and a heavy navy offset shadow. The status badge uses the same display family at weight 800.
- Spacing and layout: the title is vertically stretched to match the reference's tall letterforms. The badge is centered, overlaps the lower edge, and is approximately 43% of the visible title width in the focused comparison.
- Color: the existing solid red-to-blue division background is retained, with the reference's white title and dark navy badge treatment.
- Assets: no new raster asset was substituted for the heading. The supplied screenshot remains the visual source, while the implementation stays selectable, accessible text. Existing UBL brand assets are unchanged.
- Copy: the badge reads exactly `League play begins December 3`.
- Division headers: both visible `Varsity standings` subtitles were removed. The table captions remain as accessible names only.

## Comparison history

1. An initial preview was rejected because it was served by a stale local process and was not valid comparison evidence.
2. The first clean implementation matched the overall treatment, but the focused side-by-side comparison showed the title was too short and the badge too wide relative to the supplied lockup.
3. The title was stretched vertically and the badge was narrowed. The second focused comparison matches the reference's title height, overlap, shadow weight, border treatment, and badge-to-title proportion. No actionable P0, P1, or P2 visual differences remain. Minor glyph-shape and antialiasing differences are expected from using the site's existing webfont rather than embedding text as an image.

## Responsive and interaction checks

- Desktop: both division subtitles are absent; the title and badge overlap cleanly; no horizontal overflow was detected.
- Phone: the full title remains inside the viewport, the badge remains centered, both division tables remain readable, and no horizontal overflow was detected.
- Mobile navigation: the menu opened, reported `aria-expanded="true"`, closed, and returned to `aria-expanded="false"`.
- Console: no error-level messages were recorded during the final local desktop and phone checks.

## Final result

passed
