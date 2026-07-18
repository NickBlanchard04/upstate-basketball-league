const fs = require("node:fs");
const path = require("node:path");

const siteRoot = path.resolve(__dirname, "..");
const distRoot = path.resolve(siteRoot, "dist");

const publicFiles = Object.freeze([
  "index.html",
  "schedule.html",
  "standings.html",
  "teams.html",
  "team.html",
  "bracket.html",
  "rules.html",
  "gallery.html",
  "sponsors.html",
  "about.html",
  "404.html",
  "styles.css",
  "ubl-standings.css",
  "ubl-about.css",
  "sponsors.css",
  "config.js",
  "analytics.js",
  "league-core.js",
  "data.js",
  "data-loader.js",
  "script.js",
  "ubl-standings.js",
  "sponsors.js",
  "league-data.json",
  "robots.txt",
  "sitemap.xml",
  "site.webmanifest"
]);

const allowedPngAssets = new Set([
  "assets/icons/favicon-32.png",
  "assets/icons/favicon-64.png",
  "assets/icons/apple-touch-icon-180.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/optimized/ubl-logo-64.png"
]);

const forbiddenReleasePaths = [
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

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function assertInside(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must be a child of ${root}: ${candidate}`);
  }
}

function safeSource(relativePath) {
  if (path.isAbsolute(relativePath) || relativePath.includes("\\") || relativePath.split("/").includes("..")) {
    throw new Error(`Unsafe release path: ${relativePath}`);
  }
  const source = path.resolve(siteRoot, relativePath);
  assertInside(siteRoot, source, "Release source");
  const stat = fs.lstatSync(source);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Release source must be a regular file: ${relativePath}`);
  return source;
}

function copyFile(relativePath) {
  const normalized = toPosix(relativePath);
  const source = safeSource(normalized);
  const destination = path.resolve(distRoot, normalized);
  assertInside(distRoot, destination, "Release destination");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function referencedAssets() {
  const assets = new Set();
  const assetPattern = /\bassets\/[A-Za-z0-9._/@()\-]+/g;
  for (const relativePath of publicFiles) {
    const content = fs.readFileSync(safeSource(relativePath), "utf8");
    for (const match of content.matchAll(assetPattern)) assets.add(match[0]);
  }
  return [...assets].sort();
}

function validateAssetAllowlist(assets) {
  for (const asset of assets) {
    if (forbiddenReleasePaths.some((pattern) => pattern.test(asset))) {
      throw new Error(`Forbidden asset referenced by public source: ${asset}`);
    }
    if (path.extname(asset).toLowerCase() === ".png" && !allowedPngAssets.has(asset)) {
      throw new Error(`Source PNG is not release-allowlisted: ${asset}`);
    }
    safeSource(asset);
  }
}

function walkFiles(root, current = root) {
  const results = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(root, absolute));
    else if (entry.isFile()) results.push(toPosix(path.relative(root, absolute)));
    else throw new Error(`Unexpected non-file in release: ${absolute}`);
  }
  return results;
}

function validateProjectIdentity() {
  const packagePath = path.join(siteRoot, "package.json");
  const designPath = path.join(siteRoot, "DESIGN.md");
  if (!fs.existsSync(packagePath) || !fs.existsSync(designPath)) {
    throw new Error(`Release must run from the standalone UBL project root: ${siteRoot}`);
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const design = fs.readFileSync(designPath, "utf8");
  if (packageJson.name !== "upstate-basketball-league" || !/^# Upstate Basketball League Brand Identity$/m.test(design)) {
    throw new Error(`Release source is not the standalone UBL project: ${siteRoot}`);
  }
}

function main() {
  validateProjectIdentity();
  if (distRoot !== path.join(siteRoot, "dist")) throw new Error(`Unexpected release destination: ${distRoot}`);

  for (const relativePath of publicFiles) safeSource(relativePath);
  const assets = referencedAssets();
  validateAssetAllowlist(assets);

  fs.rmSync(distRoot, { recursive: true, force: true });
  fs.mkdirSync(distRoot, { recursive: true });
  for (const relativePath of publicFiles) copyFile(relativePath);
  for (const relativePath of assets) copyFile(relativePath);

  const releaseFiles = walkFiles(distRoot).sort();
  const forbidden = releaseFiles.filter((relativePath) => forbiddenReleasePaths.some((pattern) => pattern.test(relativePath)));
  if (forbidden.length) throw new Error(`Forbidden files entered dist:\n${forbidden.join("\n")}`);

  const expected = new Set([...publicFiles, ...assets]);
  const extras = releaseFiles.filter((relativePath) => !expected.has(relativePath));
  const missing = [...expected].filter((relativePath) => !releaseFiles.includes(relativePath));
  if (extras.length || missing.length) {
    throw new Error(`Release allowlist mismatch. Extras: ${extras.join(", ") || "none"}. Missing: ${missing.join(", ") || "none"}.`);
  }

  const bytes = releaseFiles.reduce((total, relativePath) => total + fs.statSync(path.join(distRoot, relativePath)).size, 0);
  console.log(`Built UBL release: ${releaseFiles.length} allowlisted files, ${(bytes / 1024 / 1024).toFixed(2)} MiB.`);
}

main();
