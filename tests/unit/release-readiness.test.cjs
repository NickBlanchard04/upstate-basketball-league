const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const siteRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(siteRoot, relativePath), "utf8");
}

test("404 base bootstrap resolves deep GitHub Pages paths before relative assets", () => {
  const html = read("404.html");
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "404.html must contain its early base bootstrap");
  assert.ok(html.indexOf("<script>") < html.indexOf('href="site.webmanifest"'));

  function run(hostname, pathname) {
    let appended;
    const document = {
      createElement(tagName) {
        assert.equal(tagName, "base");
        return {};
      },
      head: {
        append(node) {
          appended = node;
        }
      }
    };
    vm.runInNewContext(script, { document, location: { hostname, pathname } });
    return appended?.href;
  }

  assert.equal(
    run("nickblanchard04.github.io", "/upstate-basketball-league/missing/deep/route"),
    "/upstate-basketball-league/"
  );
  assert.equal(run("upstatebasketballleague.com", "/missing/deep/route"), "/");
  assert.equal(run("127.0.0.1", "/404.html"), "/");
});

test("mobile team routes and profile assets share one cache version", () => {
  const script = read("script.js");
  const profileExperience = read("team-profile-experience.js");
  const directoryVersion = script.match(/UBL_TEAM_PROFILE_CACHE_VERSION = "([^"]+)"/)?.[1];
  const profileVersion = profileExperience.match(/TEAM_PROFILE_ASSET_VERSION = "([^"]+)"/)?.[1];

  assert.ok(directoryVersion, "script.js must publish a mobile profile cache version");
  assert.equal(profileVersion, directoryVersion, "team profile scripts must agree on the cache version");
  assert.match(script, /profileBuild=\$\{encodeURIComponent\(UBL_TEAM_PROFILE_CACHE_VERSION\)\}/);
  assert.match(profileExperience, /typeof renderStackedTeamProfile !== "function"/);

  for (const file of ["teams.html", "team.html"]) {
    const versions = [...read(file).matchAll(/\?v=([0-9-]+)/g)].map((match) => match[1]);
    assert.ok(versions.length > 0, `${file} must version its shared assets`);
    assert.deepEqual([...new Set(versions)], [directoryVersion], `${file} assets must use the profile cache version`);
  }
});

test("public source excludes fabricated identity and affiliation assets", () => {
  const files = [
    "index.html", "schedule.html", "standings.html", "teams.html", "team.html", "bracket.html",
    "rules.html", "gallery.html", "sponsors.html", "about.html", "404.html", "styles.css",
    "ubl-standings.css", "ubl-about.css", "sponsors.css", "league-core.js", "data.js",
    "league-data.json", "script.js", "ubl-standings.js", "sponsors.js", "site.webmanifest"
  ];
  const source = files.map(read).join("\n");
  assert.doesNotMatch(source, /assets\/team-hv-flames\.svg/i);
  assert.doesNotMatch(source, /assets\/sponsors/i);
  assert.doesNotMatch(source, /ubl-championship-hero|ubl-core-commitments-trophy/i);
  assert.doesNotMatch(source, /Northline/i);

  const sponsors = read("sponsors.html");
  assert.doesNotMatch(sponsors, /Google logo|Microsoft logo|NVIDIA logo|AMD logo|Intel logo|Epic Games logo|Rockstar Games logo|Chipotle logo|McDonald(?:'|&apos;)s logo|Burger King logo/i);
  assert.match(sponsors, /Prospective partner categories/);
  assert.match(sponsors, /no organization is shown as a confirmed UBL sponsor/);
});

test("sitemap contains only statically indexable canonical pages", () => {
  const sitemap = read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replaceAll("&amp;", "&"));
  assert.ok(urls.length > 0);
  assert.ok(!urls.some((url) => url.includes("team.html")));
  assert.equal((sitemap.match(/<lastmod>[^<]+<\/lastmod>/g) || []).length, urls.length);
  assert.match(sitemap, /<loc>https:\/\/upstatebasketballleague\.com\/teams\.html<\/loc><lastmod>2026-07-21<\/lastmod>/);

  for (const url of urls) {
    const parsed = new URL(url);
    const relative = parsed.pathname.replace(/^\/+/, "") || "index.html";
    assert.match(read(relative), /<meta name="robots" content="index, follow">/);
  }
  assert.match(read("team.html"), /<meta name="robots" content="noindex, follow">/);
  assert.match(read("script.js"), /setAttribute\("content", "index, follow"\)/);
});

test("homepage retains Google Search Console ownership verification", () => {
  assert.match(
    read("index.html"),
    /<meta name="google-site-verification" content="QpcmoOi9BCl5q2IPHPLoq1-9uzXWo6s6ZuOqaBOuZ2s">/
  );
});

test("public discovery files and metadata use the registered UBL domain", () => {
  const canonicalBase = "https://upstatebasketballleague.com";
  const legacyBase = "https://nickblanchard04.github.io/upstate-basketball-league";
  const publicFiles = [
    "index.html", "schedule.html", "standings.html", "teams.html", "team.html", "bracket.html",
    "rules.html", "gallery.html", "sponsors.html", "about.html", "robots.txt", "sitemap.xml",
    "security.txt", ".well-known/security.txt"
  ];

  for (const file of publicFiles) {
    const source = read(file);
    assert.ok(!source.includes(legacyBase), `${file} still references the legacy public URL`);
  }

  for (const file of publicFiles.filter((name) => name.endsWith(".html"))) {
    const html = read(file);
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonicalBase.replaceAll(".", "\\.")}`), `${file} needs the registered-domain canonical`);
    assert.match(html, new RegExp(`<meta property="og:url" content="${canonicalBase.replaceAll(".", "\\.")}`), `${file} needs the registered-domain Open Graph URL`);
  }

  assert.match(read("robots.txt"), /^Sitemap: https:\/\/upstatebasketballleague\.com\/sitemap\.xml$/m);
  assert.match(read("sitemap.xml"), /<loc>https:\/\/upstatebasketballleague\.com\//);
  assert.match(read(".well-known/security.txt"), /^Canonical: https:\/\/upstatebasketballleague\.com\/\.well-known\/security\.txt$/m);
});

test("public analytics configures the UBL GA4 property behind privacy and host guards", () => {
  const config = read("config.js");
  const analytics = read("analytics.js");

  assert.match(config, /googleAnalyticsMeasurementId:\s*"G-E7W3TG2NR8"/);
  assert.match(analytics, /allowedHost\s*&&\s*!doNotTrack/);
  assert.match(analytics, /googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(analytics, /window\.gtag\("config", measurementId/);
});

test("release builder identifies UBL by project sentinels instead of a local folder name", () => {
  const builder = read("scripts/build-release.cjs");
  const pagesWorkflow = read(".github/workflows/manual-pages-release.yml");
  assert.doesNotMatch(builder, /path\.basename\(siteRoot\)/);
  assert.match(builder, /packageJson\.name !== "upstate-basketball-league"/);
  assert.match(builder, /Upstate Basketball League Brand Identity/);
  assert.match(pagesWorkflow, /include-hidden-files:\s*true/);
  assert.match(builder, /"llms\.txt"/);
  assert.match(builder, /"5e2cb865318641f38db2af0e8a4a4bc8\.txt"/);
  assert.match(pagesWorkflow, /notify-indexnow:[\s\S]*needs: deploy/);
  assert.match(pagesWorkflow, /node scripts\/submit-indexnow\.cjs --all/);
});

test("team directory and AI summary expose verified league information without JavaScript", () => {
  const teams = read("teams.html");
  for (const name of ["The King's School", "Perth", "Wilton Baptist", "HV Rocks", "HV Flames"]) {
    assert.ok(teams.includes(name), `${name} must be present in static HTML`);
  }
  const json = [...teams.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .find((schema) => schema["@type"] === "ItemList");
  assert.equal(json.numberOfItems, 5);
  assert.deepEqual(json.itemListElement.map((entry) => entry.item.name), [
    "The King's School", "Perth", "Wilton Baptist", "HV Rocks", "HV Flames"
  ]);

  const llms = read("llms.txt");
  assert.match(llms, /^# Upstate Basketball League$/m);
  assert.match(llms, /https:\/\/upstatebasketballleague\.com\/schedule\.html/);
  assert.match(llms, /Info\.upstatebasketballleague@gmail\.com/);
});

test("security contact files follow the public vulnerability disclosure format", () => {
  const canonical = read(".well-known/security.txt");
  const legacy = read("security.txt");
  assert.ok(fs.existsSync(path.join(siteRoot, ".nojekyll")), "GitHub Pages must publish the .well-known directory");
  assert.equal(legacy.replace(/\r\n/g, "\n"), canonical.replace(/\r\n/g, "\n"));
  assert.match(canonical, /^Contact: mailto:Info\.upstatebasketballleague@gmail\.com$/m);
  assert.match(canonical, /^Expires: 2027-06-30T23:59:59Z$/m);
  assert.match(canonical, /^Preferred-Languages: en$/m);
  assert.match(canonical, /^Canonical: https:\/\/upstatebasketballleague\.com\/\.well-known\/security\.txt$/m);
});

test("homepage schema identifies the league without inventing a storefront", () => {
  const html = read("index.html");
  const json = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)?.[1];
  assert.ok(json, "Homepage must include JSON-LD");
  const schema = JSON.parse(json);
  const organization = schema["@graph"].find((item) => item["@type"] === "SportsOrganization");
  const website = schema["@graph"].find((item) => item["@type"] === "WebSite");
  assert.equal(organization.name, "Upstate Basketball League");
  assert.equal(organization.areaServed.name, "Upstate New York");
  assert.deepEqual(organization.member.map((team) => team.name), [
    "The King's School", "Perth", "Wilton Baptist", "HV Rocks", "HV Flames"
  ]);
  assert.equal(organization.address, undefined);
  assert.equal(organization["@type"], "SportsOrganization");
  assert.equal(website.publisher["@id"], organization["@id"]);
});

test("utility pages provide contextual internal links beyond the main navigation", () => {
  for (const file of ["schedule.html", "standings.html", "teams.html", "bracket.html", "rules.html", "about.html"]) {
    const html = read(file);
    const block = html.match(/<nav class="page-paths[\s\S]*?<\/nav>/)?.[0] || "";
    assert.match(block, /Continue exploring/, `${file} needs a contextual navigation label`);
    assert.ok((block.match(/href="[^"]+\.html"/g) || []).length >= 3, `${file} needs at least three contextual internal links`);
  }

  const teamProfileExperience = read("team-profile-experience.js");
  assert.match(teamProfileExperience, /Back to all teams/, "team.html needs a contextual return path");
  assert.ok((teamProfileExperience.match(/href="[^"]+\.html"/g) || []).length >= 3, "team.html needs at least three contextual internal links");

  const gallery = read("gallery.html");
  const galleryExperience = read("team-gallery-experience.js");
  assert.match(gallery, /team-gallery-card/, "gallery.html needs program-level album navigation");
  assert.match(galleryExperience, /teamProfileUrl\(/, "gallery.html needs a contextual team-profile return path");
});
