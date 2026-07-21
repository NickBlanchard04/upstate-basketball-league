# UBL System Ownership Register

This register records ownership and recovery responsibility without storing passwords, recovery codes, tokens, or private folder IDs. Verify each `Needs verification` entry in the provider's ownership screen before the season.

| System asset | Current owner or administrator | Target owner | Backup administrator | Recovery location | Last verified |
| --- | --- | --- | --- | --- | --- |
| GitHub repository `NickBlanchard04/upstate-basketball-league` | Nick / `NickBlanchard04` | UBL-controlled GitHub organization or current owner with league succession plan | Unassigned - required before season | GitHub repository plus dated local backup | 2026-07-18 |
| GitHub Pages website | Repository owner | Same account or organization as repository | Unassigned - required before season | Rebuild from `main` and validated release artifact | 2026-07-18 |
| UBL League Control Panel | Needs verification in Google Drive | League-controlled Google account | Commissioner plus one approved system backup | `UBL Automated Backups` Drive folder | Needs verification |
| Score-feed Apps Script project and deployment | `nickblanchardbusiness@gmail.com` - verify in Apps Script | League-controlled Google account | Unassigned - required before season | Repository `apps-script/Code.gs` plus deployment notes | Needs verification |
| Gallery and analytics Apps Script deployment | `nickblanchardbusiness@gmail.com` - verify in Apps Script | League-controlled Google account | Unassigned - required before season | Repository `apps-script/Gallery.gs` plus deployment notes | Needs verification |
| Team score portal workbooks | Control-panel automation owner | League-controlled Google account | System owner | Recreate from Access Roster with `syncAccessAndCoachPortals` | Needs verification |
| Team photo upload forms and Pending folders | Needs verification in Google Drive | League-controlled Google account | System owner | Form responses and private team folders | Needs verification |
| Approved and Rejected gallery folders | Needs verification in Google Drive | League-controlled Google account | System owner | Private Drive folder hierarchy and moderation log | Needs verification |
| League mailbox `info.upstatebasketballleague@gmail.com` | League commissioner | League organization | One approved league officer | Google's account recovery process | Needs verification |
| Analytics and Notification Log sheets | Control-panel owner | League-controlled Google account | System owner | Daily control-panel backup | Needs verification |
| Custom domain `UpstateBasketballLeague.com` | Website system owner / GoDaddy | UBL website system owner | Commissioner recovery access to be added | GoDaddy account recovery and private purchase receipt | 2026-07-21 |

## Required before public rollout

1. Verify the owner shown for every Google file, script, form, folder, and deployment.
2. Assign one backup administrator who is not dependent on the same personal account or device.
3. Confirm the league mailbox recovery phone and recovery email are league-approved.
4. Confirm GitHub two-factor authentication and repository recovery access.
5. Confirm the GoDaddy renewal date, billing contact, and commissioner recovery access after registration finishes.
6. Run one isolated workbook recovery drill and one website rebuild from a clean clone.

## Quarterly review

- Remove former representatives and administrators.
- Verify backups can be opened by the backup administrator.
- Review Apps Script deployments and triggers for unknown owners or duplicate triggers.
- Confirm GitHub branch protection and workflow permissions.
- Verify the domain and league mailbox renewal/recovery contacts.
- Update `Last verified` dates in this register.
