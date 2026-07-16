# UBL Score Feed

The production site uses the published `Website Feed` CSV from the UBL League Control Panel. It does not require Google Apps Script.

## Coach-only portal workflow

Team representatives use the separate [UBL Coach Score Entry - 2026-27](https://docs.google.com/spreadsheets/d/1DScan6FYWXM8w6pmsj6d5jh6CLaoheWl4nKoKscAe-M/edit) workbook. They never receive access to the private league control panel.

Participant instructions are in [COACH_SCORE_GUIDE.md](../docs/COACH_SCORE_GUIDE.md). Commissioner exceptions are in [GAME_EXCEPTION_WORKFLOW.md](../docs/GAME_EXCEPTION_WORKFLOW.md).

1. On the coach portal's `Coach Score Entry` sheet, find the completed game.
2. Enter the away score, home score, and your full name.
3. Check `Submit` only after the result is final.
4. Confirm `Website Status` changes to `Published to website`.
5. The `Website Feed` tab mirrors only public schedule and result fields. The site refreshes from it every minute.

Incomplete, tied, negative, decimal, duplicate, and incomplete-name submissions are rejected. Scores above 130 or margins above 80 require the coach to verify the exact numbers and check Submit a second time.

The public website automatically falls back to its published schedule if Google Sheets is temporarily unavailable.

## Sheet maintenance

- Update dates, times, teams, venues, and game status in the protected `Games` tab. The `Coach Score Entry` and `Website Feed` tabs update from that source.
- Keep the `Website Feed` publication set to `Comma-separated values (.csv)` with automatic republishing enabled.
- Do not publish the entire control panel. Only the `Website Feed` tab is public.

## Apps Script setup

Run `setupCoachScorePortal` once as the league business account. It creates the isolated coach workbook, shares it with the configured coach accounts, protects every cell except score/name/submit inputs, and installs the owner-run edit trigger. Run `syncCoachScorePortal` after major schedule changes.

The owner-run trigger validates each result, writes accepted finals to the private `Games` sheet, records the attempt in `Score Audit`, and clears the coach input cells. The private control panel remains restricted to league leadership.

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
