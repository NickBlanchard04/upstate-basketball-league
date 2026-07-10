# UBL Public Feed Deployment

The script reads the private league control spreadsheet and publishes only public schedule, team, venue, and settings fields.

1. Open the control spreadsheet.
2. Choose Extensions, then Apps Script.
3. Replace `Code.gs` with this folder's `Code.gs` and set the project manifest to `appsscript.json`.
4. Run `installCoachScoreTrigger` once and approve the requested spreadsheet authorization. This owner-run trigger lets coaches submit through protected input cells without editing administrative tabs.
5. Deploy as a web app, execute as the deploying account, and allow access to anyone.
6. Open the deployment URL and confirm valid JSON appears.
7. Put that `/exec` URL in `config.js` as `liveFeedUrl`.

If coaches checked Submit before the trigger was installed, run `publishPendingCoachScores` once after installation. It processes every checked row without requiring the scores to be retyped.

The site validates the response. If the endpoint is unavailable or invalid, it automatically uses `league-data.json`, then the bundled `data.js` dataset.

Coach submissions are entered on the visible `Coach Score Entry` tab. The installable trigger validates the score, marks the canonical game `Final`, updates the public timestamp, clears the input cells, and appends an audit record. The public site checks for changes every minute.
