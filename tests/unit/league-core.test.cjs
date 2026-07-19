const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../../league-core.js");
const feed = require("../../league-data.json");

const programs = feed.teams.map((team) => ({ ...team }));

test("published feed is valid", () => {
  assert.deepEqual(core.validateFeed(feed), []);
});

test("feed validation rejects unsafe game state", () => {
  const invalid = structuredClone(feed);
  invalid.games[0].status = "Final";
  invalid.games[0].awayScore = 40;
  invalid.games[0].homeScore = 40;
  assert.match(core.validateFeed(invalid).join(" "), /cannot end tied/);
});

test("feed validation accepts any commissioner-approved game date and enforces score shape", () => {
  const invalid = structuredClone(feed);
  invalid.games[0].date = "2026-12-04";
  invalid.games[0].awayScore = -1;
  const errors = core.validateFeed(invalid).join(" ");
  assert.doesNotMatch(errors, /weekday/i);
  assert.match(errors, /nonnegative whole numbers/);
});

test("current games use a 90-minute window and preserve overlaps", () => {
  const games = [
    { id: "a", date: "2026-12-03", time: "6:00 PM", status: "Scheduled" },
    { id: "b", date: "2026-12-03", time: "6:30 PM", status: "Scheduled" },
    { id: "c", date: "2026-12-03", time: "6:45 PM", status: "Postponed" }
  ];
  const now = Date.parse("2026-12-03T23:45:00Z");
  assert.deepEqual(core.getCurrentGames(games, now, { timezone: "America/New_York", gameDurationMinutes: 90 }).map((game) => game.id), ["b", "a"]);
  const cutoff = Date.parse("2026-12-04T00:30:00Z");
  assert.deepEqual(core.getCurrentGames(games, cutoff, { timezone: "America/New_York", gameDurationMinutes: 90 }).map((game) => game.id), ["b"]);
});

test("standings count finals and apply point differential tiebreaker", () => {
  const teams = [
    { id: "a", name: "Alpha", divisions: ["Boys Varsity"] },
    { id: "b", name: "Bravo", divisions: ["Boys Varsity"] },
    { id: "c", name: "Charlie", divisions: ["Boys Varsity"] }
  ];
  const games = [
    { division: "Boys Varsity", awayId: "b", homeId: "a", awayScore: 40, homeScore: 50, status: "Final", stage: "" },
    { division: "Boys Varsity", awayId: "c", homeId: "b", awayScore: 42, homeScore: 52, status: "Final", stage: "" },
    { division: "Boys Varsity", awayId: "a", homeId: "c", awayScore: 60, homeScore: 45, status: "Final", stage: "" },
    { division: "Boys Varsity", awayId: "a", homeId: "b", awayScore: 10, homeScore: 0, status: "Cancelled", stage: "" }
  ];
  const rows = core.calculateStandings(teams, games, "Boys Varsity");
  assert.equal(rows[0].programId, "a");
  assert.deepEqual(rows.map((row) => [row.wins, row.losses]), [[2, 0], [1, 1], [0, 2]]);
});

test("normalization connects venues, statuses, and new feed teams", () => {
  const fallback = {
    programs: [],
    scheduleWeeks: [{ id: "opening-week", label: "Opening Week", range: "Dec 3", games: [] }],
    scheduleNotice: "Notice"
  };
  const normalized = core.normalizeFeed(feed, fallback);
  assert.equal(normalized.games[0].location, "Perth home court");
  assert.equal(normalized.games[0].status, "Scheduled");
  assert.equal(normalized.programs.length, feed.teams.length);
  assert.ok(normalized.programs[0].teams["Boys Varsity"].headCoach);
});

test("live public profiles override team pages while missing profiles keep bundled data", () => {
  const profileFeed = structuredClone(feed);
  profileFeed.profiles = [{
    id: "kings-school:Boys Varsity",
    teamId: "kings-school",
    division: "Boys Varsity",
    summary: "Live approved summary.",
    representativeEmail: "rep@example.com",
    homeVenueId: "kings-school-gym",
    headCoach: { name: "Live Coach", experience: "Five seasons", photo: "https://example.com/coach.webp" },
    assistants: [{ name: "Live Assistant", experience: "Two seasons", photo: "javascript:alert(1)" }]
  }];
  const fallback = {
    programs: [{
      id: "kings-school",
      name: "The King's School",
      divisions: ["Boys Varsity", "Girls Varsity"],
      summary: "Bundled summary.",
      homeGym: "Bundled gym",
      homeAddress: "Bundled address",
      representativeEmail: "bundled@example.com",
      teams: {
        "Boys Varsity": { headCoach: { name: "Bundled Coach", experience: "", photo: "" }, assistants: [] },
        "Girls Varsity": { headCoach: { name: "Girls Fallback", experience: "", photo: "" }, assistants: [] }
      }
    }],
    scheduleWeeks: []
  };
  const normalized = core.normalizeFeed(profileFeed, fallback);
  const kings = normalized.programs.find((program) => program.id === "kings-school");
  assert.equal(kings.summary, "Live approved summary.");
  assert.equal(kings.representativeEmail, "rep@example.com");
  assert.equal(kings.homeAddress, profileFeed.venues.find((venue) => venue.id === "kings-school-gym").address);
  assert.equal(kings.teams["Boys Varsity"].headCoach.name, "Live Coach");
  assert.equal(kings.teams["Boys Varsity"].assistants[0].photo, "");
  assert.equal(kings.teams["Girls Varsity"].headCoach.name, "Girls Fallback");
});

test("profile validation rejects unknown teams, duplicate rows, and invalid emails", () => {
  const invalid = structuredClone(feed);
  invalid.profiles = [
    { id: "bad", teamId: "unknown", division: "Boys Varsity", representativeEmail: "not-an-email", assistants: [] },
    { id: "bad", teamId: "unknown", division: "Other", assistants: {} }
  ];
  const errors = core.validateFeed(invalid).join(" ");
  assert.match(errors, /unknown profile team/);
  assert.match(errors, /Duplicate profile id/);
  assert.match(errors, /invalid representative email/);
  assert.match(errors, /assistants must be an array/);
});

test("published score CSV safely replaces schedule and result fields", () => {
  const csv = [
    "Game ID,Date,Time,Division,Away Team ID,Home Team ID,Venue ID,Status,Away Score,Home Score,Week ID",
    "ubl-001,2026-12-03,6:00 PM,Boys Varsity,wilton-baptist,kings-school,kings-school-gym,Final,42,51,opening-week",
    'ubl-002,2026-12-03,7:30 PM,Girls Varsity,wilton-baptist,kings-school,kings-school-gym,Scheduled,,,opening-week'
  ].join("\n");
  const scoreGames = core.parseScoreFeedCsv(csv);
  const merged = core.mergeScoreFeed(structuredClone(feed), scoreGames);

  assert.equal(merged.games.length, 2);
  assert.equal(merged.games[0].status, "Final");
  assert.equal(merged.games[0].awayScore, 42);
  assert.equal(merged.games[0].homeScore, 51);
  assert.deepEqual(core.validateFeed(merged), []);
});

test("bracket state advances completed games with assigned participants", () => {
  const teams = [
    { id: "a", name: "Alpha", divisions: ["Boys Varsity"] },
    { id: "b", name: "Bravo", divisions: ["Boys Varsity"] }
  ];
  const games = [
    { division: "Boys Varsity", awayId: "b", homeId: "a", awayScore: 41, homeScore: 50, status: "Final", stage: "Championship" }
  ];
  assert.equal(core.bracketState(teams, games, "Boys Varsity").champion, "a");
});

test("image URLs reject executable schemes", () => {
  assert.equal(core.safeImageUrl("javascript:alert(1)"), "assets/icons/icon-192.png");
});

test("public venue labels replace placeholder language without changing confirmed labels", () => {
  assert.equal(core.publicVenueLabel("Wilton Baptist - TBD"), "Venue details pending");
  assert.equal(core.publicVenueLabel("To be confirmed"), "Venue details pending");
  assert.equal(core.publicVenueLabel("placeholder gym"), "Venue details pending");
  assert.equal(core.publicVenueLabel("Open Arms Church"), "Open Arms Church");
});
