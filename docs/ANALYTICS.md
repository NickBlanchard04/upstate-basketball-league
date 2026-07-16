# UBL Site Analytics

The public site sends one cookieless page-view event after each page finishes loading. Events are stored privately in the `Site Analytics` tab of the UBL League Control Panel.

Collected fields:

- UTC timestamp
- Page name
- Referring hostname or `direct`
- Coarse device class
- Viewport size
- Page load time, Largest Contentful Paint, and Cumulative Layout Shift

The tracker does not collect names, email addresses, IP addresses, full referrer URLs, advertising identifiers, or cookies. It honors the browser's Do Not Track setting and submits only from approved production hostnames, so local previews do not contaminate league reporting. The Apps Script endpoint accepts only known UBL page names, sanitizes and bounds every value, and caps storage at 5,000 events per UTC day.

Use this data to compare page usage and spot performance regressions. Do not use it to identify individual visitors.

## Service check

The gallery Apps Script deployment also owns the private analytics endpoint. If analytics stops writing after an account or scope change, open that Apps Script project as `nickblanchardbusiness@gmail.com`, run `verifyAnalyticsDestination`, and approve the requested Google Sheets access. A successful run completes without an error and returns the `Site Analytics` sheet name.
