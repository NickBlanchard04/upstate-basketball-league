const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createPayload,
  host,
  key,
  keyLocation,
  parseSitemap,
  submit,
  waitForPublishedKey
} = require("../../scripts/submit-indexnow.cjs");

test("IndexNow parses, deduplicates, and validates canonical sitemap URLs", () => {
  const xml = `
    <urlset>
      <url><loc>https://upstatebasketballleague.com/</loc></url>
      <url><loc>https://upstatebasketballleague.com/teams.html</loc></url>
      <url><loc>https://upstatebasketballleague.com/teams.html</loc></url>
    </urlset>`;
  assert.deepEqual(parseSitemap(xml), [
    "https://upstatebasketballleague.com/",
    "https://upstatebasketballleague.com/teams.html"
  ]);
  assert.throws(
    () => parseSitemap("<urlset><url><loc>https://example.com/</loc></url></urlset>"),
    /outside the canonical UBL host/
  );
});

test("IndexNow payload uses the public UBL key and key location", () => {
  const urlList = ["https://upstatebasketballleague.com/"];
  assert.deepEqual(createPayload(urlList), { host, key, keyLocation, urlList });
});

test("IndexNow waits for the deployed key before submission", async () => {
  let calls = 0;
  await waitForPublishedKey(async () => {
    calls += 1;
    return calls === 1
      ? new Response("not ready", { status: 404 })
      : new Response(`${key}\n`, { status: 200 });
  }, 2, 0);
  assert.equal(calls, 2);
});

test("IndexNow accepts successful API responses and reports rejections", async () => {
  const urls = ["https://upstatebasketballleague.com/"];
  assert.equal(await submit(urls, async () => new Response("", { status: 202 })), 202);
  await assert.rejects(
    submit(urls, async () => new Response("invalid key", { status: 403 })),
    /rejected the submission \(403\): invalid key/
  );
});
