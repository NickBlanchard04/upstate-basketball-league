# System Owner Runbook

This role maintains the automation, access controls, recovery tools, and website release process. It does not replace commissioner authority over league decisions.

## Routine checks

- Confirm `Operations Alerts` and `Notification Log` are processing normally.
- Review failed representative provisioning rows and gallery moderation errors.
- Verify the public JSON feed, CSV fallback, and bundled snapshot contain no pilot records.
- Keep Apps Script deployments, triggers, GitHub access, and Google Drive ownership under approved league accounts.

## Access changes

Use `Access Roster`. Enter the verified Google email, exact Team ID, and active portal role, then check `Provision and Send`. The automation creates or refreshes the portal, grants only that team access, records the URL and timestamps, and logs the invitation. Keep notification test mode enabled until the destination account is verified.

## Recovery

- Automated backups run daily.
- Run the isolated recovery drill monthly from the `UBL Operations` menu.
- Never overwrite production from an unverified backup.
- Record ownership and recovery details in [SYSTEM_OWNERSHIP_REGISTER.md](SYSTEM_OWNERSHIP_REGISTER.md).

## Releases

1. Run `npm test`.
2. Run `npm run test:workflow`.
3. Run `npm run test:release`.
4. Review the Git diff and public feed snapshot.
5. Deploy only an approved release; the scheduled snapshot workflow may open a pull request but never deploys.
