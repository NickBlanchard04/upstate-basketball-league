var SPREADSHEET_ID = "1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE";
var CACHE_KEY = "ubl-public-feed-v1";

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
  var now = new Date().toISOString();

  if (sheet.getName() === "Games" && event.range.getRow() > 1) {
    sheet.getRange(event.range.getRow(), 15).setValue(now);
  }

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
