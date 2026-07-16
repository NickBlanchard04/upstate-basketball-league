var GALLERY_CACHE_KEY = "ubl-approved-gallery-v1";
var ANALYTICS_SPREADSHEET_ID = "1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE";
var ANALYTICS_SHEET = "Site Analytics";
var ANALYTICS_CHANNEL = "ubl-public-v1";
var ANALYTICS_DAILY_LIMIT = 5000;
var ANALYTICS_PAGES = {
  "index.html": true,
  "schedule.html": true,
  "standings.html": true,
  "teams.html": true,
  "bracket.html": true,
  "rules.html": true,
  "gallery.html": true,
  "about.html": true,
  "404.html": true
};
var PENDING_GALLERY_FOLDERS = [
  "16RKC0BChYXUveLqSrnppuWmXkDTXrDLI",
  "1Yy_zD5T_AaKsWnXxL9GvUFx2QkpyUnFw",
  "1TUJltYF_2Ff_nruVjzXMzMH9dYoWgvdI",
  "1gkkKBm5a5rZ3zMS-ksPk0Y-TmiRB2Zfy",
  "1gh19kCFvEgZvG-63IkyppW1Y82GqEgRT"
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

function securePendingGalleryPhotos_() {
  PENDING_GALLERY_FOLDERS.forEach(function (folderId) {
    secureFolderTree_(DriveApp.getFolderById(folderId));
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
