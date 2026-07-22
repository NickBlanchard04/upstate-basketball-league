const { chromium } = require("@playwright/test");

const defaultBaseUrl = "https://upstatebasketballleague.com";
const routes = [
  "index.html",
  "schedule.html",
  "standings.html",
  "teams.html",
  "teams/hv-rocks-boys.html",
  "news.html",
  "bracket.html",
  "rules.html",
  "gallery.html",
  "sponsors.html",
  "about.html"
];
const budgets = { loadMs: 2000, lcpMs: 2500, cls: 0.1 };

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function round(value, digits = 0) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

async function measureRoute(browser, baseUrl, route) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 40,
    downloadThroughput: 4 * 1024 * 1024 / 8,
    uploadThroughput: 3 * 1024 * 1024 / 8,
    connectionType: "cellular4g"
  });

  let requests = 0;
  let transferredBytes = 0;
  page.on("request", () => { requests += 1; });
  page.on("response", async (response) => {
    const headers = await response.allHeaders().catch(() => ({}));
    const size = Number(headers["content-length"] || 0);
    if (Number.isFinite(size)) transferredBytes += size;
  });

  await page.addInitScript(() => {
    window.__ublVitals = { cls: 0, lcp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__ublVitals.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length) window.__ublVitals.lcp = entries.at(-1).startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  try {
    await page.goto(`${baseUrl}/${route}`, { waitUntil: "load", timeout: 30000 });
    await page.locator("h1").waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(800);

    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const paint = performance.getEntriesByName("first-contentful-paint")[0];
      return {
        loadMs: navigation?.loadEventEnd || 0,
        fcpMs: paint?.startTime || 0,
        lcpMs: window.__ublVitals?.lcp || 0,
        cls: window.__ublVitals?.cls || 0
      };
    });

    return { ...metrics, requests, transferredKb: transferredBytes / 1024 };
  } finally {
    await context.close();
  }
}

async function measureRouteWithRetry(browser, baseUrl, route) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await measureRoute(browser, baseUrl, route);
    } catch (error) {
      lastError = error;
      if (attempt < 2) console.warn(`Retrying ${route} after a transient audit failure: ${error.message}`);
    }
  }
  throw lastError;
}

async function main() {
  const baseUrl = argument("base-url", process.env.PERF_BASE_URL || defaultBaseUrl).replace(/\/$/, "");
  const runCount = Math.max(1, Number(argument("runs", "3")) || 3);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const route of routes) {
      const samples = [];
      for (let run = 0; run < runCount; run += 1) {
        samples.push(await measureRouteWithRetry(browser, baseUrl, route));
      }
      results.push({
        route,
        loadMs: round(median(samples.map((sample) => sample.loadMs))),
        fcpMs: round(median(samples.map((sample) => sample.fcpMs))),
        lcpMs: round(median(samples.map((sample) => sample.lcpMs))),
        cls: round(median(samples.map((sample) => sample.cls)), 3),
        requests: round(median(samples.map((sample) => sample.requests))),
        transferredKb: round(median(samples.map((sample) => sample.transferredKb)))
      });
    }
  } finally {
    await browser.close();
  }

  console.log(`\nUBL mobile fast-4G performance audit: ${baseUrl}`);
  console.table(results);
  console.log(`Budgets: load <= ${budgets.loadMs} ms, LCP <= ${budgets.lcpMs} ms, CLS <= ${budgets.cls}`);

  const failures = results.filter((result) => (
    result.loadMs > budgets.loadMs || result.lcpMs > budgets.lcpMs || result.cls > budgets.cls
  ));
  if (failures.length) {
    console.error(`Performance budget failed: ${failures.map((result) => result.route).join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
