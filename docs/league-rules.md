# UBL 2026-27 Provisional Data Rules

These rules make schedule, standings, and playoff updates deterministic while the commissioner finalizes the full league standards. Any commissioner-approved replacement rule should be changed in the control sheet and this document together.

## Games and public status

- `Scheduled`: appears in upcoming games, the homepage feature, and the moving homepage ticker.
- `Live`: may be set manually, but a scheduled game is also treated as current from its start time through the configured 90-minute window.
- `Final`: requires both scores and counts in standings when it is a regular-season game.
- `Postponed`: remains visible with a `New date pending` message and does not appear as upcoming or live until its date is replaced and its status returns to `Scheduled`.
- `Cancelled`: remains visible for historical clarity and does not affect standings.
- `Forfeit`: counts in standings as a final result. The provisional official score is 1-0.
- Play-in, semifinal, and championship games never change regular-season standings.

## Standings

Teams are sorted by:

1. Win percentage.
2. Head-to-head wins among teams tied on win percentage.
3. Point differential.
4. Fewest points allowed.
5. Team name, used only as a deterministic display fallback.

Only regular-season games marked `Final` or `Forfeit` count. A tied final score is invalid.

## Playoff brackets

- Boys Varsity and Girls Varsity use separate brackets.
- Seed 4 plays Seed 5 in the play-in game.
- The play-in winner advances to play Seed 1.
- Seed 2 plays Seed 3 in the other semifinal.
- The two semifinal winners advance to the division championship.
- Seeds are calculated from the applicable division standings.
- A completed playoff game advances its winner automatically.

## Current-game behavior

- The league timezone is `America/New_York`.
- A game is current from its listed start through 90 minutes unless its public status excludes it.
- If games overlap, every current game is shown. The most recently started game appears first.
- The public feed refresh interval is five minutes.

## Data ownership and privacy

- Game IDs, team IDs, and venue IDs are permanent once published.
- Each game has one ISO date, one time, one division, and one venue reference.
- The private control sheet may contain representative email addresses and internal notes.
- The public JSON feed excludes representative emails and internal-only notes.
- If the live feed is unavailable or malformed, the site uses the last published repository snapshot.
