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
  assert.equal((sitemap.match(/<lastmod>2026-07-18<\/lastmod>/g) || []).length, urls.length);

  for (const url of urls.filter((value) => !value.includes("team.html?"))) {
    const parsed = new URL(url);
    const relative = parsed.pathname.replace("/upstate-basketball-league/", "") || "index.html";
    assert.match(read(relative), /<meta name="robots" content="index, follow">/);
  }
  assert.match(read("team.html"), /<meta name="robots" content="noindex, follow">/);
  assert.match(read("script.js"), /setAttribute\("content", "index, follow"\)/);
});

test("release builder identifies UBL by project sentinels instead of a local folder name", () => {
  const builder = read("scripts/build-release.cjs");
  assert.doesNotMatch(builder, /path\.basename\(siteRoot\)/);
  assert.match(builder, /packageJson\.name !== "upstate-basketball-league"/);
  assert.match(builder, /Upstate Basketball League Brand Identity/);
});
