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

test("sitemap contains only indexable page templates and valid team profiles", () => {
  const sitemap = read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replaceAll("&amp;", "&"));
  assert.ok(urls.length > 0);
  assert.ok(!urls.includes("https://nickblanchard04.github.io/upstate-basketball-league/team.html"));
  assert.ok(urls.some((url) => url.endsWith("team.html?program=hv-rocks&division=boys")));
  assert.equal((sitemap.match(/<lastmod>2026-07-20<\/lastmod>/g) || []).length, urls.length);

  for (const url of urls.filter((value) => !value.includes("team.html?"))) {
    const parsed = new URL(url);
    const relative = parsed.pathname.replace("/upstate-basketball-league/", "") || "index.html";
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

test("release builder identifies UBL by project sentinels instead of a local folder name", () => {
  const builder = read("scripts/build-release.cjs");
  const pagesWorkflow = read(".github/workflows/manual-pages-release.yml");
  assert.doesNotMatch(builder, /path\.basename\(siteRoot\)/);
  assert.match(builder, /packageJson\.name !== "upstate-basketball-league"/);
  assert.match(builder, /Upstate Basketball League Brand Identity/);
  assert.match(pagesWorkflow, /include-hidden-files:\s*true/);
});

test("security contact files follow the public vulnerability disclosure format", () => {
  const canonical = read(".well-known/security.txt");
  const legacy = read("security.txt");
  assert.ok(fs.existsSync(path.join(siteRoot, ".nojekyll")), "GitHub Pages must publish the .well-known directory");
  assert.equal(legacy, canonical);
  assert.match(canonical, /^Contact: mailto:Info\.upstatebasketballleague@gmail\.com$/m);
  assert.match(canonical, /^Expires: 2027-06-30T23:59:59Z$/m);
  assert.match(canonical, /^Preferred-Languages: en$/m);
  assert.match(canonical, /^Canonical: https:\/\/nickblanchard04\.github\.io\/upstate-basketball-league\/\.well-known\/security\.txt$/m);
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
  for (const file of ["schedule.html", "standings.html", "teams.html", "team.html", "bracket.html", "rules.html", "gallery.html", "about.html"]) {
    const html = read(file);
    const block = html.match(/<nav class="page-paths[\s\S]*?<\/nav>/)?.[0] || "";
    assert.match(block, /Continue exploring/, `${file} needs a contextual navigation label`);
    assert.ok((block.match(/href="[^"]+\.html"/g) || []).length >= 3, `${file} needs at least three contextual internal links`);
  }
});
