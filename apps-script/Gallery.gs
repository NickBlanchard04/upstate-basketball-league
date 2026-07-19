var GALLERY_CACHE_KEY = "ubl-approved-gallery-v1";
var ANALYTICS_SPREADSHEET_ID = "1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE";
var ANALYTICS_SHEET = "Site Analytics";
var ANALYTICS_CHANNEL = "ubl-public-v1";
var ANALYTICS_DAILY_LIMIT = 5000;
var GALLERY_MODERATION_SHEET = "Gallery Moderation";
var GALLERY_REJECTED_FOLDER = "UBL Rejected Gallery Uploads";
var GALLERY_MODERATION_HEADERS = [
  "File ID", "Thumbnail", "Filename", "Team ID", "Team", "Division", "Submitted By",
  "Uploaded At", "Fingerprint", "Duplicate Of", "Decision", "Status", "Processed At", "File URL"
];
var ANALYTICS_PAGES = {
  "index.html": true,
  "schedule.html": true,
  "standings.html": true,
  "teams.html": true,
  "bracket.html": true,
  "rules.html": true,
  "gallery.html": true,
  "sponsors.html": true,
  "about.html": true,
  "404.html": true
};
var PENDING_GALLERY_FOLDERS = [
  { id: "16RKC0BChYXUveLqSrnppuWmXkDTXrDLI", teamId: "kings-school", teamName: "The King's School" },
  { id: "1Yy_zD5T_AaKsWnXxL9GvUFx2QkpyUnFw", teamId: "perth", teamName: "Perth" },
  { id: "1TUJltYF_2Ff_nruVjzXMzMH9dYoWgvdI", teamId: "wilton-baptist", teamName: "Wilton Baptist" },
  { id: "1gkkKBm5a5rZ3zMS-ksPk0Y-TmiRB2Zfy", teamId: "hv-rocks", teamName: "HV Rocks" },
  { id: "1gh19kCFvEgZvG-63IkyppW1Y82GqEgRT", teamId: "hv-flames", teamName: "HV Flames" }
];
var GALLERY_FOLDERS = [
  {
    teamId: "kings-school",
    teamName: "The King's School",
    folders: [
      { id: "1P3rCTp3On_JnlRYxckVZmqKuqE-m35RX", division: "Boys Varsity" },
      { id: "1NSWBLfoDgyxE586es83i7Dt0PYu9Y75u", division: "Girls Varsity" }
    ]
  },
  {
    teamId: "perth",
    teamName: "Perth",
    folders: [
      { id: "1Knl09WOE10oWzjrKIBjbQ0ejOfkwyLvp", division: "Boys Varsity" },
      { id: "1UXXT6wI9L4KCTQmitM0bTk9KTCHJKSc8", division: "Girls Varsity" }
    ]
  },
  {
    teamId: "wilton-baptist",
    teamName: "Wilton Baptist",
    folders: [
      { id: "16gpQu0CV8yGD7IHJA0HX2DAwazMlfm6G", division: "Boys Varsity" },
      { id: "1TwjXcq-kTb9jMcwCAC4rkQjd940yZ4T2", division: "Girls Varsity" }
    ]
  },
  {
    teamId: "hv-rocks",
    teamName: "HV Rocks",
    folders: [{ id: "1yCox5NppdHUgCjh-kYHylrDYA0DNiXnI", division: "Boys Varsity" }]
  },
  {
    teamId: "hv-flames",
    teamName: "HV Flames",
    folders: [{ id: "1IEmvruXY1oz3gmweB0bVKidUVpMqCB6f", division: "Girls Varsity" }]
  }
];

function doGet() {
  try {
    securePendingGalleryPhotos_();
    var cache = CacheService.getScriptCache();
    var cached = cache.get(GALLERY_CACHE_KEY);
    if (cached) return galleryJson_(JSON.parse(cached));

    var payload = buildApprovedGallery_();
    var serialized = JSON.stringify(payload);
    if (serialized.length < 90000) cache.put(GALLERY_CACHE_KEY, serialized, 60);
    return galleryJson_(payload);
  } catch (error) {
    return galleryJson_({
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      photos: [],
      error: "Gallery feed unavailable"
    });
  }
}

function doPost(event) {
  try {
    var params = event && event.parameter ? event.parameter : {};
    if (params.event !== "pageview" || params.channel !== ANALYTICS_CHANNEL) {
      return analyticsResult_(false, "invalid-request");
    }

    var page = analyticsPage_(params.page);
    if (!page) return analyticsResult_(false, "invalid-page");

    var row = [
      new Date().toISOString(),
      page,
      analyticsText_(params.referrer, 100),
      analyticsDevice_(params.device),
      analyticsViewport_(params.viewport),
      analyticsNumber_(params.loadMs, 120000),
      analyticsNumber_(params.lcpMs, 120000),
      analyticsNumber_(params.cls, 10),
      ANALYTICS_CHANNEL
    ];

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return analyticsResult_(false, "busy");
    try {
      if (!analyticsWithinDailyLimit_()) return analyticsResult_(false, "rate-limited");
      var spreadsheet;
      try {
        spreadsheet = SpreadsheetApp.openById(ANALYTICS_SPREADSHEET_ID);
      } catch (openError) {
        console.error("Analytics spreadsheet open failed", openError);
        return analyticsResult_(false, "spreadsheet-unavailable");
      }

      var sheet = spreadsheet.getSheetByName(ANALYTICS_SHEET);
      if (!sheet) return analyticsResult_(false, "sheet-unavailable");

      try {
        var targetRow = Math.max(sheet.getLastRow() + 1, 2);
        if (targetRow > sheet.getMaxRows()) sheet.insertRowAfter(sheet.getMaxRows());
        sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
      } catch (writeError) {
        console.error("Analytics row write failed", writeError);
        return analyticsResult_(false, "row-write-failed");
      }
      analyticsIncrementDailyCount_();
    } finally {
      lock.releaseLock();
    }

    return analyticsResult_(true, "accepted");
  } catch (error) {
    console.error("Analytics write failed", error);
    return analyticsResult_(false, "write-failed");
  }
}

function analyticsResult_(accepted, reason) {
  return galleryJson_({ accepted: accepted, reason: reason });
}

function verifyAnalyticsDestination() {
  var sheet = SpreadsheetApp.openById(ANALYTICS_SPREADSHEET_ID).getSheetByName(ANALYTICS_SHEET);
  if (!sheet) throw new Error("Analytics destination is missing");
  return sheet.getName();
}

function analyticsPage_(value) {
  var page = analyticsText_(value, 40).replace(/^\/+/, "");
  if (!page) page = "index.html";
  return ANALYTICS_PAGES[page] ? page : "";
}

function analyticsText_(value, maxLength) {
  return String(value || "").replace(/[\r\n\t]/g, " ").trim().slice(0, maxLength);
}

function analyticsDevice_(value) {
  var device = analyticsText_(value, 10).toLowerCase();
  return /^(mobile|tablet|desktop)$/.test(device) ? device : "unknown";
}

function analyticsViewport_(value) {
  var viewport = analyticsText_(value, 20).toLowerCase();
  return /^\d{2,5}x\d{2,5}$/.test(viewport) ? viewport : "";
}

function analyticsNumber_(value, max) {
  var number = Number(value);
  if (!isFinite(number) || number < 0) return "";
  return Math.round(Math.min(number, max) * 1000) / 1000;
}

function analyticsDayKey_() {
  return "analytics:" + Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd");
}

function analyticsWithinDailyLimit_() {
  var count = Number(PropertiesService.getScriptProperties().getProperty(analyticsDayKey_()) || 0);
  return count < ANALYTICS_DAILY_LIMIT;
}

function analyticsIncrementDailyCount_() {
  var properties = PropertiesService.getScriptProperties();
  var key = analyticsDayKey_();
  properties.setProperty(key, String(Number(properties.getProperty(key) || 0) + 1));
}

function installGalleryModerationAutomation() {
  var control = SpreadsheetApp.openById(ANALYTICS_SPREADSHEET_ID);
  ensureGalleryModerationDashboard_(control);
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "handleGalleryModerationEdit") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("handleGalleryModerationEdit")
    .forSpreadsheet(ANALYTICS_SPREADSHEET_ID)
    .onEdit()
    .create();
  return syncGalleryModerationDashboard();
}

function ensureGalleryModerationDashboard_(control) {
  var sheet = control.getSheetByName(GALLERY_MODERATION_SHEET);
  if (!sheet) sheet = control.insertSheet(GALLERY_MODERATION_SHEET);
  if (sheet.getMaxColumns() < GALLERY_MODERATION_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), GALLERY_MODERATION_HEADERS.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, GALLERY_MODERATION_HEADERS.length).setValues([GALLERY_MODERATION_HEADERS]);
  sheet.getRange(1, 1, 1, GALLERY_MODERATION_HEADERS.length)
    .setBackground("#020f22")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setWrap(true);
  sheet.setFrozenRows(1);
  var dataRows = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(2, 6, dataRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(["Boys Varsity", "Girls Varsity"], true).setAllowInvalid(false).build()
  );
  sheet.getRange(2, 11, dataRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(["Pending", "Approve", "Reject"], true).setAllowInvalid(false).build()
  );
  sheet.hideColumns(1);
  sheet.hideColumns(9, 2);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 260);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 160);
  sheet.setColumnWidth(6, 115);
  sheet.setColumnWidth(7, 210);
  sheet.setColumnWidth(8, 165);
  sheet.setColumnWidth(11, 100);
  sheet.setColumnWidth(12, 150);
  sheet.setColumnWidth(13, 165);
  sheet.setColumnWidth(14, 260);
  return sheet;
}

function galleryTeamConfig_(teamId) {
  for (var index = 0; index < GALLERY_FOLDERS.length; index += 1) {
    if (GALLERY_FOLDERS[index].teamId === teamId) return GALLERY_FOLDERS[index];
  }
  return null;
}

function galleryDivisionFolder_(teamId, division) {
  var team = galleryTeamConfig_(teamId);
  if (!team) return null;
  for (var index = 0; index < team.folders.length; index += 1) {
    if (team.folders[index].division === division) return team.folders[index];
  }
  return null;
}

function galleryFingerprint_(file) {
  var bytes = file.getBlob().getBytes();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
}

function gallerySubmitter_(file) {
  try {
    return file.getOwner().getEmail() || "";
  } catch (error) {
    return "Uploader metadata unavailable";
  }
}

function collectPendingGalleryFiles_(folderConfig, folder, output) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (!/^image\//i.test(file.getMimeType())) continue;
    securePendingPhoto_(file);
    output.push({ config: folderConfig, file: file });
  }
  var children = folder.getFolders();
  while (children.hasNext()) collectPendingGalleryFiles_(folderConfig, children.next(), output);
}

function approvedGalleryFingerprintIndex_() {
  var index = {};
  GALLERY_FOLDERS.forEach(function (team) {
    team.folders.forEach(function (folderConfig) {
      var files = DriveApp.getFolderById(folderConfig.id).getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if (!/^image\//i.test(file.getMimeType())) continue;
        try {
          index[galleryFingerprint_(file)] = file.getId();
        } catch (error) {
          console.error("Unable to fingerprint approved photo", file.getId(), error);
        }
      }
    });
  });
  return index;
}

function moderationRowsByFileId_(sheet) {
  var rows = {};
  if (sheet.getLastRow() < 2) return rows;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, GALLERY_MODERATION_HEADERS.length).getValues().forEach(function (row, index) {
    if (String(row[0] || "").trim()) rows[String(row[0]).trim()] = { rowNumber: index + 2, values: row };
  });
  return rows;
}

function syncGalleryModerationDashboard() {
  var control = SpreadsheetApp.openById(ANALYTICS_SPREADSHEET_ID);
  var sheet = ensureGalleryModerationDashboard_(control);
  var existing = moderationRowsByFileId_(sheet);
  var fingerprints = approvedGalleryFingerprintIndex_();
  Object.keys(existing).forEach(function (fileId) {
    var row = existing[fileId].values;
    if (String(row[8] || "") && String(row[11] || "") !== "Rejected") fingerprints[String(row[8])] = fileId;
  });
  var pending = [];
  PENDING_GALLERY_FOLDERS.forEach(function (folderConfig) {
    collectPendingGalleryFiles_(folderConfig, DriveApp.getFolderById(folderConfig.id), pending);
  });
  var added = 0;
  var duplicates = 0;
  pending.forEach(function (item) {
    var file = item.file;
    var fileId = file.getId();
    var prior = existing[fileId];
    var fingerprint = prior ? String(prior.values[8] || "") : "";
    if (!fingerprint) fingerprint = galleryFingerprint_(file);
    var duplicateOf = fingerprints[fingerprint] && fingerprints[fingerprint] !== fileId ? fingerprints[fingerprint] : "";
    if (duplicateOf) duplicates += 1;
    if (prior) {
      if (String(prior.values[11] || "") === "Pending review" || String(prior.values[11] || "") === "Duplicate review") {
        sheet.getRange(prior.rowNumber, 9, 1, 4).setValues([[
          fingerprint,
          duplicateOf,
          prior.values[10] || "Pending",
          duplicateOf ? "Duplicate review" : "Pending review"
        ]]);
      }
    } else {
      var team = galleryTeamConfig_(item.config.teamId);
      var defaultDivision = team && team.folders.length === 1 ? team.folders[0].division : "";
      sheet.appendRow([
        fileId,
        "",
        file.getName(),
        item.config.teamId,
        item.config.teamName,
        defaultDivision,
        gallerySubmitter_(file),
        file.getDateCreated().toISOString(),
        fingerprint,
        duplicateOf,
        "Pending",
        duplicateOf ? "Duplicate review" : "Pending review",
        "",
        file.getUrl()
      ]);
      var rowNumber = sheet.getLastRow();
      sheet.getRange(rowNumber, 2).setFormula('=IMAGE("https://drive.google.com/thumbnail?id=' + fileId + '&sz=w160")');
      sheet.setRowHeight(rowNumber, 105);
      added += 1;
    }
    if (!fingerprints[fingerprint]) fingerprints[fingerprint] = fileId;
  });
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, GALLERY_MODERATION_HEADERS.length).setWrap(true).setVerticalAlignment("middle");
  }
  return JSON.stringify({ pending: pending.length, added: added, duplicates: duplicates });
}

function rejectedGalleryFolder_(teamId) {
  var roots = DriveApp.getFoldersByName(GALLERY_REJECTED_FOLDER);
  var root = roots.hasNext() ? roots.next() : DriveApp.createFolder(GALLERY_REJECTED_FOLDER);
  root.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
  var children = root.getFoldersByName(teamId);
  var folder = children.hasNext() ? children.next() : root.createFolder(teamId);
  folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
  return folder;
}

function processGalleryModerationRow_(control, rowNumber) {
  var sheet = ensureGalleryModerationDashboard_(control);
  var row = sheet.getRange(rowNumber, 1, 1, GALLERY_MODERATION_HEADERS.length).getValues()[0];
  var fileId = String(row[0] || "").trim();
  var decision = String(row[10] || "").trim();
  if (!fileId || (decision !== "Approve" && decision !== "Reject")) return "No decision";
  var file = DriveApp.getFileById(fileId);
  var processedAt = new Date().toISOString();
  if (decision === "Reject") {
    securePendingPhoto_(file);
    file.moveTo(rejectedGalleryFolder_(String(row[3] || "").trim()));
    sheet.getRange(rowNumber, 12, 1, 2).setValues([["Rejected", processedAt]]);
    CacheService.getScriptCache().remove(GALLERY_CACHE_KEY);
    return "Rejected";
  }
  if (String(row[9] || "").trim()) {
    sheet.getRange(rowNumber, 12).setValue("Duplicate blocked");
    return "Duplicate blocked";
  }
  var folderConfig = galleryDivisionFolder_(String(row[3] || "").trim(), String(row[5] || "").trim());
  if (!folderConfig) {
    sheet.getRange(rowNumber, 12).setValue("Choose a valid division");
    return "Choose a valid division";
  }
  file.moveTo(DriveApp.getFolderById(folderConfig.id));
  ensureApprovedPhotoIsPublic_(file);
  sheet.getRange(rowNumber, 12, 1, 2).setValues([["Approved", processedAt]]);
  CacheService.getScriptCache().remove(GALLERY_CACHE_KEY);
  return "Approved";
}

function handleGalleryModerationEdit(event) {
  if (!event || !event.range || !event.source) return;
  var range = event.range;
  if (range.getSheet().getName() !== GALLERY_MODERATION_SHEET) return;
  if (range.getRow() < 2 || range.getColumn() !== 11 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    processGalleryModerationRow_(event.source, range.getRow());
  } finally {
    lock.releaseLock();
  }
}

function securePendingGalleryPhotos_() {
  PENDING_GALLERY_FOLDERS.forEach(function (folderConfig) {
    secureFolderTree_(DriveApp.getFolderById(folderConfig.id));
  });
}

function secureFolderTree_(folder) {
  var files = folder.getFiles();
  while (files.hasNext()) securePendingPhoto_(files.next());

  var childFolders = folder.getFolders();
  while (childFolders.hasNext()) secureFolderTree_(childFolders.next());
}

function securePendingPhoto_(file) {
  if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
  }
}

function buildApprovedGallery_() {
  var photos = [];
  GALLERY_FOLDERS.forEach(function (team) {
    team.folders.forEach(function (folderConfig) {
      var files = DriveApp.getFolderById(folderConfig.id).getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if (!/^image\//i.test(file.getMimeType())) continue;
        ensureApprovedPhotoIsPublic_(file);
        photos.push(galleryPhotoRecord_(team, folderConfig.division, file));
      }
    });
  });

  photos.sort(function (left, right) {
    return right.createdAt.localeCompare(left.createdAt);
  });

  return {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    photos: photos
  };
}

function galleryPhotoRecord_(team, division, file) {
  var id = file.getId();
  return {
    id: id,
    teamId: team.teamId,
    teamName: team.teamName,
    division: division,
    season: "2026-27 season",
    alt: team.teamName + " " + division + " basketball photo",
    createdAt: file.getDateCreated().toISOString(),
    previewUrl: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w600",
    fullUrl: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1600"
  };
}

function ensureApprovedPhotoIsPublic_(file) {
  if (file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK || file.getSharingPermission() !== DriveApp.Permission.VIEW) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
}

function galleryJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
