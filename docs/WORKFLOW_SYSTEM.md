# UBL Workflow System

## Operating model

`Games` is the single source of truth. The Commissioner Dashboard, team portals, public JSON feed, published CSV, website, standings, ticker, and brackets all read from or write back to that table.

## Implemented safeguards

1. `Access Roster` stores each verified Google account, exact Team ID, access-test state, pilot state, rollout state, and private portal URL.
2. Every active program receives a compact, team-specific mobile portal containing only its assigned pilot and current or nearest games.
3. Drive editor access is recalculated from the roster. Inactive or removed representatives lose portal access during the next access sync.
4. Commissioner Dashboard and backend Games edits refresh existing team portals automatically.
5. The website uses the full Apps Script JSON feed first, the public score CSV second, and the repository snapshot last.
6. An hourly health check records overdue finals and recent public-feed mismatches in `Operations Alerts`, resolves cleared items, and updates the dashboard count.
7. The Commissioner Dashboard provides one visible place for schedule, venue, status, score, and note changes.
8. Coaches request corrections from their portal; the commissioner approves or rejects them in `Corrections Queue`. A dated control-panel backup runs daily.

## Commissioner routine

- Before game day: review `Commissioner Dashboard` and its status line.
- After games: investigate any missing-score alert; coaches normally submit their own finals.
- For a correction: review `Corrections Queue`, add a note when useful, then choose `Approved` or `Rejected`.
- For an access change: edit `Access Roster`, then run `syncAccessAndCoachPortals`.
- Weekly: compare completed games, standings, and bracket seeding. Backups are automatic.

## Coach routine

- Open the private link for your program.
- Enter away score, home score, and Submit.
- Read Status.
- Use `Correction Request` only when an already-published score is wrong.

No coach edits the website, commissioner control panel, standings, or schedule directly.
