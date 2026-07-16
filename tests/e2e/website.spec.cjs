const { test, expect } = require("@playwright/test");
const feed = require("../../league-data.json");
const scoreFeedUrlPattern = /docs\.google\.com\/spreadsheets\/d\/e\/2PACX-1vTp7iD4G8a9gp67-XCnN4in2fFfAuGJNKqYpKaxHoADZDABGCT_YMP7aFYa8ynhY1Itk6OvdHW6bq5T\/pub/;
const galleryFeedUrlPattern = /script\.google\.com\/macros\/s\/AKfycbyLkMwVxtgJugNRvBmEApHvCOwsGC4fNn8EqArGUnPaVZosyQbN-VYIDOna3SkQ3kA7\/exec/;

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function scoreFeedCsv(sourceFeed) {
  const headers = ["Game ID", "Date", "Time", "Division", "Away Team ID", "Home Team ID", "Venue ID", "Status", "Away Score", "Home Score", "Week ID"];
  const rows = sourceFeed.games.map((game) => [
    game.id,
    game.date,
    game.time,
    game.division,
    game.awayTeamId,
    game.homeTeamId,
    game.venueId,
    game.status,
    game.awayScore,
    game.homeScore,
    game.weekId
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

test.beforeEach(async ({ page }) => {
  await page.route(scoreFeedUrlPattern, (route) => route.fulfill({ contentType: "text/csv", body: scoreFeedCsv(feed) }));
  await page.route(galleryFeedUrlPattern, (route) => route.fulfill({ json: { schemaVersion: 1, photos: [] } }));
});

async function expectNoAppErrors(page, action) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await action();
  expect(errors).toEqual([]);
}

test("all public routes render meaningful content without runtime errors", async ({ page }) => {
  const routes = [
    ["/index.html", "Faith."],
    ["/schedule.html", "League schedule"],
    ["/standings.html", "Standings"],
    ["/teams.html", "UBL programs"],
    ["/bracket.html", "Playoff brackets"],
    ["/rules.html", "League standards"],
    ["/gallery.html", "Gallery"],
    ["/about.html", "About UBL"]
  ];
  await expectNoAppErrors(page, async () => {
    for (const [route, heading] of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toContainText(heading);
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });
});

test("homepage uses the shared schedule and continuously moving game ticker", async ({ page }, testInfo) => {
  await page.goto("/index.html");
  const heroArt = page.locator(".hero-art");
  await expect(heroArt).toHaveAttribute("src", "assets/ubl-championship-hero.jpg");
  expect(await heroArt.evaluate((image) => image.currentSrc)).toMatch(/ubl-championship-hero-(?:mobile-768|1600)\.(?:avif|webp)$/);
  await expect(page.locator("[data-featured-game]")).toContainText("Next league game");
  await expect(page.locator(".score-ticker")).toBeVisible();
  await expect(page.locator(".ticker-track")).toHaveCSS("animation-name", "ticker-scroll");
  await expect(page.locator("[data-freshness]")).toContainText("synced from the league sheet");
  const openSpot = page.locator(".team-card-open-spot");
  await expect(openSpot.locator("img")).toHaveAttribute("src", "assets/optimized/ubl-logo-192.webp");
  await expect(openSpot).toHaveAttribute("href", "mailto:Info.upstatebasketballleague@gmail.com?subject=Interested%20in%20joining%20the%20UBL");
  if (testInfo.project.name.startsWith("desktop")) {
    const scheduleButton = page.getByRole("link", { name: "View schedule" });
    await scheduleButton.hover();
    await expect.poll(() => scheduleButton.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    await expect.poll(() => scheduleButton.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");

    const standingsButton = page.getByRole("link", { name: "Check standings" });
    await standingsButton.hover();
    await expect.poll(() => standingsButton.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(255, 255, 255)");
  }
});

test("homepage places Coming Up below standings and mixes prior-night finals into the ticker", async ({ page }) => {
  const resultFeed = structuredClone(feed);
  Object.assign(resultFeed.games[0], { status: "Final", awayScore: 41, homeScore: 50 });
  Object.assign(resultFeed.games[1], { status: "Final", awayScore: 44, homeScore: 52 });
  await page.unroute(scoreFeedUrlPattern);
  await page.route(scoreFeedUrlPattern, (route) => route.fulfill({ contentType: "text/csv", body: scoreFeedCsv(resultFeed) }));
  await page.addInitScript(() => {
    Date.now = () => Date.parse("2026-12-04T15:00:00.000Z");
  });
  await page.goto("/index.html");
  const overview = page.locator(".home-league-grid");
  await expect(overview.locator(".standings-panel")).toBeVisible();
  await expect(overview.locator(".schedule-panel")).toBeVisible();
  expect(await overview.evaluate((element) => Array.from(element.children).map((child) => child.className))).toEqual([
    "panel standings-panel",
    "panel schedule-panel"
  ]);
  const recentTickerGames = page.locator("[data-ticker-state='recent']");
  await expect(recentTickerGames).toHaveCount(4);
  expect(await recentTickerGames.evaluateAll((elements) => elements.every((element) => element.textContent.includes("Final")))).toBe(true);
  await expect(page.locator("[data-ticker-state='upcoming']")).toHaveCount(8);
});

test("desktop ticker moves even when the browser requests reduced motion", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"), "Desktop-specific ticker behavior");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/index.html");
  const ticker = page.locator(".score-ticker");
  const track = page.locator(".ticker-track");
  await expect(ticker).toBeVisible();
  expect(await ticker.evaluate((element) => parseFloat(getComputedStyle(element).height))).toBeGreaterThan(65);
  await expect(track).toHaveCSS("animation-name", "ticker-scroll");
  await expect(page.locator(".ticker-window")).toHaveCSS("overflow-x", "hidden");
  const startTransform = await track.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(750);
  const endTransform = await track.evaluate((element) => getComputedStyle(element).transform);
  expect(endTransform).not.toBe(startTransform);
});

test("schedule week, division, and map controls work", async ({ page }) => {
  await page.goto("/schedule.html");
  await page.locator("[data-week-select]").selectOption("week-3");
  await expect(page.locator("[data-week-heading]")).toContainText("Week 3");
  await page.getByRole("button", { name: "Boys Varsity" }).click();
  const rows = page.locator("[data-week-game-list] .game-row");
  await expect(rows).toHaveCount(1);
  for (const row of await rows.all()) await expect(row).toContainText("Boys Varsity");
  await page.getByRole("button", { name: "All games" }).click();
  const openArmsLinks = page.locator('[data-week-game-list] [data-map-address="2714 Curry Rd, Schenectady, NY 12303"]');
  await expect(openArmsLinks).toHaveCount(1);
  await expect(openArmsLinks).toContainText("2714 Curry Rd, Schenectady, NY 12303");
  await openArmsLinks.click();
  await expect(page.locator(".map-dialog")).toBeVisible();
  await expect(page.locator("[data-map-dialog-address]")).toHaveText("2714 Curry Rd, Schenectady, NY 12303");
  await expect(page.getByRole("link", { name: "Apple Maps" })).toHaveAttribute("href", /maps\.apple\.com/);
  await expect(page.getByRole("link", { name: "Google Maps" })).toHaveAttribute("href", /google\.com\/maps/);
  await expect(page.getByRole("link", { name: "Waze" })).toHaveAttribute("href", /waze\.com/);
});

test("standings and separate division brackets render from league data", async ({ page }) => {
  await page.goto("/standings.html");
  await page.getByRole("tab", { name: "Girls Varsity" }).click();
  await expect(page.locator("[data-standings-body]")).toContainText("HV Flames");
  await page.goto("/bracket.html");
  await expect(page.locator("[data-bracket='Boys Varsity']")).toContainText("Winner advances to play Seed 1");
  await expect(page.locator("[data-bracket='Girls Varsity']")).toContainText("Winner advances to play Seed 1");
  await expect(page.locator("[data-bracket]")).toHaveCount(2);
});

test("team profiles and gallery interactions remain usable", async ({ page }) => {
  await page.goto("/teams.html");
  await page.locator("#hv-rocks summary").click();
  await expect(page.locator("#hv-rocks")).toContainText("Marc Bailey");
  await page.locator("#hv-rocks [data-map-address]").click();
  await expect(page.locator(".map-dialog")).toContainText("2714 Curry Rd");
  await page.locator("[data-map-dialog-close]").click();

  await page.goto("/gallery.html");
  await expect(page.locator(".gallery-lede")).toHaveCount(0);
  const galleryOpenSpot = page.locator(".gallery-panel .open-spot-profile");
  await expect(galleryOpenSpot).toContainText("Bring your program to the UBL");
  await expect(galleryOpenSpot.getByRole("link", { name: "Start a conversation" })).toHaveAttribute("href", "mailto:Info.upstatebasketballleague@gmail.com?subject=Interested%20in%20joining%20the%20UBL");
  await page.locator(".team-gallery").first().locator("summary").click();
  await page.locator("[data-gallery-full]").first().click();
  await expect(page.locator(".gallery-lightbox")).toBeVisible();
  await page.getByRole("button", { name: "Close fullscreen photo" }).click();
});

test("approved Drive photos appear only in their matching team and division", async ({ page }) => {
  await page.route("**/config.js*", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.UBL_CONFIG = {
      liveFeedUrl: "",
      scoreFeedUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTp7iD4G8a9gp67-XCnN4in2fFfAuGJNKqYpKaxHoADZDABGCT_YMP7aFYa8ynhY1Itk6OvdHW6bq5T/pub?gid=1900000003&single=true&output=csv",
      galleryFeedUrl: "https://example.test/approved-gallery",
      staticFeedUrl: "league-data.json",
      refreshMinutes: 1
    };`
  }));
  await page.route("https://example.test/approved-gallery", (route) => route.fulfill({
    json: {
      schemaVersion: 1,
      photos: [{
        id: "approved-rocks-1",
        teamId: "hv-rocks",
        teamName: "HV Rocks",
        division: "Boys Varsity",
        season: "2026-27 season",
        alt: "HV Rocks boys varsity game",
        previewUrl: "https://drive.google.com/thumbnail?id=approved-rocks-1&sz=w600",
        fullUrl: "https://drive.google.com/thumbnail?id=approved-rocks-1&sz=w1600"
      }]
    }
  }));

  await page.goto("/gallery.html");
  const rocksGallery = page.locator('[data-gallery-team="hv-rocks"]');
  await rocksGallery.locator("summary").click();
  await expect(rocksGallery.locator("[data-gallery-count]")).toHaveText("1 photo");
  await expect(rocksGallery.locator('[data-gallery-photo-id="approved-rocks-1"]')).toBeVisible();

  await page.getByRole("tab", { name: "Girls Varsity" }).click();
  await expect(rocksGallery).toBeHidden();
  await page.getByRole("tab", { name: "Boys Varsity" }).click();
  await expect(rocksGallery).toBeVisible();
  await rocksGallery.locator('[data-gallery-photo-id="approved-rocks-1"] [data-gallery-full]').click();
  await expect(page.locator(".gallery-lightbox")).toBeVisible();
  await expect(page.locator("[data-gallery-lightbox-title]")).toHaveText("Boys Varsity");
});

test("completed score updates schedule, standings, and bracket seeds", async ({ page }) => {
  const resultFeed = structuredClone(feed);
  Object.assign(resultFeed.games[0], { status: "Final", awayScore: 41, homeScore: 50 });
  await page.unroute(scoreFeedUrlPattern);
  await page.route(scoreFeedUrlPattern, (route) => route.fulfill({ contentType: "text/csv", body: scoreFeedCsv(resultFeed) }));

  await page.goto("/schedule.html");
  await expect(page.locator("[data-game-id='ubl-001']")).toContainText("41 - 50");
  await page.goto("/standings.html");
  const firstRow = page.locator("[data-standings-body] tr").first();
  await expect(firstRow).toContainText("Perth");
  await expect(firstRow).toContainText("1");
  await page.goto("/bracket.html");
  await expect(page.locator("[data-bracket='Boys Varsity']")).toContainText("Perth");
});

test("simultaneous games are all shown during the configured live window", async ({ page }) => {
  await page.addInitScript(() => {
    Date.now = () => Date.parse("2027-02-18T22:15:00.000Z");
  });
  await page.goto("/index.html");
  await expect(page.locator("[data-featured-game] h2")).toHaveText("2 games live");
  await expect(page.locator("[data-featured-game] [data-game-id]")).toHaveCount(2);
});

test("malformed live data falls back to the bundled schedule", async ({ page }) => {
  await page.route("**/league-data.json*", (route) => route.fulfill({ json: { games: "invalid" } }));
  await page.goto("/schedule.html");
  await expect(page.locator("[data-week-game-list] .game-row")).not.toHaveCount(0);
  await expect(page.locator("[data-freshness]")).toContainText("backup schedule");
});

test("bundled data renders immediately while score and schedule feeds load in parallel", async ({ page }) => {
  await page.unroute(scoreFeedUrlPattern);
  const requestTimes = {};
  await page.route(scoreFeedUrlPattern, async (route) => {
    requestTimes.score = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({ contentType: "text/csv", body: scoreFeedCsv(feed) });
  });
  await page.route("**/league-data.json*", async (route) => {
    requestTimes.schedule = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({ json: feed });
  });

  await page.goto("/schedule.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-week-game-list] .game-row")).not.toHaveCount(0);
  await expect(page.locator("[data-freshness]")).toContainText("saved schedule while live updates load");
  await expect.poll(() => Object.keys(requestTimes).length).toBe(2);
  expect(Math.abs(requestTimes.score - requestTimes.schedule)).toBeLessThan(150);
  await expect(page.locator("[data-freshness]")).toContainText("synced from the league sheet", { timeout: 3000 });
});

test("identical live data does not replace already rendered schedule nodes", async ({ page }) => {
  await page.goto("/schedule.html");
  await expect(page.locator("[data-week-game-list] .game-row")).not.toHaveCount(0);
  const preserved = await page.evaluate(() => {
    const row = document.querySelector("[data-week-game-list] .game-row");
    window.__ublTestRow = row;
    document.dispatchEvent(new CustomEvent("ubl:data-updated", { detail: { data: window.UBL_DATA } }));
    return window.__ublTestRow === document.querySelector("[data-week-game-list] .game-row");
  });
  expect(preserved).toBe(true);
});

test("fonts and responsive artwork load from optimized local assets", async ({ page }, testInfo) => {
  const requestedUrls = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  await page.goto("/about.html");

  await expect(page.locator('link[rel="preload"][href="assets/fonts/barlow-condensed-900-latin.woff2"]')).toHaveCount(1);
  await expect(page.locator('link[rel="preload"][href="assets/fonts/ibm-plex-sans-400-700-latin.woff2"]')).toHaveCount(1);
  expect(requestedUrls.some((url) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url))).toBe(false);

  const bannerImage = await page.locator(".page-banner").evaluate((element) => getComputedStyle(element).backgroundImage);
  if (testInfo.project.name.startsWith("mobile")) {
    expect(bannerImage).toContain("ubl-website-hero-768.webp");
  } else {
    expect(bannerImage).toContain("ubl-website-hero-1600.webp");
  }

  const portrait = page.getByAltText("Chris Webster officiating a basketball game");
  await expect(portrait).toHaveAttribute("width", "192");
  await expect(portrait).toHaveAttribute("height", "192");
  await expect(portrait).toHaveAttribute("loading", "lazy");
  expect(await portrait.evaluate((image) => image.currentSrc)).toMatch(/chris-webster-192\.(?:avif|webp)$/);
});

test("approved gallery feed is requested only after an empty team gallery opens", async ({ page }) => {
  await page.unroute(galleryFeedUrlPattern);
  let requests = 0;
  await page.route(galleryFeedUrlPattern, async (route) => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ json: { schemaVersion: 1, photos: [] } });
  });

  await page.goto("/gallery.html");
  await page.waitForTimeout(100);
  expect(requests).toBe(0);

  const rocksGallery = page.locator('[data-gallery-team="hv-rocks"]');
  await rocksGallery.locator("summary").click();
  await expect(rocksGallery.locator(".gallery-skeleton")).toHaveCount(2);
  await expect.poll(() => requests).toBe(1);
  await expect(rocksGallery.locator(".gallery-skeleton")).toHaveCount(0, { timeout: 2000 });

  await page.goto("/schedule.html");
  await page.waitForTimeout(100);
  expect(requests).toBe(1);
});
