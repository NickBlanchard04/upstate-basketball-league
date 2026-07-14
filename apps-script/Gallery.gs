var GALLERY_CACHE_KEY = "ubl-approved-gallery-v1";
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
