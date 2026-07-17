var SPREADSHEET_ID = "1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE";
var CACHE_KEY = "ubl-public-feed-v1";
var COACH_PORTAL_PROPERTY = "ubl-coach-portal-id";
var TEAM_PORTAL_INDEX_PROPERTY = "ubl-team-portal-index";
var COACH_PORTAL_NAME = "UBL Team Score Entry - 2026-27";
var COACH_PORTAL_SHEET = "Coach Score Entry";
var CORRECTION_REQUEST_SHEET = "Correction Request";
var COACH_PORTAL_PROTECTION = "UBL managed coach-entry protection";
var COMMISSIONER_DASHBOARD_SHEET = "Commissioner Dashboard";
var CORRECTIONS_QUEUE_SHEET = "Corrections Queue";
var OPERATIONS_ALERTS_SHEET = "Operations Alerts";
var BACKUP_FOLDER_NAME = "UBL Automated Backups";
var HEALTH_ALERT_PROPERTY = "ubl-health-alert-fingerprint";
var PILOT_GAME_PREFIX = "pilot-";
var PILOT_WEEK_ID = "pilot-test";
var PILOT_GAME_IDS = ["pilot-kings-01", "pilot-wilton-01"];
var PILOT_PORTAL_ASSIGNMENTS = {
  "pilot-kings-01": "kings-school",
  "pilot-wilton-01": "wilton-baptist"
};
var PORTAL_PAST_DAYS = 2;
var PORTAL_FUTURE_DAYS = 8;
var PORTAL_FALLBACK_GAMES = 4;
var UNUSUAL_SCORE_LIMIT = 130;
var UNUSUAL_MARGIN_LIMIT = 80;

function doGet() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(CACHE_KEY);
    if (cached) return jsonOutput_(JSON.parse(cached));

    var payload = buildPublicFeed_();
    var serialized = JSON.stringify(payload);
    cache.put(CACHE_KEY, serialized, 60);
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
  return buildLeagueFeed_(false);
}

function buildCoachFeed_() {
  return buildLeagueFeed_(true);
}

function buildLeagueFeed_(includePilotGames) {
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

  var games = sheetObjects_(spreadsheet, "Games").filter(function (row) {
    return includePilotGames || !isPilotSourceRow_(row);
  }).map(function (row) {
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

function handleControlGameEdit(event) {
  if (!event || !event.range) return;
  var spreadsheet = event.source;
  var sheet = event.range.getSheet();
  if (sheet.getName() === COMMISSIONER_DASHBOARD_SHEET) {
    handleCommissionerDashboardEdit_(event);
    return;
  }
  if (sheet.getName() === CORRECTIONS_QUEUE_SHEET) {
    handleCorrectionsQueueEdit_(event);
    return;
  }
  if (sheet.getName() !== "Games" || event.range.getRow() <= 1) return;
  var now = new Date().toISOString();

  sheet.getRange(event.range.getRow(), 15).setValue(now);
  var gameId = sheet.getRange(event.range.getRow(), 1).getDisplayValue();
  var weekId = sheet.getRange(event.range.getRow(), 16).getDisplayValue();
  if (!isPilotIdentifier_(gameId, weekId)) touchPublication_(spreadsheet, now);
  syncCommissionerDashboard_();
  syncCoachPortalIfConfigured_();
}

function installControlPanelTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "handleControlGameEdit") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("handleControlGameEdit")
    .forSpreadsheet(SPREADSHEET_ID)
    .onEdit()
    .create();
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
  return syncAccessAndCoachPortals();
}

function syncCoachScorePortal() {
  return syncAccessAndCoachPortals();
}

function syncAccessAndCoachPortals() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var entries = activePortalEntries_(control);
  var teams = teamRecordsById_(control);
  var properties = PropertiesService.getScriptProperties();
  var portalIndex = teamPortalIndex_();
  var legacyPortalId = properties.getProperty(COACH_PORTAL_PROPERTY);
  var activePortalIds = [];
  var urls = {};

  entries.forEach(function (entry) {
    var team = teams[entry.teamId];
    if (!team) throw new Error("Access Roster has an unknown Team ID: " + entry.teamId);
    var portalId = portalIndex[entry.teamId];
    if (!portalId && entry.teamId === "kings-school" && legacyPortalId) portalId = legacyPortalId;
    var portal = openSpreadsheetOrNull_(portalId);
    if (!portal) {
      portal = SpreadsheetApp.create("UBL " + team.name + " Score Entry - 2026-27");
      portalId = portal.getId();
    }
    portalIndex[entry.teamId] = portalId;
    if (entry.teamId === "kings-school") properties.setProperty(COACH_PORTAL_PROPERTY, portalId);
    DriveApp.getFileById(portalId).setName("UBL " + team.name + " Score Entry - 2026-27");
    syncTeamPortalEditors_(portalId, entry.emails);
    syncCoachScorePortal_(portal, entry, team);
    activePortalIds.push(portalId);
    urls[entry.teamId] = portal.getUrl();
    writeAccessRosterPortalUrl_(control, entry.rowNumbers, portal.getUrl());
  });

  Object.keys(portalIndex).forEach(function (teamId) {
    if (urls[teamId]) return;
    var inactivePortal = openSpreadsheetOrNull_(portalIndex[teamId]);
    if (inactivePortal) syncTeamPortalEditors_(inactivePortal.getId(), []);
  });

  saveTeamPortalIndex_(portalIndex);
  installCoachPortalTriggers_(activePortalIds);
  installControlPanelTrigger_();
  syncCommissionerDashboard_();
  Logger.log("Team coach portals refreshed: " + JSON.stringify(urls));
  return urls;
}

function installCoachPortalTriggers_(portalIds) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "handleCoachPortalEdit") ScriptApp.deleteTrigger(trigger);
  });
  portalIds.forEach(function (portalId) {
    ScriptApp.newTrigger("handleCoachPortalEdit")
      .forSpreadsheet(portalId)
      .onEdit()
      .create();
  });
}

function syncCoachScorePortal_(portal, entry, team) {
  var feed = buildCoachFeed_();
  var teamNames = {};
  feed.teams.forEach(function (feedTeam) {
    teamNames[feedTeam.id] = feedTeam.name;
  });

  var sheet = portal.getSheetByName(COACH_PORTAL_SHEET);
  if (!sheet) {
    sheet = portal.getSheets()[0];
    sheet.setName(COACH_PORTAL_SHEET);
  }

  var existing = coachPortalExistingRows_(sheet);
  var portalGames = selectPortalGames_(feed.games, entry.teamId, new Date());

  var rows = portalGames.map(function (game) {
    var prior = existing[game.id] || {};
    var published = game.status === "Final" || game.status === "Forfeit";
    var pilot = isPilotGame_(game);
    var status = pilot
      ? (published ? "Pilot complete - private" : "Pilot ready - private")
      : (published ? "Published to website" : "Ready");
    if (!published && /^(Rejected:|Review )/.test(text_(prior.status))) status = text_(prior.status);
    var gameLabel = (pilot ? "PILOT TEST\n" : "")
      + coachPortalDate_(game.date, feed.settings.timezone || "America/New_York")
      + " - " + game.time + "\n"
      + game.division + "\n"
      + (game.awayName || teamNames[game.awayTeamId]) + " vs " + (game.homeName || teamNames[game.homeTeamId]);
    return [
      game.id,
      gameLabel,
      published ? "" : valueOrBlank_(prior.awayScore),
      published ? "" : valueOrBlank_(prior.homeScore),
      false,
      status,
      entry.person
    ];
  });

  var requiredRows = Math.max(5, rows.length + 4);
  if (sheet.getMaxRows() < requiredRows) sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < 7) sheet.insertColumnsAfter(sheet.getMaxColumns(), 7 - sheet.getMaxColumns());

  sheet.showColumns(1, sheet.getMaxColumns());
  sheet.getRange(1, 1, Math.min(2, sheet.getMaxRows()), sheet.getMaxColumns()).breakApart();
  sheet.clear();
  sheet.getRange(1, 1, 1, 7).merge().setValue("UBL " + team.name.toUpperCase() + " SCORE ENTRY");
  sheet.getRange(2, 1, 1, 7).merge().setValue("Enter the away and home final scores, then check Submit. Your name is recorded automatically.");
  sheet.getRange(4, 1, 1, 7).setValues([[
    "Game ID", "GAME", "AWAY", "HOME", "SUBMIT", "STATUS", "Submitted By"
  ]]);
  if (rows.length) sheet.getRange(5, 1, rows.length, 7).setValues(rows);

  var dataRows = Math.max(1, rows.length);
  sheet.getRange(5, 5, dataRows, 1).insertCheckboxes();
  sheet.getRange(5, 3, dataRows, 2).setNumberFormat("0");
  sheet.getRange(5, 3, dataRows, 3).setBackground("#fff4cc");
  sheet.getRange(5, 6, dataRows, 1).setBackground("#fff4cc");
  sheet.getRange(1, 1, 1, 7).setBackground("#020f22").setFontColor("#ffffff").setFontWeight("bold").setFontSize(18).setHorizontalAlignment("center");
  sheet.getRange(2, 1, 1, 7).setBackground("#e9eff7").setFontColor("#08284d").setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
  sheet.getRange(4, 1, 1, 7).setBackground("#020f22").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
  sheet.setFrozenRows(4);
  sheet.hideColumns(1);
  sheet.hideColumns(7);
  sheet.setColumnWidth(2, 205);
  sheet.setColumnWidths(3, 2, 62);
  sheet.setColumnWidth(5, 62);
  sheet.setColumnWidth(6, 155);
  sheet.getRange(5, 2, dataRows, 5).setVerticalAlignment("middle").setWrap(true);
  sheet.setRowHeights(5, dataRows, 76);
  rows.forEach(function (row, index) {
    if (!isPilotIdentifier_(row[0], "")) return;
    sheet.getRange(index + 5, 2).setBackground("#e9eff7").setFontWeight("bold");
    sheet.getRange(index + 5, 6).setBackground("#d9ead3").setFontColor("#0c591e").setFontWeight("bold");
  });

  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (protection) {
    if (protection.getDescription() === COACH_PORTAL_PROTECTION) protection.remove();
  });
  var protection = sheet.protect().setDescription(COACH_PORTAL_PROTECTION).setWarningOnly(false);
  protection.setUnprotectedRanges([sheet.getRange(5, 3, dataRows, 3)]);
  try {
    var ownerEmail = Session.getEffectiveUser().getEmail();
    var removableEditors = protection.getEditors().filter(function (editor) {
      return editor.getEmail() !== ownerEmail;
    });
    if (removableEditors.length) protection.removeEditors(removableEditors);
    if (ownerEmail) protection.addEditor(ownerEmail);
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  } catch (error) {
    Logger.log("Coach portal protection warning: " + error.message);
  }

  syncCorrectionRequestSheet_(portal, entry, team, feed, teamNames);
  SpreadsheetApp.flush();
}

function coachPortalDate_(date, timezone) {
  return Utilities.formatDate(new Date(date + "T12:00:00Z"), timezone, "EEE, MMM d, yyyy");
}

function valueOrBlank_(value) {
  return value === 0 || value ? value : "";
}

function isVerifiedEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text_(value));
}

function ensureAccessRosterSchema_(control) {
  var sheet = control.getSheetByName("Access Roster");
  if (!sheet) throw new Error("Missing sheet: Access Roster");
  var headers = [
    "Role", "Person", "Program", "Google account / email", "Access level", "Status",
    "Last verified", "Operational responsibility", "Team ID", "Invite sent",
    "Access tested", "Pilot completed", "Ready for rollout", "Portal URL"
  ];
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#020f22")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setWrap(true);
  sheet.setFrozenRows(1);
  return sheet;
}

function activePortalEntries_(control) {
  var sheet = ensureAccessRosterSchema_(control);
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getDisplayValues();
  var grouped = {};
  values.forEach(function (row, index) {
    var accessLevel = text_(row[4]).toLowerCase();
    var status = text_(row[5]).toLowerCase();
    var email = text_(row[3]).toLowerCase();
    var teamId = text_(row[8]);
    if (accessLevel.indexOf("coach score portal editor") === -1) return;
    if (status !== "active" || !isVerifiedEmail_(email) || !teamId) return;
    if (!grouped[teamId]) {
      grouped[teamId] = {
        teamId: teamId,
        person: text_(row[1]),
        emails: [],
        rowNumbers: []
      };
    }
    grouped[teamId].emails.push(email);
    grouped[teamId].rowNumbers.push(index + 2);
  });
  return Object.keys(grouped).map(function (teamId) {
    var uniqueEmails = {};
    grouped[teamId].emails.forEach(function (email) { uniqueEmails[email] = true; });
    grouped[teamId].emails = Object.keys(uniqueEmails);
    return grouped[teamId];
  });
}

function teamRecordsById_(control) {
  var teams = {};
  sheetObjects_(control, "Teams").forEach(function (row) {
    var id = text_(row["Team ID"]);
    if (!id) return;
    teams[id] = { id: id, name: text_(row.Name), short: text_(row.Abbreviation) };
  });
  return teams;
}

function teamPortalIndex_() {
  var raw = PropertiesService.getScriptProperties().getProperty(TEAM_PORTAL_INDEX_PROPERTY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch (error) {
    return {};
  }
}

function saveTeamPortalIndex_(index) {
  PropertiesService.getScriptProperties().setProperty(TEAM_PORTAL_INDEX_PROPERTY, JSON.stringify(index || {}));
}

function openSpreadsheetOrNull_(spreadsheetId) {
  if (!spreadsheetId) return null;
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    Logger.log("Unable to open spreadsheet " + spreadsheetId + ": " + error.message);
    return null;
  }
}

function syncTeamPortalEditors_(portalId, desiredEmails) {
  var file = DriveApp.getFileById(portalId);
  var ownerEmail = "";
  try {
    ownerEmail = file.getOwner().getEmail().toLowerCase();
  } catch (error) {
    ownerEmail = Session.getEffectiveUser().getEmail().toLowerCase();
  }
  var desired = {};
  (desiredEmails || []).forEach(function (email) {
    email = text_(email).toLowerCase();
    if (isVerifiedEmail_(email) && email !== ownerEmail) desired[email] = true;
  });
  Object.keys(desired).forEach(function (email) {
    file.addEditor(email);
  });
  file.getEditors().forEach(function (editor) {
    var email = editor.getEmail().toLowerCase();
    if (email !== ownerEmail && !desired[email]) {
      try {
        file.removeEditor(email);
      } catch (error) {
        Logger.log("Unable to remove portal editor " + email + ": " + error.message);
      }
    }
  });
}

function writeAccessRosterPortalUrl_(control, rowNumbers, portalUrl) {
  var sheet = ensureAccessRosterSchema_(control);
  (Array.isArray(rowNumbers) ? rowNumbers : [rowNumbers]).forEach(function (rowNumber) {
    if (rowNumber < 2) return;
    sheet.getRange(rowNumber, 14).setValue(portalUrl);
    if (!text_(sheet.getRange(rowNumber, 10).getDisplayValue())) {
      sheet.getRange(rowNumber, 10).setValue(Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd"));
    }
  });
}

function portalConfigById_(portalId) {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var entries = activePortalEntries_(control);
  var index = teamPortalIndex_();
  var legacyPortalId = PropertiesService.getScriptProperties().getProperty(COACH_PORTAL_PROPERTY);
  for (var i = 0; i < entries.length; i += 1) {
    var entryPortalId = index[entries[i].teamId] || (entries[i].teamId === "kings-school" ? legacyPortalId : "");
    if (entryPortalId === portalId) return entries[i];
  }
  return null;
}

function coachPortalExistingRows_(sheet) {
  var existing = {};
  if (!sheet || sheet.getLastRow() < 5) return existing;
  var lastColumn = Math.max(7, sheet.getLastColumn());
  var headers = sheet.getRange(4, 1, 1, lastColumn).getDisplayValues()[0].map(function (value) {
    return text_(value).toLowerCase();
  });
  function columnIndex(names, fallback) {
    for (var i = 0; i < names.length; i += 1) {
      var index = headers.indexOf(names[i]);
      if (index >= 0) return index;
    }
    return fallback;
  }
  var idIndex = columnIndex(["game id"], 0);
  var awayIndex = columnIndex(["away", "away score"], 2);
  var homeIndex = columnIndex(["home", "home score"], 3);
  var statusIndex = columnIndex(["status", "website status"], 5);
  var values = sheet.getRange(5, 1, sheet.getLastRow() - 4, lastColumn).getValues();
  values.forEach(function (row) {
    var id = text_(row[idIndex]);
    if (!id) return;
    existing[id] = { awayScore: row[awayIndex], homeScore: row[homeIndex], status: text_(row[statusIndex]) };
  });
  return existing;
}

function gameTimestamp_(game) {
  var match = text_(game.time).match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  var date = new Date(text_(game.date) + "T12:00:00");
  if (!match || isNaN(date.getTime())) return date.getTime();
  var hour = Number(match[1]) % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  date.setHours(hour, Number(match[2]), 0, 0);
  return date.getTime();
}

function portalGameBelongsToTeam_(game, teamId) {
  if (!game || !teamId) return false;
  if (isPilotIdentifier_(game.id, game.weekId)) return PILOT_PORTAL_ASSIGNMENTS[game.id] === teamId;
  return game.awayTeamId === teamId || game.homeTeamId === teamId;
}

function selectPortalGames_(games, teamId, now) {
  var nowTime = (now || new Date()).getTime();
  var pastLimit = nowTime - PORTAL_PAST_DAYS * 86400000;
  var futureLimit = nowTime + PORTAL_FUTURE_DAYS * 86400000;
  var teamGames = (games || []).filter(function (game) {
    return portalGameBelongsToTeam_(game, teamId);
  }).sort(function (a, b) {
    return gameTimestamp_(a) - gameTimestamp_(b);
  });
  var pilots = teamGames.filter(isPilotGame_);
  var seasonGames = teamGames.filter(function (game) { return !isPilotGame_(game); });
  var windowGames = seasonGames.filter(function (game) {
    var timestamp = gameTimestamp_(game);
    return timestamp >= pastLimit && timestamp <= futureLimit;
  });
  if (!windowGames.length) {
    windowGames = seasonGames.filter(function (game) {
      return gameTimestamp_(game) >= nowTime;
    }).slice(0, PORTAL_FALLBACK_GAMES);
  }
  return pilots.concat(windowGames);
}

function gameValuesObject_(values) {
  values = values || [];
  return {
    id: text_(values[0]),
    date: dateText_(values[1], "America/New_York"),
    time: timeText_(values[2], "America/New_York"),
    division: text_(values[3]),
    awayTeamId: text_(values[4]),
    homeTeamId: text_(values[5]),
    awayName: text_(values[6]),
    homeName: text_(values[7]),
    venueId: text_(values[8]),
    status: text_(values[9]),
    awayScore: nullableNumber_(values[10]),
    homeScore: nullableNumber_(values[11]),
    stage: text_(values[12]),
    notes: text_(values[13]),
    lastUpdated: isoText_(values[14]),
    weekId: text_(values[15])
  };
}

function coachAuditValues_(gameId, gameValues) {
  var game = gameValuesObject_(gameValues);
  return [gameId, game.date, game.time, game.division, game.awayName || game.awayTeamId, game.homeName || game.homeTeamId];
}

function correctionExistingRows_(sheet) {
  var existing = {};
  if (!sheet || sheet.getLastRow() < 5) return existing;
  var rows = sheet.getRange(5, 1, sheet.getLastRow() - 4, 8).getValues();
  rows.forEach(function (row) {
    var id = text_(row[6]);
    if (id) existing[id] = { awayScore: row[1], homeScore: row[2], reason: row[3], status: row[5] };
  });
  return existing;
}

function syncCorrectionRequestSheet_(portal, entry, team, feed, teamNames) {
  var sheet = portal.getSheetByName(CORRECTION_REQUEST_SHEET);
  if (!sheet) sheet = portal.insertSheet(CORRECTION_REQUEST_SHEET);
  var existing = correctionExistingRows_(sheet);
  var games = feed.games.filter(function (game) {
    return portalGameBelongsToTeam_(game, entry.teamId)
      && !isPilotGame_(game)
      && (game.status === "Final" || game.status === "Forfeit");
  }).sort(function (a, b) { return gameTimestamp_(b) - gameTimestamp_(a); }).slice(0, 8);
  var rows = games.map(function (game) {
    var prior = existing[game.id] || {};
    var label = coachPortalDate_(game.date, feed.settings.timezone || "America/New_York")
      + " - " + game.division + "\n"
      + (game.awayName || teamNames[game.awayTeamId]) + " " + game.awayScore
      + " - " + game.homeScore + " " + (game.homeName || teamNames[game.homeTeamId]);
    return [label, valueOrBlank_(prior.awayScore), valueOrBlank_(prior.homeScore), prior.reason || "", false, prior.status || "Ready", game.id, entry.person];
  });
  var requiredRows = Math.max(5, rows.length + 4);
  if (sheet.getMaxRows() < requiredRows) sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < 8) sheet.insertColumnsAfter(sheet.getMaxColumns(), 8 - sheet.getMaxColumns());
  sheet.showColumns(1, sheet.getMaxColumns());
  sheet.getRange(1, 1, 2, sheet.getMaxColumns()).breakApart();
  sheet.clear();
  sheet.getRange(1, 1, 1, 8).merge().setValue("REQUEST A SCORE CORRECTION");
  sheet.getRange(2, 1, 1, 8).merge().setValue("Enter the corrected score and reason. The commissioner must approve every change.");
  sheet.getRange(4, 1, 1, 8).setValues([["GAME", "AWAY", "HOME", "REASON", "SUBMIT", "STATUS", "Game ID", "Submitted By"]]);
  if (rows.length) sheet.getRange(5, 1, rows.length, 8).setValues(rows);
  var dataRows = Math.max(1, rows.length);
  sheet.getRange(5, 5, dataRows, 1).insertCheckboxes();
  sheet.getRange(5, 2, dataRows, 4).setBackground("#fff4cc");
  sheet.getRange(1, 1, 1, 8).setBackground("#020f22").setFontColor("#ffffff").setFontWeight("bold").setFontSize(17).setHorizontalAlignment("center");
  sheet.getRange(2, 1, 1, 8).setBackground("#e9eff7").setFontColor("#08284d").setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
  sheet.getRange(4, 1, 1, 8).setBackground("#020f22").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
  sheet.setFrozenRows(4);
  sheet.hideColumns(7, 2);
  sheet.setColumnWidth(1, 230);
  sheet.setColumnWidths(2, 2, 62);
  sheet.setColumnWidth(4, 170);
  sheet.setColumnWidth(5, 62);
  sheet.setColumnWidth(6, 145);
  sheet.getRange(5, 1, dataRows, 6).setWrap(true).setVerticalAlignment("middle");
  sheet.setRowHeights(5, dataRows, 72);
  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (protection) {
    if (protection.getDescription() === COACH_PORTAL_PROTECTION) protection.remove();
  });
  var protection = sheet.protect().setDescription(COACH_PORTAL_PROTECTION).setWarningOnly(false);
  protection.setUnprotectedRanges([sheet.getRange(5, 2, dataRows, 4)]);
  try {
    var ownerEmail = Session.getEffectiveUser().getEmail();
    protection.getEditors().forEach(function (editor) {
      if (editor.getEmail() !== ownerEmail) protection.removeEditor(editor);
    });
    if (ownerEmail) protection.addEditor(ownerEmail);
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  } catch (error) {
    Logger.log("Correction sheet protection warning: " + error.message);
  }
}

function ensureCorrectionsQueue_(control) {
  var sheet = control.getSheetByName(CORRECTIONS_QUEUE_SHEET);
  if (!sheet) sheet = control.insertSheet(CORRECTIONS_QUEUE_SHEET);
  var headers = [
    "Request ID", "Received", "Game ID", "Requested By", "Team ID", "Current Result",
    "Requested Result", "Reason", "Status", "Commissioner Notes", "Resolved"
  ];
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#020f22")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 155);
  sheet.setColumnWidth(3, 145);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 125);
  sheet.setColumnWidths(6, 2, 105);
  sheet.setColumnWidth(8, 240);
  sheet.setColumnWidth(9, 105);
  sheet.setColumnWidth(10, 240);
  sheet.setColumnWidth(11, 155);
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Open", "Approved", "Rejected", "Completed"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 9, Math.max(1, sheet.getMaxRows() - 1), 1).setDataValidation(statusRule);
  return sheet;
}

function ensureCommissionerDashboard_(control) {
  var sheet = control.getSheetByName(COMMISSIONER_DASHBOARD_SHEET);
  if (!sheet) sheet = control.insertSheet(COMMISSIONER_DASHBOARD_SHEET, 0);
  if (sheet.getMaxColumns() < 11) sheet.insertColumnsAfter(sheet.getMaxColumns(), 11 - sheet.getMaxColumns());
  return sheet;
}

function ensureOperationsAlerts_(control) {
  var sheet = control.getSheetByName(OPERATIONS_ALERTS_SHEET);
  if (!sheet) sheet = control.insertSheet(OPERATIONS_ALERTS_SHEET, 3);
  var headers = ["Alert Key", "First Detected", "Last Checked", "Type", "Game ID", "Details", "Status", "Resolved"];
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#020f22")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setWrap(true);
  sheet.setFrozenRows(1);
  sheet.showColumns(1, headers.length);
  sheet.hideColumns(1);
  sheet.setColumnWidths(2, 2, 155);
  sheet.setColumnWidth(4, 135);
  sheet.setColumnWidth(5, 145);
  sheet.setColumnWidth(6, 420);
  sheet.setColumnWidth(7, 90);
  sheet.setColumnWidth(8, 155);
  return sheet;
}

function ensureOperationsSheets_() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureAccessRosterSchema_(control);
  ensureCorrectionsQueue_(control);
  ensureOperationsAlerts_(control);
  ensureCommissionerDashboard_(control);
  syncCommissionerDashboard_();
  return control.getUrl();
}

function dashboardGames_(games, now) {
  var nowTime = (now || new Date()).getTime();
  var lower = nowTime - 7 * 86400000;
  var upper = nowTime + 45 * 86400000;
  var sorted = (games || []).slice().sort(function (a, b) { return gameTimestamp_(a) - gameTimestamp_(b); });
  var current = sorted.filter(function (game) {
    var timestamp = gameTimestamp_(game);
    return timestamp >= lower && timestamp <= upper;
  });
  if (!current.length) {
    current = sorted.filter(function (game) { return gameTimestamp_(game) >= nowTime; }).slice(0, 24);
  }
  return current.slice(0, 24);
}

function syncCommissionerDashboard_() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ensureCommissionerDashboard_(control);
  var queue = ensureCorrectionsQueue_(control);
  var feed = buildCoachFeed_();
  var teamNames = {};
  feed.teams.forEach(function (team) { teamNames[team.id] = team.name; });
  var venueNames = {};
  feed.venues.forEach(function (venue) { venueNames[venue.id] = venue.name; });
  var games = dashboardGames_(feed.games, new Date());
  var rows = games.map(function (game) {
    return [
      game.date,
      game.time,
      game.division,
      game.awayName || teamNames[game.awayTeamId] || game.awayTeamId,
      game.homeName || teamNames[game.homeTeamId] || game.homeTeamId,
      venueNames[game.venueId] || game.venueId,
      game.status,
      game.awayScore === null ? "" : game.awayScore,
      game.homeScore === null ? "" : game.homeScore,
      game.notes,
      game.id
    ];
  });
  var openCorrections = 0;
  if (queue.getLastRow() >= 2) {
    queue.getRange(2, 9, queue.getLastRow() - 1, 1).getDisplayValues().forEach(function (row) {
      if (row[0] === "Open") openCorrections += 1;
    });
  }
  var missingScores = missingFinalGames_(feed.games, new Date()).length;
  var alertsSheet = ensureOperationsAlerts_(control);
  var openAlerts = 0;
  if (alertsSheet.getLastRow() >= 2) {
    alertsSheet.getRange(2, 7, alertsSheet.getLastRow() - 1, 1).getDisplayValues().forEach(function (row) {
      if (row[0] === "Open") openAlerts += 1;
    });
  }
  var requiredRows = Math.max(5, rows.length + 4);
  if (sheet.getMaxRows() < requiredRows) sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  sheet.getRange(1, 1, 2, sheet.getMaxColumns()).breakApart();
  sheet.clear();
  sheet.getRange(1, 1, 1, 11).merge().setValue("UBL COMMISSIONER DASHBOARD");
  sheet.getRange(2, 1, 1, 11).merge().setValue(
    "Last refreshed " + Utilities.formatDate(new Date(), feed.settings.timezone || "America/New_York", "MMM d, yyyy h:mm a")
      + " | Open corrections: " + openCorrections + " | Operations alerts: " + openAlerts + " | Missing final scores: " + missingScores
  );
  sheet.getRange(4, 1, 1, 11).setValues([[
    "DATE", "TIME", "DIVISION", "AWAY TEAM", "HOME TEAM", "VENUE", "STATUS",
    "AWAY SCORE", "HOME SCORE", "NOTES", "Game ID"
  ]]);
  if (rows.length) sheet.getRange(5, 1, rows.length, 11).setValues(rows);
  sheet.getRange(1, 1, 1, 11).setBackground("#020f22").setFontColor("#ffffff").setFontWeight("bold").setFontSize(18).setHorizontalAlignment("center");
  sheet.getRange(2, 1, 1, 11).setBackground(missingScores || openCorrections || openAlerts ? "#fff4cc" : "#d9ead3").setFontColor("#08284d").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange(4, 1, 1, 11).setBackground("#08284d").setFontColor("#ffffff").setFontWeight("bold").setWrap(true);
  sheet.setFrozenRows(4);
  sheet.setColumnWidth(1, 105);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 115);
  sheet.setColumnWidths(4, 2, 150);
  sheet.setColumnWidth(6, 180);
  sheet.setColumnWidth(7, 105);
  sheet.setColumnWidths(8, 2, 85);
  sheet.setColumnWidth(10, 260);
  sheet.showColumns(1, 11);
  sheet.hideColumns(11);
  var dataRows = Math.max(1, rows.length);
  sheet.getRange(5, 1, dataRows, 10).setWrap(true).setVerticalAlignment("middle");
  sheet.setRowHeights(5, dataRows, 44);
  var teamList = feed.teams.map(function (team) { return team.name; });
  var venueList = feed.venues.map(function (venue) { return venue.name; });
  var teamRule = SpreadsheetApp.newDataValidation().requireValueInList(teamList, true).setAllowInvalid(false).build();
  var venueRule = SpreadsheetApp.newDataValidation().requireValueInList(venueList, true).setAllowInvalid(false).build();
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Scheduled", "Live", "Final", "Postponed", "Cancelled", "Forfeit"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(5, 4, dataRows, 2).setDataValidation(teamRule);
  sheet.getRange(5, 6, dataRows, 1).setDataValidation(venueRule);
  sheet.getRange(5, 7, dataRows, 1).setDataValidation(statusRule);
  SpreadsheetApp.flush();
  return sheet.getSheetId();
}

function lookupIdByLabel_(rows, idHeader, labelHeaders, value) {
  var target = text_(value).toLowerCase();
  if (!target) return "";
  for (var i = 0; i < rows.length; i += 1) {
    var candidates = [text_(rows[i][idHeader])];
    labelHeaders.forEach(function (header) { candidates.push(text_(rows[i][header])); });
    if (candidates.some(function (candidate) { return candidate.toLowerCase() === target; })) {
      return text_(rows[i][idHeader]);
    }
  }
  return "";
}

function handleCommissionerDashboardEdit_(event) {
  var range = event.range;
  if (range.getRow() < 5 || range.getColumn() > 10 || range.getNumRows() !== 1) return;
  var control = event.source;
  var dashboard = range.getSheet();
  var gameId = text_(dashboard.getRange(range.getRow(), 11).getDisplayValue());
  if (!gameId) return;
  var gamesSheet = control.getSheetByName("Games");
  var gameRow = findGameRow_(gamesSheet, gameId);
  if (!gameRow) {
    control.toast("That game no longer exists in the private Games table.", "Dashboard not saved", 8);
    syncCommissionerDashboard_();
    return;
  }
  var dashboardValues = dashboard.getRange(range.getRow(), 1, 1, 10).getValues()[0];
  var gameValues = gamesSheet.getRange(gameRow, 1, 1, 16).getValues()[0];
  var teamRows = sheetObjects_(control, "Teams");
  var venueRows = sheetObjects_(control, "Venues");
  var awayId = lookupIdByLabel_(teamRows, "Team ID", ["Name", "Abbreviation"], dashboardValues[3]);
  var homeId = lookupIdByLabel_(teamRows, "Team ID", ["Name", "Abbreviation"], dashboardValues[4]);
  var venueId = lookupIdByLabel_(venueRows, "Venue ID", ["Name", "Map Label"], dashboardValues[5]);
  var stagedGame = Boolean(text_(gameValues[12]));
  if ((!stagedGame && (!awayId || !homeId)) || !venueId) {
    control.toast("Choose teams and a venue from the provided lists.", "Dashboard not saved", 8);
    syncCommissionerDashboard_();
    return;
  }
  var status = text_(dashboardValues[6]);
  var awayScore = dashboardValues[7] === "" ? "" : Number(dashboardValues[7]);
  var homeScore = dashboardValues[8] === "" ? "" : Number(dashboardValues[8]);
  if ((status === "Final" || status === "Forfeit")
      && (!Number.isInteger(awayScore) || !Number.isInteger(homeScore) || awayScore < 0 || homeScore < 0 || awayScore === homeScore)) {
    control.toast("A final result needs two nonnegative whole-number scores and cannot be tied.", "Dashboard not saved", 10);
    syncCommissionerDashboard_();
    return;
  }
  gameValues[1] = dashboardValues[0];
  gameValues[2] = dashboardValues[1];
  gameValues[3] = text_(dashboardValues[2]);
  gameValues[4] = awayId;
  gameValues[5] = homeId;
  gameValues[6] = awayId ? "" : text_(dashboardValues[3]);
  gameValues[7] = homeId ? "" : text_(dashboardValues[4]);
  gameValues[8] = venueId;
  gameValues[9] = status;
  gameValues[10] = awayScore;
  gameValues[11] = homeScore;
  gameValues[13] = text_(dashboardValues[9]);
  var now = new Date().toISOString();
  gameValues[14] = now;
  gamesSheet.getRange(gameRow, 1, 1, 16).setValues([gameValues]);
  if (!isPilotIdentifier_(gameId, gameValues[15])) touchPublication_(control, now);
  syncCoachPortalIfConfigured_();
  syncCommissionerDashboard_();
  control.toast("Game updated everywhere.", "UBL dashboard", 5);
}

function handleCorrectionsQueueEdit_(event) {
  var range = event.range;
  if (range.getRow() < 2 || range.getColumn() !== 9 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  var control = event.source;
  var sheet = range.getSheet();
  var row = sheet.getRange(range.getRow(), 1, 1, 11).getValues()[0];
  var decision = text_(row[8]);
  if (decision === "Rejected") {
    sheet.getRange(range.getRow(), 11).setValue(new Date().toISOString());
    syncCommissionerDashboard_();
    return;
  }
  if (decision !== "Approved") return;
  var result = text_(row[6]).match(/^(\d+)\s*-\s*(\d+)$/);
  if (!result || Number(result[1]) === Number(result[2])) {
    sheet.getRange(range.getRow(), 9).setValue("Open");
    control.toast("The requested result must contain two whole-number scores and cannot be tied.", "Correction not applied", 8);
    return;
  }
  var gamesSheet = control.getSheetByName("Games");
  var gameId = text_(row[2]);
  var gameRow = findGameRow_(gamesSheet, gameId);
  if (!gameRow) {
    sheet.getRange(range.getRow(), 9).setValue("Open");
    control.toast("The correction's game could not be found.", "Correction not applied", 8);
    return;
  }
  var gameValues = gamesSheet.getRange(gameRow, 1, 1, 16).getValues()[0];
  var now = new Date().toISOString();
  gameValues[9] = "Final";
  gameValues[10] = Number(result[1]);
  gameValues[11] = Number(result[2]);
  gameValues[14] = now;
  gamesSheet.getRange(gameRow, 1, 1, 16).setValues([gameValues]);
  appendScoreAudit_(
    control.getSheetByName("Score Audit"),
    gameId,
    coachAuditValues_(gameId, gameValues),
    Number(result[1]),
    Number(result[2]),
    text_(row[3]),
    "Commissioner approved correction " + text_(row[0]) + " from " + text_(row[5]) + " to " + text_(row[6])
  );
  sheet.getRange(range.getRow(), 9).setValue("Completed");
  sheet.getRange(range.getRow(), 11).setValue(now);
  if (!isPilotIdentifier_(gameId, gameValues[15])) touchPublication_(control, now);
  syncCoachPortalIfConfigured_();
  syncCommissionerDashboard_();
  control.toast("Approved correction published everywhere.", "UBL correction", 6);
}

function gameDateTime_(game, timezone) {
  try {
    return Utilities.parseDate(game.date + " " + game.time, timezone || "America/New_York", "yyyy-MM-dd h:mm a");
  } catch (error) {
    return new Date(gameTimestamp_(game));
  }
}

function missingFinalGames_(games, now) {
  var nowTime = (now || new Date()).getTime();
  var overdue = nowTime - 150 * 60000;
  var recent = nowTime - 2 * 86400000;
  return (games || []).filter(function (game) {
    if (isPilotGame_(game) || (game.status !== "Scheduled" && game.status !== "Live")) return false;
    var timestamp = gameTimestamp_(game);
    return timestamp >= recent && timestamp <= overdue;
  });
}

function publishedFeedIssues_(games, now) {
  var issues = [];
  var publicFeed;
  try {
    publicFeed = buildPublicFeed_();
  } catch (error) {
    return ["Public JSON feed could not be built: " + error.message];
  }
  var published = {};
  publicFeed.games.forEach(function (game) {
    if (isPilotGame_(game)) issues.push(game.id + " leaked into the public JSON feed.");
    published[game.id] = game;
  });
  var cutoff = (now || new Date()).getTime() - 36 * 3600000;
  (games || []).forEach(function (game) {
    if (isPilotGame_(game) || (game.status !== "Final" && game.status !== "Forfeit")) return;
    var updated = new Date(game.lastUpdated).getTime();
    if (!isFinite(updated) || updated < cutoff) return;
    var row = published[game.id];
    if (!row) {
      issues.push(game.id + " is final in the control panel but missing from the published feed.");
      return;
    }
    if (row.status !== game.status
        || row.awayScore !== game.awayScore
        || row.homeScore !== game.homeScore) {
      issues.push(game.id + " does not match the published feed.");
    }
  });
  return issues;
}

function healthAlertFingerprint_(issues) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, issues.join("|"));
  return Utilities.base64EncodeWebSafe(digest);
}

function syncOperationsAlerts_(control, alerts) {
  var sheet = ensureOperationsAlerts_(control);
  var now = new Date().toISOString();
  var existing = {};
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues().forEach(function (row, index) {
      var key = text_(row[0]);
      if (key) existing[key] = { rowNumber: index + 2, values: row };
    });
  }
  var current = {};
  (alerts || []).forEach(function (alert) {
    current[alert.key] = true;
    var prior = existing[alert.key];
    if (prior) {
      sheet.getRange(prior.rowNumber, 3, 1, 6).setValues([[
        now, alert.type, alert.gameId || "", alert.details, "Open", ""
      ]]);
    } else {
      sheet.appendRow([alert.key, now, now, alert.type, alert.gameId || "", alert.details, "Open", ""]);
    }
  });
  Object.keys(existing).forEach(function (key) {
    if (current[key] || text_(existing[key].values[6]) !== "Open") return;
    sheet.getRange(existing[key].rowNumber, 7, 1, 2).setValues([["Resolved", now]]);
  });
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).setWrap(true).setVerticalAlignment("middle");
  }
  return alerts.length;
}

function runLeagueHealthCheck() {
  var feed = buildCoachFeed_();
  var teamNames = {};
  feed.teams.forEach(function (team) { teamNames[team.id] = team.name; });
  var missing = missingFinalGames_(feed.games, new Date());
  var alerts = missing.map(function (game) {
    return {
      key: "missing-final:" + game.id,
      type: "Missing final score",
      gameId: game.id,
      details: (game.awayName || teamNames[game.awayTeamId] || game.awayTeamId) + " at "
        + (game.homeName || teamNames[game.homeTeamId] || game.homeTeamId)
    };
  });
  publishedFeedIssues_(feed.games, new Date()).forEach(function (issue) {
    alerts.push({
      key: "feed:" + healthAlertFingerprint_([issue]),
      type: "Public feed mismatch",
      gameId: text_(issue).split(" ")[0],
      details: issue
    });
  });
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var alertCount = syncOperationsAlerts_(control, alerts);
  var properties = PropertiesService.getScriptProperties();
  if (!alerts.length) {
    properties.deleteProperty(HEALTH_ALERT_PROPERTY);
    syncCommissionerDashboard_();
    return "Healthy";
  }
  var fingerprint = healthAlertFingerprint_(alerts.map(function (alert) { return alert.key; }));
  properties.setProperty(HEALTH_ALERT_PROPERTY, fingerprint);
  syncCommissionerDashboard_();
  return alertCount + " open alert(s)";
}

function backupFolder_() {
  var folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);
}

function createDailyControlBackup() {
  var timezone = "America/New_York";
  var date = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");
  var name = "UBL League Control Panel Backup " + date;
  var folder = backupFolder_();
  var existing = folder.getFilesByName(name);
  if (existing.hasNext()) return existing.next().getId();
  return DriveApp.getFileById(SPREADSHEET_ID).makeCopy(name, folder).getId();
}

function installOperationsTriggers_() {
  var managedHandlers = {
    runLeagueHealthCheck: true,
    createDailyControlBackup: true
  };
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (managedHandlers[trigger.getHandlerFunction()]) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("runLeagueHealthCheck").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("createDailyControlBackup").timeBased().atHour(3).everyDays(1).create();
}

function installOperationsAutomation() {
  ensureOperationsSheets_();
  syncAccessAndCoachPortals();
  installControlPanelTrigger_();
  installOperationsTriggers_();
  var backupId = createDailyControlBackup();
  var health = runLeagueHealthCheck();
  SpreadsheetApp.openById(SPREADSHEET_ID).toast("Dashboard, team portals, alerts, and backups are active.", "UBL operations", 8);
  return JSON.stringify({ backupId: backupId, health: health, portals: teamPortalIndex_() });
}

function setupPilotTestGames() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var gamesSheet = control.getSheetByName("Games");
  var now = new Date().toISOString();
  removePilotGameRows_(gamesSheet);

  var rows = [
    ["pilot-kings-01", "2026-07-20", "6:00 PM", "Boys Varsity", "kings-school", "wilton-baptist", "", "", "wilton-baptist-gym", "Scheduled", "", "", "", "PRIVATE PILOT - never published", now, PILOT_WEEK_ID],
    ["pilot-wilton-01", "2026-07-23", "7:30 PM", "Girls Varsity", "wilton-baptist", "kings-school", "", "", "kings-school-gym", "Scheduled", "", "", "", "PRIVATE PILOT - never published", now, PILOT_WEEK_ID]
  ];
  var startRow = gamesSheet.getLastRow() + 1;
  var sourceRow = Math.max(2, startRow - 1);
  var source = gamesSheet.getRange(sourceRow, 1, 1, 16);
  var destination = gamesSheet.getRange(startRow, 1, rows.length, 16);
  source.copyTo(destination, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  source.copyTo(destination, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  destination.setValues(rows);

  installPilotPublicationGuard_(control);
  installControlPanelTrigger_();
  syncCoachPortalIfConfigured_();
  var verification = verifyPilotIsolation_(control);
  control.toast("Two private pilot games are ready. The public website is isolated.", "UBL pilot", 8);
  Logger.log(JSON.stringify(verification));
  return JSON.stringify(verification);
}

function clearPilotTestGames() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  removePilotGameRows_(control.getSheetByName("Games"));
  installPilotPublicationGuard_(control);
  syncCoachPortalIfConfigured_();
  control.toast("Pilot games removed. Season data was not changed.", "UBL pilot", 8);
}

function runPilotIsolationSelfTest() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var result = null;
  setupPilotTestGames();
  try {
    var portalId = PropertiesService.getScriptProperties().getProperty(COACH_PORTAL_PROPERTY);
    if (!portalId) throw new Error("Coach portal is not configured.");
    var portal = SpreadsheetApp.openById(portalId);
    var portalSheet = portal.getSheetByName(COACH_PORTAL_SHEET);
    var portalRow = findGameRow_(portalSheet, PILOT_GAME_IDS[0]);
    if (!portalRow) throw new Error("King's pilot game is missing from the coach portal.");

    portalSheet.getRange(portalRow, 3, 1, 3).setValues([[48, 52, true]]);
    publishCoachPortalScore_(portal, portalRow, portalConfigById_(portal.getId()));
    SpreadsheetApp.flush();

    var gameRow = findGameRow_(control.getSheetByName("Games"), PILOT_GAME_IDS[0]);
    var gameValues = control.getSheetByName("Games").getRange(gameRow, 1, 1, 16).getDisplayValues()[0];
    if (gameValues[9] !== "Final" || gameValues[10] !== "48" || gameValues[11] !== "52") {
      throw new Error("Pilot score did not reach the private Games table.");
    }
    result = verifyPilotIsolation_(control);
    result.privateSubmissionVerified = true;
  } finally {
    setupPilotTestGames();
  }
  Logger.log(JSON.stringify(result));
  return JSON.stringify(result);
}

function installPilotPublicationGuard_(control) {
  var feedSheet = control.getSheetByName("Website Feed");
  var rowCount = Math.max(1, feedSheet.getMaxRows() - 1);
  feedSheet.getRange(2, 1, rowCount, 11).clearContent();
  feedSheet.getRange(2, 1).setFormula('=FILTER({Games!A2:F,Games!I2:L,Games!P2:P},Games!A2:A<>"",LEFT(Games!A2:A,6)<>"pilot-",Games!P2:P<>"pilot-test")');
  SpreadsheetApp.flush();
}

function removePilotGameRows_(gamesSheet) {
  var lastRow = gamesSheet.getLastRow();
  if (lastRow < 2) return;
  var identifiers = gamesSheet.getRange(2, 1, lastRow - 1, 16).getDisplayValues();
  for (var index = identifiers.length - 1; index >= 0; index -= 1) {
    if (isPilotIdentifier_(identifiers[index][0], identifiers[index][15])) gamesSheet.deleteRow(index + 2);
  }
}

function verifyPilotIsolation_(control) {
  SpreadsheetApp.flush();
  var privateFeed = buildCoachFeed_();
  var publicFeed = buildPublicFeed_();
  var privatePilots = privateFeed.games.filter(isPilotGame_);
  var publicPilots = publicFeed.games.filter(isPilotGame_);
  if (privatePilots.length !== PILOT_GAME_IDS.length) throw new Error("Expected two private pilot games.");
  if (publicPilots.length) throw new Error("A pilot game reached the Apps Script public feed.");

  var feedSheet = control.getSheetByName("Website Feed");
  var lastRow = Math.max(2, feedSheet.getLastRow());
  var publicIds = feedSheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  var leakedIds = publicIds.filter(function (row) { return isPilotIdentifier_(row[0], ""); });
  if (leakedIds.length) throw new Error("A pilot game reached the published Website Feed.");

  return {
    pilotGamesReady: privatePilots.length,
    appsScriptPublicPilots: publicPilots.length,
    websiteFeedPublicPilots: leakedIds.length,
    publicSeasonGames: publicFeed.games.length
  };
}

function syncCoachPortalIfConfigured_() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var entries = activePortalEntries_(control);
  var teams = teamRecordsById_(control);
  var portalIndex = teamPortalIndex_();
  var legacyPortalId = PropertiesService.getScriptProperties().getProperty(COACH_PORTAL_PROPERTY);
  entries.forEach(function (entry) {
    var portalId = portalIndex[entry.teamId] || (entry.teamId === "kings-school" ? legacyPortalId : "");
    var portal = openSpreadsheetOrNull_(portalId);
    if (portal && teams[entry.teamId]) syncCoachScorePortal_(portal, entry, teams[entry.teamId]);
  });
}

function handleCoachPortalEdit(event) {
  if (!event || !event.range || !event.source) return;
  var portalConfig = portalConfigById_(event.source.getId());
  if (!portalConfig) return;
  var range = event.range;
  var sheetName = range.getSheet().getName();
  if (range.getRow() < 5 || range.getColumn() !== 5 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  if (String(event.value).toUpperCase() !== "TRUE") return;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (sheetName === COACH_PORTAL_SHEET) {
      publishCoachPortalScore_(event.source, range.getRow(), portalConfig);
    } else if (sheetName === CORRECTION_REQUEST_SHEET) {
      publishCorrectionRequest_(event.source, range.getRow(), portalConfig);
    }
  } finally {
    lock.releaseLock();
  }
}

function publishCoachPortalScore_(portal, rowNumber, portalConfig) {
  var portalSheet = portal.getSheetByName(COACH_PORTAL_SHEET);
  var values = portalSheet.getRange(rowNumber, 1, 1, 7).getValues()[0];
  var gameId = text_(values[0]);
  var awayScore = Number(values[2]);
  var homeScore = Number(values[3]);
  var submittedBy = text_(values[6]) || portalConfig.person;
  var error = coachScoreError_(gameId, values[2], values[3], submittedBy);
  var warning = coachScoreWarning_(values[2], values[3]);

  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var gamesSheet = control.getSheetByName("Games");
  var auditSheet = control.getSheetByName("Score Audit");
  var gameRow = findGameRow_(gamesSheet, gameId);
  var gameValues = gameRow ? gamesSheet.getRange(gameRow, 1, 1, 16).getValues()[0] : [];
  var pilotGame = isPilotIdentifier_(gameId, gameValues[15]);
  if (!error && !gameRow) error = "The selected game could not be found.";
  if (!error && !portalGameBelongsToTeam_(gameValuesObject_(gameValues), portalConfig.teamId)) {
    error = "This game is not assigned to your program.";
  }
  if (!error && (gameValues[9] === "Final" || gameValues[9] === "Forfeit")) {
    error = "This result is already published. Contact the commissioner to make a correction.";
  }
  var auditValues = coachAuditValues_(gameId, gameValues, awayScore, homeScore, submittedBy);

  if (error) {
    portalSheet.getRange(rowNumber, 5).setValue(false);
    portalSheet.getRange(rowNumber, 6).setValue("Rejected: " + error);
    appendScoreAudit_(auditSheet, gameId, auditValues, awayScore, homeScore, submittedBy, "Rejected: " + error);
    portal.toast(error, "Score not submitted", 8);
    return;
  }

  if (warning && !scoreWarningAcknowledged_(values[5], values[2], values[3])) {
    var warningStatus = scoreWarningStatus_(values[2], values[3], warning);
    portalSheet.getRange(rowNumber, 5).setValue(false);
    portalSheet.getRange(rowNumber, 6).setValue(warningStatus);
    appendScoreAudit_(auditSheet, gameId, auditValues, awayScore, homeScore, submittedBy, "Warning: " + warning);
    portal.toast(warning + " Verify both scores, then check Submit again to confirm.", "Check this score", 10);
    return;
  }

  var now = new Date().toISOString();
  gamesSheet.getRange(gameRow, 10, 1, 3).setValues([["Final", awayScore, homeScore]]);
  gamesSheet.getRange(gameRow, 15).setValue(now);
  if (!pilotGame) touchPublication_(control, now);
  appendScoreAudit_(auditSheet, gameId, auditValues, awayScore, homeScore, submittedBy, pilotGame ? "Private pilot submission" : "Published from " + portalConfig.teamId + " portal");
  portalSheet.getRange(rowNumber, 3, 1, 2).clearContent();
  portalSheet.getRange(rowNumber, 5).setValue(false);
  portalSheet.getRange(rowNumber, 6).setValue(pilotGame ? "Pilot complete - private" : "Published to website");
  syncCoachPortalIfConfigured_();
  syncCommissionerDashboard_();
  SpreadsheetApp.flush();
  portal.toast(
    pilotGame ? "Pilot score recorded privately. The public website was not changed." : "Final score published to the UBL website.",
    "Score submitted",
    8
  );
}

function publishCorrectionRequest_(portal, rowNumber, portalConfig) {
  var sheet = portal.getSheetByName(CORRECTION_REQUEST_SHEET);
  var values = sheet.getRange(rowNumber, 1, 1, 8).getValues()[0];
  var gameId = text_(values[6]);
  var awayScore = Number(values[1]);
  var homeScore = Number(values[2]);
  var reason = text_(values[3]);
  var submittedBy = text_(values[7]) || portalConfig.person;
  var error = coachScoreError_(gameId, values[1], values[2], submittedBy);
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var gamesSheet = control.getSheetByName("Games");
  var gameRow = findGameRow_(gamesSheet, gameId);
  var gameValues = gameRow ? gamesSheet.getRange(gameRow, 1, 1, 16).getValues()[0] : [];
  if (!error && !gameRow) error = "The selected game could not be found.";
  if (!error && !portalGameBelongsToTeam_(gameValuesObject_(gameValues), portalConfig.teamId)) error = "This game is not assigned to your program.";
  if (!error && gameValues[9] !== "Final" && gameValues[9] !== "Forfeit") error = "Only a published result can be corrected.";
  if (!error && !reason) error = "Enter a short reason for the correction.";

  if (error) {
    sheet.getRange(rowNumber, 5).setValue(false);
    sheet.getRange(rowNumber, 6).setValue("Rejected: " + error);
    portal.toast(error, "Correction not submitted", 8);
    return;
  }

  var queue = ensureCorrectionsQueue_(control);
  var now = new Date().toISOString();
  var requestId = "corr-" + Utilities.formatDate(new Date(), "America/New_York", "yyyyMMdd-HHmmss") + "-" + portalConfig.teamId;
  queue.appendRow([
    requestId,
    now,
    gameId,
    submittedBy,
    portalConfig.teamId,
    gameValues[10] + "-" + gameValues[11],
    awayScore + "-" + homeScore,
    reason,
    "Open",
    "",
    ""
  ]);
  sheet.getRange(rowNumber, 2, 1, 3).clearContent();
  sheet.getRange(rowNumber, 5).setValue(false);
  sheet.getRange(rowNumber, 6).setValue("Submitted to commissioner");
  syncCommissionerDashboard_();
  portal.toast("The commissioner received this request.", "Correction submitted", 8);
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
  var pilotGame = isPilotIdentifier_(gameId, gameValues[15]);
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
  if (!pilotGame) touchPublication_(spreadsheet, now);
  appendScoreAudit_(auditSheet, gameId, values, awayScore, homeScore, submittedBy, pilotGame ? "Private pilot submission" : "Published");
  coachSheet.getRange(coachRow, 7, 1, 3).clearContent();
  coachSheet.getRange(coachRow, 10).setValue(false);
  SpreadsheetApp.flush();
  spreadsheet.toast(
    pilotGame ? "Pilot score recorded privately. The public website was not changed." : "Final score published to the UBL website.",
    "Score submitted",
    8
  );
}

function isPilotIdentifier_(gameId, weekId) {
  return text_(gameId).toLowerCase().indexOf(PILOT_GAME_PREFIX) === 0 || text_(weekId).toLowerCase() === PILOT_WEEK_ID;
}

function isPilotSourceRow_(row) {
  return isPilotIdentifier_(row["Game ID"], row["Week ID"]);
}

function isPilotGame_(game) {
  return isPilotIdentifier_(game.id, game.weekId);
}

function coachScoreError_(gameId, rawAwayScore, rawHomeScore, submittedBy) {
  var awayScore = Number(rawAwayScore);
  var homeScore = Number(rawHomeScore);
  if (!text_(gameId)) return "This game is not available for score entry.";
  if (rawAwayScore === "" || rawHomeScore === "") return "Enter both final scores before submitting.";
  if (!Number.isInteger(awayScore) || !Number.isInteger(homeScore) || awayScore < 0 || homeScore < 0) return "Scores must be whole numbers of 0 or greater.";
  if (awayScore === homeScore) return "A final basketball score cannot be tied.";
  if (text_(submittedBy).split(/\s+/).filter(Boolean).length < 2) return "Enter your first and last name before submitting.";
  return "";
}

function coachScoreWarning_(rawAwayScore, rawHomeScore) {
  var awayScore = Number(rawAwayScore);
  var homeScore = Number(rawHomeScore);
  if (!Number.isInteger(awayScore) || !Number.isInteger(homeScore)) return "";
  if (awayScore > UNUSUAL_SCORE_LIMIT || homeScore > UNUSUAL_SCORE_LIMIT) {
    return "One score is above " + UNUSUAL_SCORE_LIMIT + ".";
  }
  if (Math.abs(awayScore - homeScore) > UNUSUAL_MARGIN_LIMIT) {
    return "The scoring margin is above " + UNUSUAL_MARGIN_LIMIT + ".";
  }
  return "";
}

function scoreWarningStatus_(rawAwayScore, rawHomeScore, warning) {
  return "Review " + Number(rawAwayScore) + "-" + Number(rawHomeScore) + ": " + warning + " Verify both scores, then check Submit again.";
}

function scoreWarningAcknowledged_(status, rawAwayScore, rawHomeScore) {
  var prefix = "Review " + Number(rawAwayScore) + "-" + Number(rawHomeScore) + ":";
  return text_(status).indexOf(prefix) === 0;
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
