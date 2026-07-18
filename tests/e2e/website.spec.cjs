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
    ["/teams.html", "Meet the teams shaping UBL."],
    ["/team.html?program=hv-rocks&division=boys", "HV Rocks"],
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

async function useLiveFeed(page, sourceFeed) {
  await page.unroute(liveFeedUrlPattern);
  await page.route(liveFeedUrlPattern, (route) => route.fulfill({ json: sourceFeed }));
}

test("public pages do not expose internal placeholder language", async ({ page }) => {
  for (const route of ["/schedule.html", "/teams.html", "/team.html?program=hv-rocks&division=boys", "/bracket.html", "/gallery.html", "/sponsors.html", "/about.html"]) {
    await page.goto(route);
    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toMatch(/\bTBD\b|placeholder|to be confirmed|coming soon/i);
  }
});

test("homepage uses the shared schedule and continuously moving game ticker", async ({ page }, testInfo) => {
  await page.goto("/index.html");
  const heroArt = page.locator(".hero-art");
  await expect(heroArt).toHaveAttribute("src", "assets/ubl/ubl-faith-before-the-whistle.webp");
  expect(await heroArt.evaluate((image) => image.currentSrc)).toMatch(/assets\/ubl\/ubl-faith-before-the-whistle\.webp$/);
  await expect(page.locator("[data-featured-game]")).toContainText("Next league game");
  await expect(page.locator(".score-ticker")).toBeVisible();
  await expect(page.locator(".ticker-track")).toHaveCSS("animation-name", "ticker-scroll");
  await expect(page.locator("[data-freshness]")).toContainText("synced from the league sheet");
  const openSpot = page.locator(".team-card-open-spot");
  await expect(openSpot.locator("img")).toHaveAttribute("src", "assets/icons/icon-192.png");
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

test("team directory separates each division and opens the right profile", async ({ page }, testInfo) => {
  await page.goto("/teams.html");

  const girlsColumn = page.locator("#girls-division");
  const boysColumn = page.locator("#boys-division");
  const girlsCards = girlsColumn.locator(".division-team-card");
  const boysCards = boysColumn.locator(".division-team-card");
  await expect(girlsCards).toHaveCount(4);
  await expect(boysCards).toHaveCount(4);
  await expect(page.locator('[data-program-card="tbd"]')).toHaveCount(0);
  await expect(girlsColumn.locator("[data-division-count]")).toHaveText("4 teams");
  await expect(boysColumn.locator("[data-division-count]")).toHaveText("4 teams");
  await expect(page.locator(".division-team-card img")).toHaveCount(8);
  await expect(girlsColumn.locator('[data-program-card="hv-flames"] img')).toHaveAttribute("src", "assets/icons/icon-192.png");

  const girlsKings = girlsColumn.locator('[data-program-card="kings-school"]');
  await expect(girlsKings).toHaveAttribute("href", "team.html?program=kings-school&division=girls");
  await expect(girlsKings).toHaveAccessibleName(/View team.*The King’s School.*Meet the program/);

  const layout = await page.locator(".division-board").evaluate((board) => {
    const [girls, boys] = board.children;
    const girlsRect = girls.getBoundingClientRect();
    const boysRect = boys.getBoundingClientRect();
    return { girlsX: girlsRect.x, girlsY: girlsRect.y, boysX: boysRect.x, boysY: boysRect.y };
  });
  if (testInfo.project.name.startsWith("desktop")) {
    expect(layout.girlsX).toBeLessThan(layout.boysX);
    expect(Math.abs(layout.girlsY - layout.boysY)).toBeLessThan(2);
    await girlsKings.scrollIntoViewIfNeeded();
    await expect(girlsKings).toHaveClass(/is-visible/);
    await girlsKings.hover();
    await expect(girlsKings).toHaveCSS("border-color", "rgb(227, 19, 49)");
    await expect(girlsKings.locator(".team-card-view")).toHaveCSS("background-color", "rgb(227, 19, 49)");
  } else {
    expect(layout.girlsY).toBeLessThan(layout.boysY);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await girlsKings.click();
  await expect(page).toHaveURL(/team\.html\?program=kings-school&division=girls$/);
  await expect(page.locator("h1")).toHaveText("The King’s School");
  await expect(page.getByRole("heading", { name: "Brodie Farr" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Todd Brown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hudson Waters" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "athletic_director@kingsschool.info" })).toHaveAttribute("href", "mailto:athletic_director@kingsschool.info");

  await page.getByRole("link", { name: "Boys", exact: true }).click();
  await expect(page).toHaveURL(/team\.html\?program=kings-school&division=boys$/);
  await expect(page.getByRole("heading", { name: "Hudson Waters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Jacob Fischer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brodie Farr" })).toHaveCount(0);
});

test("team profiles expose known venue data and honest missing states", async ({ page }) => {
  await page.goto("/team.html?program=hv-rocks&division=boys");
  await expect(page.getByRole("heading", { name: "Marc Bailey" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tim Stuitje" })).toBeVisible();
  await page.locator('[data-map-address="2714 Curry Rd, Schenectady, NY 12303"]').click();
  await expect(page.locator(".map-dialog")).toContainText("2714 Curry Rd");
  await page.locator("[data-map-dialog-close]").click();
  await expect(page.locator(".map-dialog")).not.toBeVisible();

  await page.goto("/team.html?program=perth&division=girls");
  await expect(page.locator(".team-profile-empty")).toContainText("Coaching staff not yet published");
  await expect(page.locator(".team-profile-facts")).toContainText("Home-court details not yet published");
  await expect(page.locator(".team-profile-facts")).toContainText("Public representative email not yet provided");
  await expect(page.getByRole("link", { name: "Ask UBL for the right contact" })).toHaveAttribute("href", /^mailto:Info\.upstatebasketballleague@gmail\.com/);
});

test("team cards remain complete when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/teams.html");
  const cards = page.locator(".division-team-card");
  await expect(cards).toHaveCount(8);
  expect(await cards.evaluateAll((elements) => elements.every((element) => {
    const style = getComputedStyle(element);
    return style.opacity === "1" && style.animationName === "none";
  }))).toBe(true);
});

test("team cards stay separated across mobile, tablet, and desktop breakpoints", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"), "One browser can cover the responsive breakpoint matrix");
  const widths = [390, 600, 767, 768, 1100, 1279, 1280, 1440];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/teams.html");
    await expect(page.locator(".division-team-card")).toHaveCount(8);
    const metrics = await page.evaluate(() => {
      const board = document.querySelector(".division-board");
      const girls = document.querySelector("#girls-division");
      const boys = document.querySelector("#boys-division");
      const grid = document.querySelector(".division-team-grid");
      const actions = document.querySelector(".teams-hero-actions");
      const rail = document.querySelector(".teams-values-rail");
      const cards = [...document.querySelectorAll(".division-team-card")];
      const cardOverlap = cards.some((card) => {
        const cardRect = card.getBoundingClientRect();
        const logoRect = card.querySelector(".team-card-logo-stage").getBoundingClientRect();
        const titleRect = card.querySelector(".division-team-card-content strong").getBoundingClientRect();
        const actionRect = card.querySelector(".division-team-card-content b").getBoundingClientRect();
        return logoRect.bottom > titleRect.top + 1
          || logoRect.top < cardRect.top - 1
          || actionRect.bottom > cardRect.bottom + 1;
      });
      const girlsRect = girls.getBoundingClientRect();
      const boysRect = boys.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        cardOverlap,
        divisionsSideBySide: Math.abs(girlsRect.y - boysRect.y) < 2 && girlsRect.x < boysRect.x,
        innerColumns: getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
        heroOverlap: innerWidth < 600 && actions.getBoundingClientRect().bottom > rail.getBoundingClientRect().top + 1
      };
    });

    expect(metrics.overflow, `${width}px horizontal overflow`).toBe(false);
    expect(metrics.cardOverlap, `${width}px logo or action overlap`).toBe(false);
    expect(metrics.divisionsSideBySide, `${width}px division placement`).toBe(width >= 768);
    expect(metrics.innerColumns, `${width}px cards per division row`).toBe((width >= 600 && width < 768) || width >= 1280 ? 2 : 1);
    expect(metrics.heroOverlap, `${width}px hero rail overlap`).toBe(false);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/teams.html");
  const menu = page.locator(".menu-toggle");
  await expect(menu).toHaveAccessibleName("Open menu");
  await menu.click();
  await expect(menu).toHaveAccessibleName("Close menu");
  await expect(page.locator("body")).toHaveClass(/menu-open/);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/menu-open/);
  await menu.click();
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(page.locator("body")).not.toHaveClass(/menu-open/);
});

test("bundled gallery metadata renders responsively and remains interactive", async ({ page }) => {
  await page.goto("/gallery.html");
  await expect(page.locator(".gallery-lede")).toHaveCount(0);
  const galleryOpenSpot = page.locator(".gallery-panel .open-spot-profile");
  await expect(galleryOpenSpot).toContainText("Bring your program to the UBL");
  await expect(galleryOpenSpot.getByRole("link", { name: "Start a conversation" })).toHaveAttribute("href", "mailto:Info.upstatebasketballleague@gmail.com?subject=Interested%20in%20joining%20the%20UBL");
  const kingsGallery = page.locator('[data-gallery-team="kings-school"]');
  const bundledPhotos = kingsGallery.locator("[data-gallery-photo-id]");
  const firstPhoto = kingsGallery.locator('[data-gallery-photo-id="kings-gallery-01"]');
  const firstImage = firstPhoto.locator("img");
  await expect(bundledPhotos).toHaveCount(13);
  await expect(kingsGallery.locator("[data-gallery-count]")).toHaveText("13 photos");
  await expect(firstImage).toHaveAttribute("src", "assets/gallery/optimized/480/kings-gallery-01.webp");
  await expect(firstImage).toHaveAttribute("srcset", "assets/gallery/optimized/480/kings-gallery-01.webp 480w, assets/gallery/optimized/960/kings-gallery-01.webp 960w");
  await expect(firstImage).toHaveAttribute("sizes", "(min-width: 768px) 25vw, 50vw");
  await expect(firstImage).toHaveAttribute("width", "480");
  await expect(firstImage).toHaveAttribute("height", "320");
  await expect(firstImage).toHaveAttribute("alt", "King's girls varsity player driving through defenders");

  await kingsGallery.locator("summary").click();
  await page.getByRole("tab", { name: "Boys Varsity" }).click();
  await expect(kingsGallery.locator('[data-gallery-division="Boys Varsity"]:not([hidden])')).toHaveCount(7);
  await expect(kingsGallery.locator('[data-gallery-division="Girls Varsity"]:not([hidden])')).toHaveCount(0);
  await page.getByRole("tab", { name: "Girls Varsity" }).click();
  await expect(kingsGallery.locator('[data-gallery-division="Girls Varsity"]:not([hidden])')).toHaveCount(6);
  await expect(kingsGallery.locator('[data-gallery-division="Boys Varsity"]:not([hidden])')).toHaveCount(0);
  await page.getByRole("tab", { name: "All photos" }).click();

  await firstPhoto.locator("[data-gallery-full]").click();
  await expect(page.locator(".gallery-lightbox")).toBeVisible();
  await expect(page.locator("[data-gallery-lightbox-image]")).toHaveAttribute("src", "assets/gallery/optimized/960/kings-gallery-01.webp");
  await expect(page.locator("[data-gallery-lightbox-image]")).toHaveAttribute("alt", "King's girls varsity player driving through defenders");
  await expect(page.locator("[data-gallery-lightbox-title]")).toHaveText("Girls Varsity");
  await expect(page.locator("[data-gallery-lightbox-detail]")).toHaveText("2025-26 season");
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
      photos: [
        {
          id: "approved-rocks-1",
          teamId: "hv-rocks",
          teamName: "HV Rocks",
          division: "Boys Varsity",
          season: "2026-27 season",
          alt: "HV Rocks boys varsity game",
          previewUrl: "https://drive.google.com/thumbnail?id=approved-rocks-1&sz=w600",
          fullUrl: "https://drive.google.com/thumbnail?id=approved-rocks-1&sz=w1600"
        },
        {
          id: "kings-gallery-01",
          teamId: "kings-school",
          teamName: "The King's School",
          division: "Girls Varsity",
          season: "2026-27 season",
          alt: "Duplicate approved photo",
          previewUrl: "https://drive.google.com/thumbnail?id=kings-gallery-01&sz=w600",
          fullUrl: "https://drive.google.com/thumbnail?id=kings-gallery-01&sz=w1600"
        }
      ]
    }
  }));

  await page.goto("/gallery.html");
  const rocksGallery = page.locator('[data-gallery-team="hv-rocks"]');
  await rocksGallery.locator("summary").click();
  await expect(rocksGallery.locator("[data-gallery-count]")).toHaveText("1 photo");
  await expect(rocksGallery.locator('[data-gallery-photo-id="approved-rocks-1"]')).toBeVisible();
  const kingsGallery = page.locator('[data-gallery-team="kings-school"]');
  await expect(kingsGallery.locator("[data-gallery-count]")).toHaveText("13 photos");
  await expect(kingsGallery.locator('[data-gallery-photo-id="kings-gallery-01"]')).toHaveCount(1);
  await expect(kingsGallery.locator('[data-gallery-photo-id="kings-gallery-01"] img')).toHaveAttribute("src", "assets/gallery/optimized/480/kings-gallery-01.webp");

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

test("live placeholders are replaced while confirmed map addresses remain usable", async ({ page }) => {
  const honestFeed = structuredClone(feed);
  honestFeed.teams.find((team) => team.id === "tbd").name = "Team 5";
  const openArms = honestFeed.venues.find((venue) => venue.id === "open-arms");
  openArms.name = "Wilton Baptist - TBD";
  openArms.mapLabel = "Wilton Baptist - TBD";
  await useLiveFeed(page, honestFeed);

  await page.goto("/schedule.html");
  await page.locator("[data-week-select]").selectOption("holiday-week");
  const openSpotGame = page.locator('[data-game-id="ubl-009"]');
  await expect(openSpotGame).toContainText("Open League Spot");
  await expect(openSpotGame).toContainText("Venue details pending");
  await expect(openSpotGame).not.toContainText(/Team 5|TBD|to be confirmed|placeholder/i);
  await expect(openSpotGame.locator('[data-map-address="2714 Curry Rd, Schenectady, NY 12303"]')).toHaveCount(1);
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
  const competitionIllustration = page.locator('.season-stage-standings img[src="assets/ubl/ubl-competition-give-your-best.webp"]');
  const playoffHuddle = page.getByAltText("UBL players and coaches raise their hands together in a team huddle");
  await expect(liveAction).toBeVisible();
  await expect(competitionIllustration).toBeVisible();
  await expect(playoffHuddle).toBeVisible();
  await expect(liveAction).toHaveAttribute("loading", "lazy");
  await expect(competitionIllustration).toHaveAttribute("loading", "lazy");
  await expect(playoffHuddle).toHaveAttribute("loading", "lazy");
  await expect.poll(() => liveAction.evaluate((image) => image.currentSrc)).toMatch(/about-season-02-live-action-(?:768|1600)\.webp$/);
  await expect(competitionIllustration).toHaveAttribute("width", "1536");
  await expect(competitionIllustration).toHaveAttribute("height", "1024");
  await expect.poll(() => competitionIllustration.evaluate((image) => image.currentSrc)).toMatch(/assets\/ubl\/ubl-competition-give-your-best\.webp$/);
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
    const crossPlatformRoundingTolerance = 8;
    expect(quoteBox.y).toBeGreaterThanOrEqual(imageBox.y + imageBox.height - crossPlatformRoundingTolerance);
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

test("sponsorship page moves through three partner views and displays prospective partner categories", async ({ page }, testInfo) => {
  await page.goto("/sponsors.html");

  await expect(page.getByRole("heading", { name: "Put your business courtside." })).toBeVisible();
  const divisionFact = page.locator(".sponsor-facts li").first();
  await divisionFact.scrollIntoViewIfNeeded();
  await expect(divisionFact).toContainText("Two");
  await expect(divisionFact).toContainText("Varsity divisions");
  await expect(page.locator('[data-count-up="10"]')).toHaveCount(0);
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

  const partnerCategories = page.locator(".sponsor-logo-group:not([aria-hidden]) li");
  await expect(partnerCategories).toHaveCount(5);
  await expect(page.locator(".sponsor-logo-group img")).toHaveCount(0);
  await expect(partnerCategories).toContainText(["Local businesses", "Community organizations", "Service partners", "Faith partners", "Event supporters"]);
  const sponsorLogoTrack = page.locator(".sponsor-logo-track");
  await expect(sponsorLogoTrack).toHaveCSS("animation-name", "sponsor-marquee");
  await expect(sponsorLogoTrack).toHaveCSS("animation-play-state", "running");
  if (testInfo.project.name.startsWith("desktop")) {
    const localCategory = partnerCategories.first();
    await localCategory.hover({ force: true });
    await expect(localCategory.locator(".sponsor-category-mark")).toHaveCSS("transform", /matrix/);
    await expect(sponsorLogoTrack).toHaveCSS("animation-play-state", "running");
  }
  await expect(page.locator(".sponsor-sample-note")).toContainText("no organization is shown as a confirmed UBL sponsor");
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(page.locator(".sponsor-footer-bottom")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("public pages expose complete search and social metadata", async ({ page, request }) => {
  const routes = ["index.html", "schedule.html", "standings.html", "teams.html", "team.html?program=hv-rocks&division=boys", "bracket.html", "rules.html", "gallery.html", "sponsors.html", "about.html"];
  for (const route of routes) {
    await page.goto(`/${route}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /UBL|Upstate Basketball League/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\//);
    await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute("content", "image/jpeg");
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1600");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "900");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /Upstate Basketball League/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", /Upstate Basketball League/);
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
  const routes = ["index.html", "schedule.html", "standings.html", "teams.html", "team.html?program=hv-rocks&division=boys", "bracket.html", "rules.html", "gallery.html", "sponsors.html", "about.html", "404.html"];
  for (const route of routes) {
    await page.goto(`/${route}`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, `${route} accessibility violations`).toEqual([]);
  }
});
