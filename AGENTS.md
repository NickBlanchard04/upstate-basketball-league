# UBL site instructions

## Scope

- This directory is the complete Upstate Basketball League website. Keep UBL work inside it.
- Read `DESIGN.md` before substantial visual or copy changes.
- For a major design pass, read `.agents/skills/gpt-taste/SKILL.md` before editing the UI.
- Never use Northline identity, copy, imagery, components, or Northline source files here.

## Structure

- `index.html` and the sibling page files are the active public site.
- `styles.css` and `script.js` are UBL's shared presentation and behavior.
- `league-data.json` is the published snapshot, `data-loader.js` loads and normalizes live data, and `data.js` remains the bundled fallback.
- Page-specific files use the `ubl-*` prefix.
- `assets/` contains UBL logos, team marks, authentic photography, and the coordinated generated-image set.
- `docs/`, `reference/`, `visual-qa/`, and `archive/` are supporting material, not production dependencies.

## Brand and GPT image combinations

- UBL owns a standalone identity; do not borrow from, reference, or visually blend with Northline.
- Treat `DESIGN.md` as the canonical brand brief for voice, typography, color, layout, and motion.
- The coordinated GPT image combination is the three-part "Court & Calling" campaign: Faith / Before the Whistle, Competition / Give Your Best, and Kingdom Impact / Beyond One Team.
- Use the web-ready assets and prompt records in `assets/ubl/`. Keep the triptych visually coherent, clearly illustrative, and centered on anonymous figures rather than invented UBL history.
- Do not generate fake teams, identifiable athletes, scores, sponsors, trophies, venues, or documentary moments. Use authentic gallery photography only for events that actually occurred.

Keep league information honest about planned or future events. Do not generate fictional teams, athletes, scores, venues, or documentary moments. Preserve responsive behavior, keyboard access, and reduced-motion support.
