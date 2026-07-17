# UBL Access And Roles

The private `Access Roster` tab in the [UBL League Control Panel - 2026-27](https://docs.google.com/spreadsheets/d/1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE/edit) is the source of truth for names, verified Google accounts, team assignments, portal links, pilot status, and rollout readiness.

## Access levels

- **System owner:** Owns Apps Script, automated triggers, backups, public feeds, and access changes.
- **Commissioner:** Uses the control panel and Commissioner Dashboard for schedule decisions, corrections, and weekly review.
- **Coach score portal editor:** Can edit only the yellow input cells in that program's portal. This role cannot see another team's portal, the control panel, or audit data.
- **Public visitor:** Can view only the public website and feeds.

## Access workflow

1. Record the representative's full name, verified Google email, and exact Team ID.
2. Set Access level to `Coach score portal editor` and Status to `Active` only after verification.
3. Run `syncAccessAndCoachPortals` as the league business account.
4. Send only the Portal URL written to that representative's roster row.
5. Mark `Access tested`, `Pilot completed`, and `Ready for rollout` as each step is completed.

The sync creates or refreshes one portal per active program, grants access only to rostered Google accounts, and removes editors who are no longer active. Give each program one primary score submitter unless the commissioner approves a backup.

Never publish the Access Roster, send passwords or recovery codes, or grant team representatives access to the private control panel.
