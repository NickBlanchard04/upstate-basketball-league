const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../../league-core.js");
const feed = require("../../league-data.json");

const siteRoot = path.resolve(__dirname, "../..");
const dataPath = path.join(siteRoot, "data.js");
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(dataPath, "utf8"), context, { filename: dataPath });
const data = context.window.UBL_DATA;

const expectedPhotos = [
  ["kings-gallery-01", "Girls Varsity", "King's girls varsity player driving through defenders"],
  ["kings-gallery-02", "Girls Varsity", "King's girls varsity player dribbling up the court"],
  ["kings-gallery-03", "Boys Varsity", "King's boys varsity player on the court"],
  ["kings-gallery-04", "Boys Varsity", "King's boys varsity player during a stoppage in play"],
  ["kings-gallery-05", "Boys Varsity", "King's boys varsity player bringing the ball up the court"],
  ["kings-gallery-06", "Girls Varsity", "King's girls varsity player taking a contested shot"],
  ["kings-gallery-07", "Boys Varsity", "King's boys varsity player holding the basketball"],
  ["kings-gallery-08", "Girls Varsity", "King's girls varsity player preparing for a free throw"],
  ["kings-gallery-09", "Girls Varsity", "King's girls varsity player protecting the basketball"],
  ["kings-gallery-10", "Boys Varsity", "King's boys varsity player facing a defender"],
  ["kings-gallery-11", "Girls Varsity", "King's girls varsity team celebrating in a huddle"],
  ["kings-gallery-12", "Boys Varsity", "King's boys varsity team gathered in a huddle"],
  ["kings-gallery-13", "Boys Varsity", "King's boys varsity player dribbling against a defender"]
];

function assertGalleryAssetExists(relativePath) {
  assert.match(relativePath, /^assets\/gallery\/[a-z0-9][a-z0-9/_-]*\.(?:avif|jpe?g|png|webp)$/i);
  const absolutePath = path.resolve(siteRoot, ...relativePath.split("/"));
  const galleryRoot = path.join(siteRoot, "assets", "gallery") + path.sep;
  assert.ok(absolutePath.startsWith(galleryRoot), `${relativePath} must stay inside assets/gallery`);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} must exist`);
}

test("bundled gallery metadata is complete, responsive, and backed by local assets", () => {
  const photos = Array.from(data.galleryPhotos || []);
  const programs = new Map(Array.from(data.programs, (program) => [program.id, program]));

  assert.equal(photos.length, expectedPhotos.length);
  assert.equal(new Set(photos.map((photo) => photo.id)).size, expectedPhotos.length);
  assert.equal(photos.filter((photo) => photo.division === "Boys Varsity").length, 7);
  assert.equal(photos.filter((photo) => photo.division === "Girls Varsity").length, 6);

  photos.forEach((photo, index) => {
    const [id, division, alt] = expectedPhotos[index];
    assert.equal(photo.id, id);
    assert.equal(photo.teamId, "kings-school");
    assert.equal(photo.division, division);
    assert.equal(photo.alt, alt);
    assert.equal(photo.season, "2025-26 season");
    assert.equal(photo.sizes, "(min-width: 768px) 25vw, 50vw");
    assert.equal(photo.width, 480);
    assert.equal(photo.height, 320);

    const program = programs.get(photo.teamId);
    assert.ok(program, `${photo.id} must reference a known program`);
    assert.ok(Array.from(program.divisions).includes(photo.division), `${photo.id} must use a division offered by its program`);

    const sources = Array.from(photo.previewSrcset || []);
    assert.deepEqual(sources.map((source) => source.width), [480, 960]);
    assert.equal(photo.previewUrl, sources[0].url);
    assert.equal(photo.fullUrl, sources[1].url);
    assertGalleryAssetExists(photo.previewUrl);
    assertGalleryAssetExists(photo.fullUrl);
    sources.forEach((source) => assertGalleryAssetExists(source.url));
  });
});

test("live league normalization preserves bundled gallery metadata", () => {
  const normalized = core.normalizeFeed(feed, data);
  assert.equal(normalized.galleryPhotos, data.galleryPhotos);
  assert.equal(normalized.galleryPhotos.length, 13);
});
