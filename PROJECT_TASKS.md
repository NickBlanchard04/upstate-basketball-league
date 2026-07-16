# UBL Website Task List

## Priority 1: In-Season Operations

- [x] Make the current `/concept/` site the single production site and retire the outdated root version before connecting live data.
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
- [ ] Move gallery photo metadata into structured data instead of maintaining repeated HTML.
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
