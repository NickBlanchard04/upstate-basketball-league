# UBL website release procedure

This runbook applies only to the active `ubl-site/` project. It does not publish workspace archives, audits, internal operations files, source imagery, temporary team identities, sample sponsor logos, or any Northline material.

Treat `ubl-site/` as the root of its own UBL repository when connecting it to GitHub. The included `.github/workflows/` files become active from that repository root; never commit the parent multi-project workspace or the separate `northline-site/` project into the UBL repository.

## 1. Prepare and verify

From the `ubl-site/` directory:

```powershell
npm ci
npx playwright install chromium
npm run test:unit
npm run test:e2e
npm run build:release
npm run validate:release
```

Serve the generated release and enforce the mobile performance budgets:

```powershell
python -m http.server 4175 --directory dist
```

In a second terminal:

```powershell
npm run audit:performance -- --base-url=http://127.0.0.1:4175 --runs=1
```

The release is ready only when every command exits successfully. Inspect `dist/` rather than the workspace root: it is the sole deployment artifact.

## 2. Record checksums

Create a deterministic per-file SHA-256 list outside `dist/`:

```powershell
$releaseRoot = (Resolve-Path .\dist).Path
Get-ChildItem -LiteralPath $releaseRoot -Recurse -File |
  Sort-Object FullName |
  ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
    $relative = $_.FullName.Substring($releaseRoot.Length + 1).Replace('\', '/')
    "$($hash.Hash.ToLowerInvariant())  $relative"
  } | Set-Content -LiteralPath .\release-checksums.sha256 -Encoding utf8
Get-FileHash -LiteralPath .\release-checksums.sha256 -Algorithm SHA256
```

Retain the checksum list with the release handoff, not inside `dist/`. Rebuilds from unchanged inputs should produce the same file list and checksums.

## 3. Deploy manually

The workflow `.github/workflows/manual-pages-release.yml` has only a `workflow_dispatch` trigger. It repeats unit, browser, build, validation, and performance checks before uploading `dist/`, then deploys that artifact to GitHub Pages.

1. Open the repository's **Actions** tab.
2. Choose **Manual UBL Pages release**.
3. Select the intended branch or release tag and click **Run workflow**.
4. Confirm the build job is green before the protected `github-pages` deployment begins.

Do not add a push, pull-request, or schedule trigger to the deployment workflow. The separate website-test workflow is the automatic quality gate and does not deploy.

## 4. Post-deployment smoke test

Verify these production surfaces on desktop and mobile:

- Home, schedule, standings, teams, one valid team profile, bracket, gallery, sponsors, about, and a missing deep URL.
- Navigation, menu, schedule filters, team-card navigation, map dialog, sponsor story controls, gallery tabs/lightbox, and keyboard focus.
- No console errors, missing assets, horizontal overflow, broken social metadata, or stale fake/temporary branding.
- `robots.txt`, `sitemap.xml`, and `site.webmanifest` return HTTP 200.
- A valid team-profile URL becomes `index, follow` with its query-specific canonical; the generic `team.html` state and `404.html` remain `noindex, follow`.

## 5. Custom-domain checks

The production domain is `upstatebasketballleague.com`, registered through GoDaddy. GitHub Pages must be configured with that apex domain before DNS records are changed.

- Point the apex host to GitHub Pages using all four documented IPv4 records.
- Point `www` to `NickBlanchard04.github.io` with a CNAME record.
- Confirm both hosts resolve, `www` redirects to the apex host, and the previous GitHub Pages project URL redirects to the apex host.
- Enable **Enforce HTTPS** after GitHub issues the certificate.
- Submit `https://upstatebasketballleague.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools after the HTTPS site is available.

## 6. Roll back

If production verification fails:

1. Stop promotion and record the failing route, visible symptom, console output, and deployed workflow run.
2. Select the most recent known-good release branch or tag in **Manual UBL Pages release** and run it manually.
3. Confirm the rollback artifact passes the workflow gates and the post-deployment smoke test.
4. Compare its recorded checksum list with the known-good handoff.
5. Fix the issue on a new branch; do not patch files directly in the deployed artifact.

No release workflow should be dispatched until the release owner explicitly approves deployment.
