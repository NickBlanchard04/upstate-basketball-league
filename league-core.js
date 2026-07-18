(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.UBL_CORE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ACTIVE_STATUSES = new Set(["Scheduled", "Live"]);
  const FINAL_STATUSES = new Set(["Final", "Forfeit"]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeImageUrl(value, fallback = "assets/icons/icon-192.png") {
    const url = String(value || "");
    if (/^(?:assets\/|https:\/\/)/i.test(url)) return url;
    return fallback;
  }

  function publicVenueLabel(value, fallback = "Venue details pending") {
    const label = String(value || "").trim();
    if (!label || /\b(?:TBD|to\s+be\s+confirmed|placeholder)\b/i.test(label)) return fallback;
    return label;
  }

  function numberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function csvRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const input = String(text || "").replace(/^\uFEFF/, "");

    for (let index = 0; index < input.length; index += 1) {
      const character = input[index];
      if (quoted) {
        if (character === '"' && input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
        } else {
          field += character;
        }
      } else if (character === '"') {
        quoted = true;
      } else if (character === ",") {
        row.push(field);
        field = "";
      } else if (character === "\n") {
        row.push(field.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += character;
      }
    }

    if (field || row.length) {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
    }
    return rows;
  }

  function parseScoreFeedCsv(text) {
    const rows = csvRows(text);
    if (!rows.length) throw new Error("Score feed is empty.");
    const requiredHeaders = [
      "Game ID",
      "Date",
      "Time",
      "Division",
      "Away Team ID",
      "Home Team ID",
      "Venue ID",
      "Status",
      "Away Score",
      "Home Score",
      "Week ID"
    ];
    const headers = rows.shift().map((value) => String(value || "").trim());
    const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
    const missing = requiredHeaders.filter((header) => indexes[header] === undefined);
    if (missing.length) throw new Error(`Score feed is missing: ${missing.join(", ")}.`);

    const games = rows.filter((values) => String(values[indexes["Game ID"]] || "").trim()).map((values) => ({
      id: String(values[indexes["Game ID"]] || "").trim(),
      date: String(values[indexes.Date] || "").trim(),
      time: String(values[indexes.Time] || "").trim(),
      division: String(values[indexes.Division] || "").trim(),
      awayTeamId: String(values[indexes["Away Team ID"]] || "").trim(),
      homeTeamId: String(values[indexes["Home Team ID"]] || "").trim(),
      venueId: String(values[indexes["Venue ID"]] || "").trim(),
      status: String(values[indexes.Status] || "Scheduled").trim() || "Scheduled",
      awayScore: numberOrNull(values[indexes["Away Score"]]),
      homeScore: numberOrNull(values[indexes["Home Score"]]),
      weekId: String(values[indexes["Week ID"]] || "").trim()
    }));
    if (!games.length) throw new Error("Score feed contains no games.");
    return games;
  }

  function mergeScoreFeed(feed, scoreGames) {
    if (!feed || !Array.isArray(feed.games)) throw new Error("Base feed has no games.");
    if (!Array.isArray(scoreGames) || !scoreGames.length) return feed;
    const baseGames = new Map(feed.games.map((game) => [game.id, game]));
    return {
      ...feed,
      games: scoreGames.map((scoreGame) => ({
        ...(baseGames.get(scoreGame.id) || {}),
        ...scoreGame
      }))
    };
  }

  function validateFeed(feed) {
    const errors = [];
    if (!feed || typeof feed !== "object") return ["Feed must be an object."];
    for (const key of ["games", "teams", "venues"]) {
      if (!Array.isArray(feed[key])) errors.push(`${key} must be an array.`);
    }
    if (errors.length) return errors;

    const teamIds = new Set();
    for (const team of feed.teams) {
      if (!team.id) errors.push("Every team requires an id.");
      if (teamIds.has(team.id)) errors.push(`Duplicate team id: ${team.id}`);
      teamIds.add(team.id);
    }

    const venueIds = new Set();
    for (const venue of feed.venues) {
      if (!venue.id) errors.push("Every venue requires an id.");
      if (venueIds.has(venue.id)) errors.push(`Duplicate venue id: ${venue.id}`);
      venueIds.add(venue.id);
    }

    const gameIds = new Set();
    const validStatuses = new Set(["Scheduled", "Live", "Final", "Postponed", "Cancelled", "Forfeit"]);
    for (const game of feed.games) {
      if (!game.id) errors.push("Every game requires an id.");
      if (gameIds.has(game.id)) errors.push(`Duplicate game id: ${game.id}`);
      gameIds.add(game.id);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(game.date || "")) errors.push(`${game.id}: invalid date.`);
      if (!["Boys Varsity", "Girls Varsity"].includes(game.division)) errors.push(`${game.id}: invalid division.`);
      if (game.awayTeamId && !teamIds.has(game.awayTeamId)) errors.push(`${game.id}: unknown away team.`);
      if (game.homeTeamId && !teamIds.has(game.homeTeamId)) errors.push(`${game.id}: unknown home team.`);
      if (game.venueId && !venueIds.has(game.venueId)) errors.push(`${game.id}: unknown venue.`);
      if (!validStatuses.has(game.status || "Scheduled")) errors.push(`${game.id}: invalid status.`);
      if (game.awayTeamId && game.awayTeamId === game.homeTeamId) errors.push(`${game.id}: home and away teams match.`);
      if (!game.stage && (!game.awayTeamId || !game.homeTeamId)) errors.push(`${game.id}: regular-season teams are required.`);
      if (!game.venueId) errors.push(`${game.id}: venue is required.`);
      for (const score of [game.awayScore, game.homeScore]) {
        const number = numberOrNull(score);
        if (number !== null && (!Number.isInteger(number) || number < 0)) errors.push(`${game.id}: scores must be nonnegative whole numbers.`);
      }
      if (FINAL_STATUSES.has(game.status)) {
        if (numberOrNull(game.awayScore) === null || numberOrNull(game.homeScore) === null) {
          errors.push(`${game.id}: final games require both scores.`);
        } else if (numberOrNull(game.awayScore) === numberOrNull(game.homeScore)) {
          errors.push(`${game.id}: final games cannot end tied.`);
        }
      }
    }
    return errors;
  }

  function settingsObject(settings) {
    if (!settings) return {};
    if (!Array.isArray(settings)) return { ...settings };
    return Object.fromEntries(settings.map((item) => [item.key, item.value]));
  }

  function timeParts(time) {
    const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return { hours, minutes };
  }

  function timezoneOffsetAt(utcMs, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(utcMs));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const asUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );
    return asUtc - utcMs;
  }

  function gameStartTime(game, timeZone = "America/New_York") {
    const clock = timeParts(game.time);
    if (!clock || !/^\d{4}-\d{2}-\d{2}$/.test(game.iso || game.date || "")) return NaN;
    const [year, month, day] = String(game.iso || game.date).split("-").map(Number);
    const initial = Date.UTC(year, month - 1, day, clock.hours, clock.minutes, 0);
    const firstOffset = timezoneOffsetAt(initial, timeZone);
    const adjusted = initial - firstOffset;
    const secondOffset = timezoneOffsetAt(adjusted, timeZone);
    return initial - secondOffset;
  }

  function formatGameDate(iso, timeZone = "America/New_York") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "Date announcement pending";
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric"
    }).format(new Date(`${iso}T12:00:00Z`));
  }

  function getCurrentGames(games, now = Date.now(), settings = {}) {
    const timeZone = settings.timezone || "America/New_York";
    const duration = Number(settings.gameDurationMinutes || 90) * 60 * 1000;
    return games
      .filter((game) => ACTIVE_STATUSES.has(game.status || "Scheduled"))
      .filter((game) => {
        const start = gameStartTime(game, timeZone);
        return Number.isFinite(start) && now >= start && now < start + duration;
      })
      .sort((a, b) => gameStartTime(b, timeZone) - gameStartTime(a, timeZone));
  }

  function getUpcomingGames(games, now = Date.now(), settings = {}, limit = Infinity) {
    const timeZone = settings.timezone || "America/New_York";
    const current = getCurrentGames(games, now, settings);
    const future = games
      .filter((game) => ACTIVE_STATUSES.has(game.status || "Scheduled"))
      .filter((game) => gameStartTime(game, timeZone) > now)
      .sort((a, b) => gameStartTime(a, timeZone) - gameStartTime(b, timeZone));
    return [...current, ...future.filter((game) => !current.includes(game))].slice(0, limit);
  }

  function finishedRegularGames(games, division) {
    return games.filter((game) =>
      game.division === division &&
      !game.stage &&
      FINAL_STATUSES.has(game.status) &&
      numberOrNull(game.awayScore) !== null &&
      numberOrNull(game.homeScore) !== null &&
      game.awayId &&
      game.homeId
    );
  }

  function calculateStandings(programs, games, division) {
    const rows = programs
      .filter((program) => program.divisions.includes(division))
      .map((program) => ({
        programId: program.id,
        name: program.name,
        wins: 0,
        losses: 0,
        pf: 0,
        pa: 0,
        headToHeadWins: 0
      }));
    const byId = new Map(rows.map((row) => [row.programId, row]));
    const finished = finishedRegularGames(games, division);

    for (const game of finished) {
      const away = byId.get(game.awayId);
      const home = byId.get(game.homeId);
      if (!away || !home) continue;
      const awayScore = numberOrNull(game.awayScore);
      const homeScore = numberOrNull(game.homeScore);
      away.pf += awayScore;
      away.pa += homeScore;
      home.pf += homeScore;
      home.pa += awayScore;
      if (awayScore > homeScore) {
        away.wins += 1;
        home.losses += 1;
      } else if (homeScore > awayScore) {
        home.wins += 1;
        away.losses += 1;
      }
    }

    const percentage = (row) => {
      const total = row.wins + row.losses;
      return total ? row.wins / total : 0;
    };

    const grouped = new Map();
    for (const row of rows) {
      const key = percentage(row).toFixed(6);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }

    for (const group of grouped.values()) {
      if (group.length < 2) continue;
      const ids = new Set(group.map((row) => row.programId));
      for (const game of finished) {
        if (!ids.has(game.awayId) || !ids.has(game.homeId)) continue;
        const winner = numberOrNull(game.awayScore) > numberOrNull(game.homeScore) ? game.awayId : game.homeId;
        const row = group.find((item) => item.programId === winner);
        if (row) row.headToHeadWins += 1;
      }
    }

    return rows.sort((a, b) =>
      percentage(b) - percentage(a) ||
      b.headToHeadWins - a.headToHeadWins ||
      (b.pf - b.pa) - (a.pf - a.pa) ||
      a.pa - b.pa ||
      a.name.localeCompare(b.name)
    );
  }

  function winnerId(game) {
    if (!game || !FINAL_STATUSES.has(game.status)) return "";
    const away = numberOrNull(game.awayScore);
    const home = numberOrNull(game.homeScore);
    if (away === null || home === null || away === home) return "";
    return away > home ? game.awayId : game.homeId;
  }

  function bracketState(programs, games, division) {
    const standings = calculateStandings(programs, games, division);
    const seeds = standings.map((row) => row.programId);
    const playoffGames = games.filter((game) => game.division === division && game.stage);
    const playIn = playoffGames.find((game) => game.stage === "Play-in");
    const semifinals = playoffGames.filter((game) => game.stage === "Semifinal");
    const championship = playoffGames.find((game) => game.stage === "Championship");
    return {
      seeds,
      playInWinner: winnerId(playIn),
      semifinalWinners: semifinals.map(winnerId).filter(Boolean),
      champion: winnerId(championship)
    };
  }

  function normalizeFeed(feed, fallback) {
    const errors = validateFeed(feed);
    if (errors.length) throw new Error(errors.join(" "));
    const settings = {
      timezone: "America/New_York",
      gameDurationMinutes: 90,
      showSimultaneousLiveGames: true,
      ...settingsObject(feed.settings)
    };
    settings.gameDurationMinutes = Number(settings.gameDurationMinutes || 90);
    settings.showSimultaneousLiveGames = String(settings.showSimultaneousLiveGames) !== "false";

    const fallbackTeams = new Map(fallback.programs.map((program) => [program.id, program]));
    const programs = feed.teams.map((remote) => {
      const program = fallbackTeams.get(remote.id) || {
        id: remote.id,
        name: remote.name,
        short: remote.short,
        logo: safeImageUrl(remote.logo),
        divisions: remote.divisions || [],
        summary: remote.summary || "UBL member program.",
        homeGym: "",
        homeAddress: "",
        representativeEmail: "",
        teams: {}
      };
      const divisions = remote.divisions?.length ? remote.divisions : program.divisions;
      return {
        ...program,
        name: remote.name || program.name,
        short: remote.short || program.short,
        logo: program.logoStatus ? safeImageUrl(program.logo) : safeImageUrl(remote.logo, program.logo),
        divisions,
        summary: remote.summary || program.summary,
        status: remote.status || "Active",
        teams: Object.fromEntries(divisions.map((division) => [division, program.teams?.[division] || {
          headCoach: { name: "", experience: "", photo: "" },
          assistants: []
        }]))
      };
    });

    const venues = new Map(feed.venues.map((venue) => [venue.id, venue]));
    const normalizedGames = feed.games.map((game) => {
      const venue = venues.get(game.venueId) || {};
      return {
        id: game.id,
        iso: game.date,
        date: formatGameDate(game.date, settings.timezone),
        time: game.time,
        division: game.division,
        awayId: game.awayTeamId || "",
        homeId: game.homeTeamId || "",
        awayName: game.awayName || "",
        homeName: game.homeName || "",
        venueId: game.venueId || "",
        location: publicVenueLabel(venue.mapLabel || venue.name),
        locationAddress: venue.address || "",
        status: game.status || "Scheduled",
        awayScore: numberOrNull(game.awayScore),
        homeScore: numberOrNull(game.homeScore),
        stage: game.stage || "",
        note: game.notes || "",
        lastUpdated: game.lastUpdated || feed.lastUpdated || "",
        weekId: game.weekId || ""
      };
    });

    const gamesByWeek = new Map();
    for (const game of normalizedGames) {
      if (!gamesByWeek.has(game.weekId)) gamesByWeek.set(game.weekId, []);
      gamesByWeek.get(game.weekId).push(game);
    }

    const scheduleWeeks = fallback.scheduleWeeks.map((week) => ({
      ...week,
      games: (gamesByWeek.get(week.id) || []).sort((a, b) => gameStartTime(a, settings.timezone) - gameStartTime(b, settings.timezone))
    }));

    const knownWeeks = new Set(scheduleWeeks.map((week) => week.id));
    for (const [weekId, games] of gamesByWeek) {
      if (!weekId || knownWeeks.has(weekId)) continue;
      scheduleWeeks.push({
        id: weekId,
        label: weekId.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "),
        range: games.length ? games[0].date.replace(/^\w+\s/, "") : "",
        type: games.some((game) => game.stage) ? "playoff" : "regular",
        note: games[0]?.note || "",
        games
      });
    }

    return {
      ...fallback,
      programs,
      scheduleWeeks,
      games: normalizedGames,
      venues: feed.venues,
      settings,
      lastUpdated: feed.lastUpdated || "",
      standings: {
        "Boys Varsity": calculateStandings(programs, normalizedGames, "Boys Varsity"),
        "Girls Varsity": calculateStandings(programs, normalizedGames, "Girls Varsity")
      }
    };
  }

  return {
    ACTIVE_STATUSES,
    FINAL_STATUSES,
    bracketState,
    calculateStandings,
    escapeHtml,
    formatGameDate,
    gameStartTime,
    getCurrentGames,
    getUpcomingGames,
    normalizeFeed,
    numberOrNull,
    parseScoreFeedCsv,
    publicVenueLabel,
    safeImageUrl,
    settingsObject,
    slug,
    mergeScoreFeed,
    validateFeed,
    winnerId
  };
});
