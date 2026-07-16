# UpstateBasketballLeague.com Launch Checklist

Do not add a `CNAME` file or change canonical URLs until the league owns the domain and DNS access is confirmed.

## Ownership before purchase

- **Domain:** `UpstateBasketballLeague.com`
- **Registrar owner:** League-controlled account selected by the commissioner
- **DNS operator:** System owner
- **GitHub repository:** `NickBlanchard04/upstate-basketball-league`
- **Preferred public address:** `https://www.upstatebasketballleague.com/`
- **Fallback during launch:** `https://nickblanchard04.github.io/upstate-basketball-league/`

Store the registrar receipt, recovery method, and renewal date in the league's private Drive. Enable automatic renewal, registrar lock, and multi-factor authentication before changing DNS.

## Pre-launch gate

Complete these before purchasing or connecting the domain:

- The commissioner approves the final spelling and `www` preference.
- The live GitHub Pages site passes automated tests.
- The score and gallery feeds work from a private browser window.
- The league account can access the registrar, GitHub Pages settings, and recovery method.
- A current repository commit and screenshot of the working GitHub Pages settings are recorded for rollback.

## Secure setup order

1. Purchase `UpstateBasketballLeague.com` and enable account multi-factor authentication and registrar lock.
2. In GitHub account settings, verify the domain with GitHub's generated DNS TXT record.
3. In the repository's **Settings > Pages**, add `www.upstatebasketballleague.com` as the custom domain before changing DNS.
4. At the registrar, point `www` with a CNAME to `nickblanchard04.github.io`.
5. Configure the apex `@` with GitHub Pages A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`.
6. Do not use wildcard DNS records. Remove conflicting apex A/AAAA/ALIAS/ANAME records and conflicting `www` CNAME records.
7. Verify DNS with `Resolve-DnsName UpstateBasketballLeague.com` and `Resolve-DnsName www.UpstateBasketballLeague.com`.
8. Wait for GitHub's certificate, then enable **Enforce HTTPS**.
9. Add `CNAME` containing `www.upstatebasketballleague.com` only if GitHub Pages is publishing from a branch and GitHub has not already created it.
10. Replace every canonical, Open Graph, structured-data, sitemap, and robots URL with `https://www.upstatebasketballleague.com/`.
11. Test apex-to-`www`, HTTP-to-HTTPS, every public route, images, the score feed, gallery feed, and social previews before announcing the domain.

## Launch verification

Run each check on both a phone and desktop:

1. Open `http://upstatebasketballleague.com` and confirm it reaches the HTTPS `www` address.
2. Open every navigation page directly, not only through the homepage.
3. Confirm no browser certificate warning appears.
4. Submit a private pilot result and verify public isolation.
5. Confirm the public score feed, standings, ticker, maps, and gallery still load.
6. Run `npm test` and `npm run audit:performance` against the custom domain.
7. Check the page title, social image, canonical URL, sitemap, and `robots.txt`.

## Rollback

If HTTPS, routing, or feeds fail after DNS changes:

1. Keep the GitHub Pages deployment intact.
2. Remove the custom domain from GitHub Pages.
3. Restore the previously recorded DNS values.
4. Use the GitHub Pages fallback URL while DNS caches expire.
5. Do not announce the custom domain until all launch verification checks pass again.

## Launch handoff

After a clean 24-hour verification window, record the registrar, renewal date, DNS operator, GitHub owner, final `CNAME`, and launch date in the private league control records. Only then replace distributed links and announce the domain publicly.

GitHub recommends configuring both the apex and `www` variants and verifying the domain before use to reduce domain-takeover risk.
