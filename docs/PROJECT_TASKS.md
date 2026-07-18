# UBL Website Task List

## July 18 Website Completion (Tasks 1–9)

1. [x] Promote the modern build to the canonical `ubl-site/` root.
2. [x] Integrate the standalone UBL brand identity, GPT image set, and About-page improvements.
3. [x] Move gallery content into validated structured data with responsive assets.
4. [x] Reconcile canonical paths, documentation, older snapshots, duplicate backups, and obsolete active-source assets.
5. [x] Pass unit, data, desktop, mobile, accessibility, and console-error checks.
6. [x] Exercise every public route and key interaction in real desktop and mobile browsers.
7. [x] Complete image, loading, performance, metadata, sitemap, manifest, favicon, and social-sharing hardening.
8. [x] Build and validate the allowlisted `dist/` launch artifact, checksum manifest, manual release workflow, and QA/rollback runbook.
9. [x] Remove the empty locked legacy UBL working folder after safely stopping its orphaned preview server.

## Priority 1: In-Season Operations

- [x] Promote the modern build to the `ubl-site/` root as the single canonical production source; keep older concepts and rollback snapshots under `archive/` only.
- [x] Build a phone-friendly league update system backed by one Google Sheet.
  - Keep one `Games` table for dates, times, divisions, teams, venues, game status, and final scores.
  - Keep one `Venues` table so addresses and map links are entered once.
  - Publish only the public `Website Feed` tab as a Google Sheets CSV feed.
  - Make the homepage, schedule, moving ticker, standings, and playoff brackets read from that same source.
  - Calculate standings automatically from games marked `Final`.
  - Support `Scheduled`, `Final`, `Postponed`, and `Cancelled` game states.
  - Show a clear live-sheet sync status on public pages.
  - Validate missing teams, duplicate games, invalid scores, and commissioner-approved scheduling before publishing.
  - Keep the current bundled data as a fallback if the live sheet is temporarily unavailable.
  - [x] Write a short phone workflow for league leadership and test a complete update from score entry to the public site.

## Priority 2: Reliability And Maintenance

- [x] Fix overlapping live-game detection so a later game is not hidden behind an earlier game's assumed two-hour window.
- [x] Store one canonical game date/time and derive all visible date labels from it.
- [x] Give each game a venue ID and address instead of assuming the home program's normal gym.
- [x] Render live Sheet data safely without inserting untrusted text through raw HTML templates.
- [x] Resolve remaining accessibility issues in tables, dialogs, and current-page navigation.
- [x] Move gallery photo metadata into structured data instead of maintaining repeated HTML.
- [x] Add automated end-to-end tests for navigation, schedules, standings, teams, brackets, galleries, dialogs, and mobile layouts.
- [x] Add data validation tests for team references, dates, divisions, venues, scores, and standings calculations.
- [x] Run the test suite automatically for every push and pull request.

## Priority 3: Season Readiness

- [ ] Replace remaining placeholder dates, venues, contacts, coaches, and fifth-team information.
- [x] Hide or rephrase unconfirmed public details so raw placeholder language is not displayed.
- [x] Publish coach, commissioner, exception, access-role, and team-onboarding guides.
- [x] Add a private access roster to the league control workbook.
- [x] Add incomplete, duplicate, and unusual-score safeguards to the coach workflow.
- [x] Prepare the `UpstateBasketballLeague.com` launch and rollback checklist.
- [x] Document provisional tie and forfeit rules for commissioner confirmation.
- [ ] Confirm final Boys Varsity and Girls Varsity playoff sites and times.
- [ ] Add the league Facebook link when the page is live.
