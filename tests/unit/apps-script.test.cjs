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
  assert.match(context.coachScoreError_("ubl-001", 41, 50, ""), /full name/);
});

test("coach portal configuration isolates coach access from the control panel", () => {
  assert.equal(context.COACH_PORTAL_NAME, "UBL Coach Score Entry - 2026-27");
  assert.deepEqual(Array.from(context.COACH_PORTAL_EDITORS), ["athletic_director@kingsschool.info"]);
  assert.equal(context.COACH_PORTAL_SHEET, "Coach Score Entry");
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
