# Upstate Basketball League website

This independent static site serves UBL families, teams, coaches, prospective programs, and community partners with league schedules, standings, team profiles, standards, and season information.

## Local development

1. Run `npm ci`.
2. Run `npx playwright install chromium` once when Chromium is not already available.
3. Run `npm test` for unit and browser coverage.

`league-data.json` is the published league snapshot. `data-loader.js` loads approved live data, while `data.js` provides the bundled offline fallback and gallery metadata. Brand and implementation decisions live in `DESIGN.md`.

## Release checks

- `npm run build:release` creates `dist/` from a strict public-file allowlist.
- `npm run validate:release` checks routes, references, metadata, icons, social imagery, sitemap/indexability, asset honesty, cache tokens, and release boundaries.
- `npm run test:release` runs unit tests, the release build, and the release validator.
- `npm run audit:performance -- --base-url=http://127.0.0.1:4175 --runs=1` enforces the mobile performance budgets against a served build.

Deployment is intentionally manual-only. See `docs/WEBSITE_RELEASE.md` for the complete handoff, verification, checksum, deployment, and rollback procedure. `dist/` is generated and must not be committed.

Northline is a separate project. UBL source, brand rules, imagery, and release artifacts have no dependency on it.
