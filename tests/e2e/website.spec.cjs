const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const feed = require("../../league-data.json");
const liveFeedUrlPattern = /script\.google\.com\/macros\/s\/AKfycbzgjDF7Z0LZahvdeFMa3illib1Dc26LsI2lYG_gCn63gXiUgncmExTQoJrUUD94fxzZ\/exec/;
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
  await page.route(liveFeedUrlPattern, (route) => route.fulfill({ json: feed }));
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
    ["/sponsors.html", "Put your business"],
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

test("every public page uses the Standings header and shared menu behavior", async ({ page }, testInfo) => {
  const routes = [
    "/standings.html",
    "/index.html",
    "/schedule.html",
    "/teams.html",
    "/bracket.html",
    "/rules.html",
    "/gallery.html",
    "/sponsors.html",
    "/about.html",
    "/404.html"
  ];
  let standingsHeader;

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('link[href^="ubl-header.css"]')).toHaveCount(1);
    await expect(page.locator('script[src^="ubl-header.js"]')).toHaveCount(1);
    await expect(page.locator(".site-nav a")).toHaveCount(9);

    const header = await page.locator(".site-header").evaluate((element) => {
      const logo = element.querySelector(".brand img");
      const nav = element.querySelector(".site-nav");
      const styles = getComputedStyle(element);
      return {
        height: Math.round(element.getBoundingClientRect().height * 10) / 10,
        logoWidth: Math.round(logo.getBoundingClientRect().width * 10) / 10,
        borderBottomColor: styles.borderBottomColor,
        borderBottomStyle: styles.borderBottomStyle,
        borderBottomWidth: styles.borderBottomWidth,
        navPosition: getComputedStyle(nav).position
      };
    });

    standingsHeader ||= header;
    expect(header).toEqual(standingsHeader);

    const activeLink = page.locator(".site-nav a.active");
    if (route === "/404.html") {
      await expect(activeLink).toHaveCount(0);
    } else {
      await expect(activeLink).toHaveCount(1);
      await expect(activeLink).toHaveAttribute("aria-current", "page");
    }

    const menuToggle = page.locator(".menu-toggle");
    if (testInfo.project.name === "mobile-chromium") {
      await expect(menuToggle).toBeVisible();
      await expect(menuToggle).toHaveText("Menu");
      await menuToggle.click();
      await expect(menuToggle).toHaveText("Close");
      await expect(menuToggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator(".site-nav")).toBeVisible();
      await expect(page.locator("body")).toHaveClass(/menu-open/);
      const ticker = page.locator(".score-ticker");
      if (await ticker.count()) {
        expect(await page.locator(".site-header").evaluate((element) => Number(getComputedStyle(element).zIndex)))
          .toBeGreaterThan(await ticker.evaluate((element) => Number(getComputedStyle(element).zIndex)));
      }
      await page.keyboard.press("Escape");
      await expect(menuToggle).toHaveText("Menu");
      await expect(menuToggle).toHaveAttribute("aria-expanded", "false");
    } else {
      await expect(menuToggle).toBeHidden();
      await expect(page.locator(".site-nav")).toBeVisible();
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }

  if (testInfo.project.name === "desktop-chromium") {
    await page.goto("/index.html");
    const scheduleLink = page.locator('.site-nav a[href="schedule.html"]');
    const underlineBefore = await scheduleLink.evaluate((link) => getComputedStyle(link, "::after").transform);
    await scheduleLink.hover();
    await expect.poll(() => scheduleLink.evaluate((link) => getComputedStyle(link, "::after").transform)).not.toBe(underlineBefore);
  }
});

async function useLiveFeed(page, sourceFeed) {
  await page.unroute(liveFeedUrlPattern);
  await page.route(liveFeedUrlPattern, (route) => route.fulfill({ json: sourceFeed }));
}

test("public pages do not expose internal placeholder language", async ({ page }) => {
  for (const route of ["/schedule.html", "/teams.html", "/bracket.html", "/gallery.html", "/sponsors.html", "/about.html"]) {
    await page.goto(route);
    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toMatch(/\bTBD\b|placeholder|to be confirmed|coming soon/i);
  }
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

    const hasStandingsHoverRule = await page.evaluate(() => {
      const includesRule = (rules) => Array.from(rules).some((rule) => {
        if (rule.selectorText === ".hero-actions .button-outline:hover") {
          return rule.style.background === "var(--white)" && rule.style.boxShadow !== "";
        }
        return rule.cssRules ? includesRule(rule.cssRules) : false;
      });
      return Array.from(document.styleSheets).some((sheet) => includesRule(sheet.cssRules));
    });
    expect(hasStandingsHoverRule).toBe(true);
  }
});

test("homepage places Coming Up below standings and mixes prior-night finals into the ticker", async ({ page }) => {
  const resultFeed = structuredClone(feed);
  Object.assign(resultFeed.games[0], { status: "Final", awayScore: 41, homeScore: 50 });
  Object.assign(resultFeed.games[1], { status: "Final", awayScore: 44, homeScore: 52 });
  await useLiveFeed(page, resultFeed);
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
  await expect(page.locator("[data-standings-division='Girls Varsity']")).toContainText("HV Flames");
  await expect(page.locator("[data-standings-division='Boys Varsity']")).toContainText("HV Rocks");
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
  await useLiveFeed(page, resultFeed);

  await page.goto("/schedule.html");
  await expect(page.locator("[data-game-id='ubl-001']")).toContainText("41 - 50");
  await page.goto("/standings.html");
  const firstRow = page.locator("[data-standings-division='Boys Varsity'] tr").first();
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
  await page.unroute(liveFeedUrlPattern);
  await page.route(liveFeedUrlPattern, (route) => route.fulfill({ json: { games: "invalid" } }));
  await page.route("**/league-data.json*", (route) => route.fulfill({ json: { games: "invalid" } }));
  await page.goto("/schedule.html");
  await expect(page.locator("[data-week-game-list] .game-row")).not.toHaveCount(0);
  await expect(page.locator("[data-freshness]")).toContainText("backup schedule");
});

test("bundled data renders immediately while the primary live feed loads without duplicate requests", async ({ page }) => {
  await page.unroute(liveFeedUrlPattern);
  const requestTimes = {};
  let legacyScoreRequests = 0;
  let snapshotRequests = 0;
  await page.unroute(scoreFeedUrlPattern);
  await page.route(scoreFeedUrlPattern, async (route) => {
    legacyScoreRequests += 1;
    await route.fulfill({ contentType: "text/csv", body: scoreFeedCsv(feed) });
  });
  await page.route(liveFeedUrlPattern, async (route) => {
    requestTimes.live = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({ json: feed });
  });
  await page.route("**/league-data.json*", async (route) => {
    snapshotRequests += 1;
    await route.fulfill({ json: feed });
  });

  await page.goto("/schedule.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-week-game-list] .game-row")).not.toHaveCount(0);
  await expect(page.locator("[data-freshness]")).toContainText("saved schedule while live updates load");
  await expect.poll(() => Object.keys(requestTimes).length).toBe(1);
  await expect(page.locator("[data-freshness]")).toContainText("synced from the league sheet", { timeout: 3000 });
  expect(legacyScoreRequests).toBe(0);
  expect(snapshotRequests).toBe(0);
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
  await expect(page.locator('link[rel="preload"][href="assets/fonts/material-symbols-rounded-ubl-700.woff2"]')).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 16px "Material Symbols Rounded"'))).toBe(true);
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
  await portrait.scrollIntoViewIfNeeded();
  await expect.poll(() => portrait.evaluate((image) => image.currentSrc)).toMatch(/chris-webster-192\.(?:avif|webp)$/);
});

test("about page explains the league, season, testimonial, and leadership", async ({ page }, testInfo) => {
  await page.goto("/about.html");

  await expect(page.getByRole("heading", { name: "This is UBL" })).toBeVisible();
  await expect(page.locator(".identity-facts")).toContainText("Smaller high school programs");
  await expect(page.locator(".identity-facts")).toContainText("Across upstate New York");

  const identityToggles = page.locator(".identity-toggle");
  const identityPanels = page.locator(".identity-panel");
  await expect(identityToggles).toHaveCount(3);
  await expect(identityPanels).toHaveCount(3);
  await expect(page.locator(".identity-symbol")).toHaveCount(3);

  if (testInfo.project.name === "mobile-chromium") {
    await expect(identityToggles.nth(0)).toBeEnabled();
    await expect(identityToggles.nth(0)).toHaveAttribute("aria-expanded", "false");
    await expect(identityPanels.nth(0)).toHaveAttribute("aria-hidden", "true");
    await identityToggles.nth(0).click();
    await expect(identityToggles.nth(0)).toHaveAttribute("aria-expanded", "true");
    await expect(identityPanels.nth(0)).toHaveAttribute("aria-hidden", "false");
    await identityToggles.nth(1).click();
    await expect(identityToggles.nth(0)).toHaveAttribute("aria-expanded", "false");
    await expect(identityToggles.nth(1)).toHaveAttribute("aria-expanded", "true");
  } else {
    await expect(identityToggles.nth(0)).toBeDisabled();
    await expect(identityPanels.nth(0)).toHaveAttribute("aria-hidden", "false");
    const identityBox = await page.locator(".league-identity").boundingBox();
    expect(identityBox).not.toBeNull();
    expect(identityBox.y + identityBox.height).toBeLessThanOrEqual(720);
  }

  await expect(page.getByRole("heading", { name: "How a UBL season works" })).toBeVisible();
  await expect(page.locator(".season-path > li")).toHaveCount(4);
  await expect(page.locator(".season-node")).toHaveCount(4);
  await expect(page.locator(".season-flip-card")).toHaveCount(4);
  await expect(page.locator('.season-flip-card[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".season-brand")).toHaveAttribute("data-ink", "UBL");
  await expect(page.locator(".season-title-line")).toHaveAttribute("data-ink", "season works");
  await expect(page.locator(".season-number-ink")).toHaveCount(4);

  const routeMarkersOverlap = await page.locator(".season-stage").evaluateAll((stages) => stages.some((stage) => {
    const number = stage.querySelector(".season-step").getBoundingClientRect();
    const node = stage.querySelector(".season-node").getBoundingClientRect();
    return !(number.right <= node.left || number.left >= node.right || number.bottom <= node.top || number.top >= node.bottom);
  }));
  expect(routeMarkersOverlap).toBe(false);

  if (testInfo.project.name === "mobile-chromium") {
    const mobileNumbersSitInsidePhotos = await page.locator(".season-stage").evaluateAll((stages) => stages.every((stage) => {
      const number = stage.querySelector(".season-step").getBoundingClientRect();
      const photo = stage.querySelector(".season-media").getBoundingClientRect();
      return number.left >= photo.left
        && number.left <= photo.left + 80
        && number.top >= photo.top
        && number.bottom <= photo.bottom + 2
        && number.bottom >= photo.bottom - 90;
    }));
    expect(mobileNumbersSitInsidePhotos).toBe(true);
  }

  const seasonCards = page.locator(".season-flip-card");
  await seasonCards.nth(0).click();
  await expect(seasonCards.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(seasonCards.nth(0).locator(".season-card-back")).toHaveAttribute("aria-hidden", "false");
  await expect(seasonCards.nth(0)).toContainText("Member programs register Boys Varsity");
  await seasonCards.nth(1).click();
  await expect(seasonCards.nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(seasonCards.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(seasonCards.nth(1)).toContainText("December and runs through the end of January");

  const liveAction = page.getByAltText("Two varsity basketball players contest the opening tip");
  const championshipTrophy = page.getByAltText("The UBL championship trophy under arena lights");
  const playoffHuddle = page.getByAltText("UBL players and coaches raise their hands together in a team huddle");
  await expect(liveAction).toBeVisible();
  await expect(championshipTrophy).toBeVisible();
  await expect(playoffHuddle).toBeVisible();
  await expect(liveAction).toHaveAttribute("loading", "lazy");
  await expect(championshipTrophy).toHaveAttribute("loading", "lazy");
  await expect(playoffHuddle).toHaveAttribute("loading", "lazy");
  await expect.poll(() => liveAction.evaluate((image) => image.currentSrc)).toMatch(/about-season-02-live-action-(?:768|1600)\.webp$/);
  await expect(championshipTrophy).toHaveAttribute("width", "1600");
  await expect(championshipTrophy).toHaveAttribute("height", "900");
  await expect.poll(() => championshipTrophy.evaluate((image) => image.currentSrc)).toMatch(/ubl-championship-hero-1600\.webp$/);
  await expect.poll(() => playoffHuddle.evaluate((image) => image.currentSrc)).toMatch(/about-season-04-playoffs-huddle-(?:768|1600)\.webp$/);

  await expect(page.getByRole("heading", { name: "The culture behind the commitments" })).toHaveCount(0);
  await expect(page.locator(".culture-section")).toHaveCount(0);

  const huddle = page.getByAltText("Basketball players gathered shoulder-to-shoulder in a team huddle");
  await expect(huddle).toHaveAttribute("src", "assets/optimized/ubl-team-huddle-960.webp");
  await expect(huddle).toHaveAttribute("width", "960");
  await expect(huddle).toHaveAttribute("height", "640");
  await expect(huddle).toHaveAttribute("loading", "lazy");
  await expect(page.locator(".testimonial-break")).toContainText("Nick Blanchard");
  await expect(page.locator(".testimonial-break")).toContainText("Founder");

  if (testInfo.project.name === "mobile-chromium") {
    const imageBox = await huddle.boundingBox();
    const quoteBox = await page.locator(".testimonial-break figcaption").boundingBox();
    expect(imageBox).not.toBeNull();
    expect(quoteBox).not.toBeNull();
    expect(quoteBox.y).toBeGreaterThanOrEqual(imageBox.y + imageBox.height - 1);
  }

  await expect(page.locator(".leadership-section .leader-card")).toHaveCount(2);
  await expect(page.locator(".leader-monogram")).toHaveAttribute("aria-label", "Andy Walts");
  await expect(page.getByAltText("Chris Webster officiating a basketball game")).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
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

test("sponsorship page moves through three partner views and displays safe sample marks", async ({ page }, testInfo) => {
  await page.goto("/sponsors.html");

  await expect(page.getByRole("heading", { name: "Put your business courtside." })).toBeVisible();
  const teamCount = page.locator('[data-count-up="10"]');
  await teamCount.scrollIntoViewIfNeeded();
  await expect(teamCount).toHaveText("10", { timeout: 2500 });
  await expect(page.locator(".sponsor-facts li").first()).toHaveAttribute("aria-label", "10 teams");
  await expect(page.getByRole("link", { name: "Start a conversation" })).toHaveAttribute(
    "href",
    "mailto:Info.upstatebasketballleague@gmail.com?subject=UBL%20Sponsorship%20Inquiry"
  );

  const story = page.locator("[data-sponsor-story]");
  await expect(story.locator("[data-sponsor-step]")).toHaveCount(3);
  await expect(story).toHaveAttribute("data-active-scene", "digital");
  await expect(story.locator('[data-sponsor-scene="digital"]')).toHaveClass(/is-active/);

  await story.getByRole("button", { name: "02 Game night" }).click();
  await expect(story).toHaveAttribute("data-active-scene", "gamenight");
  await expect(story.locator('[data-sponsor-scene="gamenight"]')).toHaveClass(/is-active/);
  await expect(story.getByRole("button", { name: "02 Game night" })).toHaveAttribute("aria-pressed", "true");

  await story.getByRole("button", { name: "03 Community" }).click();
  await expect(story).toHaveAttribute("data-active-scene", "community");
  await expect(story.locator('[data-sponsor-step="community"]')).toHaveClass(/is-active/);

  const sponsorOptions = page.locator("[data-sponsor-option]");
  await expect(sponsorOptions).toHaveCount(6);
  await expect(sponsorOptions.first().getByRole("heading", { name: "Digital sponsorship" })).toBeVisible();
  await expect(page.locator('[data-sponsor-option="champions-legacy"]')).toContainText("boys' and girls' division champions");

  await expect(page.locator(".sponsor-logo-group:not([aria-hidden]) li")).toHaveCount(10);
  await expect(page.locator(".sponsor-logo-group:not([aria-hidden]) img")).toHaveCount(10);
  await expect(page.locator('.sponsor-logo-group:not([aria-hidden]) img[alt="Sample digital business mark"]')).toHaveAttribute("src", "assets/sponsors/sample-digital.svg");
  await expect(page.locator('.sponsor-logo-group:not([aria-hidden]) img[alt="Sample financial business mark"]')).toHaveAttribute("src", "assets/sponsors/sample-finance.svg");
  await expect(page.locator('.sponsor-logo-group[aria-hidden="true"] img:not([alt=""])')).toHaveCount(0);
  const sponsorLogoTrack = page.locator(".sponsor-logo-track");
  await expect(sponsorLogoTrack).toHaveCSS("animation-name", "sponsor-marquee");
  await expect(sponsorLogoTrack).toHaveCSS("animation-play-state", "running");
  if (testInfo.project.name.startsWith("desktop")) {
    const healthMark = page.locator('.sponsor-logo-group:not([aria-hidden]) img[alt="Sample health business mark"]');
    await healthMark.hover({ force: true });
    await expect(healthMark).toHaveCSS("filter", /grayscale\(0\)/);
    await expect(sponsorLogoTrack).toHaveCSS("animation-play-state", "running");
  }
  await expect(page.locator(".sponsor-sample-note")).toContainText("do not represent real businesses or confirmed UBL sponsors");
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(page.locator(".sponsor-footer-bottom")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("public pages expose complete search and social metadata", async ({ page, request }) => {
  const routes = ["index.html", "schedule.html", "standings.html", "teams.html", "bracket.html", "rules.html", "gallery.html", "sponsors.html", "about.html"];
  for (const route of routes) {
    await page.goto(`/${route}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /UBL|Upstate Basketball League/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\//);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\//);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "site.webmanifest");
    await expect(page.locator("h1")).toHaveCount(1);
  }

  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain("sitemap.xml");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/site.webmanifest")).status()).toBe(200);
});

test("cookieless analytics sends only bounded anonymous page data", async ({ page }) => {
  await page.route("**/config.js*", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.UBL_CONFIG = {
      analyticsEndpoint: "https://script.google.com/macros/s/AKfycbyLkMwVxtgJugNRvBmEApHvCOwsGC4fNn8EqArGUnPaVZosyQbN-VYIDOna3SkQ3kA7/exec",
      analyticsChannel: "ubl-public-v1",
      analyticsEnabled: true,
      analyticsAllowedHosts: ["127.0.0.1"],
      staticFeedUrl: "league-data.json",
      refreshMinutes: 1
    };`
  }));
  await page.unroute(galleryFeedUrlPattern);
  let analyticsBody = "";
  await page.route(galleryFeedUrlPattern, async (route) => {
    if (route.request().method() === "POST") {
      analyticsBody = route.request().postData() || "";
      await route.fulfill({ json: { accepted: true } });
      return;
    }
    await route.fulfill({ json: { schemaVersion: 1, photos: [] } });
  });

  await page.goto("/schedule.html");
  await expect.poll(() => analyticsBody, { timeout: 4000 }).toContain("event=pageview");
  const params = new URLSearchParams(analyticsBody);
  expect(params.get("page")).toBe("schedule.html");
  expect(params.get("device")).toMatch(/mobile|desktop/);
  expect(params.get("viewport")).toMatch(/^\d+x\d+$/);
  expect(params.has("email")).toBe(false);
  expect(params.has("name")).toBe(false);
  expect(await page.context().cookies()).toEqual([]);
});

test("analytics stays disabled on unapproved preview hosts", async ({ page }) => {
  await page.unroute(galleryFeedUrlPattern);
  let analyticsPosts = 0;
  await page.route(galleryFeedUrlPattern, async (route) => {
    if (route.request().method() === "POST") analyticsPosts += 1;
    await route.fulfill({ json: { accepted: true, schemaVersion: 1, photos: [] } });
  });

  await page.goto("/schedule.html");
  await page.waitForTimeout(1800);
  expect(analyticsPosts).toBe(0);
});

test("public routes have no automatic WCAG A or AA violations", async ({ page }) => {
  const routes = ["index.html", "schedule.html", "standings.html", "teams.html", "bracket.html", "rules.html", "gallery.html", "sponsors.html", "about.html", "404.html"];
  for (const route of routes) {
    await page.goto(`/${route}`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, `${route} accessibility violations`).toEqual([]);
  }
});
