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
var RECOVERY_STATUS_SHEET = "Recovery Status";
var BACKUP_NAME_PREFIX = "UBL League Control Panel Backup ";
var RECOVERY_DRILL_PREFIX = "UBL RECOVERY DRILL ";
var RECOVERY_CANDIDATE_PREFIX = "UBL RECOVERY CANDIDATE ";
var MAX_BACKUP_AGE_HOURS = 30;
var MAX_RECOVERY_DRILL_AGE_DAYS = 31;
var RECOVERY_REQUIRED_SHEETS = ["Games", "Teams", "Venues", "Settings", "Public Team Profiles", "Website Feed"];
var RECOVERY_FINGERPRINT_SHEETS = ["Games", "Teams", "Venues", "Settings", "Public Team Profiles"];
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
var GAME_COLUMN_COUNT = 17;
var GAME_REPORTER_COLUMN = 17;
var PUBLIC_TEAM_PROFILES_SHEET = "Public Team Profiles";
var NOTIFICATION_LOG_SHEET = "Notification Log";
var DEFAULT_COMMISSIONER_EMAIL = "info.upstatebasketballleague@gmail.com";
var WORKFLOW_SETTING_DEFAULTS = {
  scoreReporterEnforced: false,
  coachReminderMinutes: 90,
  commissionerEscalationMinutes: 150,
  operationsTestMode: true,
  commissionerEmail: DEFAULT_COMMISSIONER_EMAIL,
  notificationTestEmail: "athletic_director@kingsschool.info"
};
var ACCESS_ROSTER_HEADERS = [
  "Role", "Person", "Program", "Google account / email", "Access level", "Status",
  "Last verified", "Operational responsibility", "Team ID", "Invite sent",
  "Access tested", "Pilot completed", "Ready for rollout", "Portal URL",
  "Provision and Send", "Provisioned At", "Invitation Sent At", "Provisioning Status"
];
var PUBLIC_TEAM_PROFILE_HEADERS = [
  "Team ID", "Division", "Program Summary", "Representative Email", "Home Venue ID",
  "Head Coach", "Head Coach Experience", "Head Coach Photo URL", "Assistants JSON",
  "Published", "Last Updated"
];
var PUBLIC_TEAM_PROFILE_SEED = [
  ["kings-school", "Boys Varsity", "A founding UBL program fielding both boys and girls varsity teams.", "athletic_director@kingsschool.info", "kings-school-gym", "Hudson Waters", "Second season as head coach.", "assets/optimized/hudson-waters-192.webp", '[{"name":"Jacob Fischer","experience":"Assistant coach and Class of 2022 alumnus.","photo":"assets/optimized/jacob-fischer-192.webp"}]', true],
  ["kings-school", "Girls Varsity", "A founding UBL program fielding both boys and girls varsity teams.", "athletic_director@kingsschool.info", "kings-school-gym", "Brodie Farr", "Class of 1992 alumnus; coached the program for four seasons.", "", '[{"name":"Todd Brown","experience":"Coached alongside Brodie Farr for four seasons.","photo":""}]', true],
  ["perth", "Boys Varsity", "A founding UBL program with boys and girls varsity participation planned.", "", "perth-gym", "", "", "", "[]", true],
  ["perth", "Girls Varsity", "A founding UBL program with boys and girls varsity participation planned.", "", "perth-gym", "", "", "", "[]", true],
  ["wilton-baptist", "Boys Varsity", "A founding UBL program led by coach Chris Webster.", "", "wilton-baptist-gym", "Chris Webster", "Head coach at Wilton Baptist for 10 seasons.", "assets/optimized/chris-webster-192.webp", '[{"name":"Rob Newcome","experience":"Coaching for eight seasons.","photo":""}]', true],
  ["wilton-baptist", "Girls Varsity", "A founding UBL program led by coach Chris Webster.", "", "wilton-baptist-gym", "Chris Webster", "Head coach at Wilton Baptist for 10 seasons.", "assets/optimized/chris-webster-192.webp", "[]", true],
  ["hv-rocks", "Boys Varsity", "HV Rocks has competed for nearly 30 years.", "", "open-arms", "Marc Bailey", "Head coach with 15 seasons of coaching experience.", "", '[{"name":"Tim Stuitje","experience":"Assistant coach for three seasons, entering his fourth.","photo":""}]', true],
  ["hv-flames", "Girls Varsity", "HV Flames competes in the UBL Girls Varsity division.", "", "open-arms", "Rebekah Johnson", "Additional coach information is being collected.", "", "[]", true],
  ["tbd", "Boys Varsity", "UBL is recruiting a fifth program ready for structured varsity competition, shared standards, and a meaningful championship experience.", DEFAULT_COMMISSIONER_EMAIL, "", "Your program", "Applications are open for the 2026-27 season.", "", "[]", true],
  ["tbd", "Girls Varsity", "UBL is recruiting a fifth program ready for structured varsity competition, shared standards, and a meaningful championship experience.", DEFAULT_COMMISSIONER_EMAIL, "", "Your program", "Applications are open for the 2026-27 season.", "", "[]", true]
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("UBL Operations")
    .addItem("Check backup and recovery status", "runBackupStatusCheck")
    .addItem("Run isolated recovery drill", "runBackupRecoveryDrill")
    .addItem("Create recovery candidate", "createRecoveryCandidateFromLatestBackup")
    .addSeparator()
    .addItem("Refresh commissioner dashboard", "syncCommissionerDashboard_")
    .addItem("Provision checked representatives", "provisionCheckedRepresentatives")
    .addItem("Run notification self-test", "runNotificationSelfTest")
    .addToUi();
}

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
  var settings = workflowSettings_(spreadsheet);

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
      weekId: text_(row["Week ID"]),
      scoreReporterTeamId: text_(row["Score Reporter Team ID"]) || text_(row["Home Team ID"])
    };
  });

  var profiles = publicTeamProfiles_(spreadsheet, teams, venues);
  validatePublicFeed_(teams, venues, games, profiles);
  var responseSettings = includePilotGames ? settings : publicWorkflowSettings_(settings);
  return {
    schemaVersion: Number(settings.dataVersion || 1),
    lastUpdated: text_(settings.lastUpdated) || new Date().toISOString(),
    settings: responseSettings,
    teams: teams,
    venues: venues,
    games: games,
    profiles: profiles
  };
}

function handleControlGameEdit(event) {
  if (!event || !event.range) return;
  var spreadsheet = event.source;
  var sheet = event.range.getSheet();
  if (sheet.getName() === RECOVERY_STATUS_SHEET) {
    handleRecoveryStatusEdit_(event);
    return;
  }
  if (sheet.getName() === COMMISSIONER_DASHBOARD_SHEET) {
    handleCommissionerDashboardEdit_(event);
    return;
  }
  if (sheet.getName() === CORRECTIONS_QUEUE_SHEET) {
    handleCorrectionsQueueEdit_(event);
    return;
  }
  if (sheet.getName() === "Access Roster") {
    handleAccessRosterEdit_(event);
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
  var reporterEnforced = feed.settings.scoreReporterEnforced === true;

  var rows = portalGames.map(function (game) {
    var prior = existing[game.id] || {};
    var published = game.status === "Final" || game.status === "Forfeit";
    var pilot = isPilotGame_(game);
    var status = pilot
      ? (published ? "Pilot complete - private" : "Pilot ready - private")
      : (published ? "Published to website" : "Ready");
    if (!published && !portalCanReportGame_(game, entry.teamId, feed.settings)) {
      status = "Verification only - designated team reports";
    }
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
  sheet.getRange(2, 1, 1, 7).merge().setValue(
    reporterEnforced
      ? "The designated reporting team enters the final. Other listed games are available for result verification."
      : "Enter the away and home final scores, then check Submit. Your name is recorded automatically."
  );
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
  portalGames.forEach(function (game, index) {
    if (portalCanReportGame_(game, entry.teamId, feed.settings)) return;
    sheet.getRange(index + 5, 3, 1, 3).setBackground("#e9eff7").clearContent();
    sheet.getRange(index + 5, 6).setBackground("#e9eff7").setFontColor("#637084");
  });

  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (protection) {
    if (protection.getDescription() === COACH_PORTAL_PROTECTION) protection.remove();
  });
  var protection = sheet.protect().setDescription(COACH_PORTAL_PROTECTION).setWarningOnly(false);
  var editableRanges = [];
  portalGames.forEach(function (game, index) {
    if (portalCanReportGame_(game, entry.teamId, feed.settings)) {
      editableRanges.push(sheet.getRange(index + 5, 3, 1, 3));
    }
  });
  protection.setUnprotectedRanges(editableRanges);
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

function workflowSettings_(control) {
  var settings = {};
  sheetObjects_(control, "Settings").forEach(function (row) {
    settings[text_(row.Key)] = typedSetting_(row.Value);
  });
  Object.keys(WORKFLOW_SETTING_DEFAULTS).forEach(function (key) {
    if (settings[key] === "" || settings[key] === null || settings[key] === undefined) {
      settings[key] = WORKFLOW_SETTING_DEFAULTS[key];
    }
  });
  settings.coachReminderMinutes = positiveMinutes_(settings.coachReminderMinutes, WORKFLOW_SETTING_DEFAULTS.coachReminderMinutes);
  settings.commissionerEscalationMinutes = positiveMinutes_(settings.commissionerEscalationMinutes, WORKFLOW_SETTING_DEFAULTS.commissionerEscalationMinutes);
  if (settings.commissionerEscalationMinutes < settings.coachReminderMinutes) {
    settings.commissionerEscalationMinutes = settings.coachReminderMinutes;
  }
  settings.scoreReporterEnforced = settings.scoreReporterEnforced === true;
  settings.operationsTestMode = settings.operationsTestMode !== false;
  return settings;
}

function publicWorkflowSettings_(settings) {
  var allowed = [
    "timezone", "dataVersion", "lastUpdated", "gameDurationMinutes", "showSimultaneousLiveGames",
    "scoreReporterEnforced", "coachReminderMinutes", "commissionerEscalationMinutes"
  ];
  var result = {};
  allowed.forEach(function (key) {
    if (settings[key] !== undefined) result[key] = settings[key];
  });
  return result;
}

function positiveMinutes_(value, fallback) {
  var number = Number(value);
  return isFinite(number) && number >= 1 ? Math.round(number) : fallback;
}

function ensureWorkflowSettings_(control) {
  var sheet = control.getSheetByName("Settings");
  if (!sheet) sheet = control.insertSheet("Settings");
  if (sheet.getMaxColumns() < 2) sheet.insertColumnsAfter(sheet.getMaxColumns(), 2 - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, 2).setValues([["Key", "Value"]]);
  var existing = {};
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().forEach(function (row) {
      if (text_(row[0])) existing[text_(row[0])] = true;
    });
  }
  Object.keys(WORKFLOW_SETTING_DEFAULTS).forEach(function (key) {
    if (!existing[key]) sheet.appendRow([key, WORKFLOW_SETTING_DEFAULTS[key]]);
  });
  sheet.getRange(1, 1, 1, 2).setBackground("#020f22").setFontColor("#ffffff").setFontWeight("bold");
  sheet.setFrozenRows(1);
  return sheet;
}

function ensureGameReporterAssignments_(control) {
  var sheet = control.getSheetByName("Games");
  if (!sheet) throw new Error("Missing sheet: Games");
  if (sheet.getMaxColumns() < GAME_COLUMN_COUNT) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), GAME_COLUMN_COUNT - sheet.getMaxColumns());
  }
  sheet.getRange(1, GAME_REPORTER_COLUMN).setValue("Score Reporter Team ID");
  if (sheet.getLastRow() < 2) return sheet;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, GAME_COLUMN_COUNT).getValues();
  var changed = false;
  values.forEach(function (row) {
    if (!text_(row[16]) && text_(row[5])) {
      row[16] = text_(row[5]);
      changed = true;
    }
  });
  if (changed) sheet.getRange(2, 1, values.length, GAME_COLUMN_COUNT).setValues(values);
  return sheet;
}

function safeProfileImageUrl_(value) {
  var url = text_(value);
  return /^(?:assets\/|https:\/\/)/i.test(url) ? url : "";
}

function safeAssistants_(value) {
  var rows = [];
  try {
    rows = Array.isArray(value) ? value : JSON.parse(text_(value) || "[]");
  } catch (error) {
    rows = [];
  }
  return rows.slice(0, 5).map(function (row) {
    return {
      name: text_(row && row.name).slice(0, 100),
      experience: text_(row && row.experience).slice(0, 240),
      photo: safeProfileImageUrl_(row && row.photo)
    };
  }).filter(function (row) { return row.name; });
}

function ensurePublicTeamProfiles_(control) {
  var sheet = control.getSheetByName(PUBLIC_TEAM_PROFILES_SHEET);
  if (!sheet) sheet = control.insertSheet(PUBLIC_TEAM_PROFILES_SHEET);
  if (sheet.getMaxColumns() < PUBLIC_TEAM_PROFILE_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), PUBLIC_TEAM_PROFILE_HEADERS.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, PUBLIC_TEAM_PROFILE_HEADERS.length).setValues([PUBLIC_TEAM_PROFILE_HEADERS]);
  if (sheet.getLastRow() < 2) {
    var now = new Date().toISOString();
    var seedRows = PUBLIC_TEAM_PROFILE_SEED.map(function (row) { return row.concat([now]); });
    sheet.getRange(2, 1, seedRows.length, PUBLIC_TEAM_PROFILE_HEADERS.length).setValues(seedRows);
  }
  sheet.getRange(1, 1, 1, PUBLIC_TEAM_PROFILE_HEADERS.length)
    .setBackground("#020f22")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setWrap(true);
  sheet.setFrozenRows(1);
  var dataRows = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(2, 2, dataRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(["Boys Varsity", "Girls Varsity"], true).setAllowInvalid(false).build()
  );
  sheet.getRange(2, 10, dataRows, 1).insertCheckboxes();
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 115);
  sheet.setColumnWidth(3, 330);
  sheet.setColumnWidth(4, 210);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidths(6, 2, 175);
  sheet.setColumnWidth(8, 260);
  sheet.setColumnWidth(9, 380);
  sheet.setColumnWidth(10, 90);
  sheet.setColumnWidth(11, 170);
  return sheet;
}

function publicTeamProfiles_(control, teams, venues) {
  var sheet = control.getSheetByName(PUBLIC_TEAM_PROFILES_SHEET);
  if (!sheet) return [];
  var teamIds = {};
  (teams || []).forEach(function (team) { teamIds[team.id] = team; });
  var venueIds = {};
  (venues || []).forEach(function (venue) { venueIds[venue.id] = true; });
  return sheetObjects_(control, PUBLIC_TEAM_PROFILES_SHEET).filter(function (row) {
    return row.Published === true || text_(row.Published).toLowerCase() === "true";
  }).map(function (row) {
    var teamId = text_(row["Team ID"]);
    var division = text_(row.Division);
    var email = text_(row["Representative Email"]);
    var venueId = text_(row["Home Venue ID"]);
    if (!teamIds[teamId]) throw new Error("Public Team Profiles has an unknown Team ID: " + teamId);
    if (teamIds[teamId].divisions.indexOf(division) < 0) throw new Error(teamId + " has an invalid public profile division.");
    if (email && !isVerifiedEmail_(email)) throw new Error(teamId + " has an invalid representative email.");
    if (venueId && !venueIds[venueId]) throw new Error(teamId + " has an unknown home venue.");
    return {
      id: teamId + ":" + division,
      teamId: teamId,
      division: division,
      summary: text_(row["Program Summary"]).slice(0, 500),
      representativeEmail: email,
      homeVenueId: venueId,
      headCoach: {
        name: text_(row["Head Coach"]).slice(0, 100),
        experience: text_(row["Head Coach Experience"]).slice(0, 240),
        photo: safeProfileImageUrl_(row["Head Coach Photo URL"])
      },
      assistants: safeAssistants_(row["Assistants JSON"]),
      lastUpdated: isoText_(row["Last Updated"])
    };
  });
}

function ensureAccessRosterSchema_(control) {
  var sheet = control.getSheetByName("Access Roster");
  if (!sheet) throw new Error("Missing sheet: Access Roster");
  var headers = ACCESS_ROSTER_HEADERS;
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
  var dataRows = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(2, 15, dataRows, 1).insertCheckboxes();
  sheet.getRange(2, 18, dataRows, 1).setWrap(true);
  return sheet;
}

function activePortalEntries_(control) {
  var sheet = ensureAccessRosterSchema_(control);
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_ROSTER_HEADERS.length).getDisplayValues();
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
  });
}

function accessRosterRow_(sheet, rowNumber) {
  var values = sheet.getRange(rowNumber, 1, 1, ACCESS_ROSTER_HEADERS.length).getValues()[0];
  return {
    rowNumber: rowNumber,
    role: text_(values[0]),
    person: text_(values[1]),
    program: text_(values[2]),
    email: text_(values[3]).toLowerCase(),
    accessLevel: text_(values[4]),
    status: text_(values[5]),
    teamId: text_(values[8]),
    portalUrl: text_(values[13]),
    provision: values[14] === true
  };
}

function handleAccessRosterEdit_(event) {
  var range = event.range;
  if (range.getRow() < 2 || range.getColumn() !== 15 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  if (range.getValue() !== true) return;
  try {
    provisionRepresentativeRow_(event.source, range.getRow());
  } finally {
    range.setValue(false);
  }
}

function provisionCheckedRepresentatives() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ensureAccessRosterSchema_(control);
  var completed = 0;
  if (sheet.getLastRow() < 2) return "No representatives are listed.";
  var checks = sheet.getRange(2, 15, sheet.getLastRow() - 1, 1).getValues();
  checks.forEach(function (row, index) {
    if (row[0] !== true) return;
    provisionRepresentativeRow_(control, index + 2);
    sheet.getRange(index + 2, 15).setValue(false);
    completed += 1;
  });
  control.toast(completed + " representative(s) provisioned.", "UBL access", 8);
  return completed + " representative(s) provisioned.";
}

function provisionRepresentativeRow_(control, rowNumber) {
  var sheet = ensureAccessRosterSchema_(control);
  var entry = accessRosterRow_(sheet, rowNumber);
  if (entry.person.split(/\s+/).filter(Boolean).length < 2) throw new Error("Enter the representative's first and last name.");
  if (!isVerifiedEmail_(entry.email)) throw new Error("Enter a verified Google account email.");
  if (!entry.teamId || !teamRecordsById_(control)[entry.teamId]) throw new Error("Choose a valid Team ID.");

  sheet.getRange(rowNumber, 5).setValue("Coach score portal editor");
  sheet.getRange(rowNumber, 6).setValue("Active");
  sheet.getRange(rowNumber, 7).setValue(new Date().toISOString());
  var urls = syncAccessAndCoachPortals();
  var portalUrl = urls[entry.teamId];
  if (!portalUrl) throw new Error("The team portal could not be created.");

  var now = new Date().toISOString();
  sheet.getRange(rowNumber, 14).setValue(portalUrl);
  sheet.getRange(rowNumber, 16).setValue(now);
  var notification = sendOperationsNotification_(control, {
    key: "representative-invite:" + entry.teamId + ":" + entry.email,
    type: "Representative invitation",
    to: entry.email,
    subject: "Your UBL team score portal",
    body: "Hi " + entry.person + ",\n\nYour private UBL score portal is ready: " + portalUrl
      + "\n\nUse this portal only for " + (entry.program || entry.teamId)
      + ". Do not share the link publicly.\n\nUBL Operations"
  });
  if (notification.status === "Sent") sheet.getRange(rowNumber, 17).setValue(now);
  sheet.getRange(rowNumber, 10).setValue(notification.status === "Sent" ? now : notification.status);
  sheet.getRange(rowNumber, 18).setValue("Provisioned; " + notification.status.toLowerCase());
  return { portalUrl: portalUrl, notification: notification };
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

function scoreReporterTeamId_(game) {
  return text_(game && game.scoreReporterTeamId) || text_(game && game.homeTeamId);
}

function portalCanReportGame_(game, teamId, settings) {
  if (!game || !teamId) return false;
  if (isPilotGame_(game)) return PILOT_PORTAL_ASSIGNMENTS[game.id] === teamId;
  if (!settings || settings.scoreReporterEnforced !== true) return portalGameBelongsToTeam_(game, teamId);
  return scoreReporterTeamId_(game) === teamId;
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
    weekId: text_(values[15]),
    scoreReporterTeamId: text_(values[16]) || text_(values[5])
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

function ensureNotificationLog_(control) {
  var sheet = control.getSheetByName(NOTIFICATION_LOG_SHEET);
  if (!sheet) sheet = control.insertSheet(NOTIFICATION_LOG_SHEET, 4);
  var headers = ["Notification Key", "Created", "To", "Type", "Subject", "Status", "Details"];
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
  sheet.hideColumns(1);
  sheet.setColumnWidth(2, 165);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 300);
  sheet.setColumnWidth(6, 105);
  sheet.setColumnWidth(7, 300);
  return sheet;
}

function priorNotificationStatus_(sheet, key) {
  if (!sheet || sheet.getLastRow() < 2) return "";
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getDisplayValues();
  for (var index = rows.length - 1; index >= 0; index -= 1) {
    if (text_(rows[index][0]) === key) return text_(rows[index][5]);
  }
  return "";
}

function sendOperationsNotification_(control, notification) {
  var to = text_(notification && notification.to).toLowerCase();
  var key = text_(notification && notification.key);
  if (!key) throw new Error("Notification key is required.");
  if (!isVerifiedEmail_(to)) return { status: "No verified recipient", duplicate: false };
  var settings = workflowSettings_(control);
  var sheet = ensureNotificationLog_(control);
  var prior = priorNotificationStatus_(sheet, key);
  if (prior === "Sent" || (settings.operationsTestMode && prior === "Test logged")) {
    return { status: prior, duplicate: true };
  }
  var status = "Test logged";
  var details = settings.operationsTestMode ? "No email sent because operationsTestMode is enabled." : "Email sent by Apps Script.";
  if (!settings.operationsTestMode) {
    try {
      MailApp.sendEmail({
        to: to,
        subject: text_(notification.subject).slice(0, 160),
        body: text_(notification.body).slice(0, 10000),
        name: "Upstate Basketball League"
      });
      status = "Sent";
    } catch (error) {
      status = "Failed";
      details = text_(error && error.message ? error.message : error).slice(0, 500);
    }
  }
  sheet.appendRow([
    key,
    new Date().toISOString(),
    to,
    text_(notification.type),
    text_(notification.subject).slice(0, 160),
    status,
    details
  ]);
  return { status: status, duplicate: false };
}

function notificationRecipientForTeam_(control, teamId) {
  var sheet = ensureAccessRosterSchema_(control);
  if (sheet.getLastRow() < 2) return "";
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_ROSTER_HEADERS.length).getDisplayValues();
  for (var index = 0; index < rows.length; index += 1) {
    if (text_(rows[index][8]) !== teamId || text_(rows[index][5]).toLowerCase() !== "active") continue;
    if (isVerifiedEmail_(rows[index][3])) return text_(rows[index][3]).toLowerCase();
  }
  return "";
}

function runNotificationSelfTest() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureWorkflowSettings_(control);
  var settings = workflowSettings_(control);
  var result = sendOperationsNotification_(control, {
    key: "self-test:" + Utilities.formatDate(new Date(), settings.timezone || "America/New_York", "yyyy-MM-dd"),
    type: "Notification self-test",
    to: settings.notificationTestEmail,
    subject: "UBL notification self-test",
    body: "This is a UBL operations notification test. Test mode should log this message without sending it."
  });
  control.toast(result.status, "UBL notification self-test", 8);
  return JSON.stringify(result);
}

function ensureRecoveryStatus_(control) {
  var sheet = control.getSheetByName(RECOVERY_STATUS_SHEET);
  if (!sheet) sheet = control.insertSheet(RECOVERY_STATUS_SHEET, 4);
  var headers = [
    "Run ID", "Run Type", "Started", "Completed", "Backup", "Backup ID",
    "Backup Age (hours)", "Drill or Candidate", "Damage Detected", "Restore Verified",
    "Production Unchanged", "Public Feed Verified", "Status", "Details"
  ];
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < 5) sheet.insertRowsAfter(sheet.getMaxRows(), 5 - sheet.getMaxRows());
  sheet.getRange(1, 1, 2, headers.length).breakApart();
  sheet.getRange(1, 1, 1, headers.length).merge().setValue("UBL BACKUP & RECOVERY STATUS");
  sheet.getRange(2, 1, 1, headers.length).merge();
  if (!sheet.getRange(2, 1).getDisplayValue()) {
    sheet.getRange(2, 1).setValue("No recovery check has been recorded yet.");
  }
  sheet.getRange(3, 1, 1, 8).setValues([[
    "CHECK STATUS", false, "", "RUN ISOLATED DRILL", false, "", "CREATE RECOVERY CANDIDATE", false
  ]]);
  [2, 5, 8].forEach(function (column) {
    sheet.getRange(3, column).insertCheckboxes().setValue(false);
  });
  sheet.getRange(4, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#020f22")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(18)
    .setHorizontalAlignment("center");
  sheet.getRange(2, 1, 1, headers.length)
    .setBackground("#fff4cc")
    .setFontColor("#08284d")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setWrap(true);
  sheet.getRange(4, 1, 1, headers.length)
    .setBackground("#08284d")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setWrap(true);
  sheet.getRange(3, 1, 1, 8)
    .setBackground("#e9eff7")
    .setFontColor("#08284d")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  [2, 5, 8].forEach(function (column) {
    sheet.getRange(3, column).setBackground("#ef1738").setFontColor("#ffffff");
  });
  sheet.setFrozenRows(4);
  sheet.setRowHeight(3, 42);
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidths(3, 2, 155);
  sheet.setColumnWidth(5, 250);
  sheet.setColumnWidth(6, 250);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 280);
  sheet.setColumnWidths(9, 4, 115);
  sheet.setColumnWidth(13, 110);
  sheet.setColumnWidth(14, 420);
  return sheet;
}

function handleRecoveryStatusEdit_(event) {
  if (event.range.getRow() !== 3 || event.range.getNumRows() !== 1 || event.range.getNumColumns() !== 1) return;
  var column = event.range.getColumn();
  if ([2, 5, 8].indexOf(column) === -1 || event.range.getValue() !== true) return;

  event.range.setValue(false);
  if (column === 2) {
    runBackupStatusCheck();
  } else if (column === 5) {
    runBackupRecoveryDrill();
  } else {
    createRecoveryCandidateFromLatestBackup();
  }
}

function ensureOperationsSheets_() {
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureWorkflowSettings_(control);
  ensureGameReporterAssignments_(control);
  ensureAccessRosterSchema_(control);
  ensurePublicTeamProfiles_(control);
  ensureCorrectionsQueue_(control);
  ensureOperationsAlerts_(control);
  ensureNotificationLog_(control);
  ensureRecoveryStatus_(control);
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
  var missingScores = missingFinalGames_(feed.games, new Date(), feed.settings.coachReminderMinutes).length;
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
  var gameValues = gamesSheet.getRange(gameRow, 1, 1, GAME_COLUMN_COUNT).getValues()[0];
  var teamRows = sheetObjects_(control, "Teams");
  var venueRows = sheetObjects_(control, "Venues");
  var awayId = lookupIdByLabel_(teamRows, "Team ID", ["Name", "Abbreviation"], dashboardValues[3]);
  var homeId = lookupIdByLabel_(teamRows, "Team ID", ["Name", "Abbreviation"], dashboardValues[4]);
  var venueId = lookupIdByLabel_(venueRows, "Venue ID", ["Name", "Map Label"], dashboardValues[5]);
  var stagedGame = Boolean(text_(gameValues[12]));
  var priorHomeId = text_(gameValues[5]);
  var priorReporterId = text_(gameValues[16]);
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
  if (!priorReporterId || priorReporterId === priorHomeId) gameValues[16] = homeId;
  gameValues[6] = awayId ? "" : text_(dashboardValues[3]);
  gameValues[7] = homeId ? "" : text_(dashboardValues[4]);
  gameValues[8] = venueId;
  gameValues[9] = status;
  gameValues[10] = awayScore;
  gameValues[11] = homeScore;
  gameValues[13] = text_(dashboardValues[9]);
  var now = new Date().toISOString();
  gameValues[14] = now;
  gamesSheet.getRange(gameRow, 1, 1, GAME_COLUMN_COUNT).setValues([gameValues]);
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
    var rejectedAt = new Date().toISOString();
    sheet.getRange(range.getRow(), 11).setValue(rejectedAt);
    sendOperationsNotification_(control, {
      key: "correction-rejected:" + text_(row[0]),
      type: "Correction decision",
      to: notificationRecipientForTeam_(control, text_(row[4])),
      subject: "UBL score correction was not approved",
      body: "The correction request for " + text_(row[2]) + " was rejected. Commissioner note: " + (text_(row[9]) || "No note supplied.")
    });
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
  var gameValues = gamesSheet.getRange(gameRow, 1, 1, GAME_COLUMN_COUNT).getValues()[0];
  var now = new Date().toISOString();
  gameValues[9] = "Final";
  gameValues[10] = Number(result[1]);
  gameValues[11] = Number(result[2]);
  gameValues[14] = now;
  gamesSheet.getRange(gameRow, 1, 1, GAME_COLUMN_COUNT).setValues([gameValues]);
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
  sendOperationsNotification_(control, {
    key: "correction-completed:" + text_(row[0]),
    type: "Correction decision",
    to: notificationRecipientForTeam_(control, text_(row[4])),
    subject: "UBL score correction completed",
    body: "The correction for " + gameId + " was approved and the result is now " + text_(row[6]) + "."
  });
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

function missingFinalGames_(games, now, delayMinutes) {
  var nowTime = (now || new Date()).getTime();
  var overdue = nowTime - positiveMinutes_(delayMinutes, WORKFLOW_SETTING_DEFAULTS.commissionerEscalationMinutes) * 60000;
  var recent = nowTime - 2 * 86400000;
  return (games || []).filter(function (game) {
    if (isPilotGame_(game) || (game.status !== "Scheduled" && game.status !== "Live")) return false;
    var timestamp = gameTimestamp_(game);
    return timestamp >= recent && timestamp <= overdue;
  });
}

function scoreDeadlineState_(game, now, settings) {
  if (!game || isPilotGame_(game) || (game.status !== "Scheduled" && game.status !== "Live")) return "";
  settings = settings || WORKFLOW_SETTING_DEFAULTS;
  var elapsedMinutes = ((now || new Date()).getTime() - gameTimestamp_(game)) / 60000;
  var coachMinutes = positiveMinutes_(settings.coachReminderMinutes, WORKFLOW_SETTING_DEFAULTS.coachReminderMinutes);
  var commissionerMinutes = positiveMinutes_(settings.commissionerEscalationMinutes, WORKFLOW_SETTING_DEFAULTS.commissionerEscalationMinutes);
  if (elapsedMinutes >= commissionerMinutes) return "commissioner-escalation";
  if (elapsedMinutes >= coachMinutes) return "coach-reminder";
  return "";
}

function scoreNotificationKey_(prefix, game) {
  return prefix + ":" + text_(game.id) + ":" + text_(game.date) + ":" + text_(game.time).replace(/\s+/g, "-");
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
  var settings = feed.settings || WORKFLOW_SETTING_DEFAULTS;
  var teamNames = {};
  feed.teams.forEach(function (team) { teamNames[team.id] = team.name; });
  var now = new Date();
  var missing = missingFinalGames_(feed.games, now, settings.coachReminderMinutes);
  var escalated = missingFinalGames_(feed.games, now, settings.commissionerEscalationMinutes);
  var alerts = missing.map(function (game) {
    return {
      key: "missing-final:" + game.id,
      type: "Missing final score",
      gameId: game.id,
      details: (game.awayName || teamNames[game.awayTeamId] || game.awayTeamId) + " at "
        + (game.homeName || teamNames[game.homeTeamId] || game.homeTeamId)
    };
  });
  publishedFeedIssues_(feed.games, now).forEach(function (issue) {
    alerts.push({
      key: "feed:" + healthAlertFingerprint_([issue]),
      type: "Public feed mismatch",
      gameId: text_(issue).split(" ")[0],
      details: issue
    });
  });
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  missing.forEach(function (game) {
    var reporterTeamId = scoreReporterTeamId_(game);
    var recipient = notificationRecipientForTeam_(control, reporterTeamId);
    sendOperationsNotification_(control, {
      key: scoreNotificationKey_("score-reminder", game),
      type: "Score reminder",
      to: recipient,
      subject: "UBL final score needed: " + (game.awayName || teamNames[game.awayTeamId] || game.awayTeamId)
        + " at " + (game.homeName || teamNames[game.homeTeamId] || game.homeTeamId),
      body: "The final score for " + game.id + " has not been received. Please use your private UBL team portal to submit both final scores."
    });
  });
  escalated.forEach(function (game) {
    sendOperationsNotification_(control, {
      key: scoreNotificationKey_("commissioner-score-escalation", game),
      type: "Commissioner score escalation",
      to: settings.commissionerEmail,
      subject: "UBL overdue final score: " + game.id,
      body: "The final score for " + game.id + " remains missing after " + settings.commissionerEscalationMinutes
        + " minutes. The designated reporting team is " + scoreReporterTeamId_(game) + "."
    });
  });
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
  var name = BACKUP_NAME_PREFIX + date;
  var folder = backupFolder_();
  var existing = folder.getFilesByName(name);
  if (existing.hasNext()) return existing.next().getId();
  return DriveApp.getFileById(SPREADSHEET_ID).makeCopy(name, folder).getId();
}

function latestBackupFile_() {
  var files = backupFolder_().getFiles();
  var latest = null;
  while (files.hasNext()) {
    var file = files.next();
    if (file.getName().indexOf(BACKUP_NAME_PREFIX) !== 0) continue;
    if (!latest || file.getDateCreated().getTime() > latest.getDateCreated().getTime()) latest = file;
  }
  if (!latest) throw new Error("No dated UBL control-panel backup was found.");
  return latest;
}

function backupAgeHours_(file, now) {
  return Math.max(0, ((now || new Date()).getTime() - file.getDateCreated().getTime()) / 3600000);
}

function fingerprintValue_(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(fingerprintValue_);
  if (value && typeof value === "object") {
    var normalized = {};
    Object.keys(value).sort().forEach(function (key) {
      normalized[key] = fingerprintValue_(value[key]);
    });
    return normalized;
  }
  return value;
}

function fingerprintObject_(value) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(fingerprintValue_(value)),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
}

function spreadsheetFingerprint_(spreadsheet) {
  var payload = RECOVERY_FINGERPRINT_SHEETS.map(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error("Missing critical sheet: " + name);
    var range = sheet.getDataRange();
    return {
      name: name,
      values: range.getValues(),
      formulas: range.getFormulas()
    };
  });
  return fingerprintObject_(payload);
}

function publicFeedFingerprint_(feed) {
  return fingerprintObject_({
    schemaVersion: feed.schemaVersion,
    lastUpdated: feed.lastUpdated,
    settings: feed.settings,
    teams: feed.teams,
    venues: feed.venues,
    games: feed.games,
    profiles: feed.profiles || []
  });
}

function recoveryWorkbookInfo_(spreadsheet) {
  var issues = [];
  RECOVERY_REQUIRED_SHEETS.forEach(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      issues.push("Missing sheet: " + name);
      return;
    }
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) issues.push(name + " is empty.");
  });
  var requiredHeaders = {
    Games: ["Game ID", "Date", "Time", "Division", "Away Team ID", "Home Team ID", "Venue ID", "Status", "Away Score", "Home Score", "Last Updated", "Week ID", "Score Reporter Team ID"],
    Teams: ["Team ID", "Name"],
    Venues: ["Venue ID", "Name", "Address"],
    Settings: ["Key", "Value"],
    "Public Team Profiles": PUBLIC_TEAM_PROFILE_HEADERS
  };
  Object.keys(requiredHeaders).forEach(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet || sheet.getLastColumn() < 1) return;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    requiredHeaders[name].forEach(function (header) {
      if (headers.indexOf(header) < 0) issues.push(name + " is missing header: " + header);
    });
  });
  return {
    valid: issues.length === 0,
    issues: issues,
    games: spreadsheet.getSheetByName("Games") ? Math.max(0, spreadsheet.getSheetByName("Games").getLastRow() - 1) : 0,
    teams: spreadsheet.getSheetByName("Teams") ? Math.max(0, spreadsheet.getSheetByName("Teams").getLastRow() - 1) : 0,
    venues: spreadsheet.getSheetByName("Venues") ? Math.max(0, spreadsheet.getSheetByName("Venues").getLastRow() - 1) : 0
  };
}

function recoveryAssessment_(backupAgeHours, lastDrillAgeDays, schemaValid) {
  var reasons = [];
  if (!schemaValid) reasons.push("Latest backup failed its workbook schema check.");
  if (!isFinite(backupAgeHours) || backupAgeHours > MAX_BACKUP_AGE_HOURS) {
    reasons.push("Latest backup is older than " + MAX_BACKUP_AGE_HOURS + " hours.");
  }
  if (lastDrillAgeDays === null || lastDrillAgeDays === undefined || !isFinite(lastDrillAgeDays)) {
    reasons.push("No successful recovery drill is recorded.");
  } else if (lastDrillAgeDays > MAX_RECOVERY_DRILL_AGE_DAYS) {
    reasons.push("Last successful recovery drill is older than " + MAX_RECOVERY_DRILL_AGE_DAYS + " days.");
  }
  return { status: reasons.length ? "ACTION NEEDED" : "PASS", reasons: reasons };
}

function latestSuccessfulRecoveryDrill_(control, now) {
  var sheet = ensureRecoveryStatus_(control);
  if (sheet.getLastRow() < 5) return null;
  var rows = sheet.getRange(5, 1, sheet.getLastRow() - 4, 14).getValues();
  var completed = null;
  rows.forEach(function (row) {
    if (text_(row[1]) !== "Recovery drill" || text_(row[12]) !== "PASS") return;
    var value = row[3] instanceof Date ? row[3] : new Date(row[3]);
    if (isFinite(value.getTime()) && (!completed || value.getTime() > completed.getTime())) completed = value;
  });
  if (!completed) return null;
  return {
    completed: completed,
    ageDays: Math.max(0, ((now || new Date()).getTime() - completed.getTime()) / 86400000)
  };
}

function recordRecoveryStatus_(control, result) {
  var sheet = ensureRecoveryStatus_(control);
  var row = [
    result.runId || "",
    result.runType || "",
    result.started || "",
    result.completed || "",
    result.backupUrl || "",
    result.backupId || "",
    result.backupAgeHours === null || result.backupAgeHours === undefined ? "" : Math.round(result.backupAgeHours * 10) / 10,
    result.copyUrl || "",
    result.damageDetected === null || result.damageDetected === undefined ? "" : result.damageDetected,
    result.restoreVerified === null || result.restoreVerified === undefined ? "" : result.restoreVerified,
    result.productionUnchanged === null || result.productionUnchanged === undefined ? "" : result.productionUnchanged,
    result.publicFeedVerified === null || result.publicFeedVerified === undefined ? "" : result.publicFeedVerified,
    result.status || "",
    result.details || ""
  ];
  sheet.appendRow(row);
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1, 1, row.length).setWrap(true).setVerticalAlignment("middle");
  sheet.setRowHeight(lastRow, 48);
  var pass = result.status === "PASS";
  var summary = result.summary || (result.status + " | " + (result.details || "Recovery check recorded."));
  sheet.getRange(2, 1)
    .setValue(summary)
    .setBackground(pass ? "#d9ead3" : "#fff4cc")
    .setFontColor(pass ? "#205623" : "#7f6000");
  return control.getUrl() + "#gid=" + sheet.getSheetId();
}

function runBackupStatusCheck() {
  var now = new Date();
  var started = now.toISOString();
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var backup = latestBackupFile_();
  var backupAge = backupAgeHours_(backup, now);
  var backupBook = SpreadsheetApp.openById(backup.getId());
  var info = recoveryWorkbookInfo_(backupBook);
  var lastDrill = latestSuccessfulRecoveryDrill_(control, now);
  var assessment = recoveryAssessment_(backupAge, lastDrill ? lastDrill.ageDays : null, info.valid);
  var details = assessment.reasons.length
    ? assessment.reasons.join(" ")
    : "Latest backup schema is valid and the most recent isolated restore drill is current.";
  if (info.issues.length) details += " " + info.issues.join(" ");
  var result = {
    runId: "status-" + now.getTime(),
    runType: "Status check",
    started: started,
    completed: new Date().toISOString(),
    backupUrl: backup.getUrl(),
    backupId: backup.getId(),
    backupAgeHours: backupAge,
    status: assessment.status,
    details: details,
    summary: assessment.status + " | Backup age: " + Math.round(backupAge * 10) / 10 + " hours | " + details
  };
  result.statusSheetUrl = recordRecoveryStatus_(control, result);
  control.toast(details, "UBL backup status: " + result.status, 10);
  return JSON.stringify(result);
}

function recoveryCopyName_(prefix, now) {
  return prefix + Utilities.formatDate(now || new Date(), "America/New_York", "yyyy-MM-dd HHmmss");
}

function firstRecoveryDrillGameRow_(gamesSheet) {
  if (gamesSheet.getLastRow() < 2) return 0;
  var rows = gamesSheet.getRange(2, 1, gamesSheet.getLastRow() - 1, GAME_COLUMN_COUNT).getDisplayValues();
  for (var index = 0; index < rows.length; index += 1) {
    if (rows[index][0] && !isPilotIdentifier_(rows[index][0], rows[index][15])) return index + 2;
  }
  return 0;
}

function recoveryCellSnapshot_(sheet, row, columns) {
  return columns.map(function (column) {
    var cell = sheet.getRange(row, column);
    return { column: column, value: cell.getValue(), formula: cell.getFormula() };
  });
}

function restoreRecoveryCells_(sheet, row, cells) {
  cells.forEach(function (cellSnapshot) {
    var cell = sheet.getRange(row, cellSnapshot.column);
    if (cellSnapshot.formula) {
      cell.setFormula(cellSnapshot.formula);
    } else {
      cell.setValue(cellSnapshot.value);
    }
  });
}

function runBackupRecoveryDrill() {
  var startedAt = new Date();
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var result = {
    runId: "drill-" + startedAt.getTime(),
    runType: "Recovery drill",
    started: startedAt.toISOString(),
    completed: "",
    backupAgeHours: null,
    damageDetected: false,
    restoreVerified: false,
    productionUnchanged: false,
    publicFeedVerified: false,
    status: "FAIL",
    details: ""
  };
  try {
    var backup = latestBackupFile_();
    result.backupId = backup.getId();
    result.backupUrl = backup.getUrl();
    result.backupAgeHours = backupAgeHours_(backup, startedAt);
    var copy = backup.makeCopy(recoveryCopyName_(RECOVERY_DRILL_PREFIX, startedAt), backupFolder_());
    result.copyUrl = copy.getUrl();
    var drillBook = SpreadsheetApp.openById(copy.getId());
    var info = recoveryWorkbookInfo_(drillBook);
    if (!info.valid) throw new Error("Recovery copy schema failed: " + info.issues.join(" "));

    var liveBefore = spreadsheetFingerprint_(control);
    var publicBefore = buildPublicFeed_();
    var publicBeforeFingerprint = publicFeedFingerprint_(publicBefore);
    var drillBefore = spreadsheetFingerprint_(drillBook);
    var gamesSheet = drillBook.getSheetByName("Games");
    var gameRow = firstRecoveryDrillGameRow_(gamesSheet);
    if (!gameRow) throw new Error("No non-pilot game row was available for the recovery drill.");
    // Mutate only schedule and score fields. Rewriting date/time cells can coerce
    // text-backed dates into serial numbers and would not model a normal repair.
    var recoveryColumns = [5, 9, 10, 11, 12, 14];
    var originalCells = recoveryCellSnapshot_(gamesSheet, gameRow, recoveryColumns);
    gamesSheet.getRange(gameRow, 5).setValue("tbd");
    gamesSheet.getRange(gameRow, 9).setValue("championship-site");
    gamesSheet.getRange(gameRow, 10).setValue("Final");
    gamesSheet.getRange(gameRow, 11).setValue(999);
    gamesSheet.getRange(gameRow, 12).setValue(1);
    gamesSheet.getRange(gameRow, 14).setValue("RECOVERY DRILL SIMULATED DAMAGE");
    SpreadsheetApp.flush();
    result.damageDetected = spreadsheetFingerprint_(drillBook) !== drillBefore;

    restoreRecoveryCells_(gamesSheet, gameRow, originalCells);
    SpreadsheetApp.flush();
    result.restoreVerified = spreadsheetFingerprint_(drillBook) === drillBefore
      && recoveryWorkbookInfo_(drillBook).valid;
    result.productionUnchanged = spreadsheetFingerprint_(control) === liveBefore;
    var publicAfter = buildPublicFeed_();
    result.publicFeedVerified = publicFeedFingerprint_(publicAfter) === publicBeforeFingerprint
      && publicAfter.games.every(function (game) { return !isPilotGame_(game); });
    result.status = result.damageDetected && result.restoreVerified
      && result.productionUnchanged && result.publicFeedVerified ? "PASS" : "FAIL";
    result.details = result.status === "PASS"
      ? "Damage to schedule and score fields was detected and restored in an isolated copy. Production data and the public feed were unchanged."
      : "One or more drill checks failed. Review the boolean result columns before using this backup for recovery.";
  } catch (error) {
    result.details = "Recovery drill error: " + String(error && error.message ? error.message : error);
  }
  result.completed = new Date().toISOString();
  result.summary = result.status + " | " + result.details;
  result.statusSheetUrl = recordRecoveryStatus_(control, result);
  control.toast(result.details, "UBL recovery drill: " + result.status, 12);
  return JSON.stringify(result);
}

function createRecoveryCandidateFromLatestBackup() {
  var startedAt = new Date();
  var control = SpreadsheetApp.openById(SPREADSHEET_ID);
  var result = {
    runId: "candidate-" + startedAt.getTime(),
    runType: "Recovery candidate",
    started: startedAt.toISOString(),
    completed: "",
    backupAgeHours: null,
    status: "FAIL",
    details: ""
  };
  try {
    var liveBefore = spreadsheetFingerprint_(control);
    var publicBeforeFingerprint = publicFeedFingerprint_(buildPublicFeed_());
    var backup = latestBackupFile_();
    result.backupId = backup.getId();
    result.backupUrl = backup.getUrl();
    result.backupAgeHours = backupAgeHours_(backup, startedAt);
    var copy = backup.makeCopy(recoveryCopyName_(RECOVERY_CANDIDATE_PREFIX, startedAt), backupFolder_());
    result.copyUrl = copy.getUrl();
    var info = recoveryWorkbookInfo_(SpreadsheetApp.openById(copy.getId()));
    result.restoreVerified = info.valid;
    result.productionUnchanged = spreadsheetFingerprint_(control) === liveBefore;
    result.publicFeedVerified = publicFeedFingerprint_(buildPublicFeed_()) === publicBeforeFingerprint;
    result.status = info.valid && result.productionUnchanged && result.publicFeedVerified ? "PASS" : "FAIL";
    result.details = result.status === "PASS"
      ? "Validated recovery candidate created. No production data was changed. A system owner must approve any manual restore."
      : "Candidate checks failed: " + (info.issues.length ? info.issues.join(" ") : "production changed during candidate creation.");
  } catch (error) {
    result.details = "Recovery candidate error: " + String(error && error.message ? error.message : error);
  }
  result.completed = new Date().toISOString();
  result.summary = result.status + " | " + result.details;
  result.statusSheetUrl = recordRecoveryStatus_(control, result);
  control.toast(result.details, "UBL recovery candidate: " + result.status, 12);
  return JSON.stringify(result);
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
  ensureWorkflowSettings_(control);
  var gamesSheet = ensureGameReporterAssignments_(control);
  var now = new Date().toISOString();
  removePilotGameRows_(gamesSheet);

  var rows = [
    ["pilot-kings-01", "2026-07-20", "6:00 PM", "Boys Varsity", "kings-school", "wilton-baptist", "", "", "wilton-baptist-gym", "Scheduled", "", "", "", "PRIVATE PILOT - never published", now, PILOT_WEEK_ID, "kings-school"],
    ["pilot-wilton-01", "2026-07-23", "7:30 PM", "Girls Varsity", "wilton-baptist", "kings-school", "", "", "kings-school-gym", "Scheduled", "", "", "", "PRIVATE PILOT - never published", now, PILOT_WEEK_ID, "wilton-baptist"]
  ];
  var startRow = gamesSheet.getLastRow() + 1;
  var sourceRow = Math.max(2, startRow - 1);
  var source = gamesSheet.getRange(sourceRow, 1, 1, GAME_COLUMN_COUNT);
  var destination = gamesSheet.getRange(startRow, 1, rows.length, GAME_COLUMN_COUNT);
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
    var gameValues = control.getSheetByName("Games").getRange(gameRow, 1, 1, GAME_COLUMN_COUNT).getDisplayValues()[0];
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
  var identifiers = gamesSheet.getRange(2, 1, lastRow - 1, GAME_COLUMN_COUNT).getDisplayValues();
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
  var settings = workflowSettings_(control);
  var gameRow = findGameRow_(gamesSheet, gameId);
  var gameValues = gameRow ? gamesSheet.getRange(gameRow, 1, 1, GAME_COLUMN_COUNT).getValues()[0] : [];
  var game = gameValuesObject_(gameValues);
  var pilotGame = isPilotIdentifier_(gameId, gameValues[15]);
  if (!error && !gameRow) error = "The selected game could not be found.";
  if (!error && !portalGameBelongsToTeam_(game, portalConfig.teamId)) {
    error = "This game is not assigned to your program.";
  }
  if (!error && !portalCanReportGame_(game, portalConfig.teamId, settings)) {
    error = "The designated reporting team must submit this final score.";
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
  var gameValues = gameRow ? gamesSheet.getRange(gameRow, 1, 1, GAME_COLUMN_COUNT).getValues()[0] : [];
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
  var settings = workflowSettings_(control);
  sendOperationsNotification_(control, {
    key: "correction-request:" + requestId,
    type: "Correction request",
    to: settings.commissionerEmail,
    subject: "UBL score correction needs review: " + gameId,
    body: submittedBy + " requested " + awayScore + "-" + homeScore + " for " + gameId + ". Reason: " + reason
  });
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
  if (!error && workflowSettings_(spreadsheet).scoreReporterEnforced === true) {
    error = "Use the assigned team portal when score-reporter enforcement is active.";
  }

  var gameRow = findGameRow_(gamesSheet, gameId);
  var gameValues = gameRow ? gamesSheet.getRange(gameRow, 1, 1, GAME_COLUMN_COUNT).getValues()[0] : [];
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

function validatePublicFeed_(teams, venues, games, profiles) {
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
    if (game.scoreReporterTeamId && !teamIds[game.scoreReporterTeamId]) throw new Error(game.id + " has an unknown score reporter.");
    if (!game.stage && game.scoreReporterTeamId !== game.awayTeamId && game.scoreReporterTeamId !== game.homeTeamId) {
      throw new Error(game.id + " score reporter must be a participating team.");
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
  var profileIds = {};
  (profiles || []).forEach(function (profile) {
    if (!profile.id || profileIds[profile.id]) throw new Error("Duplicate or missing public profile ID: " + profile.id);
    profileIds[profile.id] = true;
    if (!teamIds[profile.teamId]) throw new Error(profile.id + " has an unknown team.");
    if (["Boys Varsity", "Girls Varsity"].indexOf(profile.division) < 0) throw new Error(profile.id + " has an invalid division.");
    if (profile.representativeEmail && !isVerifiedEmail_(profile.representativeEmail)) throw new Error(profile.id + " has an invalid email.");
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
