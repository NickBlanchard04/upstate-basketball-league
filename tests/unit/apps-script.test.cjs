const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require.resolve("../../apps-script/Code.gs"), "utf8");
const context = vm.createContext({ console, Number, Date, Math, String, Object, Array, JSON, RegExp, isFinite });
vm.runInContext(source, context);

const gallerySource = fs.readFileSync(require.resolve("../../apps-script/Gallery.gs"), "utf8");
const galleryContext = vm.createContext({ console, Date, JSON, RegExp, encodeURIComponent });
vm.runInContext(gallerySource, galleryContext);

test("coach score validation accepts a complete final result", () => {
  assert.equal(context.coachScoreError_("ubl-001", 41, 50, "Coach Name"), "");
});

test("coach score validation rejects missing, tied, and invalid results", () => {
  assert.match(context.coachScoreError_("ubl-001", "", 50, "Coach Name"), /both final scores/);
  assert.match(context.coachScoreError_("ubl-001", 50, 50, "Coach Name"), /cannot be tied/);
  assert.match(context.coachScoreError_("ubl-001", -1, 50, "Coach Name"), /whole numbers/);
  assert.match(context.coachScoreError_("ubl-001", 41.5, 50, "Coach Name"), /whole numbers/);
  assert.match(context.coachScoreError_("ubl-001", 41, 50, ""), /first and last name/);
  assert.match(context.coachScoreError_("ubl-001", 41, 50, "Coach"), /first and last name/);
});

test("unusual scores require confirmation of the exact score", () => {
  assert.equal(context.coachScoreWarning_(72, 65), "");
  assert.match(context.coachScoreWarning_(131, 65), /above 130/);
  assert.match(context.coachScoreWarning_(101, 20), /margin is above 80/);

  const warning = context.coachScoreWarning_(131, 65);
  const status = context.scoreWarningStatus_(131, 65, warning);
  assert.equal(context.scoreWarningAcknowledged_(status, 131, 65), true);
  assert.equal(context.scoreWarningAcknowledged_(status, 132, 65), false);
});

test("coach portal configuration isolates coach access from the control panel", () => {
  assert.equal(context.COACH_PORTAL_NAME, "UBL Team Score Entry - 2026-27");
  assert.equal(context.COACH_PORTAL_SHEET, "Coach Score Entry");
  assert.equal(context.COMMISSIONER_DASHBOARD_SHEET, "Commissioner Dashboard");
  assert.equal(context.CORRECTIONS_QUEUE_SHEET, "Corrections Queue");
  assert.equal(context.OPERATIONS_ALERTS_SHEET, "Operations Alerts");
  assert.match(source, /activePortalEntries_\(control\)/);
  assert.match(source, /getRange\(5, 3, dataRows, 2\)\.setNumberFormat\("0"\)/);
  assert.doesNotMatch(source, /COACH_PORTAL_EDITORS/);
});

test("verified accounts and team ownership drive portal access", () => {
  assert.equal(context.isVerifiedEmail_("coach@example.com"), true);
  assert.equal(context.isVerifiedEmail_("not-an-email"), false);
  assert.equal(context.portalGameBelongsToTeam_({
    id: "ubl-001",
    weekId: "opening-week",
    awayTeamId: "kings-school",
    homeTeamId: "perth"
  }, "kings-school"), true);
  assert.equal(context.portalGameBelongsToTeam_({
    id: "ubl-001",
    weekId: "opening-week",
    awayTeamId: "kings-school",
    homeTeamId: "perth"
  }, "wilton-baptist"), false);
  assert.equal(context.portalGameBelongsToTeam_({
    id: "pilot-wilton-01",
    weekId: "pilot-test",
    awayTeamId: "kings-school",
    homeTeamId: "wilton-baptist"
  }, "wilton-baptist"), true);
  assert.equal(context.portalGameBelongsToTeam_({
    id: "pilot-wilton-01",
    weekId: "pilot-test",
    awayTeamId: "kings-school",
    homeTeamId: "wilton-baptist"
  }, "kings-school"), false);
});

test("team portals show assigned pilots and only the nearest relevant games", () => {
  const games = [
    { id: "pilot-kings-01", weekId: "pilot-test", date: "2026-07-20", time: "6:00 PM", awayTeamId: "kings-school", homeTeamId: "wilton-baptist" },
    { id: "pilot-wilton-01", weekId: "pilot-test", date: "2026-07-23", time: "7:30 PM", awayTeamId: "wilton-baptist", homeTeamId: "kings-school" },
    { id: "ubl-001", weekId: "opening-week", date: "2026-12-03", time: "6:00 PM", awayTeamId: "wilton-baptist", homeTeamId: "kings-school" },
    { id: "ubl-002", weekId: "opening-week", date: "2026-12-07", time: "6:00 PM", awayTeamId: "kings-school", homeTeamId: "perth" },
    { id: "ubl-003", weekId: "opening-week", date: "2026-12-10", time: "6:00 PM", awayTeamId: "hv-rocks", homeTeamId: "wilton-baptist" }
  ];
  const selected = context.selectPortalGames_(games, "kings-school", new Date("2026-07-17T12:00:00-04:00"));
  assert.deepEqual(Array.from(selected, (game) => game.id), ["pilot-kings-01", "ubl-001", "ubl-002"]);
  assert.equal(context.valueOrBlank_(0), 0);
  assert.equal(context.valueOrBlank_(""), "");
});

test("operations automation installs dashboard, alerts, and backups", () => {
  assert.match(source, /function installOperationsAutomation\(\)/);
  assert.match(source, /function runLeagueHealthCheck\(\)/);
  assert.match(source, /function createDailyControlBackup\(\)/);
  assert.match(source, /function handleCorrectionsQueueEdit_\(event\)/);
  assert.match(source, /function syncOperationsAlerts_\(control, alerts\)/);
  assert.doesNotMatch(source, /MailApp/);
  assert.doesNotMatch(source, /UrlFetchApp/);
  assert.match(source, /publicFeed = buildPublicFeed_\(\)/);
  assert.match(source, /stagedGame = Boolean/);
  assert.match(source, /portalSheet[\s\S]*syncCoachPortalIfConfigured_\(\);[\s\S]*syncCommissionerDashboard_\(\);/);
});

test("backup recovery status applies freshness and drill requirements", () => {
  assert.equal(context.RECOVERY_STATUS_SHEET, "Recovery Status");
  assert.equal(context.recoveryAssessment_(12, 7, true).status, "PASS");
  assert.deepEqual(
    Array.from(context.recoveryAssessment_(31, 7, true).reasons),
    ["Latest backup is older than 30 hours."]
  );
  assert.match(context.recoveryAssessment_(12, null, true).reasons[0], /No successful recovery drill/);
  assert.match(context.recoveryAssessment_(12, 32, true).reasons[0], /older than 31 days/);
  assert.match(context.recoveryAssessment_(12, 7, false).reasons[0], /schema check/);
});

test("recovery drill is isolated from production source tables", () => {
  const drillSource = source.match(/function runBackupRecoveryDrill\(\) \{[\s\S]*?\n\}\n\nfunction createRecoveryCandidateFromLatestBackup/)[0];
  assert.match(drillSource, /backup\.makeCopy\(recoveryCopyName_\(RECOVERY_DRILL_PREFIX/);
  assert.match(drillSource, /drillBook\.getSheetByName\("Games"\)/);
  assert.match(drillSource, /getRange\(gameRow, 5\)\.setValue\("tbd"\)/);
  assert.match(drillSource, /getRange\(gameRow, 11\)\.setValue\(999\)/);
  assert.match(drillSource, /restoreRecoveryCells_\(gamesSheet, gameRow, originalCells\)/);
  assert.match(drillSource, /spreadsheetFingerprint_\(control\) === liveBefore/);
  assert.doesNotMatch(drillSource, /control\.getSheetByName\("(?:Games|Teams|Venues|Settings|Website Feed)"\)/);
  assert.doesNotMatch(drillSource, /setTrashed|deleteFile|clearContents/);
});

test("recovery sheet exposes one-click controls without automatic cutover", () => {
  assert.match(source, /Check backup and recovery status/);
  assert.match(source, /Run isolated recovery drill/);
  assert.match(source, /Create recovery candidate/);
  assert.match(source, /"CHECK STATUS", false, "", "RUN ISOLATED DRILL", false/);
  assert.match(source, /function handleRecoveryStatusEdit_\(event\)/);
  assert.match(source, /sheet\.getName\(\) === RECOVERY_STATUS_SHEET/);
  assert.match(source, /function createRecoveryCandidateFromLatestBackup\(\)/);
  assert.doesNotMatch(source, /function (?:auto|automatic|replace)RestoreLive/i);
});

test("pilot identifiers are isolated by both game ID and pilot week tag", () => {
  assert.equal(context.isPilotIdentifier_("pilot-kings-01", ""), true);
  assert.equal(context.isPilotIdentifier_("renamed-test", "pilot-test"), true);
  assert.equal(context.isPilotIdentifier_("ubl-001", "opening-week"), false);
  assert.equal(context.isPilotSourceRow_({ "Game ID": "pilot-wilton-01", "Week ID": "" }), true);
  assert.equal(context.isPilotGame_({ id: "ubl-002", weekId: "pilot-test" }), true);
});

test("pilot setup installs a two-layer Website Feed exclusion", () => {
  assert.match(source, /LEFT\(Games!A2:A,6\)<>"pilot-"/);
  assert.match(source, /Games!P2:P<>"pilot-test"/);
  assert.match(source, /Private pilot submission/);
  assert.match(source, /Pilot complete - private/);
});

test("pending score publisher processes only checked coach rows", () => {
  const publishedRows = [];
  const toastCalls = [];
  const coachSheet = {
    getLastRow: () => 8,
    getRange: (row, column, rowCount, columnCount) => {
      assert.deepEqual([row, column, rowCount, columnCount], [5, 10, 4, 1]);
      return { getValues: () => [[true], [false], [true], [false]] };
    }
  };
  const spreadsheet = {
    getSheetByName: (name) => {
      assert.equal(name, "Coach Score Entry");
      return coachSheet;
    },
    toast: (...args) => toastCalls.push(args)
  };

  context.SpreadsheetApp = { openById: () => spreadsheet };
  context.publishCoachScore_ = (_spreadsheet, row) => publishedRows.push(row);

  context.publishPendingCoachScores();

  assert.deepEqual(publishedRows, [5, 7]);
  assert.match(toastCalls[0][0], /2 queued score submission/);
});

test("approved gallery feed defines every UBL team and creates safe Drive image URLs", () => {
  assert.equal(galleryContext.GALLERY_FOLDERS.length, 5);
  assert.deepEqual(
    Array.from(galleryContext.GALLERY_FOLDERS, (team) => team.teamId),
    ["kings-school", "perth", "wilton-baptist", "hv-rocks", "hv-flames"]
  );

  const record = galleryContext.galleryPhotoRecord_(
    { teamId: "hv-rocks", teamName: "HV Rocks" },
    "Boys Varsity",
    {
      getId: () => "drive photo 1",
      getDateCreated: () => new Date("2026-12-03T23:00:00.000Z")
    }
  );
  assert.equal(record.teamId, "hv-rocks");
  assert.equal(record.division, "Boys Varsity");
  assert.match(record.previewUrl, /^https:\/\/drive\.google\.com\/thumbnail\?id=drive%20photo%201&sz=w600$/);
  assert.match(record.fullUrl, /&sz=w1600$/);
});

test("pending gallery scan recursively revokes public link access", () => {
  const secured = [];
  const privateFile = {
    getSharingAccess: () => "PRIVATE",
    setSharing: () => assert.fail("private files should not be changed")
  };
  const publicFile = {
    getSharingAccess: () => "ANYONE_WITH_LINK",
    setSharing: (access, permission) => secured.push([access, permission])
  };
  const iterator = (items) => ({
    hasNext: () => items.length > 0,
    next: () => items.shift()
  });
  const child = {
    getFiles: () => iterator([publicFile]),
    getFolders: () => iterator([])
  };
  const root = {
    getFiles: () => iterator([privateFile]),
    getFolders: () => iterator([child])
  };

  galleryContext.DriveApp = {
    Access: { PRIVATE: "PRIVATE" },
    Permission: { VIEW: "VIEW" }
  };
  galleryContext.secureFolderTree_(root);

  assert.deepEqual(secured, [["PRIVATE", "VIEW"]]);
});

test("analytics accepts only known public pages and bounded values", () => {
  assert.equal(galleryContext.analyticsPage_("/schedule.html"), "schedule.html");
  assert.equal(galleryContext.analyticsPage_("https://evil.test"), "");
  assert.equal(galleryContext.analyticsViewport_("390x844"), "390x844");
  assert.equal(galleryContext.analyticsViewport_("390 by 844"), "");
  assert.equal(galleryContext.analyticsNumber_("2500.1234", 120000), 2500.123);
  assert.equal(galleryContext.analyticsNumber_("-1", 120000), "");
  assert.equal(galleryContext.analyticsDevice_("DESKTOP"), "desktop");
  assert.equal(galleryContext.analyticsDevice_("bot"), "unknown");
});
