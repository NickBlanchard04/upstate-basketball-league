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
    ["/schedule.html", "Choose a week"],
    ["/standings.html", "Standings"],
    ["/teams.html", "Meet the teams shaping UBL."],
    ["/teams/hv-rocks-boys.html", "HV Rocks"],
    ["/bracket.html", "Playoff brackets"],
    ["/rules.html", "League standards"],
    ["/gallery.html", "Gallery"],
    ["/news.html", "UBL news, clearly organized."],
    ["/news/2027-playoff-format.html", "UBL outlines separate 2027 varsity playoff brackets"],
    ["/sponsors.html", "Partner with the UBL"],
    ["/about.html", "How a UBL season works"],
    ["/privacy.html", "Website privacy"]
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
  for (const route of ["/schedule.html", "/teams.html", "/teams/hv-rocks-boys.html", "/bracket.html", "/gallery.html", "/news.html", "/sponsors.html", "/about.html"]) {
    await page.goto(route);
    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toMatch(/\bTBD\b|placeholder|to be confirmed|coming soon/i);
  }
});

test("homepage uses the shared schedule and continuously moving game ticker", async ({ page }, testInfo) => {
  await page.goto("/index.html");
  const heroArt = page.locator(".hero-art");
  await expect(heroArt).toHaveAttribute("src", "assets/ubl/ubl-kingdom-impact-homepage-wide.webp");
  const heroMetrics = await heroArt.evaluate((image) => ({
    currentSrc: image.currentSrc,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    renderedWidth: image.getBoundingClientRect().width,
    renderedHeight: image.getBoundingClientRect().height,
  }));
  const expectedHeroAsset = testInfo.project.name.startsWith("mobile")
    ? /assets\/ubl\/ubl-kingdom-impact-homepage-clean-1024\.webp$/
    : /assets\/ubl\/ubl-kingdom-impact-homepage-wide\.webp$/;
  expect(heroMetrics.currentSrc).toMatch(expectedHeroAsset);
  expect(heroMetrics.naturalWidth).toBeGreaterThanOrEqual(Math.ceil(heroMetrics.renderedWidth));
  expect(heroMetrics.naturalHeight).toBeGreaterThanOrEqual(Math.ceil(heroMetrics.renderedHeight));
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
  await expect(page.getByRole("link", { name: "View full standings" })).toBeVisible();
  await expect(page.locator(".bracket-page-banner")).not.toContainText("Boys Varsity and Girls Varsity follow separate five-team paths");
  await expect(page.locator(".bracket-page-banner")).not.toContainText("Two division championships");
  await expect(page.locator(".bracket-directory")).not.toContainText("Preseason order");
  await expect(page.locator(".bracket-directory")).not.toContainText("Watching for first final");
  await expect(page.locator(".bracket-division-links")).toHaveCount(0);
  await expect(page.locator(".bracket-live-section-header")).toHaveCount(0);
  await expect(page.locator("[data-bracket='Boys Varsity']")).toContainText("Winner advances to play Seed 1");
  await expect(page.locator("[data-bracket='Girls Varsity']")).toContainText("Winner advances to play Seed 1");
  await expect(page.locator("[data-bracket]")).toHaveCount(2);
  await expect(page.locator("[data-bracket='Boys Varsity'] .bracket-live-team")).toHaveCount(5);
  await expect(page.locator("[data-bracket='Girls Varsity'] .bracket-live-team")).toHaveCount(5);
  await expect(page.locator("[data-bracket='Boys Varsity'] [data-seed='1']")).toContainText("0-0");
  await expect(page.locator(".bracket-mobile-path")).toHaveCount(2);
  await expect(page.locator(".bracket-mobile-spine")).toHaveCount(2);
  await expect(page.locator(".bracket-mobile-round")).toHaveCount(6);
  await expect(page.locator(".bracket-mobile-finish img")).toHaveCount(2);
  await expect(page.locator(".bracket-mobile-finish img").first()).toHaveAttribute("src", "assets/playoff-brackets/ubl-championship-trophy-exact-cutout.webp");
  await expect(page.locator(".bracket-live-swipe-hint")).toHaveCount(0);
  await expect(page.locator("[data-bracket='Boys Varsity'] [data-mobile-seed='1']")).toContainText("0-0");
  await expect(page.locator("[data-bracket='Boys Varsity']").locator("xpath=ancestor::section")).toHaveAttribute("data-seed-state", "preseason");

  const bracketLayout = await page.evaluate(() => {
    const directory = document.querySelector(".bracket-directory").getBoundingClientRect();
    const section = document.querySelector(".bracket-live-section").getBoundingClientRect();
    const header = document.querySelector(".site-header").getBoundingClientRect();
    const scroller = document.querySelector(".bracket-live-scroller");
    const bracket = document.querySelector(".bracket-live").getBoundingClientRect();
    const heroHeading = document.querySelector(".bracket-page-banner h1").getBoundingClientRect();
    const hero = document.querySelector(".bracket-page-banner").getBoundingClientRect();
    const standingsLink = document.querySelector(".bracket-page-standings-link").getBoundingClientRect();
    const mobilePath = document.querySelector(".bracket-mobile-path");
    const mobileTeam = document.querySelector(".bracket-mobile-team");
    const mobileTrophy = document.querySelector(".bracket-mobile-finish img");
    const desktopArt = document.querySelector(".bracket-live-artboard");
    const viewportCenter = document.documentElement.clientWidth / 2;
    return {
      directoryFillsViewport: Math.abs(directory.x) <= 1 && Math.abs(directory.width - document.documentElement.clientWidth) <= 1,
      sectionSizingMatchesViewport: window.innerWidth < 768 || section.height >= window.innerHeight - header.height - 2,
      horizontalPageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      mobilePathFitsScroller: window.innerWidth >= 768 || scroller.scrollWidth <= scroller.clientWidth + 1,
      mobilePathVisibilityMatchesViewport: window.innerWidth >= 768 || getComputedStyle(mobilePath).display !== "none",
      mobilePosterUsesCourtArtwork: window.innerWidth >= 768 || getComputedStyle(document.body).backgroundImage.includes("mobile-bracket-court.webp"),
      mobileTeamsUseDarkPanels: window.innerWidth >= 768 || getComputedStyle(mobileTeam).backgroundColor.includes("2, 15, 34"),
      mobileTrophyIsRestrained: window.innerWidth >= 768 || mobileTrophy.getBoundingClientRect().width <= 96,
      desktopArtVisibilityMatchesViewport: window.innerWidth < 768 || getComputedStyle(desktopArt).display !== "none",
      mobileHeroIsCompact: window.innerWidth >= 768 || hero.height <= 260,
      heroIsCentered: Math.abs(heroHeading.left + heroHeading.width / 2 - viewportCenter) <= 2,
      standingsLinkIsCentered: Math.abs(standingsLink.left + standingsLink.width / 2 - viewportCenter) <= 2,
      bracketIsCentered: window.innerWidth < 900 || Math.abs(bracket.left + bracket.width / 2 - viewportCenter) <= 2,
      desktopBracketIsCapped: window.innerWidth < 900 || bracket.width <= 1218,
      pageUsesOneBackgroundImage: (getComputedStyle(document.body).backgroundImage.match(/url\(/g) || []).length === 1,
    };
  });
  expect(bracketLayout).toEqual({
    directoryFillsViewport: true,
    sectionSizingMatchesViewport: true,
    horizontalPageOverflow: false,
    mobilePathFitsScroller: true,
    mobilePathVisibilityMatchesViewport: true,
    mobilePosterUsesCourtArtwork: true,
    mobileTeamsUseDarkPanels: true,
    mobileTrophyIsRestrained: true,
    desktopArtVisibilityMatchesViewport: true,
    mobileHeroIsCompact: true,
    heroIsCentered: true,
    standingsLinkIsCentered: true,
    bracketIsCentered: true,
    desktopBracketIsCapped: true,
    pageUsesOneBackgroundImage: true,
  });
});

test("standings background continues through the postseason panel", async ({ page }) => {
  await page.goto("/standings.html");
  await expect(page.locator("main > .division-field")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Five teams. One championship path." })).toBeVisible();

  const coverage = await page.evaluate(() => {
    const main = document.querySelector(".standings-page main");
    const note = document.querySelector(".standings-note");
    const mainRect = main.getBoundingClientRect();
    const noteRect = note.getBoundingClientRect();

    return {
      backgroundImage: getComputedStyle(main).backgroundImage,
      noteInsideMain: noteRect.top >= mainRect.top && noteRect.bottom <= mainRect.bottom,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  expect(coverage.backgroundImage).toContain("ubl-website-hero-1600.webp");
  expect(coverage.noteInsideMain).toBe(true);
  expect(coverage.horizontalOverflow).toBe(false);
});

test("standings removes the lower court graphic and explains desktop stat abbreviations", async ({ page }) => {
  await page.goto("/standings.html");

  await expect(page.locator(".division-title strong, .board-footer, .standings-freshness")).toHaveCount(0);
  const tooltips = page.locator(".stat-tooltip");
  await expect(tooltips).toHaveCount(10);
  await expect(tooltips.first()).toHaveAttribute("aria-describedby", "girls-wl-tooltip");
  await expect(page.locator("#girls-wl-tooltip")).toHaveText("Wins–losses record");
  await expect(page.locator("#girls-diff-tooltip")).toHaveText("Point differential (PF minus PA)");

  const firstTooltip = tooltips.first();
  if (page.viewportSize().width > 880) {
    await firstTooltip.hover();
    await expect(firstTooltip.locator("[role='tooltip']")).toHaveCSS("opacity", "1");
    await firstTooltip.focus();
    await expect(firstTooltip.locator("[role='tooltip']")).toHaveCSS("visibility", "visible");
  } else {
    await expect(firstTooltip.locator("[role='tooltip']")).toHaveCSS("display", "none");
  }
});

test("standings uses the shared site header on desktop and mobile", async ({ page }) => {
  const readHeaderStyle = () => page.evaluate(() => {
    const header = document.querySelector(".site-header");
    const inner = document.querySelector(".header-inner");
    const brand = document.querySelector(".brand");
    const logo = document.querySelector(".brand img");
    const navLink = document.querySelector(".site-nav a");

    return {
      headerHeight: header.getBoundingClientRect().height,
      headerBorder: getComputedStyle(header).borderBottom,
      innerHeight: inner.getBoundingClientRect().height,
      brandFont: getComputedStyle(brand).fontFamily,
      brandSize: getComputedStyle(brand).fontSize,
      logoWidth: logo.getBoundingClientRect().width,
      logoHeight: logo.getBoundingClientRect().height,
      navFont: getComputedStyle(navLink).fontFamily,
      navSize: getComputedStyle(navLink).fontSize,
    };
  });

  await page.goto("/index.html");
  await page.evaluate(() => document.fonts.ready);
  const sharedHeaderStyle = await readHeaderStyle();

  await page.goto("/standings.html");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('link[rel="stylesheet"][href^="styles.css?v="]')).toHaveCount(1);
  await expect(page.locator(".menu-toggle > span:not(.sr-only)")).toHaveCount(3);
  expect(await readHeaderStyle()).toEqual(sharedHeaderStyle);

  if (page.viewportSize().width < 1024) {
    const menuToggle = page.locator(".menu-toggle");
    await expect(menuToggle).toHaveAccessibleName("Open menu");
    await menuToggle.click();
    await expect(menuToggle).toHaveAttribute("aria-expanded", "true");
    await expect(menuToggle).toHaveAccessibleName("Close menu");
  }
});

test("team directory separates each division and opens the right profile", async ({ page }, testInfo) => {
  await page.goto("/teams.html");

  const directory = page.locator("[data-team-directory]");
  const profileIndex = page.locator(".team-profile-index");
  const girlsColumn = page.locator("#girls-division");
  const boysColumn = page.locator("#boys-division");
  const girlsCards = girlsColumn.locator(".division-team-card");
  const boysCards = boysColumn.locator(".division-team-card");

  await expect(directory).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Switch team division" })).toHaveCount(0);
  await expect(page.locator(".division-team-card")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Girls", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Boys", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(profileIndex)[testInfo.project.name.startsWith("desktop") ? "toBeVisible" : "toBeHidden"]();

  await page.getByRole("button", { name: "Girls", exact: true }).click();
  await expect(directory).toBeVisible();
  await expect(girlsCards).toHaveCount(5);
  await expect.poll(() => girlsCards.evaluateAll((cards) => cards.every((card) => card.classList.contains("is-visible")))).toBe(true);
  expect(await girlsCards.evaluateAll((cards) => [...new Set(cards.map((card) => getComputedStyle(card).animationDelay))])).toEqual(["0s"]);
  await expect(boysCards).toHaveCount(0);
  await expect(girlsColumn).toBeVisible();
  await expect(boysColumn).toBeHidden();
  await expect(page.getByRole("button", { name: "Girls", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Boys", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(girlsColumn.locator(".division-heading")).toHaveText("Girls division");
  await expect(girlsColumn.locator(".division-heading > :not(h2), [data-division-count]")).toHaveCount(0);
  await expect(page.locator(".division-team-card img")).toHaveCount(5);
  await expect(girlsColumn.locator('[data-program-card="hv-flames"] img')).toHaveAttribute("src", "assets/icons/icon-192.png");
  await expect(girlsColumn).not.toContainText("Girls Varsity");

  const openSpot = girlsColumn.locator('[data-program-card="tbd"]');
  await expect(openSpot).toHaveAttribute("href", "mailto:Info.upstatebasketballleague@gmail.com?subject=Interested%20in%20joining%20the%20UBL");
  await expect(openSpot).toHaveAccessibleName(/Open UBL program spot in Girls Varsity.*contact the league/);
  await expect(openSpot.locator(".team-card-kicker")).toHaveText("Now recruiting");
  await expect(openSpot.locator(".team-card-logo-stage")).toHaveClass(/team-card-logo-stage-open/);

  const girlsKings = girlsColumn.locator('[data-program-card="kings-school"]');
  await expect(girlsKings).toHaveAttribute("href", "teams/kings-school-girls.html");
  await expect(girlsKings).toHaveAccessibleName(/View team.*The King’s School.*Meet the program/);
  await expect(girlsKings.locator(".team-card-abbr")).toHaveText("TKS");
  await expect(girlsKings.locator(".division-team-card-content")).toHaveCSS("text-align", "center");
  expect(await girlsCards.evaluateAll((cards) => cards.every((card) => !/[\u00e2\u00c2\u00c3\ufffd]/u.test(card.getAttribute("aria-label") || "")))).toBe(true);

  await page.getByRole("button", { name: "Boys", exact: true }).click();
  await expect(girlsColumn).toBeHidden();
  await expect(boysColumn).toBeVisible();
  await expect(page.getByRole("button", { name: "Girls", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Boys", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Girls", exact: true }).click();
  await expect(girlsColumn).toBeVisible();

  if (testInfo.project.name.startsWith("desktop")) {
    await girlsKings.scrollIntoViewIfNeeded();
    await expect(girlsKings).toHaveClass(/is-visible/);
    await girlsKings.hover();
    await expect(girlsKings).toHaveCSS("border-color", "rgb(227, 19, 49)");
    await expect(girlsKings.locator(".team-card-view")).toHaveCSS("background-color", "rgb(227, 19, 49)");
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await girlsKings.click();
  await expect(page).toHaveURL(/teams\/kings-school-girls\.html$/);
  await expect(page.getByRole("heading", { name: "The King’s School", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brodie Farr" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Todd Brown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hudson Waters" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "athletic_director@kingsschool.info" })).toHaveAttribute("href", "mailto:athletic_director@kingsschool.info");

  await page.getByRole("link", { name: "Boys", exact: true }).click();
  await expect(page).toHaveURL(/teams\/kings-school-boys\.html$/);
  await expect(page.getByRole("heading", { name: "Hudson Waters" })).toBeVisible();
  await expect(page.getByAltText("Hudson Waters")).toHaveAttribute("src", "assets/optimized/hudson-waters-192.webp");
  await expect(page.getByRole("heading", { name: "Jacob Fischer" })).toBeVisible();
  await expect(page.getByAltText("Jacob Fischer")).toHaveAttribute("src", "assets/optimized/jacob-fischer-192.webp");
  await expect(page.getByRole("heading", { name: "Brodie Farr" })).toHaveCount(0);
});

test("team profiles expose known venue data and honest missing states", async ({ page }, testInfo) => {
  const isDesktop = testInfo.project.name.startsWith("desktop");
  await page.goto("/teams/hv-rocks-boys.html");
  if (isDesktop) await page.locator('[data-team-section-target="head-coach"]').click();
  await expect(page.getByRole("heading", { name: "Marc Bailey" })).toBeVisible();
  if (isDesktop) await page.locator('[data-team-section-target="assistant-coach"]').click();
  await expect(page.getByRole("heading", { name: "Tim Stuitje" })).toBeVisible();
  if (isDesktop) await page.locator('[data-team-section-target="program"]').click();
  await page.locator('[data-map-address="2714 Curry Rd, Schenectady, NY 12303"]').click();
  await expect(page.locator(".map-dialog")).toContainText("2714 Curry Rd");
  await page.locator("[data-map-dialog-close]").click();
  await expect(page.locator(".map-dialog")).not.toBeVisible();

  await page.goto("/teams/perth-girls.html");
  if (isDesktop) {
    await expect(page.locator(".team-banner-coach").filter({ hasText: "Profile pending" }).first()).toContainText("Profile pending");
    await expect(page.locator(".team-banner-program")).toContainText("Home-court details not yet published");
    await expect(page.locator(".team-banner-program")).toContainText("Public representative email not yet provided");
    await page.locator('[data-team-section-target="program"]').click();
  } else {
    await expect(page.locator(".team-profile-empty")).toContainText("Coaching staff not yet published");
    await expect(page.locator(".team-profile-facts")).toContainText("Home-court details not yet published");
    await expect(page.locator(".team-profile-facts")).toContainText("Public representative email not yet provided");
  }
  await expect(page.getByRole("link", { name: "Ask UBL for the right contact" })).toHaveAttribute("href", /^mailto:Info\.upstatebasketballleague@gmail\.com/);
});

test("team profile keeps the banner camera on desktop and restores the stacked mobile layout", async ({ page }, testInfo) => {
  await page.goto("/teams/kings-school-girls.html");
  const isDesktop = testInfo.project.name.startsWith("desktop");

  if (!isDesktop) {
    await expect(page.locator(".team-profile-hero")).toBeVisible();
    await expect(page.locator(".team-banner")).toHaveCount(0);
    await expect(page.locator(".team-profile-back")).toHaveAttribute("href", "teams.html");
    await expect(page.locator(".team-profile-hero-copy h1")).toContainText("The King");
    await expect(page.getByRole("link", { name: "Girls", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Boys", exact: true })).toHaveAttribute("href", "teams/kings-school-boys.html");
    await expect(page.getByRole("link", { name: "View team gallery", exact: true })).toHaveAttribute("href", "gallery.html?program=kings-school&division=girls#team-album-kings-school");
    await expect(page.getByRole("heading", { name: "Girls varsity coaching staff" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Brodie Farr" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Todd Brown" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Team gallery", exact: true })).toHaveAttribute("href", "gallery.html?program=kings-school&division=girls#team-album-kings-school");
    expect(await page.locator(".team-profile-logo").evaluate((frame) => {
      const image = frame.querySelector("img");
      const frameBounds = frame.getBoundingClientRect();
      const imageBounds = image.getBoundingClientRect();
      return getComputedStyle(image).objectFit === "contain"
        && imageBounds.left >= frameBounds.left - 1
        && imageBounds.right <= frameBounds.right + 1
        && imageBounds.top >= frameBounds.top - 1
        && imageBounds.bottom <= frameBounds.bottom + 1;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    return;
  }

  const programTrigger = page.getByRole("button", { name: "Focus program information banner" });
  const programNav = page.locator('[data-team-section-target="program"]');
  const programDetail = page.locator("#team-banner-program-detail");
  const scene = page.locator("[data-team-banner-scene]");
  const stage = page.locator("[data-team-banner-stage]");
  const lightRig = page.locator("[data-team-banner-light-rig]");
  const backLink = page.getByRole("link", { name: "Back to all teams" });
  const galleryLink = page.locator("[data-team-gallery-link]");
  const galleryNav = page.locator('[data-team-section-target="gallery"]');
  const galleryTrigger = page.getByRole("button", { name: "Focus team gallery banner" });

  await expect(page.getByText("How we win matters", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Kingdom impact", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "All teams", exact: true })).toHaveCount(1);
  await expect(page.locator(".team-banner-toolbar > p")).toHaveCount(0);
  await expect(backLink).toHaveAttribute("href", "teams.html");
  await expect(page.locator(".team-banner")).toHaveCount(6);
  await expect(page.locator(".team-profile-gallery-link")).toHaveCount(0);
  await expect(galleryLink).toHaveAttribute("href", "gallery.html?program=kings-school&division=girls#team-album-kings-school");
  await expect(page.locator(".team-banner-section-track")).not.toContainText(/0[1-6]/);

  expect(await page.locator(".team-banner-logo-lockup").evaluate((frame) => {
    const image = frame.querySelector("img");
    const frameBounds = frame.getBoundingClientRect();
    const imageBounds = image.getBoundingClientRect();
    return getComputedStyle(image).objectFit === "contain"
      && imageBounds.left >= frameBounds.left - 1
      && imageBounds.right <= frameBounds.right + 1;
  })).toBe(true);

  if (testInfo.project.name.startsWith("desktop")) {
    await page.locator('[data-team-section-target="identity"]').click();
    expect(await page.locator('[data-banner-key="identity"]').evaluate((banner) => {
      const wordBounds = banner.querySelector("h1 > span").getBoundingClientRect();
      const suffixBounds = banner.querySelector(".team-banner-name-suffix").getBoundingClientRect();
      return wordBounds.bottom <= suffixBounds.top + 1;
    })).toBe(true);
    await page.keyboard.press("Escape");
    await programTrigger.click();
    await expect(programTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(programNav).toHaveAttribute("aria-pressed", "true");
    await expect(programDetail).toBeVisible();
    await expect(scene).toHaveClass(/is-camera-active/);
    await expect.poll(() => stage.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    await expect(lightRig).toHaveCSS("display", "block");
    await expect.poll(() => page.evaluate(() => {
      const selected = document.querySelector(".team-banner.is-selected").getBoundingClientRect();
      const light = document.querySelector("[data-team-banner-light-rig]").getBoundingClientRect();
      return Math.abs((light.left + light.width / 2) - (selected.left + selected.width / 2));
    })).toBeLessThan(2);
    expect(await page.evaluate(() => {
      const sceneBounds = document.querySelector("[data-team-banner-scene]").getBoundingClientRect();
      const light = document.querySelector("[data-team-banner-light-rig]");
      const lightBounds = light.getBoundingClientRect();
      const beamWidth = Number.parseFloat(getComputedStyle(light, "::after").width);
      const center = lightBounds.left + lightBounds.width / 2;
      return center - beamWidth / 2 >= sceneBounds.left - 1
        && center + beamWidth / 2 <= sceneBounds.right + 1;
    })).toBe(true);
    await programTrigger.click();
    await expect(programTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(scene).toHaveClass(/is-camera-active/);
    await page.keyboard.press("Escape");
    await expect(programTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(scene).not.toHaveClass(/is-camera-active/);
    await expect(page.getByRole("button", { name: "View all banners" })).toBeHidden();
    await galleryNav.click();
    await expect(galleryTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(galleryNav).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#team-banner-gallery-detail")).toBeVisible();
  } else {
    await expect(page.locator('[data-banner-key="identity"]')).toBeVisible();
    await expect(page.locator('[data-banner-key="division"]')).toBeHidden();
    await programNav.click();
    await expect(programNav).toHaveAttribute("aria-pressed", "true");
    await expect(programTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(programDetail).toBeVisible();
    await expect(page.locator("[data-team-banner]:visible")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Next: Team gallery" })).toBeVisible();
    await expect(scene).not.toHaveClass(/is-camera-active/);
    await expect(stage).toHaveCSS("transform", "none");
    await expect(lightRig).toHaveCSS("display", "none");
    await galleryNav.click();
    await expect(galleryTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[data-banner-key="gallery"]')).toBeVisible();
    await expect(page.locator("[data-team-banner]:visible")).toHaveCount(1);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("team Gallery destination opens the matching expanded division album", async ({ page }, testInfo) => {
  await page.goto("/teams/kings-school-girls.html");
  if (testInfo.project.name.startsWith("desktop")) {
    await page.locator('[data-team-section-target="gallery"]').click();
    await expect(page.locator("#team-banner-gallery-detail")).toBeVisible();
    await page.locator("[data-team-gallery-link]").click();
  } else {
    await page.getByRole("link", { name: "View team gallery", exact: true }).click();
  }
  await expect(page).toHaveURL(/gallery\.html\?program=kings-school&division=girls#team-album-kings-school$/);

  const galleryDirectory = page.locator("[data-gallery-directory]");
  const kingsGallery = page.locator('[data-gallery-team="kings-school"]');
  await expect(galleryDirectory).toHaveClass(/is-direct-album/);
  await expect(page.locator(".team-gallery-card-grid")).toBeHidden();
  await expect(kingsGallery).toBeVisible();
  await expect(page.getByRole("button", { name: "Girls", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(kingsGallery.locator('[data-gallery-division="Girls Varsity"]:not([hidden])')).toHaveCount(6);
  await expect(kingsGallery.locator('[data-gallery-division="Boys Varsity"]:not([hidden])')).toHaveCount(0);
  await expect(kingsGallery.getByRole("link", { name: "Back to The King’s School team profile" })).toHaveAttribute("href", "teams/kings-school-girls.html");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("team-album-kings-school");
});

test("team identity banners fit every program name without clipping", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"), "Desktop banner geometry is covered once");
  const profiles = [
    ["kings-school", "girls"],
    ["perth", "girls"],
    ["wilton-baptist", "girls"],
    ["hv-rocks", "boys"],
    ["hv-flames", "girls"]
  ];

  for (const [program, division] of profiles) {
    await page.goto(`/teams/${program}-${division}.html`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-team-section-target="identity"]').click();
    await expect.poll(() => page.locator('[data-banner-key="identity"]').evaluate((banner) => {
      const frame = banner.querySelector("h1").getBoundingClientRect();
      const word = banner.querySelector("h1 > span").getBoundingClientRect();
      const suffix = banner.querySelector(".team-banner-name-suffix").getBoundingClientRect();
      return word.top >= frame.top - 1
        && word.bottom <= frame.bottom + 1
        && word.bottom <= suffix.top + 1;
    })).toBe(true);
  }

});

test("team profile details remain available when reduced motion is requested", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/teams/kings-school-girls.html");
  if (!testInfo.project.name.startsWith("desktop")) {
    await expect(page.locator(".team-profile-hero")).toBeVisible();
    await expect(page.locator(".team-banner")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Brodie Farr" })).toBeVisible();
    return;
  }
  const coachTrigger = page.getByRole("button", { name: "Focus Head coach banner" });
  await page.locator('[data-team-section-target="head-coach"]').click();
  await expect(coachTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#team-banner-head-coach-detail")).toBeVisible();
  await expect(page.locator("[data-team-banner-stage]")).toHaveCSS("transform", "none");
});

test("team cards remain complete when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/teams.html");
  await expect(page.locator("[data-team-directory]")).toBeHidden();
  await page.getByRole("button", { name: "Girls", exact: true }).click();
  const cards = page.locator(".division-team-card");
  await expect(cards).toHaveCount(5);
  expect(await cards.evaluateAll((elements) => elements.every((element) => {
    const style = getComputedStyle(element);
    return style.opacity === "1" && style.animationName === "none";
  }))).toBe(true);
});

test("team cards stay separated across mobile, tablet, and desktop breakpoints", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"), "One browser can cover the responsive breakpoint matrix");
  const widths = [320, 375, 390, 414, 600, 767, 768, 1100, 1279, 1280, 1440];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/teams.html");
    await expect(page.locator("[data-team-directory]")).toBeHidden();
    await expect(page.locator(".division-team-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Boys", exact: true }).click();
    await expect(page.locator("#boys-division .division-team-card")).toHaveCount(5);
    const metrics = await page.evaluate(() => {
      const grid = document.querySelector("#boys-division .division-team-grid");
      const cards = [...grid.querySelectorAll(".division-team-card")];
      const overlaps = cards.flatMap((card) => {
        const cardRect = card.getBoundingClientRect();
        const logoRect = card.querySelector(".team-card-logo-stage").getBoundingClientRect();
        const label = [...card.querySelectorAll(".team-card-abbr, .team-card-kicker, strong")]
          .find((element) => element.getBoundingClientRect().height > 0);
        const labelRect = label.getBoundingClientRect();
        const actionRect = card.querySelector(".division-team-card-content b").getBoundingClientRect();
        const overlapsContent = logoRect.bottom > labelRect.top + 1
          || logoRect.top < cardRect.top - 1
          || actionRect.bottom > cardRect.bottom + 1;
        return overlapsContent ? [{
          card: card.getAttribute("data-program-card"),
          cardBottom: Math.round(cardRect.bottom),
          logoTop: Math.round(logoRect.top),
          logoBottom: Math.round(logoRect.bottom),
          labelTop: Math.round(labelRect.top),
          actionBottom: Math.round(actionRect.bottom)
        }] : [];
      });
      const rowCounts = [...cards.reduce((rows, card) => {
        rows.set(card.offsetTop, (rows.get(card.offsetTop) || 0) + 1);
        return rows;
      }, new Map()).values()];
      const gridRect = grid.getBoundingClientRect();
      const lastCardRect = cards.at(-1).getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        overlaps,
        rowCounts,
        lastCardCentered: Math.abs(
          (lastCardRect.left + lastCardRect.width / 2) - (gridRect.left + gridRect.width / 2)
        ) < 2
      };
    });

    expect(metrics.overflow, `${width}px horizontal overflow`).toBe(false);
    expect(metrics.overlaps, `${width}px logo or action overlap: ${JSON.stringify(metrics.overlaps)}`).toEqual([]);
    const expectedRows = width < 600 || width >= 1024 ? [3, 2] : [2, 2, 1];
    expect(metrics.rowCounts, `${width}px cards per division row`).toEqual(expectedRows);
    if (width >= 600 && width < 1024) expect(metrics.lastCardCentered, `${width}px final card alignment`).toBe(true);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/teams.html");
  await page.getByRole("button", { name: "Girls", exact: true }).click();
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo({ top: document.querySelector(".team-directory").offsetTop + 600, left: 0, behavior: "instant" });
  });
  const mobileMetrics = await page.evaluate(() => ({
    stageOverflow: getComputedStyle(document.querySelector(".teams-stage")).overflow,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    activeDivisionVisible: !document.querySelector("#girls-division").hidden
  }));
  expect(["clip", "hidden"]).toContain(mobileMetrics.stageOverflow);
  expect(mobileMetrics.overflow).toBe(false);
  expect(mobileMetrics.activeDivisionVisible).toBe(true);

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

test("bundled gallery metadata renders responsively and remains interactive", async ({ page }, testInfo) => {
  await page.goto("/gallery.html");
  await expect(page.locator(".gallery-lede")).toHaveCount(0);
  await expect(page.locator("body")).toHaveClass(/gallery-landing-page/);
  await expect(page.getByRole("heading", { name: "Gallery", exact: true })).toBeVisible();
  const galleryDirectory = page.locator("[data-gallery-directory]");
  await expect(galleryDirectory).toBeHidden();
  const galleryOpenSpot = page.locator(".gallery-opportunity");
  await expect(galleryOpenSpot).toContainText("Ready to bring your program into the league?");
  await expect(galleryOpenSpot.getByRole("link", { name: "Start a conversation" })).toHaveAttribute("href", "mailto:Info.upstatebasketballleague@gmail.com?subject=Interested%20in%20joining%20the%20UBL");
  await expect(page.locator("[data-gallery-card]")).toHaveCount(5);
  await expect(page.locator(".team-gallery-card-grid")).toHaveClass(/division-team-grid/);
  const girlsSelector = page.getByRole("button", { name: "Girls", exact: true });
  const boysSelector = page.getByRole("button", { name: "Boys", exact: true });
  await girlsSelector.click();
  await expect(girlsSelector).toHaveAttribute("aria-pressed", "true");
  await expect(galleryDirectory).toBeVisible();
  await expect(page.locator("[data-gallery-card]:visible")).toHaveCount(4);
  await expect(page.locator('[data-gallery-trigger="hv-flames"]')).toBeVisible();
  await expect(page.locator('[data-gallery-trigger="hv-rocks"]')).toBeHidden();
  if (testInfo.project.name === "mobile-chromium") {
    const visibleCards = page.locator("[data-gallery-card]:visible");
    const gridBox = await page.locator(".team-gallery-card-grid").boundingBox();
    const cardBoxes = await Promise.all(Array.from({ length: 4 }, (_, index) => visibleCards.nth(index).boundingBox()));
    expect(gridBox).not.toBeNull();
    cardBoxes.forEach((box) => expect(box).not.toBeNull());
    expect(Math.abs(cardBoxes[0].y - cardBoxes[1].y)).toBeLessThan(8);
    expect(Math.abs(cardBoxes[0].y - cardBoxes[2].y)).toBeLessThan(8);
    expect(Math.abs(cardBoxes[0].width - cardBoxes[1].width)).toBeLessThan(4);
    expect(cardBoxes[0].width).toBeLessThan(gridBox.width * 0.4);
    expect(Math.abs((cardBoxes[3].x + cardBoxes[3].width / 2) - (gridBox.x + gridBox.width / 2))).toBeLessThan(4);
  }
  const kingsGallery = page.locator('[data-gallery-team="kings-school"]');
  const kingsCard = page.locator('[data-gallery-trigger="kings-school"]');
  const bundledPhotos = kingsGallery.locator("[data-gallery-photo-id]");
  const firstPhoto = kingsGallery.locator('[data-gallery-photo-id="kings-gallery-01"]');
  const firstImage = firstPhoto.locator("img");
  await expect(bundledPhotos).toHaveCount(13);
  await expect(kingsGallery.locator("[data-gallery-count]")).toHaveText("13 photos");
  await expect(firstImage).toHaveAttribute("src", "assets/gallery/optimized/480/kings-gallery-01.webp");
  await expect(firstImage).toHaveAttribute("srcset", "assets/gallery/optimized/480/kings-gallery-01.webp 480w, assets/gallery/optimized/960/kings-gallery-01.webp 960w, assets/gallery/kings-gallery-01.jpg 2048w");
  await expect(firstImage).toHaveAttribute("sizes", "(min-width: 1024px) 50vw, (min-width: 640px) 34vw, 50vw");
  await expect(firstImage).toHaveAttribute("width", "480");
  await expect(firstImage).toHaveAttribute("height", "320");
  await expect(firstImage).toHaveAttribute("alt", "King's girls varsity player driving through defenders");
  await expect(kingsCard).toHaveClass(/division-team-card/);
  await expect(kingsCard.locator(".team-card-court")).toHaveCount(1);
  await expect(kingsCard.locator(".team-card-logo-stage img")).toHaveAttribute("src", "assets/optimized/team-kings-school-192.webp");
  await expect(kingsCard.locator(".team-card-abbr")).toHaveText("TKS");
  await expect(kingsCard.locator(".division-team-card-content")).toContainText("13 photos");

  await expect(kingsCard).toHaveAttribute("aria-expanded", "false");
  await expect(kingsGallery).toBeHidden();
  await kingsCard.click();
  await expect(kingsCard).toHaveAttribute("aria-expanded", "true");
  await expect(kingsCard.locator("[data-gallery-action-label]")).toHaveText("Album open");
  await expect(kingsCard.locator("[data-gallery-cta-label]")).toHaveText("Close album");
  await expect(kingsGallery).toBeVisible();
  await kingsCard.click();
  await expect(kingsGallery).toBeHidden();
  await kingsCard.click();
  await expect(kingsGallery).toBeVisible();
  const albumShare = kingsGallery.locator('[data-gallery-share-album="kings-school"]');
  await expect(albumShare).toBeVisible();
  await expect(albumShare).toHaveAccessibleName(/Share The King.s School photo album/);
  if (testInfo.project.name === "mobile-chromium") {
    const shareBox = await albumShare.boundingBox();
    expect(shareBox).not.toBeNull();
    expect(shareBox.width).toBeGreaterThanOrEqual(44);
    expect(shareBox.height).toBeGreaterThanOrEqual(44);
  }
  await boysSelector.click();
  await expect(kingsGallery.locator('[data-gallery-division="Boys Varsity"]:not([hidden])')).toHaveCount(7);
  await expect(kingsGallery.locator('[data-gallery-division="Girls Varsity"]:not([hidden])')).toHaveCount(0);
  await girlsSelector.click();
  await expect(kingsGallery.locator('[data-gallery-division="Girls Varsity"]:not([hidden])')).toHaveCount(6);
  await expect(kingsGallery.locator('[data-gallery-division="Boys Varsity"]:not([hidden])')).toHaveCount(0);

  await firstPhoto.locator("[data-gallery-full]").click();
  await expect(page.locator(".gallery-lightbox")).toBeVisible();
  await expect(page.locator("[data-gallery-lightbox-image]")).toHaveAttribute("src", "assets/gallery/kings-gallery-01.jpg");
  await expect(page.locator("[data-gallery-lightbox-image]")).toHaveAttribute("alt", "King's girls varsity player driving through defenders");
  await expect(page.locator("[data-gallery-lightbox-title]")).toHaveText("Girls Varsity");
  await expect(page.locator("[data-gallery-lightbox-detail]")).toHaveText("2025-26 season");
  await expect(page.locator('[data-gallery-lightbox-x]')).toHaveCount(0);
  await expect(page.getByText("Please share student-athlete photos thoughtfully.")).toHaveCount(0);
  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.locator(".gallery-lightbox-site-header")).toBeVisible();
    await expect(page.locator(".gallery-lightbox-site-header .brand")).toBeVisible();
    await expect(page.locator(".gallery-lightbox-site-header .brand img")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".gallery-lightbox-site-header .site-nav")).toBeVisible();
    await expect(page.locator(".gallery-lightbox-header")).toBeVisible();
    await expect(page.locator(".gallery-lightbox-details")).toBeVisible();
    await expect(page.locator("[data-gallery-lightbox-facebook]")).toBeVisible();
    await expect(page.locator("[data-gallery-lightbox-image]")).toHaveCSS("object-fit", "contain");
    await expect(page.locator("[data-gallery-lightbox-image]")).toHaveCSS("position", "absolute");
    await expect(page.locator("[data-gallery-lightbox-album-count]")).toHaveText("13 photos");
    await expect(page.locator("[data-gallery-lightbox-position]")).toHaveText("1 of 6");
    await expect(page.locator("[data-gallery-lightbox-thumbnail]")).toHaveCount(6);
    await expect(page.locator("[data-gallery-lightbox-thumbnail].is-current img")).toHaveCSS("object-fit", "contain");
    await page.getByRole("button", { name: "View next photo (1 of 6)" }).click();
    await expect(page.locator("[data-gallery-lightbox-image]")).toHaveAttribute("src", "assets/gallery/kings-gallery-02.jpg");
    await expect(page.locator("[data-gallery-lightbox-position]")).toHaveText("2 of 6");
    await page.locator(".gallery-lightbox").press("ArrowRight");
    await expect(page.locator("[data-gallery-lightbox-image]")).toHaveAttribute("src", "assets/gallery/kings-gallery-06.jpg");
    await expect(page.locator("[data-gallery-lightbox-position]")).toHaveText("3 of 6");
  } else {
    await expect(page.locator(".gallery-lightbox-site-header")).toBeHidden();
    await expect(page.locator(".gallery-lightbox-header")).toBeHidden();
    await expect(page.locator(".gallery-lightbox-details")).toBeHidden();
  }
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
  const rocksCard = page.locator('[data-gallery-trigger="hv-rocks"]');
  await page.getByRole("button", { name: "Boys", exact: true }).click();
  await rocksCard.click();
  await expect(rocksGallery.locator("[data-gallery-count]")).toHaveText("1 photo");
  await expect(rocksGallery.locator('[data-gallery-photo-id="approved-rocks-1"]')).toBeVisible();
  const kingsGallery = page.locator('[data-gallery-team="kings-school"]');
  await expect(kingsGallery.locator("[data-gallery-count]")).toHaveText("13 photos");
  await expect(kingsGallery.locator('[data-gallery-photo-id="kings-gallery-01"]')).toHaveCount(1);
  await expect(kingsGallery.locator('[data-gallery-photo-id="kings-gallery-01"] img')).toHaveAttribute("src", "assets/gallery/optimized/480/kings-gallery-01.webp");

  await page.getByRole("button", { name: "Girls", exact: true }).click();
  await expect(rocksCard).toBeHidden();
  await expect(rocksGallery).toBeHidden();
  await page.getByRole("button", { name: "Boys", exact: true }).click();
  await expect(rocksCard).toBeVisible();
  await expect(rocksGallery).toBeHidden();
  await rocksCard.click();
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
  await expect(page.locator("[data-bracket='Boys Varsity'] [data-seed='1']")).toHaveAttribute("data-program-id", "perth");
  await expect(page.locator("[data-bracket='Boys Varsity'] [data-mobile-seed='1']")).toHaveAttribute("data-mobile-program-id", "perth");
  await expect(page.locator("[data-bracket='Boys Varsity']").locator("xpath=ancestor::section")).toHaveAttribute("data-seed-state", "current");
});

test("open bracket refreshes seed positions when a final score is posted", async ({ page }) => {
  await page.goto("/bracket.html");
  await expect(page.locator("[data-bracket='Boys Varsity'] [data-seed='1']")).not.toHaveAttribute("data-program-id", "perth");

  const resultFeed = structuredClone(feed);
  Object.assign(resultFeed.games[0], { status: "Final", awayScore: 41, homeScore: 50 });
  await useLiveFeed(page, resultFeed);
  await page.evaluate(() => window.UBL_RELOAD_DATA());

  await expect(page.locator("[data-bracket='Boys Varsity'] [data-seed='1']")).toHaveAttribute("data-program-id", "perth");
  await expect(page.locator("[data-bracket='Boys Varsity'] [data-mobile-seed='1']")).toHaveAttribute("data-mobile-program-id", "perth");
  await expect(page.locator("[data-bracket='Boys Varsity']").locator("xpath=ancestor::section")).toHaveAttribute("data-seed-state", "current");
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
  expect(requestedUrls.some((url) => /\/about\.js(?:[?#]|$)/.test(url))).toBe(true);
  expect(requestedUrls.some((url) => /\/(?:league-core|data|data-loader|script)\.js(?:[?#]|$)/.test(url))).toBe(false);

  const pageBackground = await page.locator("body.about-page").evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(pageBackground).toContain("ubl-about-playbook-texture.webp");

  const seasonArtwork = page.locator(".season-card-front picture img").first();
  await seasonArtwork.scrollIntoViewIfNeeded();
  const seasonArtworkSource = await seasonArtwork.evaluate((image) => image.currentSrc);
  if (testInfo.project.name.startsWith("mobile")) {
    expect(seasonArtworkSource).toContain("about-season-01-programs-illustrated-768.webp");
    const commitmentBackdrop = page.locator(".commitments-background img");
    await commitmentBackdrop.scrollIntoViewIfNeeded();
    await expect.poll(() => commitmentBackdrop.evaluate((image) => image.currentSrc)).toContain("ubl-kingdom-impact-huddle-768.webp");
  } else {
    expect(seasonArtworkSource).toContain("about-season-01-programs-illustrated-1536.webp");
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

  await expect(page.getByRole("heading", { name: "How a UBL season works" })).toBeVisible();
  await expect(page.locator("main > .season-section")).toHaveCount(1);
  await expect(page.locator(".page-banner, .league-identity")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Built for growing programs." })).toHaveCount(0);
  await expect(page.locator(".league-profile-card")).toHaveCount(3);
  await expect(page.locator(".league-profile-mobile details")).toHaveCount(3);
  await expect(page.locator('.league-profile-card[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".league-profile-grid")).toContainText("Who we are");
  await expect(page.locator(".league-profile-grid")).toContainText("Who we serve");
  await expect(page.locator(".league-profile-grid")).toContainText("Where we play");
  await expect(page.locator("body")).toHaveCSS("background-image", /ubl-about-playbook-texture\.webp/);
  await expect(page.locator(".season-path > li")).toHaveCount(4);
  await expect(page.locator(".season-node")).toHaveCount(4);
  await expect(page.locator(".season-flip-card")).toHaveCount(4);
  await expect(page.locator('.season-flip-card[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".season-ink, .season-number-ink")).toHaveCount(0);
  await expect(page.locator(".lineup-footer")).toHaveCount(0);

  const routeMarkersOverlap = await page.locator(".season-stage").evaluateAll((stages) => stages.some((stage) => {
    const number = stage.querySelector(".season-step").getBoundingClientRect();
    const node = stage.querySelector(".season-node").getBoundingClientRect();
    return !(number.right <= node.left || number.left >= node.right || number.bottom <= node.top || number.top >= node.bottom);
  }));
  expect(routeMarkersOverlap).toBe(false);

  if (testInfo.project.name === "mobile-chromium") {
    await expect(page.locator(".season-mobile-progress")).toBeVisible();
    await expect(page.locator(".season-mobile-count")).toContainText("1 of 4");
    expect(await page.locator(".season-path").evaluate((rail) => rail.scrollWidth > rail.clientWidth)).toBe(true);

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

    await page.locator(".season-path").evaluate((rail) => {
      rail.scrollTo({ left: rail.querySelectorAll(".season-stage")[1].offsetLeft - 16, behavior: "instant" });
    });
    await expect(page.locator(".season-mobile-count")).toContainText("2 of 4");
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
  await expect(page.locator(".season-back-icon")).toHaveCount(0);
  await expect(seasonCards.nth(1).locator(".season-card-back")).toHaveCSS("text-align", "center");

  if (testInfo.project.name === "mobile-chromium") {
    await expect(page.locator(".league-profile-grid")).toBeHidden();
    const profileDetails = page.locator(".league-profile-mobile details");
    await profileDetails.nth(0).locator("summary").click();
    await expect(profileDetails.nth(0)).toHaveAttribute("open", "");
    await expect(profileDetails.nth(0)).toContainText("A structured league that brings faith");
    await profileDetails.nth(1).locator("summary").click();
    await expect(profileDetails.nth(0)).not.toHaveAttribute("open", "");
    await expect(profileDetails.nth(1)).toHaveAttribute("open", "");
    await expect(profileDetails.nth(1)).toContainText("Smaller high school programs competing");

    const pathLinkHeights = await page.locator(".explore-panel a").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    expect(pathLinkHeights.every((height) => height >= 44)).toBe(true);
  } else {
    await expect(page.locator(".league-profile-mobile")).toBeHidden();
    const profileCards = page.locator(".league-profile-card");
    await profileCards.nth(0).click();
    await expect(profileCards.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(profileCards.nth(0).locator(".league-profile-back")).toHaveAttribute("aria-hidden", "false");
    await expect(profileCards.nth(0)).toContainText("A structured league that brings faith");
    await profileCards.nth(1).click();
    await expect(profileCards.nth(0)).toHaveAttribute("aria-pressed", "false");
    await expect(profileCards.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(profileCards.nth(1)).toContainText("Smaller high school programs competing");
    await profileCards.nth(2).click();
    await expect(profileCards.nth(1)).toHaveAttribute("aria-pressed", "false");
    await expect(profileCards.nth(2)).toContainText("Across upstate New York");
    await expect(profileCards.nth(2).locator(".league-profile-back")).toHaveCSS("text-align", "center");
  }

  const programIllustration = page.getByAltText("Illustrated UBL players gathered shoulder-to-shoulder in a pregame huddle");
  const competitionIllustration = page.getByAltText("Illustrated varsity basketball players contesting the opening tip");
  const seedingIllustration = page.getByAltText("Illustrated league standings flowing into a playoff bracket");
  const championshipIllustration = page.getByAltText("Illustrated UBL players and coaches raising their hands together in celebration");
  for (const illustration of [programIllustration, competitionIllustration, seedingIllustration, championshipIllustration]) {
    await expect(illustration).toBeVisible();
    await expect(illustration).toHaveAttribute("loading", "lazy");
    await expect(illustration).toHaveAttribute("width", "768");
    await expect(illustration).toHaveAttribute("height", "512");
  }
  await expect.poll(() => programIllustration.evaluate((image) => image.currentSrc)).toMatch(/about-season-01-programs-illustrated-(?:768|1536)\.webp$/);
  await expect.poll(() => competitionIllustration.evaluate((image) => image.currentSrc)).toMatch(/about-season-02-compete-illustrated-(?:768|1536)\.webp$/);
  await expect.poll(() => seedingIllustration.evaluate((image) => image.currentSrc)).toMatch(/about-season-03-seeding-illustrated-v2-(?:768|1536)\.webp$/);
  await expect.poll(() => championshipIllustration.evaluate((image) => image.currentSrc)).toMatch(/about-season-04-champions-illustrated-(?:768|1536)\.webp$/);

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
  await page.getByRole("button", { name: "Boys", exact: true }).click();
  await page.locator('[data-gallery-trigger="hv-rocks"]').click();
  await expect(rocksGallery.locator(".gallery-skeleton")).toHaveCount(2);
  await expect.poll(() => requests).toBe(1);
  await expect(rocksGallery.locator(".gallery-skeleton")).toHaveCount(0, { timeout: 2000 });

  await page.goto("/schedule.html");
  await page.waitForTimeout(100);
  expect(requests).toBe(1);
});

test("sponsorship page presents a focused partner path and prospective partner categories", async ({ page }, testInfo) => {
  await page.goto("/sponsors.html");

  await expect(page.getByRole("heading", { name: "Partner with the UBL." })).toBeVisible();
  const heroMark = page.locator(".sponsor-hero-lockup img");
  await expect(heroMark).toHaveAttribute("alt", "Upstate Basketball League");
  await expect(page.locator(".sponsor-hero-lockup span")).toHaveCount(0);
  expect(await heroMark.evaluate((mark) => mark.getBoundingClientRect().width)).toBeGreaterThan(80);
  await expect(heroMark).toHaveCSS("filter", /drop-shadow/);
  const supportHeadingOffset = await page.getByRole("heading", { name: "What sponsorship supports" }).evaluate((heading) => {
    const headingRect = heading.getBoundingClientRect();
    const sectionRect = heading.closest(".sponsor-section-inner").getBoundingClientRect();
    return Math.abs((headingRect.left + headingRect.width / 2) - (sectionRect.left + sectionRect.width / 2));
  });
  expect(supportHeadingOffset).toBeLessThan(1);
  const supportItems = page.locator(".sponsor-support-grid article");
  await expect(supportItems).toHaveCount(3);
  await expect(supportItems).toContainText([
    "Championship awards",
    "League operations",
    "Digital league experience"
  ]);
  await expect(page.locator("[data-sponsor-story], .sponsor-option-grid, .sponsor-facts")).toHaveCount(0);
  await expect(page.locator(".sponsor-preview-art > img")).toHaveAttribute(
    "src",
    "assets/ubl/ubl-kingdom-impact-huddle.webp"
  );
  await expect(page.getByRole("heading", { name: "Sponsor visibility" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a conversation" })).toHaveAttribute(
    "href",
    "mailto:Info.upstatebasketballleague@gmail.com?subject=UBL%20Sponsorship%20Inquiry"
  );

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
  const routes = ["index.html", "schedule.html", "standings.html", "teams.html", "teams/hv-rocks-boys.html", "bracket.html", "rules.html", "gallery.html", "news.html", "news/2027-playoff-format.html", "sponsors.html", "about.html"];
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

test("analytics stays off until consent and then sends only bounded anonymous league data", async ({ page }) => {
  await page.route("**/config.js*", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.UBL_CONFIG = {
      analyticsEndpoint: "https://script.google.com/macros/s/AKfycbyLkMwVxtgJugNRvBmEApHvCOwsGC4fNn8EqArGUnPaVZosyQbN-VYIDOna3SkQ3kA7/exec",
      analyticsChannel: "ubl-public-v1",
      analyticsEnabled: true,
      googleAnalyticsMeasurementId: "G-E7W3TG2NR8",
      analyticsAllowedHosts: ["127.0.0.1"],
      staticFeedUrl: "league-data.json",
      refreshMinutes: 1
    };`
  }));
  await page.route("https://www.googletagmanager.com/**", (route) => route.fulfill({
    contentType: "application/javascript",
    body: ""
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
  const consent = page.getByRole("dialog", { name: "Help improve the UBL site" });
  await expect(consent).toBeVisible();
  await expect(consent.getByRole("button", { name: "Allow analytics" })).toBeVisible();
  await expect(consent.getByRole("button", { name: "No thanks" })).toBeVisible();
  const consentBox = await consent.boundingBox();
  const viewport = page.viewportSize();
  expect(consentBox.height).toBeLessThanOrEqual(viewport.width <= 480 ? 210 : 175);
  for (const label of ["Allow analytics", "No thanks"]) {
    const buttonBox = await consent.getByRole("button", { name: label }).boundingBox();
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  }
  await page.waitForTimeout(500);
  expect(analyticsBody).toBe("");
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);

  await consent.getByRole("button", { name: "Allow analytics" }).click();
  await expect.poll(() => analyticsBody, { timeout: 4000 }).toContain("event=pageview");
  await expect(consent).toBeHidden();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("ubl-analytics-consent-v1"))).toBe("granted");
  const params = new URLSearchParams(analyticsBody);
  expect(params.get("page")).toBe("schedule.html");
  expect(params.get("device")).toMatch(/mobile|desktop/);
  expect(params.get("viewport")).toMatch(/^\d+x\d+$/);
  expect(params.has("email")).toBe(false);
  expect(params.has("name")).toBe(false);
  expect(await page.context().cookies()).toEqual([]);

  await page.goto("/privacy.html");
  await expect(page.locator("[data-consent-status]")).toContainText("currently allow");
  await expect(page.getByRole("dialog", { name: "Help improve the UBL site" })).toHaveCount(0);
});

test("declining analytics persists without loading tracking", async ({ page }) => {
  await page.route("**/config.js*", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.UBL_CONFIG = {
      analyticsEndpoint: "https://script.google.com/macros/s/AKfycbyLkMwVxtgJugNRvBmEApHvCOwsGC4fNn8EqArGUnPaVZosyQbN-VYIDOna3SkQ3kA7/exec",
      analyticsEnabled: true,
      googleAnalyticsMeasurementId: "G-E7W3TG2NR8",
      analyticsAllowedHosts: ["127.0.0.1"]
    };`
  }));
  await page.unroute(galleryFeedUrlPattern);
  let analyticsPosts = 0;
  await page.route(galleryFeedUrlPattern, async (route) => {
    if (route.request().method() === "POST") analyticsPosts += 1;
    await route.fulfill({ json: { accepted: true, schemaVersion: 1, photos: [] } });
  });

  await page.goto("/index.html");
  const consent = page.getByRole("dialog", { name: "Help improve the UBL site" });
  await consent.getByRole("button", { name: "No thanks" }).click();
  await page.waitForTimeout(600);
  expect(analyticsPosts).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("ubl-analytics-consent-v1"))).toBe("denied");
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("dialog", { name: "Help improve the UBL site" })).toHaveCount(0);
  await page.goto("/privacy.html");
  await expect(page.locator("[data-consent-status]")).toContainText("currently decline");
  await page.getByRole("button", { name: "Review privacy choices" }).click();
  await expect(page.getByRole("dialog", { name: "Help improve the UBL site" })).toBeVisible();
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
  await expect(page.getByRole("dialog", { name: "Help improve the UBL site" })).toHaveCount(0);
});

test("public routes have no automatic WCAG A or AA violations", async ({ page }) => {
  const routes = ["index.html", "schedule.html", "standings.html", "teams.html", "teams/hv-rocks-boys.html", "bracket.html", "rules.html", "gallery.html", "news.html", "news/2027-playoff-format.html", "sponsors.html", "about.html", "privacy.html", "404.html"];
  for (const route of routes) {
    await page.goto(`/${route}`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, `${route} accessibility violations`).toEqual([]);
  }
});
