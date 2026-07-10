const { test, expect } = require("@playwright/test");
const feed = require("../../league-data.json");

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

test("homepage uses the shared schedule and continuously moving game ticker", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator("[data-featured-game]")).toContainText("Next league game");
  await expect(page.locator(".score-ticker")).toBeVisible();
  await expect(page.locator(".ticker-track")).toHaveCSS("animation-name", "ticker-scroll");
  await expect(page.locator("[data-freshness]")).toContainText("Schedule updated");
});

test("schedule week, division, and map controls work", async ({ page }) => {
  await page.goto("/schedule.html");
  await page.locator("[data-week-select]").selectOption("week-3");
  await expect(page.locator("[data-week-heading]")).toContainText("Week 3");
  await page.getByRole("button", { name: "Boys Varsity" }).click();
  const rows = page.locator("[data-week-game-list] .game-row");
  await expect(rows).toHaveCount(2);
  for (const row of await rows.all()) await expect(row).toContainText("Boys Varsity");
  await page.getByRole("button", { name: "All games" }).click();
  await page.locator("[data-map-address]").first().click();
  await expect(page.locator(".map-dialog")).toBeVisible();
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
  await page.locator(".team-gallery").first().locator("summary").click();
  await page.locator("[data-gallery-full]").first().click();
  await expect(page.locator(".gallery-lightbox")).toBeVisible();
  await page.getByRole("button", { name: "Close fullscreen photo" }).click();
});

test("completed score updates schedule, standings, and bracket seeds", async ({ page }) => {
  const resultFeed = structuredClone(feed);
  Object.assign(resultFeed.games[0], { status: "Final", awayScore: 41, homeScore: 50 });
  resultFeed.lastUpdated = "2026-12-04T02:00:00.000Z";
  await page.route("**/league-data.json*", (route) => route.fulfill({ json: resultFeed }));

  await page.goto("/schedule.html");
  await expect(page.locator("[data-game-id='ubl-001']")).toContainText("41 - 50");
  await page.goto("/standings.html");
  const firstRow = page.locator("[data-standings-body] tr").first();
  await expect(firstRow).toContainText("The King’s School");
  await expect(firstRow).toContainText("1");
  await page.goto("/bracket.html");
  await expect(page.locator("[data-bracket='Boys Varsity']")).toContainText("The King’s School");
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
