# UBL League Operations Automation

The production site loads the Apps Script JSON feed first, uses the published `Website Feed` CSV as its live fallback, and keeps `league-data.json` as its last safe snapshot.

## Coach-only portal workflow

Each active program receives a separate, team-specific workbook generated from the private `Access Roster`. Representatives never receive access to the private league control panel or another program's portal.

Participant instructions are in [COACH_SCORE_GUIDE.md](../docs/COACH_SCORE_GUIDE.md). Commissioner exceptions are in [GAME_EXCEPTION_WORKFLOW.md](../docs/GAME_EXCEPTION_WORKFLOW.md).

1. On the coach portal's `Coach Score Entry` sheet, find the completed game.
2. Enter the away and home scores. The rostered submitter's name is recorded automatically.
3. Check `Submit` only after the result is final.
4. Confirm `Status` changes to `Published to website`.
5. Use `Correction Request` for any published result that needs commissioner approval.

Incomplete, tied, negative, decimal, unauthorized-team, and duplicate submissions are rejected. Scores above 130 or margins above 80 require the coach to verify the exact numbers and check Submit a second time.

The public website automatically falls back to its published schedule if Google Sheets is temporarily unavailable.

## Sheet maintenance

- Use `Commissioner Dashboard` for routine dates, times, teams, venues, scores, notes, and statuses. The protected `Games` tab remains the canonical backend table.
- Review `Corrections Queue` and set valid requests to `Approved`; approved requests publish and become `Completed`.
- Keep the `Website Feed` publication set to `Comma-separated values (.csv)` with automatic republishing enabled.
- Do not publish the entire control panel. Only the `Website Feed` tab is public.

## Apps Script setup

Run `installOperationsAutomation` once as the league business account. It creates the commissioner dashboard and correction queue, creates or refreshes each team portal from `Access Roster`, installs edit and time triggers, runs a health check, and creates the first daily backup.

The control workbook also receives a `UBL Operations` menu and a private `Recovery Status` sheet. Use `Check backup and recovery status` for the current readiness result, `Run isolated recovery drill` monthly, and `Create recovery candidate` only when diagnosing a possible restore. The automated tools never replace production source tables. Follow [BACKUP_AND_RECOVERY.md](../docs/BACKUP_AND_RECOVERY.md) for the owner procedure.

Run `syncAccessAndCoachPortals` after changing a representative, Google account, team assignment, or access status. Ordinary Games or dashboard edits refresh existing portals automatically.

The owner-run trigger validates each result, enforces team ownership, writes accepted finals to `Games`, records the attempt in `Score Audit`, and clears the coach input cells. An hourly trigger records overdue scores or feed mismatches in `Operations Alerts` and updates the dashboard alert count; a daily trigger copies the control workbook to `UBL Automated Backups`. A healthy recovery state requires a backup no more than 30 hours old and a successful isolated drill within 31 days.

## Closed pilot workflow

Run `setupPilotTestGames` as the league business account before the closed pilot. It creates two private rows at the top of the coach portal, installs the control-panel trigger, repairs the published `Website Feed` formula, and verifies that pilot rows are excluded from both public feed paths.

- Pilot games use both a `pilot-` Game ID and the `pilot-test` Week ID.
- The coach portal labels them `PILOT TEST` and reports `Pilot ready - private` or `Pilot complete - private`.
- Accepted pilot scores are written to `Games` and `Score Audit`, but do not touch public publication timestamps.
- Run `runPilotIsolationSelfTest` to submit a private test result, verify both public feeds remain clean, and reset the pilot rows.
- Run `setupPilotTestGames` again to reset the pilot. Run `clearPilotTestGames` after the pilot is finished.

Use [PILOT_TEST_BLUEPRINT.md](../docs/PILOT_TEST_BLUEPRINT.md) for the participant handoff.

## Approved gallery feed

`Gallery.gs` is deployed as a separate Google Apps Script web app under the league business account. It must not be added to the score-feed script project because both files define `doGet()`.

The gallery script:

- Scans only the team and division folders listed in `GALLERY_FOLDERS`
- Ignores non-image files
- Gives approved image files public read access for website delivery
- Returns a JSON feed with responsive preview and fullscreen Drive URLs
- Caches the result for 60 seconds
- Accepts bounded, cookieless site analytics events and writes them to the private `Site Analytics` control-panel tab

Deploy it as a web app that executes as the owner and allows access to anyone. Put the resulting `/exec` URL in `config.js` as `galleryFeedUrl`. Pending folder IDs are server-side identifiers and do not grant folder access; the folders remain private. Private form links are not included on the public website.

After adding analytics for the first time, run `verifyAnalyticsDestination` once in the Apps Script editor as `nickblanchardbusiness@gmail.com` and approve Google Sheets access. Keep the same `/exec` deployment URL in both `galleryFeedUrl` and `analyticsEndpoint`.
