const fs = require("node:fs");
const path = require("node:path");

const siteRoot = path.resolve(__dirname, "..");
const canonicalBase = "https://upstatebasketballleague.com/";
const host = new URL(canonicalBase).hostname;
const key = "5e2cb865318641f38db2af0e8a4a4bc8";
const keyFile = `${key}.txt`;
const keyLocation = `${canonicalBase}${keyFile}`;
const endpoint = "https://api.indexnow.org/indexnow";

function parseSitemap(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    match[1].replaceAll("&amp;", "&").trim()
  );
  if (!urls.length) throw new Error("The sitemap does not contain any URLs.");

  for (const value of urls) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== host) {
      throw new Error(`IndexNow URL is outside the canonical UBL host: ${value}`);
    }
  }

  return [...new Set(urls)];
}

function createPayload(urlList) {
  if (!Array.isArray(urlList) || !urlList.length) throw new Error("IndexNow requires at least one URL.");
  if (urlList.length > 10000) throw new Error("IndexNow accepts at most 10,000 URLs per request.");
  return { host, key, keyLocation, urlList };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForPublishedKey(fetchImpl = fetch, attempts = 24, delayMs = 5000) {
  let lastStatus = "not requested";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(`${keyLocation}?v=${Date.now()}`, { cache: "no-store" });
      lastStatus = `${response.status} ${response.statusText}`.trim();
      if (response.ok && (await response.text()).trim() === key) return;
    } catch (error) {
      lastStatus = error.message;
    }
    if (attempt < attempts) await delay(delayMs);
  }
  throw new Error(`IndexNow key was not available at ${keyLocation}. Last response: ${lastStatus}`);
}

async function submit(urlList, fetchImpl = fetch) {
  const payload = createPayload(urlList);
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });
  if (response.status !== 200 && response.status !== 202) {
    const details = (await response.text()).trim();
    throw new Error(`IndexNow rejected the submission (${response.status}): ${details || response.statusText}`);
  }
  return response.status;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const localKey = fs.readFileSync(path.join(siteRoot, keyFile), "utf8").trim();
  if (localKey !== key) throw new Error(`IndexNow key file ${keyFile} does not match the configured key.`);

  const sitemap = fs.readFileSync(path.join(siteRoot, "sitemap.xml"), "utf8");
  const urls = parseSitemap(sitemap);
  if (dryRun) {
    console.log(JSON.stringify(createPayload(urls), null, 2));
    return;
  }

  await waitForPublishedKey();
  const status = await submit(urls);
  console.log(`IndexNow accepted ${urls.length} UBL URLs with HTTP ${status}.`);
}

module.exports = { canonicalBase, createPayload, endpoint, host, key, keyLocation, parseSitemap, submit, waitForPublishedKey };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
