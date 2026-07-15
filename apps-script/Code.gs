var SPREADSHEET_ID = "1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE";
var CACHE_KEY = "ubl-public-feed-v1";
var COACH_PORTAL_PROPERTY = "ubl-coach-portal-id";
var COACH_PORTAL_NAME = "UBL Coach Score Entry - 2026-27";
var COACH_PORTAL_EDITORS = ["athletic_director@kingsschool.info"];
var COACH_PORTAL_SHEET = "Coach Score Entry";
var COACH_PORTAL_PROTECTION = "UBL managed coach-entry protection";

function doGet() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(CACHE_KEY);
    if (cached) return jsonOutput_(JSON.parse(cached));

    var payload = buildPublicFeed_();
    var serialized = JSON.stringify(payload);
    cache.put(CACHE_KEY, serialized, 300);
    return jsonOutput_(payload);
  } catch (error) {
    return jsonOutput_({
      schemaVersion: 1,
      error: "Feed unavailable",
      detail: String(error && error.message ? error.message : error)
    });
  }
}

function buildPublicFeed_() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var settingsRows = sheetObjects_(spreadsheet, "Settings");
  var settings = {};
  settingsRows.forEach(function (row) {
    settings[row.Key] = typedSetting_(row.Value);
  });

  var teams = sheetObjects_(spreadsheet, "Teams").map(function (row) {
    return {
      id: text_(row["Team ID"]),
      name: text_(row.Name),
      short: text_(row.Abbreviation),
      logo: text_(row["Logo URL"]),
      divisions: text_(row.Divisions).split("|").filter(Boolean),
      status: text_(row.Status) || "Active",
      summary: text_(row.Notes)
    };
  });

  var venues = sheetObjects_(spreadsheet, "Venues").map(function (row) {
    return {
      id: text_(row["Venue ID"]),
      name: text_(row.Name),
      address: text_(row.Address),
      mapLabel: text_(row["Map Label"]),
      status: text_(row.Status)
    };
  });

  var games = sheetObjects_(spreadsheet, "Games").map(function (row) {
    return {
      id: text_(row["Game ID"]),
      date: dateText_(row.Date, settings.timezone || "America/New_York"),
      time: timeText_(row.Time, settings.timezone || "America/New_York"),
      division: text_(row.Division),
      awayTeamId: text_(row["Away Team ID"]),
      homeTeamId: text_(row["Home Team ID"]),
      awayName: text_(row["Away Display"]),
      homeName: text_(row["Home Display"]),
      venueId: text_(row["Venue ID"]),
      status: text_(row.Status) || "Scheduled",
      awayScore: nullableNumber_(row["Away Score"]),
      homeScore: nullableNumber_(row["Home Score"]),
      stage: text_(row.Stage),
      notes: text_(row.Notes),
      lastUpdated: isoText_(row["Last Updated"]),
      weekId: text_(row["Week ID"])
    };
  });

  validatePublicFeed_(teams, venues, games);
  return {
    schemaVersion: Number(settings.dataVersion || 1),
    lastUpdated: text_(settings.lastUpdated) || new Date().toISOString(),
    settings: settings,
    teams: teams,
    venues: venues,
    games: games
  };
}

function onEdit(event) {
  if (!event || !event.range) return;
  var spreadsheet = event.source;
  var sheet = event.range.getSheet();
  if (sheet.getName() !== "Games" || event.range.getRow() <= 1) return;
  var now = new Date().toISOString();

  sheet.getRange(event.range.getRow(), 15).setValue(now);
  touchPublication_(spreadsheet, now);
}

function installCoachScoreTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "handleCoachScoreEdit") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("handleCoachScoreEdit")
    .forSpreadsheet(SPREADSHEET_ID)
    .onEdit()
    .create();
  SpreadsheetApp.openById(SPREADSHEET_ID).toast("Coach score publishing is active.", "UBL setup", 6);
}

function setupCoachScorePortal() {
  var properties = PropertiesService.getScriptProperties();
  var portalId = properties.getProperty(COACH_PORTAL_PROPERTY);
  var portal = null;

  if (portalId) {
    try {
      portal = SpreadsheetApp.openById(portalId);
    } catch (error) {
      portal = null;
    }
  }

  if (!portal) {
    portal = SpreadsheetApp.create(COACH_PORTAL_NAME);
    portalId = portal.getId();
    properties.setProperty(COACH_PORTAL_PROPERTY, portalId);
  }

  var file = DriveApp.getFileById(portalId);
  COACH_PORTAL_EDITORS.forEach(function (email) {
    file.addEditor(email);
  });

  syncCoachScorePortal_(portal);
  installCoachPortalTrigger_(portalId);
  Logger.log("Coach portal: " + portal.getUrl());
  return portal.getUrl();
}

function syncCoachScorePortal() {
  var portalId = PropertiesService.getScriptProperties().getProperty(COACH_PORTAL_PROPERTY);
  if (!portalId) throw new Error("Run setupCoachScorePortal first.");
  var portal = SpreadsheetApp.openById(portalId);
  syncCoachScorePortal_(portal);
  Logger.log("Coach portal refreshed: " + portal.getUrl());
  return portal.getUrl();
}

function installCoachPortalTrigger_(portalId) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "handleCoachPortalEdit") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("handleCoachPortalEdit")
    .forSpreadsheet(portalId)
    .onEdit()
    .create();
}

function syncCoachScorePortal_(portal) {
  var feed = buildPublicFeed_();
  var teamNames = {};
  feed.teams.forEach(function (team) {
    teamNames[team.id] = team.name;
  });

  var sheet = portal.getSheetByName(COACH_PORTAL_SHEET);
  if (!sheet) {
    sheet = portal.getSheets()[0];
    sheet.setName(COACH_PORTAL_SHEET);
  }

  var existing = {};
  if (sheet.getLastRow() >= 5) {
    sheet.getRange(5, 1, sheet.getLastRow() - 4, 11).getValues().forEach(function (row) {
      if (text_(row[0])) existing[text_(row[0])] = row;
    });
  }

  var rows = feed.games.filter(function (game) {
    return !game.stage && game.awayTeamId && game.homeTeamId;
  }).map(function (game) {
    var prior = existing[game.id] || [];
    var published = game.status === "Final" || game.status === "Forfeit";
    var status = published ? "Published to website" : "Ready";
    if (!published && text_(prior[10]).indexOf("Rejected:") === 0) status = text_(prior[10]);
    return [
      game.id,
      coachPortalDate_(game.date, feed.settings.timezone || "America/New_York"),
      game.time,
      game.division,
      teamNames[game.awayTeamId] || game.awayName,
      teamNames[game.homeTeamId] || game.homeName,
      published ? "" : prior[6] || "",
      published ? "" : prior[7] || "",
      published ? "" : prior[8] || "",
      false,
      status
    ];
  });

  var requiredRows = Math.max(5, rows.length + 4);
  if (sheet.getMaxRows() < requiredRows) sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < 11) sheet.insertColumnsAfter(sheet.getMaxColumns(), 11 - sheet.getMaxColumns());

  sheet.getRange(1, 1, Math.min(2, sheet.getMaxRows()), 11).breakApart();
  sheet.clear();
  sheet.getRange(1, 1, 1, 11).merge().setValue("UBL FINAL SCORE ENTRY");
  sheet.getRange(2, 1, 1, 11).merge().setValue("Enter both final scores and your full name, then check Submit. The website updates within one minute.");
  sheet.getRange(4, 1, 1, 11).setValues([[
    "Game ID", "Date", "Time", "Division", "Away Team", "Home Team",
    "Away Score", "Home Score", "Submitted By", "Submit", "Website Status"
  ]]);
  if (rows.length) sheet.getRange(5, 1, rows.length, 11).setValues(rows);

  var dataRows = Math.max(1, rows.length);
  sheet.getRange(5, 10, dataRows, 1).insertCheckboxes();
  sheet.getRange(5, 7, dataRows, 3).setBackground("#fff4cc");
  sheet.getRange(5, 11, dataRows, 1).setBackground("#fff4cc");
  sheet.getRange(1, 1, 1, 11).setBackground("#020f22").setFontColor("#ffffff").setFontWeight("bold").setFontSize(18).setHorizontalAlignment("center");
  sheet.getRange(2, 1, 1, 11).setBackground("#e9eff7").setFontColor("#08284d").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange(4, 1, 1, 11).setBackground("#020f22").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
  sheet.setFrozenRows(4);
  sheet.hideColumns(1);
  sheet.setColumnWidths(2, 2, 86);
  sheet.setColumnWidths(4, 3, 140);
  sheet.setColumnWidths(7, 2, 84);
  sheet.setColumnWidth(9, 150);
  sheet.setColumnWidth(10, 72);
  sheet.setColumnWidth(11, 160);
  sheet.getRange(5, 2, dataRows, 10).setVerticalAlignment("middle");

  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (protection) {
    if (protection.getDescription() === COACH_PORTAL_PROTECTION) protection.remove();
  });
  var protection = sheet.protect().setDescription(COACH_PORTAL_PROTECTION);
  protection.setUnprotectedRanges([sheet.getRange(5, 7, dataRows, 4)]);
  try {
    protection.removeEditors(protection.getEditors());
    var ownerEmail = Session.getEffectiveUser().getEmail();
    if (ownerEmail) protection.addEditor(ownerEmail);
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  } catch (error) {
    Logger.log("Coach portal protection warning: " + error.message);
  }

  portal.getSheets().forEach(function (otherSheet) {
    if (otherSheet.getSheetId() !== sheet.getSheetId()) portal.deleteSheet(otherSheet);
  });
  SpreadsheetApp.flush();
}

function coachPortalDate_(date, timezone) {
  return Utilities.formatDate(new Date(date + "T12:00:00Z"), timezone, "EEE, MMM d");
}

function handleCoachPortalEdit(event) {
  if (!event || !event.range || !event.source) return;
  var portalId = PropertiesService.getScriptProperties().getProperty(COACH_PORTAL_PROPERTY);
  if (!portalId || event.source.getId() !== portalId) return;
  var range = event.range;
  if (range.getSheet().getName() !== COACH_PORTAL_SHEET) return;
  if (range.getRow() < 5 || range.getColumn() !== 10 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  if (String(event.value).toUpperCase() !== "TRUE") return;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    publishCoachPortalScore_(event.source, range.getRow());
  } finally {
    lock.releaseLock();
  }
}

function publishCoachPortalScore_(portal, rowNumber) {
  var portalSheet = portal.getSheetByName(COACH_PORTAL_SHEET);
  var values = portalSheet.getRange(rowNumber, 1, 1, 11).getValues()[0];
  var gameId = text_(values[0]);
  var awayScore = Number(values[6]);
  var homeScore = Number(values[7]);
  var submittedBy = text_(values[8]);
  var error = coachScoreError_(gameId, values[6], values[7], submittedBy);

  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var gamesSheet = control.getSheetByName("Games");
  var auditSheet = control.getSheetByName("Score Audit");
  var gameRow = findGameRow_(gamesSheet, gameId);
  var gameValues = gameRow ? gamesSheet.getRange(gameRow, 1, 1, 16).getValues()[0] : [];
  if (!error && !gameRow) error = "The selected game could not be found.";
  if (!error && (gameValues[9] === "Final" || gameValues[9] === "Forfeit")) {
    error = "This result is already published. Contact the commissioner to make a correction.";
  }

  if (error) {
    portalSheet.getRange(rowNumber, 10).setValue(false);
    portalSheet.getRange(rowNumber, 11).setValue("Rejected: " + error);
    appendScoreAudit_(auditSheet, gameId, values, awayScore, homeScore, submittedBy, "Rejected: " + error);
    portal.toast(error, "Score not submitted", 8);
    return;
  }

  var now = new Date().toISOString();
  gamesSheet.getRange(gameRow, 10, 1, 3).setValues([["Final", awayScore, homeScore]]);
  gamesSheet.getRange(gameRow, 15).setValue(now);
  touchPublication_(control, now);
  appendScoreAudit_(auditSheet, gameId, values, awayScore, homeScore, submittedBy, "Published from coach portal");
  portalSheet.getRange(rowNumber, 7, 1, 3).clearContent();
  portalSheet.getRange(rowNumber, 10).setValue(false);
  portalSheet.getRange(rowNumber, 11).setValue("Published to website");
  SpreadsheetApp.flush();
  portal.toast("Final score published to the UBL website.", "Score submitted", 8);
}

function publishPendingCoachScores() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var coachSheet = spreadsheet.getSheetByName("Coach Score Entry");
  var lastRow = Math.max(5, coachSheet.getLastRow());
  var submitValues = coachSheet.getRange(5, 10, lastRow - 4, 1).getValues();
  var published = 0;
  submitValues.forEach(function (row, index) {
    if (row[0] === true) {
      publishCoachScore_(spreadsheet, index + 5);
      published += 1;
    }
  });
  spreadsheet.toast(published + " queued score submission(s) processed.", "UBL score queue", 8);
}

function handleCoachScoreEdit(event) {
  if (!event || !event.range) return;
  var range = event.range;
  if (range.getSheet().getName() !== "Coach Score Entry") return;
  if (range.getRow() < 5 || range.getColumn() !== 10 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  if (String(event.value).toUpperCase() !== "TRUE") return;

  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    publishCoachScore_(event.source, range.getRow());
  } finally {
    lock.releaseLock();
  }
}

function publishCoachScore_(spreadsheet, coachRow) {
  var coachSheet = spreadsheet.getSheetByName("Coach Score Entry");
  var gamesSheet = spreadsheet.getSheetByName("Games");
  var auditSheet = spreadsheet.getSheetByName("Score Audit");
  var values = coachSheet.getRange(coachRow, 1, 1, 9).getValues()[0];
  var gameId = text_(values[0]);
  var awayScore = Number(values[6]);
  var homeScore = Number(values[7]);
  var submittedBy = text_(values[8]);

  var error = coachScoreError_(gameId, values[6], values[7], submittedBy);

  var gameRow = findGameRow_(gamesSheet, gameId);
  var gameValues = gameRow ? gamesSheet.getRange(gameRow, 1, 1, 16).getValues()[0] : [];
  if (!error && !gameRow) error = "The selected game could not be found.";
  if (!error && (gameValues[9] === "Final" || gameValues[9] === "Forfeit")) {
    error = "This result is already published. Contact the commissioner to make a correction.";
  }

  if (error) {
    coachSheet.getRange(coachRow, 10).setValue(false);
    appendScoreAudit_(auditSheet, gameId, values, awayScore, homeScore, submittedBy, "Rejected: " + error);
    spreadsheet.toast(error, "Score not submitted", 8);
    return;
  }

  var now = new Date().toISOString();
  gamesSheet.getRange(gameRow, 10, 1, 3).setValues([["Final", awayScore, homeScore]]);
  gamesSheet.getRange(gameRow, 15).setValue(now);
  touchPublication_(spreadsheet, now);
  appendScoreAudit_(auditSheet, gameId, values, awayScore, homeScore, submittedBy, "Published");
  coachSheet.getRange(coachRow, 7, 1, 3).clearContent();
  coachSheet.getRange(coachRow, 10).setValue(false);
  SpreadsheetApp.flush();
  spreadsheet.toast("Final score published to the UBL website.", "Score submitted", 8);
}

function coachScoreError_(gameId, rawAwayScore, rawHomeScore, submittedBy) {
  var awayScore = Number(rawAwayScore);
  var homeScore = Number(rawHomeScore);
  if (!text_(gameId)) return "This game is not available for score entry.";
  if (rawAwayScore === "" || rawHomeScore === "") return "Enter both final scores before submitting.";
  if (!Number.isInteger(awayScore) || !Number.isInteger(homeScore) || awayScore < 0 || homeScore < 0) return "Scores must be whole numbers of 0 or greater.";
  if (awayScore === homeScore) return "A final basketball score cannot be tied.";
  if (!text_(submittedBy)) return "Enter your full name before submitting.";
  return "";
}

function findGameRow_(gamesSheet, gameId) {
  var lastRow = gamesSheet.getLastRow();
  if (lastRow < 2) return 0;
  var ids = gamesSheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (var index = 0; index < ids.length; index += 1) {
    if (ids[index][0] === gameId) return index + 2;
  }
  return 0;
}

function appendScoreAudit_(auditSheet, gameId, coachValues, awayScore, homeScore, submittedBy, outcome) {
  var email = "";
  try {
    email = Session.getActiveUser().getEmail() || "";
  } catch (error) {
    email = "";
  }
  auditSheet.appendRow([
    new Date().toISOString(),
    gameId,
    coachValues[1],
    coachValues[3],
    coachValues[4],
    coachValues[5],
    Number.isFinite(awayScore) ? awayScore : "",
    Number.isFinite(homeScore) ? homeScore : "",
    submittedBy,
    email,
    outcome
  ]);
}

function touchPublication_(spreadsheet, now) {
  now = now || new Date().toISOString();

  var settings = spreadsheet.getSheetByName("Settings");
  var values = settings.getRange(2, 1, Math.max(1, settings.getLastRow() - 1), 1).getValues();
  for (var index = 0; index < values.length; index += 1) {
    if (values[index][0] === "lastUpdated") {
      settings.getRange(index + 2, 2).setValue(now);
      break;
    }
  }
  CacheService.getScriptCache().remove(CACHE_KEY);
}

function sheetObjects_(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error("Missing sheet: " + name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(text_);
  return values.slice(1).filter(function (row) {
    return row.some(function (value) { return value !== ""; });
  }).map(function (row) {
    var object = {};
    headers.forEach(function (header, index) { object[header] = row[index]; });
    return object;
  });
}

function validatePublicFeed_(teams, venues, games) {
  var teamIds = uniqueIds_(teams, "team");
  var venueIds = uniqueIds_(venues, "venue");
  var gameIds = {};
  var validStatuses = { Scheduled: true, Live: true, Final: true, Postponed: true, Cancelled: true, Forfeit: true };

  games.forEach(function (game) {
    if (!game.id || gameIds[game.id]) throw new Error("Duplicate or missing game ID: " + game.id);
    gameIds[game.id] = true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(game.date)) throw new Error(game.id + " has an invalid date.");
    if (game.awayTeamId && !teamIds[game.awayTeamId]) throw new Error(game.id + " has an unknown away team.");
    if (game.homeTeamId && !teamIds[game.homeTeamId]) throw new Error(game.id + " has an unknown home team.");
    if (game.awayTeamId && game.awayTeamId === game.homeTeamId) throw new Error(game.id + " has the same home and away team.");
    if (game.venueId && !venueIds[game.venueId]) throw new Error(game.id + " has an unknown venue.");
    if (!validStatuses[game.status]) throw new Error(game.id + " has an invalid status.");
    if (!game.stage && (!game.awayTeamId || !game.homeTeamId)) throw new Error(game.id + " needs both regular-season teams.");
    if (!game.venueId) throw new Error(game.id + " needs a venue.");
    if (!game.stage) {
      var weekday = new Date(game.date + "T12:00:00Z").getUTCDay();
      if (weekday !== 1 && weekday !== 4) throw new Error(game.id + " must be played on Monday or Thursday.");
    }
    [game.awayScore, game.homeScore].forEach(function (score) {
      if (score !== null && (!isFinite(score) || score < 0 || Math.floor(score) !== score)) {
        throw new Error(game.id + " scores must be nonnegative whole numbers.");
      }
    });
    if ((game.status === "Final" || game.status === "Forfeit") && (game.awayScore === null || game.homeScore === null)) {
      throw new Error(game.id + " needs both final scores.");
    }
    if ((game.status === "Final" || game.status === "Forfeit") && game.awayScore === game.homeScore) {
      throw new Error(game.id + " cannot have a tied final score.");
    }
  });
}

function uniqueIds_(items, label) {
  var ids = {};
  items.forEach(function (item) {
    if (!item.id || ids[item.id]) throw new Error("Duplicate or missing " + label + " ID: " + item.id);
    ids[item.id] = true;
  });
  return ids;
}

function typedSetting_(value) {
  var text = text_(value);
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function nullableNumber_(value) {
  return value === "" || value === null ? null : Number(value);
}

function dateText_(value, timezone) {
  if (value instanceof Date) return Utilities.formatDate(value, timezone, "yyyy-MM-dd");
  return text_(value);
}

function timeText_(value, timezone) {
  if (value instanceof Date) return Utilities.formatDate(value, timezone, "h:mm a");
  return text_(value);
}

function isoText_(value) {
  if (value instanceof Date) return value.toISOString();
  return text_(value);
}

function text_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
