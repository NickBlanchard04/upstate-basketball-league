# UBL Phone Update Workflow

Control sheet: [UBL League Control Panel - 2026-27](https://docs.google.com/spreadsheets/d/1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE/edit)

## Enter a final score

1. Open the `Games` tab.
2. Find the game by date and matchup. Do not change its Game ID.
3. Enter Away Score and Home Score.
4. Change Status to `Final`.
5. Wait up to five minutes, then refresh the public schedule and standings.

## Postpone, cancel, or reschedule

1. Change Status to `Postponed` or `Cancelled`.
2. Put a short public explanation in Notes when useful.
3. For a reschedule, replace Date, Time, and Venue ID, then return Status to `Scheduled`.

## Change a location

1. Confirm the venue exists on the `Venues` tab.
2. Add its full address once in `Venues` if it is new.
3. Select that Venue ID on the game row.

## Add a team

1. Replace the `tbd` row on `Teams` while keeping Team ID `tbd` until the website assets are ready.
2. Add its logo URL, abbreviation, divisions, and public summary.
3. Add its venue to `Venues` and update its scheduled games.
4. When a permanent ID is chosen, update every game reference in the same session.

## Safety checks

- `Final` and `Forfeit` games need both scores.
- Away and home teams must be different.
- Dates use `YYYY-MM-DD` and should remain on Monday or Thursday for regular-season games.
- Public schedule notes are visible on the website. Keep private concerns outside the Games Notes column.
- If the site shows `Using backup schedule`, do not re-enter data. The live feed is unavailable and the website is intentionally showing its last safe snapshot.
