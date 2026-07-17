# UBL Backup And Recovery

Only the league system owner should run recovery actions. Coaches and team representatives continue using their private score portals.

## Normal protection

- A dated copy of the control workbook is created every day in `UBL Automated Backups`.
- `Recovery Status` records the latest backup check, isolated drill, and recovery candidate.
- The action checkboxes at the top of `Recovery Status` provide the three owner actions. The optional `UBL Operations` menu exposes the same tools when the script is opened in a bound spreadsheet context.
- A healthy system has a backup no more than 30 hours old and a successful recovery drill no more than 31 days old.

## Monthly recovery drill

1. Open the private league control workbook as the league business account.
2. Open `Recovery Status` and check the red box beside `RUN ISOLATED DRILL`.
3. Wait for the completion message, then open `Recovery Status`.
4. Confirm the latest `Recovery drill` row says `PASS`.
5. Confirm `Damage Detected`, `Restore Verified`, `Production Unchanged`, and `Public Feed Verified` are all `TRUE`.

The drill makes a separate workbook in `UBL Automated Backups`, changes one copied game's team assignment, venue, status, scores, and notes, detects the damage, restores those fields, and compares the copy with its original fingerprint. It does not write to production source tables.

## Emergency response

Use this procedure for deleted games, widespread incorrect scores, damaged formulas, or a control workbook that can no longer publish a valid feed.

1. Stop schedule and score entry. Tell coaches not to submit until the system owner reopens the workflow.
2. Open `Recovery Status` and review the latest successful drill and backup age.
3. On `Recovery Status`, check the red box beside `CREATE RECOVERY CANDIDATE`.
4. Confirm the new `Recovery candidate` row says `PASS`, then open the candidate URL from that row.
5. Compare the candidate with the live workbook and identify the smallest affected range.
6. Before changing production, create a Drive copy named `UBL EMERGENCY PRE-RESTORE` plus the current date and time.
7. Restore only the affected rows or formulas into the existing live workbook. Preserve Game IDs, tab names, column order, validation, and the live workbook ID.
8. On `Recovery Status`, check the red box beside `CHECK STATUS`, then run `runLeagueHealthCheck` from Apps Script.
9. Verify the public schedule, results, standings, ticker, and bracket before reopening coach entry.
10. Record what was restored, who approved it, the backup ID, and the verification result in the league operations notes.

Do not replace the live workbook automatically. Keeping the existing workbook ID prevents the website, triggers, team portals, and published feed from silently pointing at the wrong file.

## Small corrections

For one incorrect final score, use the coach portal's `Correction Request` and commissioner approval workflow. For one schedule, venue, or status error, use `Commissioner Dashboard`. Emergency recovery is for broader damage, not routine corrections.

## Result meanings

- `PASS`: the required checks succeeded.
- `ACTION NEEDED`: the backup is old, the workbook structure is invalid, or the last drill is missing or older than 31 days.
- `FAIL`: an isolated drill or candidate check did not prove restoration and production isolation.

If a drill fails, do not delete the drill workbook. Keep it for diagnosis and do not use that backup for a production restore until the failure is understood.
