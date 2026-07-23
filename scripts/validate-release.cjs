const fs = require("node:fs");
const path = require("node:path");

const siteRoot = path.resolve(__dirname, "..");
const distRoot = path.join(siteRoot, "dist");
const releaseToken = "20260723-3";
const canonicalBase = "https://upstatebasketballleague.com/";
const socialImageUrl = `${canonicalBase}assets/social/ubl-social-share.jpg`;
const socialImageAlt = "Upstate Basketball League mark beside an illustrated varsity basketball player preparing under arena lights";

const publicHtml = [
  "index.html",
  "league-facts.html",
  "schedule.html",
  "standings.html",
  "teams.html",
  "teams/kings-school-boys.html",
  "teams/kings-school-girls.html",
  "teams/perth-boys.html",
  "teams/perth-girls.html",
  "teams/wilton-baptist-boys.html",
  "teams/wilton-baptist-girls.html",
  "teams/hv-rocks-boys.html",
  "teams/hv-flames-girls.html",
  "team.html",
  "bracket.html",
  "rules.html",
  "gallery.html",
  "news.html",
  "news/2026-27-season-planning.html",
  "news/2027-playoff-format.html",
  "news/ubl-program-directory.html",
  "sponsors.html",
  "about.html",
  "privacy.html",
  "404.html"
];

const indexablePages = new Map([
  ["index.html", canonicalBase],
  ["league-facts.html", `${canonicalBase}league-facts.html`],
  ["schedule.html", `${canonicalBase}schedule.html`],
  ["standings.html", `${canonicalBase}standings.html`],
  ["teams.html", `${canonicalBase}teams.html`],
  ["teams/kings-school-boys.html", `${canonicalBase}teams/kings-school-boys.html`],
  ["teams/kings-school-girls.html", `${canonicalBase}teams/kings-school-girls.html`],
  ["teams/perth-boys.html", `${canonicalBase}teams/perth-boys.html`],
  ["teams/perth-girls.html", `${canonicalBase}teams/perth-girls.html`],
  ["teams/wilton-baptist-boys.html", `${canonicalBase}teams/wilton-baptist-boys.html`],
  ["teams/wilton-baptist-girls.html", `${canonicalBase}teams/wilton-baptist-girls.html`],
  ["teams/hv-rocks-boys.html", `${canonicalBase}teams/hv-rocks-boys.html`],
  ["teams/hv-flames-girls.html", `${canonicalBase}teams/hv-flames-girls.html`],
  ["bracket.html", `${canonicalBase}bracket.html`],
  ["rules.html", `${canonicalBase}rules.html`],
  ["gallery.html", `${canonicalBase}gallery.html`],
  ["news.html", `${canonicalBase}news.html`],
  ["news/2026-27-season-planning.html", `${canonicalBase}news/2026-27-season-planning.html`],
  ["news/2027-playoff-format.html", `${canonicalBase}news/2027-playoff-format.html`],
  ["news/ubl-program-directory.html", `${canonicalBase}news/ubl-program-directory.html`],
  ["sponsors.html", `${canonicalBase}sponsors.html`],
  ["about.html", `${canonicalBase}about.html`]
]);

const expectedSitemapUrls = [
  canonicalBase,
  `${canonicalBase}league-facts.html`,
  `${canonicalBase}schedule.html`,
  `${canonicalBase}standings.html`,
  `${canonicalBase}teams.html`,
  `${canonicalBase}teams/kings-school-boys.html`,
  `${canonicalBase}teams/kings-school-girls.html`,
  `${canonicalBase}teams/perth-boys.html`,
  `${canonicalBase}teams/perth-girls.html`,
  `${canonicalBase}teams/wilton-baptist-boys.html`,
  `${canonicalBase}teams/wilton-baptist-girls.html`,
  `${canonicalBase}teams/hv-rocks-boys.html`,
  `${canonicalBase}teams/hv-flames-girls.html`,
  `${canonicalBase}bracket.html`,
  `${canonicalBase}rules.html`,
  `${canonicalBase}gallery.html`,
  `${canonicalBase}news.html`,
  `${canonicalBase}news/2026-27-season-planning.html`,
  `${canonicalBase}news/2027-playoff-format.html`,
  `${canonicalBase}news/ubl-program-directory.html`,
  `${canonicalBase}sponsors.html`,
  `${canonicalBase}about.html`
];

const forbiddenDistPatterns = [
  /(^|\/)(?:\.agents|apps-script|archive|docs|reference|tests|visual-qa)(\/|$)/i,
  /(^|\/)assets\/sponsors(\/|$)/i,
  /(^|\/)assets\/UBL_logo_transparent_background\.png$/i,
  /(^|\/)assets\/team-hv-flames\.svg$/i,
  /ubl-championship-hero/i,
  /ubl-core-commitments-trophy/i,
  /northline/i,
  /(?:^|\/)(?:AGENTS|DESIGN|PROJECT_TASKS|README)\.md$/i,
  /(?:^|\/)package(?:-lock)?\.json$/i,
  /(?:^|\/)playwright\.config\.cjs$/i
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function read(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  const relation = path.relative(root, absolute);
  check(relation && !relation.startsWith("..") && !path.isAbsolute(relation), `Unsafe path: ${relativePath}`);
  check(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `Missing file: ${path.join(root, relativePath)}`);
  return fs.readFileSync(absolute, "utf8");
}

function meta(html, attribute, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<meta\\s+[^>]*${attribute}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"))?.[1] || "";
}

function link(html, relationship) {
  const escaped = relationship.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<link\\s+[^>]*rel=["']${escaped}["'][^>]*href=["']([^"']*)["'][^>]*>`, "i"))?.[1] || "";
}

function imageDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    while (offset + 9 < bytes.length) {
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd8 || marker === 0xd9) continue;
      const length = bytes.readUInt16BE(offset);
      if (sofMarkers.has(marker)) {
        return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
      }
      check(length >= 2, `Invalid JPEG segment in ${filePath}`);
      offset += length;
    }
  }
  throw new Error(`Unsupported image format for dimension check: ${filePath}`);
}

function localTarget(value) {
  if (!value || value === "../" || value.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(value)) return "";
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.origin !== new URL(canonicalBase).origin) return "";
    const relative = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    return relative || "index.html";
  }
  const withoutFragment = value.split("#")[0].split("?")[0];
  if (!withoutFragment || withoutFragment === "." || withoutFragment === "./") return "index.html";
  return withoutFragment.replace(/^\.\//, "").replace(/^\//, "");
}

function validateReferences(root) {
  for (const file of publicHtml) {
    const html = read(root, file);
    const values = [];
    for (const match of html.matchAll(/\b(?:href|src|data-bracket-art)=["']([^"']+)["']/gi)) values.push(match[1]);
    for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
      for (const candidate of match[1].split(",")) values.push(candidate.trim().split(/\s+/)[0]);
    }
    for (const value of values) {
      const target = localTarget(value);
      if (!target) continue;
      const absolute = path.resolve(root, target);
      const relation = path.relative(root, absolute);
      check(relation && !relation.startsWith("..") && !path.isAbsolute(relation), `${file} has unsafe reference: ${value}`);
      check(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `${file} has dangling reference: ${value}`);
    }
  }
}

function validateMetadata(root) {
  for (const file of publicHtml.filter((name) => name !== "404.html")) {
    const html = read(root, file);
    check(/<title>\s*\S[\s\S]*?<\/title>/i.test(html), `${file} needs a nonempty title`);
    check(meta(html, "name", "description").trim(), `${file} needs a description`);
    check(link(html, "canonical").startsWith(canonicalBase), `${file} needs the UBL canonical URL`);
    check(meta(html, "property", "og:url").startsWith(canonicalBase), `${file} needs the UBL Open Graph URL`);
    check(meta(html, "property", "og:image") === socialImageUrl, `${file} has the wrong social image`);
    check(meta(html, "property", "og:image:type") === "image/jpeg", `${file} needs og:image:type=image/jpeg`);
    check(meta(html, "property", "og:image:width") === "1600", `${file} needs the social image width`);
    check(meta(html, "property", "og:image:height") === "900", `${file} needs the social image height`);
    check(meta(html, "property", "og:image:alt") === socialImageAlt, `${file} needs the approved social image alt`);
    check(meta(html, "name", "twitter:image") === socialImageUrl, `${file} has the wrong Twitter image`);
    check(meta(html, "name", "twitter:image:alt") === socialImageAlt, `${file} needs Twitter image alt text`);
    check((html.match(/<h1\b/gi) || []).length === 1, `${file} must contain one source-level h1`);
  }

  for (const [file, canonical] of indexablePages) {
    const html = read(root, file);
    check(meta(html, "name", "robots") === "index, follow", `${file} must be indexable`);
    check(link(html, "canonical") === canonical, `${file} canonical mismatch`);
    check(meta(html, "property", "og:url") === canonical, `${file} og:url mismatch`);
  }

  const team = read(root, "team.html");
  check(meta(team, "name", "robots") === "noindex, follow", "Generic team template must stay noindex");
  const script = read(root, "script.js");
  check(script.includes('isStaticProfile ? "index, follow" : "noindex, follow"'), "Only static team profiles may become indexable at runtime");
  check(script.includes("teams/${programId}-${divisionSlug}.html"), "Team profile links must use stable static URLs");

  const privacy = read(root, "privacy.html");
  check(meta(privacy, "name", "robots") === "noindex, follow", "Privacy page must stay out of search results");
  check(privacy.includes("data-consent-open") && privacy.includes("data-consent-status"), "Privacy page needs working consent controls");
  check(privacy.includes('id="privacy-sponsors"') && privacy.includes('id="privacy-advertising"'), "Privacy page must explain sponsor reporting and advertising boundaries");
  check(privacy.includes("does not sell personal information") && privacy.includes("individual's browsing history"), "Privacy summary must state the visitor-level sharing limits");

  const notFound = read(root, "404.html");
  check(meta(notFound, "name", "robots") === "noindex, follow", "404.html must remain noindex");
  check(!link(notFound, "canonical"), "404.html must not declare a canonical URL");
  check(notFound.indexOf("firstPathSegment") < notFound.indexOf('href="site.webmanifest"'), "404 base bootstrap must run before relative assets");
  check(notFound.includes('location.hostname.endsWith(".github.io")'), "404 base bootstrap must handle GitHub Pages project paths");
}

function validateIcons(root) {
  for (const file of publicHtml) {
    const html = read(root, file);
    check(html.includes('sizes="32x32" href="assets/icons/favicon-32.png"'), `${file} needs the 32px favicon`);
    check(html.includes('sizes="64x64" href="assets/icons/favicon-64.png"'), `${file} needs the 64px favicon`);
    check(html.includes('sizes="180x180" href="assets/icons/apple-touch-icon-180.png"'), `${file} needs the Apple touch icon`);
  }

  const expected = new Map([
    ["assets/icons/favicon-32.png", [32, 32]],
    ["assets/icons/favicon-64.png", [64, 64]],
    ["assets/icons/apple-touch-icon-180.png", [180, 180]],
    ["assets/icons/icon-192.png", [192, 192]],
    ["assets/icons/icon-512.png", [512, 512]],
    ["assets/icons/icon-maskable-512.png", [512, 512]]
  ]);
  for (const [relativePath, [width, height]] of expected) {
    const dimensions = imageDimensions(path.join(root, relativePath));
    check(dimensions.width === width && dimensions.height === height, `${relativePath} is ${dimensions.width}x${dimensions.height}, expected ${width}x${height}`);
  }

  const manifest = JSON.parse(read(root, "site.webmanifest"));
  check(manifest.background_color === "#020f22" && manifest.theme_color === "#020f22", "Manifest colors must use midnight navy");
  const manifestIcons = new Map(manifest.icons.map((icon) => [icon.src, icon]));
  check(manifestIcons.get("assets/icons/icon-192.png")?.sizes === "192x192", "Manifest needs the 192px icon");
  check(manifestIcons.get("assets/icons/icon-512.png")?.sizes === "512x512", "Manifest needs the 512px icon");
  check(manifestIcons.get("assets/icons/icon-maskable-512.png")?.purpose === "maskable", "Manifest needs the maskable icon");

  const social = imageDimensions(path.join(root, "assets/social/ubl-social-share.jpg"));
  check(social.width === 1600 && social.height === 900, `Social image is ${social.width}x${social.height}, expected 1600x900`);
}

function validateCaching(root) {
  for (const file of publicHtml) {
    const html = read(root, file);
    const expectedToken = releaseToken;
    for (const match of html.matchAll(/(?:href|src)=["'][^"']+\.(?:css|js)\?v=([^"']+)["']/gi)) {
      check(match[1] === expectedToken, `${file} uses stale asset token ${match[1]}`);
    }
    if (html.includes("styles.css")) check(html.includes(`styles.css?v=${expectedToken}`), `${file} has a stale styles.css token`);
    if (html.includes("script.js")) check(html.includes(`script.js?v=${expectedToken}`), `${file} has a stale script.js token`);
  }
}

function validateSitemap(root) {
  const sitemap = read(root, "sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replaceAll("&amp;", "&"));
  check(JSON.stringify(urls) === JSON.stringify(expectedSitemapUrls), "Sitemap URLs or ordering do not match the public UBL routes");
  const entries = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)]
    .map((match) => [match[1].replaceAll("&amp;", "&"), match[2]]);
  check(entries.length === expectedSitemapUrls.length, "Every sitemap route needs a lastmod date");
  for (const [url, lastmod] of entries) {
    const updatedOnJuly23 = new Set([
      canonicalBase,
      `${canonicalBase}league-facts.html`,
      `${canonicalBase}news.html`,
      `${canonicalBase}news/2026-27-season-planning.html`,
      `${canonicalBase}news/2027-playoff-format.html`,
      `${canonicalBase}news/ubl-program-directory.html`,
      `${canonicalBase}about.html`
    ]);
    const expected = updatedOnJuly23.has(url) ? "2026-07-23" : "2026-07-22";
    check(lastmod === expected, `${url} has an inaccurate sitemap lastmod date`);
  }
  check(!urls.some((url) => /\/team\.html(?:$|\?)/.test(url)), "Generic client-rendered team template must not appear in sitemap");
  check(urls.every((url) => [...indexablePages.values()].includes(url)), "Sitemap must contain only statically indexable canonical pages");

  const robots = read(root, "robots.txt");
  check(robots.includes(`Sitemap: ${canonicalBase}sitemap.xml`), "robots.txt sitemap URL mismatch");
}

function validateDiscoveryFiles(root) {
  const facts = read(root, "league-facts.html");
  check(facts.includes("What is the Upstate Basketball League?"), "league-facts.html needs the exact league identity question");
  check(facts.includes("not a college basketball program") && facts.includes("adult recreational league"), "league-facts.html needs a visible disambiguation statement");
  check(facts.includes('"@type": "SportsOrganization"') && facts.includes('"@type": "FAQPage"'), "league-facts.html needs organization and FAQ structured data");
  check(facts.includes("Andy Walts") && facts.includes("Chris Webster"), "league-facts.html needs confirmed league leadership");
  check(facts.includes("Info.upstatebasketballleague@gmail.com"), "league-facts.html needs the official contact");

  const teams = read(root, "teams.html");
  for (const name of ["The King's School", "Perth", "Wilton Baptist", "HV Rocks", "HV Flames"]) {
    check(teams.includes(name), `teams.html must expose ${name} without requiring JavaScript`);
  }
  check(teams.includes('"@type": "ItemList"') && teams.includes('"@type": "SportsTeam"'), "teams.html needs structured team-list data");
  for (const route of [
    "teams/kings-school-boys.html", "teams/kings-school-girls.html", "teams/perth-boys.html", "teams/perth-girls.html",
    "teams/wilton-baptist-boys.html", "teams/wilton-baptist-girls.html", "teams/hv-rocks-boys.html", "teams/hv-flames-girls.html"
  ]) {
    const profile = read(root, route);
    check(profile.includes('"@type": "SportsTeam"'), `${route} needs SportsTeam structured data`);
    check(profile.includes("data-team-program=") && profile.includes("data-team-division="), `${route} needs a stable runtime profile identity`);
  }

  const news = read(root, "news.html");
  check(news.includes('"@type": "CollectionPage"') && news.includes("news/2027-playoff-format.html"), "news.html needs a crawlable article collection");
  for (const route of ["news/2026-27-season-planning.html", "news/2027-playoff-format.html", "news/ubl-program-directory.html"]) {
    check(read(root, route).includes('"@type": "NewsArticle"'), `${route} needs NewsArticle structured data`);
  }

  const llms = read(root, "llms.txt");
  check(llms.startsWith("# Upstate Basketball League"), "llms.txt needs an official league heading");
  check(llms.includes(`${canonicalBase}league-facts.html`), "llms.txt needs the official league facts source");
  check(llms.includes(`${canonicalBase}schedule.html`) && llms.includes(`${canonicalBase}standings.html`), "llms.txt needs official schedule and standings sources");
  check(llms.includes("Info.upstatebasketballleague@gmail.com"), "llms.txt needs the league contact");

  const indexNowKey = "5e2cb865318641f38db2af0e8a4a4bc8";
  check(read(root, `${indexNowKey}.txt`).trim() === indexNowKey, "Published IndexNow key file is invalid");
}

function validateHonestContent(root) {
  const sponsors = read(root, "sponsors.html");
  check(!/assets\/sponsors|Google logo|Microsoft logo|NVIDIA logo|AMD logo|Intel logo|Epic Games logo|Rockstar Games logo|Chipotle logo|McDonald(?:'|&apos;)s logo|Burger King logo/i.test(sponsors), "Sponsor page contains an unconfirmed major-brand affiliation");
  check(!/data-count-up=["']10|aria-label=["']10 teams/i.test(sponsors), "Sponsor page contains an unconfirmed team count");
  check(sponsors.includes("Prospective partner categories") && sponsors.includes("no organization is shown as a confirmed UBL sponsor"), "Sponsor page needs explicit prospective-category language");

  const releaseTextFiles = publicHtml.concat([
    "styles.css", "discovery.css", "team-profile-experience.css", "team-gallery-experience.css", "ubl-standings.css", "ubl-about.css", "sponsors.css", "about.js", "site-shell.js", "league-core.js", "data.js", "league-data.json", "script.js", "team-profile-experience.js", "team-gallery-experience.js", "ubl-standings.js", "sponsors.js", "site.webmanifest", "sitemap.xml", "robots.txt", "llms.txt"
  ]);
  const forbidden = /assets\/team-hv-flames\.svg|assets\/ubl-championship-hero|ubl-core-commitments-trophy|assets\/sponsors|Northline/i;
  for (const file of releaseTextFiles) check(!forbidden.test(read(root, file)), `${file} references a forbidden temporary, fake, sponsor, or Northline asset`);
  const publicScript = read(root, "script.js");
  check(publicScript.includes('if (programId === "tbd") return "Open League Spot";'), "Open feed slots must use the public Open League Spot label");
  check(publicScript.includes("publicVenueLabel(game.location)"), "Live-feed venue labels must pass through the public placeholder filter");
  check(read(root, "bracket.html").includes("boys-varsity-bracket.webp") && read(root, "bracket.html").includes("girls-varsity-bracket.webp"), "Bracket artwork must use WebP");
}

function walk(root, current = root) {
  const files = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...walk(root, absolute));
    else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join("/"));
  }
  return files;
}

function validateDistBoundaries() {
  check(fs.existsSync(distRoot) && fs.statSync(distRoot).isDirectory(), "dist is missing; run npm run build:release first");
  const files = walk(distRoot);
  const forbidden = files.filter((relativePath) => forbiddenDistPatterns.some((pattern) => pattern.test(relativePath)));
  check(!forbidden.length, `Forbidden release files found: ${forbidden.join(", ")}`);
  check(!files.some((file) => file.endsWith(".png") && !file.startsWith("assets/icons/") && file !== "assets/optimized/ubl-logo-64.png"), "Unapproved source PNG entered dist");
}

function validateRoot(root) {
  validateReferences(root);
  validateMetadata(root);
  validateIcons(root);
  validateCaching(root);
  validateSitemap(root);
  validateDiscoveryFiles(root);
  validateHonestContent(root);
}

function validateIndexNowAutomation() {
  const automation = read(siteRoot, "scripts/submit-indexnow.cjs");
  const workflow = read(siteRoot, ".github/workflows/manual-pages-release.yml");
  check(automation.includes("https://api.indexnow.org/indexnow"), "IndexNow automation needs the official endpoint");
  check(automation.includes("waitForPublishedKey"), "IndexNow automation must wait for the deployed key");
  check(workflow.includes("needs: deploy") && workflow.includes("node scripts/submit-indexnow.cjs --all"), "Pages releases must notify IndexNow after deployment");
}

validateRoot(siteRoot);
validateRoot(distRoot);
validateIndexNowAutomation();
validateDistBoundaries();
console.log("UBL release validation passed: routes, metadata, assets, sitemap, honesty, and dist boundaries are coherent.");
