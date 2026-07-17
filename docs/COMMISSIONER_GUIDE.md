# UBL Commissioner Game-Day Guide

Use the league account, `info.upstatebasketballleague@gmail.com`, for commissioner work. Coaches use only their team-specific portals.

Quick references: [Coach Final-Score Guide](COACH_SCORE_GUIDE.md), [Game Exceptions And Corrections](GAME_EXCEPTION_WORKFLOW.md), [Backup And Recovery](BACKUP_AND_RECOVERY.md), and [Access And Roles](ACCESS_AND_ROLES.md).

## Before each game day

1. Open the [UBL League Control Panel - 2026-27](https://docs.google.com/spreadsheets/d/1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE/edit).
2. Use `Commissioner Dashboard` to confirm dates, times, teams, venues, and statuses.
3. Review the dashboard status line for missing scores or open corrections.
4. Verify the public [schedule](https://nickblanchard04.github.io/upstate-basketball-league/schedule.html) after changes publish.

Do not unhide or routinely edit the backend `Games` sheet. Dashboard edits update that source, team portals, and the website automatically.

## Routine final scores

Coaches enter the away and home scores in their team portal and check `Submit`. Their name is recorded automatically. Accepted results become `Final`, appear on every public score surface, recalculate standings and seeding, and create a private `Score Audit` entry.

Scores above 130 or margins above 80 require a second confirmation of the exact numbers.

## Corrections and exceptions

- Review `Corrections Queue`. Set an accurate request to `Approved`; it becomes `Completed` after publishing. Set an invalid request to `Rejected` and add a short commissioner note.
- Use `Commissioner Dashboard` for postponements, cancellations, reschedules, venue changes, and forfeits.
- Keep private discipline, medical, and eligibility details out of public Notes.
- Never delete a game or reuse a Game ID.

## Automated safeguards

- An hourly health check records overdue finals and public-feed mismatches in `Operations Alerts`; the Commissioner Dashboard displays the open count.
- A dated control-panel backup is created automatically each day in `UBL Automated Backups`.
- `Recovery Status` shows whether the latest backup is current and whether an isolated restore drill has passed within 31 days. The system owner checks the red `RUN ISOLATED DRILL` box on that sheet once a month.
- `Access Roster` controls team portal permissions. Removing or deactivating a representative and running the portal sync removes that person's access.

League communications: [info.upstatebasketballleague@gmail.com](mailto:info.upstatebasketballleague@gmail.com)
