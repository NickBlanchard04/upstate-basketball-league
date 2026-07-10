# UBL Website Codebase Audit

Audit date: July 10, 2026

## Scope

- Public routes, mobile navigation, schedules, standings, team profiles, brackets, gallery, dialogs, and homepage ticker.
- League data model, source validation, fallback behavior, standings calculations, playoff advancement, and update workflow.
- Desktop and mobile browser behavior, console health, malformed data, final-score propagation, and overlapping current games.

## Findings resolved

- Replaced page-specific schedule assumptions with one normalized game feed.
- Added permanent game, team, and venue IDs and canonical ISO game dates.
- Corrected live detection from a single two-hour match to all games in a configurable 90-minute window.
- Stopped deriving game addresses from a team's usual gym; every game now resolves its venue directly.
- Added public states for scheduled, live, final, postponed, cancelled, and forfeited games.
- Added automatic standings and separate Boys Varsity and Girls Varsity bracket progression.
- Escaped feed text and restricted dynamic image URLs before rendering HTML.
- Added duplicate-ID, reference, division, weekday, status, score, and final-result validation.
- Added a repository snapshot and bundled fallback so a failed live endpoint does not blank the site.
- Added current-page semantics, dialog labels, keyboard-operable controls, and reduced-motion ticker behavior.
- Added unit, desktop end-to-end, mobile end-to-end, and GitHub Actions coverage.

## Verification result

- 8 unit/data tests passed.
- 16 end-to-end tests passed across desktop Chromium and a 390-pixel mobile Chromium viewport.
- Every public route rendered without browser console errors.
- Simulated final scores updated schedule results, standings, and bracket seeds.
- Simulated overlapping games displayed both current matchups.
- Simulated malformed JSON fell back to the bundled schedule.

## Remaining non-code inputs

- Commissioner confirmation of the provisional tiebreaker, forfeit, and game-duration rules.
- Final venues, times, contacts, coaches, and fifth-team identity.
- Final playoff sites and times.
- League Facebook URL when available.
- Google account authorization to create the first Apps Script web-app deployment and place its `/exec` URL in `config.js`. The deployment-ready source is in `apps-script/`.
