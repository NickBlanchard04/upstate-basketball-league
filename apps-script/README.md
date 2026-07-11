# UBL Score Feed

The production site uses the published `Website Feed` CSV from the UBL League Control Panel. It does not require Google Apps Script.

## In-season workflow

1. On `Coach Score Entry`, find the completed game.
2. Enter the away score, home score, and your full name.
3. Check `Submit` only after the result is final.
4. Confirm `Website Status` changes to `Published to website`.
5. The `Website Feed` tab mirrors only public schedule and result fields. The site refreshes from it every minute.

The public website automatically falls back to its published schedule if Google Sheets is temporarily unavailable.

## Sheet maintenance

- Update dates, times, teams, venues, and game status in the protected `Games` tab. The `Coach Score Entry` and `Website Feed` tabs update from that source.
- Keep the `Website Feed` publication set to `Comma-separated values (.csv)` with automatic republishing enabled.
- Do not publish the entire control panel. Only the `Website Feed` tab is public.

## Optional Apps Script

`Code.gs` remains as an optional future upgrade for audit logging and automatic clearing of score-entry rows. It is not part of the current production workflow.
