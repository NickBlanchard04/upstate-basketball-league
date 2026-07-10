# UBL Public Feed Deployment

The script reads the private league control spreadsheet and publishes only public schedule, team, venue, and settings fields.

1. Open the control spreadsheet.
2. Choose Extensions, then Apps Script.
3. Replace `Code.gs` with this folder's `Code.gs` and set the project manifest to `appsscript.json`.
4. Deploy as a web app, execute as the deploying account, and allow access to anyone.
5. Open the deployment URL and confirm valid JSON appears.
6. Put that `/exec` URL in `config.js` as `liveFeedUrl`.

The site validates the response. If the endpoint is unavailable or invalid, it automatically uses `league-data.json`, then the bundled `data.js` dataset.
