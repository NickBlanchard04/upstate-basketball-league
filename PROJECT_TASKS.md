# UBL Website Task List

## Priority 1: In-Season Operations

- [x] Make the current `/concept/` site the single production site and retire the outdated root version before connecting live data.
- [ ] Build a phone-friendly league update system backed by one Google Sheet.
  - Keep one `Games` table for dates, times, divisions, teams, venues, game status, and final scores.
  - Keep one `Venues` table so addresses and map links are entered once.
  - Publish only approved public fields through a small Google Apps Script JSON endpoint.
  - Make the homepage, schedule, moving ticker, standings, and playoff brackets read from that same source.
  - Calculate standings automatically from games marked `Final`.
  - Support `Scheduled`, `Final`, `Postponed`, and `Cancelled` game states.
  - Show a public "Last updated" timestamp.
  - Validate missing teams, duplicate games, invalid scores, and Monday/Thursday scheduling before publishing.
  - Keep the current bundled data as a fallback if the live sheet is temporarily unavailable.
  - Write a short phone workflow for league leadership and test a complete update from score entry to the public site.

## Priority 2: Reliability And Maintenance

- [ ] Fix overlapping live-game detection so a later game is not hidden behind an earlier game's assumed two-hour window.
- [ ] Store one canonical game date/time and derive all visible date labels from it.
- [ ] Give each game a venue ID and address instead of assuming the home program's normal gym.
- [ ] Render live Sheet data safely without inserting untrusted text through raw HTML templates.
- [ ] Resolve remaining accessibility issues in tables, dialogs, and current-page navigation.
- [ ] Move gallery photo metadata into structured data instead of maintaining repeated HTML.
- [ ] Add automated end-to-end tests for navigation, schedules, standings, teams, brackets, galleries, dialogs, and mobile layouts.
- [ ] Add data validation tests for team references, dates, divisions, venues, scores, and standings calculations.
- [ ] Run the test suite automatically before every GitHub Pages deployment.

## Priority 3: Season Readiness

- [ ] Replace remaining placeholder dates, venues, contacts, coaches, and fifth-team information.
- [ ] Confirm how ties and forfeits affect standings and playoff seeding.
- [ ] Confirm final Boys Varsity and Girls Varsity playoff sites and times.
- [ ] Add the league Facebook link when the page is live.
