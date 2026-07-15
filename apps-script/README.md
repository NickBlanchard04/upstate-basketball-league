# UBL Score Feed

The production site uses the published `Website Feed` CSV from the UBL League Control Panel. It does not require Google Apps Script.

## Coach-only portal workflow

Team representatives use the separate [UBL Coach Score Entry - 2026-27](https://docs.google.com/spreadsheets/d/1DScan6FYWXM8w6pmsj6d5jh6CLaoheWl4nKoKscAe-M/edit) workbook. They never receive access to the private league control panel.

1. On the coach portal's `Coach Score Entry` sheet, find the completed game.
2. Enter the away score, home score, and your full name.
3. Check `Submit` only after the result is final.
4. Confirm `Website Status` changes to `Published to website`.
5. The `Website Feed` tab mirrors only public schedule and result fields. The site refreshes from it every minute.

The public website automatically falls back to its published schedule if Google Sheets is temporarily unavailable.

## Sheet maintenance

- Update dates, times, teams, venues, and game status in the protected `Games` tab. The `Coach Score Entry` and `Website Feed` tabs update from that source.
- Keep the `Website Feed` publication set to `Comma-separated values (.csv)` with automatic republishing enabled.
- Do not publish the entire control panel. Only the `Website Feed` tab is public.

## Apps Script setup

Run `setupCoachScorePortal` once as the league business account. It creates the isolated coach workbook, shares it with the configured coach accounts, protects every cell except score/name/submit inputs, and installs the owner-run edit trigger. Run `syncCoachScorePortal` after major schedule changes.

The owner-run trigger validates each result, writes accepted finals to the private `Games` sheet, records the attempt in `Score Audit`, and clears the coach input cells. The private control panel remains restricted to league leadership.

## Approved gallery feed

`Gallery.gs` is deployed as a separate Google Apps Script web app under the league business account. It must not be added to the score-feed script project because both files define `doGet()`.

The gallery script:

- Scans only the team and division folders listed in `GALLERY_FOLDERS`
- Ignores non-image files
- Gives approved image files public read access for website delivery
- Returns a JSON feed with responsive preview and fullscreen Drive URLs
- Caches the result for 60 seconds

Deploy it as a web app that executes as the owner and allows access to anyone. Put the resulting `/exec` URL in `config.js` as `galleryFeedUrl`. Pending upload folders and private form links are never included in the script or public website.
