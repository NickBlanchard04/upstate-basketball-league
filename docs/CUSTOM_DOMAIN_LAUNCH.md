# UpstateBasketballLeague.com Launch Checklist

Do not add a `CNAME` file or change canonical URLs until the league owns the domain and DNS access is confirmed.

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

GitHub recommends configuring both the apex and `www` variants and verifying the domain before use to reduce domain-takeover risk.
