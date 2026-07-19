let league = window.UBL_DATA;
const core = window.UBL_CORE;
const { ACTIVE_STATUSES, FINAL_STATUSES, escapeHtml, publicVenueLabel, safeImageUrl } = core;

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const menuToggleLabel = menuToggle?.querySelector(".sr-only");
siteNav?.querySelector("a.active")?.setAttribute("aria-current", "page");

function closeSiteMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  if (menuToggleLabel) menuToggleLabel.textContent = "Open menu";
  siteNav?.classList.remove("open");
  document.body.classList.remove("menu-open");
}

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  if (menuToggleLabel) menuToggleLabel.textContent = open ? "Open menu" : "Close menu";
  siteNav.classList.toggle("open", !open);
  document.body.classList.toggle("menu-open", !open);
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeSiteMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSiteMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) closeSiteMenu();
});

function setIdentityFactExpanded(item, expanded) {
  const button = item.querySelector(".identity-toggle");
  const panel = item.querySelector(".identity-panel");
  item.classList.toggle("is-expanded", expanded);
  button?.setAttribute("aria-expanded", String(expanded));
  panel?.setAttribute("aria-hidden", String(!expanded));
}

function initializeIdentityAccordion() {
  const container = document.querySelector("[data-identity-accordion]");
  if (!container) return;

  const items = [...container.querySelectorAll(".identity-fact")];
  const mobileLayout = window.matchMedia("(max-width: 767px)");
  let previousMobileState = null;

  const applyLayout = () => {
    const isMobile = mobileLayout.matches;
    items.forEach((item) => {
      const button = item.querySelector(".identity-toggle");
      if (button) button.disabled = !isMobile;
      setIdentityFactExpanded(item, isMobile ? previousMobileState === true && item.classList.contains("is-expanded") : true);
    });
    previousMobileState = isMobile;
    container.classList.add("is-ready");
  };

  items.forEach((item) => {
    item.querySelector(".identity-toggle")?.addEventListener("click", () => {
      if (!mobileLayout.matches) return;
      const shouldExpand = !item.classList.contains("is-expanded");
      items.forEach((candidate) => setIdentityFactExpanded(candidate, candidate === item && shouldExpand));
    });
  });

  mobileLayout.addEventListener?.("change", applyLayout);
  applyLayout();
}

initializeIdentityAccordion();

function initializeSeasonMotion() {
  const section = document.querySelector(".season-section");
  if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (!("IntersectionObserver" in window)) {
    section.classList.add("season-motion-visible");
    return;
  }

  section.classList.add("season-motion-ready");
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    section.classList.add("season-motion-visible");
    observer.disconnect();
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -8% 0px"
  });

  observer.observe(section);
}

initializeSeasonMotion();

function setSeasonCardFlipped(card, flipped) {
  const title = card.dataset.seasonTitle || "Season stage";
  const front = card.querySelector(".season-card-front");
  const back = card.querySelector(".season-card-back");
  card.classList.toggle("is-flipped", flipped);
  card.setAttribute("aria-pressed", String(flipped));
  card.setAttribute("aria-label", `${title}: ${flipped ? "return to photo" : "show details"}`);
  front?.setAttribute("aria-hidden", String(flipped));
  back?.setAttribute("aria-hidden", String(!flipped));
}

function initializeSeasonFlipCards() {
  const cards = [...document.querySelectorAll(".season-flip-card")];
  cards.forEach((card) => {
    setSeasonCardFlipped(card, false);
    card.addEventListener("click", () => {
      const nextState = card.getAttribute("aria-pressed") !== "true";
      cards.forEach((item) => setSeasonCardFlipped(item, item === card && nextState));
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || card.getAttribute("aria-pressed") !== "true") return;
      event.preventDefault();
      setSeasonCardFlipped(card, false);
    });
  });
}

initializeSeasonFlipCards();

document.addEventListener("toggle", (event) => {
  const item = event.target;
  if (!(item instanceof HTMLDetailsElement) || !item.open) return;
  const group = item.dataset.accordionGroup;
  if (!group) return;
  document.querySelectorAll(`[data-accordion-group="${group}"][open]`).forEach((openItem) => {
    if (openItem !== item) openItem.open = false;
  });
}, true);

function programById(id) {
  return league.programs.find((program) => program.id === id);
}

function teamProfileUrl(programId, division = "") {
  const params = new URLSearchParams({ program: programId });
  if (division) params.set("division", division === "Girls Varsity" ? "girls" : "boys");
  return `team.html?${params.toString()}`;
}

function gameTeamName(game, side) {
  const programId = game[`${side}Id`];
  if (programId === "tbd") return "Open League Spot";
  const directName = game[`${side}Name`];
  if (directName) return directName;
  return programById(programId)?.name || "Team not assigned";
}

function safeAttribute(value) {
  return escapeHtml(value);
}

function mapTriggerMarkup(label, address, detail = "", context = "Game location") {
  if (!address) return escapeHtml(label);
  return `
    <button class="map-trigger" type="button" data-map-label="${safeAttribute(label)}" data-map-address="${safeAttribute(address)}" data-map-context="${safeAttribute(context)}">
      <span>${escapeHtml(label)}</span>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </button>
  `;
}

function gameLocationMarkup(game) {
  const homeAddress = game.homeId ? programById(game.homeId)?.homeAddress : "";
  const address = game.locationAddress || homeAddress || "";
  return mapTriggerMarkup(publicVenueLabel(game.location), address, address);
}

function gameStatusMarkup(game) {
  const status = game.status || "Scheduled";
  if (FINAL_STATUSES.has(status)) {
    return `<span class="game-status status-${status.toLowerCase()}">${escapeHtml(status)}</span><strong class="game-score">${game.awayScore} - ${game.homeScore}</strong>`;
  }
  if (status === "Postponed") {
    return `<span class="game-status status-postponed">Postponed</span><span class="game-status-note">${escapeHtml(league.settings?.postponedDisplay || "New date pending")}</span>`;
  }
  if (status === "Cancelled") return `<span class="game-status status-cancelled">Cancelled</span>`;
  if (status === "Live") return `<span class="game-status status-live">Live</span>`;
  return "";
}

function gameMarkup(game) {
  const dateParts = String(game.date || "Date announcement pending").split(" ");
  return `
    <article class="game-row" data-game-id="${safeAttribute(game.id || "")}">
      <div class="game-date">${escapeHtml(dateParts[0])}<span>${escapeHtml(dateParts.slice(1).join(" "))} &middot; ${escapeHtml(game.time)}</span></div>
      <div class="game-info">
        <strong>${escapeHtml(gameTeamName(game, "away"))} <em>vs</em> ${escapeHtml(gameTeamName(game, "home"))}</strong>
        <p>${escapeHtml(game.division)} &middot; ${game.stage ? `${escapeHtml(game.stage)} &middot; ` : ""}${gameLocationMarkup(game)}</p>
        <div class="game-row-status">${gameStatusMarkup(game)}</div>
      </div>
    </article>
  `;
}

function scheduleDateParts(game) {
  const parts = String(game.date || "Date pending").trim().split(/\s+/);
  return {
    weekday: parts[0] || "Date",
    month: parts[1] || "",
    day: parts.slice(2).join(" ") || "Pending"
  };
}

function scheduleTeamMarkup(game, side) {
  const team = tickerTeam(game, side);
  return `
    <div class="schedule-team schedule-team-${side}">
      <img src="${safeAttribute(team.logo)}" alt="">
      <strong>${escapeHtml(team.name)}</strong>
    </div>
  `;
}

function scheduleGameRowMarkup(game) {
  return `
    <article class="game-row schedule-game-row" data-game-id="${safeAttribute(game.id || "")}">
      ${scheduleTeamMarkup(game, "away")}
      <span class="schedule-versus" aria-hidden="true">vs</span>
      ${scheduleTeamMarkup(game, "home")}
      <span class="schedule-division">${escapeHtml(game.division)}</span>
      <time class="schedule-time"${game.iso ? ` datetime="${safeAttribute(game.iso)}"` : ""}>${escapeHtml(game.time)}</time>
      <div class="schedule-venue">${gameLocationMarkup(game)}</div>
      <div class="game-row-status">${gameStatusMarkup(game)}</div>
    </article>
  `;
}

function scheduleSlateMarkup(games) {
  const groups = new Map();
  games.forEach((game) => {
    const key = game.iso || game.date || "date-pending";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(game);
  });

  return [...groups.values()].map((group) => {
    const parts = scheduleDateParts(group[0]);
    return `
      <section class="schedule-date-group" aria-label="Games on ${safeAttribute(group[0].date || "date pending")}">
        <time class="schedule-date-rail"${group[0].iso ? ` datetime="${safeAttribute(group[0].iso)}"` : ""}>
          <span>${escapeHtml(parts.weekday)}</span>
          <small>${escapeHtml(parts.month)}</small>
          <strong>${escapeHtml(parts.day)}</strong>
        </time>
        <div class="schedule-matchups">${group.map(scheduleGameRowMarkup).join("")}</div>
      </section>
    `;
  }).join("");
}

function scheduleSupportRowMarkup(game) {
  const parts = scheduleDateParts(game);
  return `
    <article class="schedule-support-row" data-support-game-id="${safeAttribute(game.id || "")}">
      <time${game.iso ? ` datetime="${safeAttribute(game.iso)}"` : ""}><strong>${escapeHtml(parts.weekday)}</strong><span>${escapeHtml(`${parts.month} ${parts.day}`.trim())}</span></time>
      <div class="schedule-support-matchup">${scheduleTeamMarkup(game, "away")}<span class="schedule-versus" aria-hidden="true">vs</span>${scheduleTeamMarkup(game, "home")}</div>
      <span class="schedule-division">${escapeHtml(game.division)}</span>
      <div class="game-row-status">${gameStatusMarkup(game)}</div>
      <div class="schedule-venue">${gameLocationMarkup(game)}</div>
    </article>
  `;
}

function allScheduledGames() {
  const games = league.games || league.scheduleWeeks.flatMap((week) => week.games);
  return [...new Map(games.map((game) => [game.id || `${game.iso}-${game.time}-${game.division}`, game])).values()]
    .sort((a, b) => gameStartTime(a) - gameStartTime(b));
}

function gameStartTime(game) {
  return core.gameStartTime(game, league.settings?.timezone || "America/New_York");
}

function scheduleFocus(now = Date.now()) {
  const games = allScheduledGames();
  const currentGames = core.getCurrentGames(games, now, league.settings || {});
  const next = games.find((game) => ACTIVE_STATUSES.has(game.status || "Scheduled") && gameStartTime(game) > now);
  return { currentGames, current: currentGames[0], next };
}

function upcomingScheduledGames(limit = 4, now = Date.now()) {
  return core.getUpcomingGames(allScheduledGames(), now, league.settings || {}, limit);
}

function leagueIsoDate(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: league.settings?.timezone || "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(now));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function previousLeagueDate(now = Date.now()) {
  const date = new Date(`${leagueIsoDate(now)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function tickerGames(now = Date.now()) {
  const games = allScheduledGames();
  const previousNight = games.filter((game) =>
    FINAL_STATUSES.has(game.status) && game.iso === previousLeagueDate(now)
  );
  const upcoming = core.getUpcomingGames(games, now, league.settings || {}, 4);
  return [...previousNight, ...upcoming];
}

function tickerTeam(game, side) {
  const program = game[`${side}Id`] ? programById(game[`${side}Id`]) : null;
  const name = gameTeamName(game, side);
  return {
    name,
    short: program?.short || name,
    logo: safeImageUrl(program?.logo)
  };
}

function tickerGameMarkup(game, interactive = true) {
  const away = tickerTeam(game, "away");
  const home = tickerTeam(game, "home");
  const shortDate = game.date.split(" ").slice(1).join(" ");
  const isLive = scheduleFocus().currentGames.some((current) => current.id === game.id);
  const isFinal = FINAL_STATUSES.has(game.status);
  const state = isFinal ? "recent" : "upcoming";
  const status = isFinal
    ? `Final &middot; ${escapeHtml(game.division)}`
    : `${isLive ? "Live now &middot; " : ""}${escapeHtml(game.division)}${game.stage ? ` &middot; ${escapeHtml(game.stage)}` : ""}`;
  return `
    <a class="ticker-game" href="schedule.html"${interactive ? "" : ' tabindex="-1"'} data-ticker-state="${state}" aria-label="${safeAttribute(away.name)} versus ${safeAttribute(home.name)}, ${safeAttribute(shortDate)} at ${safeAttribute(game.time)}${isFinal ? ", final" : ""}.">
      <time><span>${escapeHtml(shortDate)}</span><small>${escapeHtml(game.time)}</small></time>
      <img src="${safeAttribute(away.logo)}" alt="">
      <b>${escapeHtml(away.short)}</b>
      <em>vs</em>
      <b>${escapeHtml(home.short)}</b>
      <img src="${safeAttribute(home.logo)}" alt="">
      <span class="ticker-status">${status}</span>
    </a>
  `;
}

function renderUpcomingTicker() {
  const ticker = document.querySelector(".score-ticker");
  if (!ticker) return;
  const games = tickerGames();
  if (!games.length) {
    ticker.hidden = true;
    return;
  }
  ticker.hidden = false;
  const group = games.map((game) => tickerGameMarkup(game, true)).join("");
  const duplicateGroup = games.map((game) => tickerGameMarkup(game, false)).join("");
  ticker.innerHTML = `
    <div class="ticker-window">
      <div class="ticker-track">
        <div class="ticker-group">${group}</div>
        <div class="ticker-group" aria-hidden="true">${duplicateGroup}</div>
      </div>
    </div>
  `;
}

let scheduleDivision = "all";
let selectedWeekId = "";

function featuredMatchupMarkup(game, compact = false) {
  const away = tickerTeam(game, "away");
  const home = tickerTeam(game, "home");
  const score = FINAL_STATUSES.has(game.status)
    ? `<strong class="featured-score">${game.awayScore} - ${game.homeScore}</strong>`
    : "";
  return `
    <div class="featured-matchup${compact ? " featured-matchup-compact" : ""}" data-game-id="${safeAttribute(game.id || "")}">
      <div><img src="${safeAttribute(away.logo)}" alt=""><strong>${escapeHtml(away.name)}</strong><span>Away</span></div>
      ${score || "<b>VS</b>"}
      <div><img src="${safeAttribute(home.logo)}" alt=""><strong>${escapeHtml(home.name)}</strong><span>Home</span></div>
    </div>
  `;
}

function renderFeaturedGame() {
  const featured = document.querySelector("[data-featured-game]");
  if (!featured) return;
  const { currentGames, next } = scheduleFocus();
  const game = currentGames[0] || next;

  if (!game) {
    featured.innerHTML = `
      <div class="panel-heading"><h2>Season complete</h2><span>2026–27</span></div>
      <div class="featured-empty">
        <strong>Thank you for following the UBL.</strong>
        <p>Final results and the next season schedule will appear here.</p>
      </div>
      <a class="text-link" href="schedule.html">View season schedule</a>
    `;
    return;
  }

  const liveGames = currentGames.length ? currentGames : [game];
  featured.innerHTML = `
    <div class="panel-heading">
      <h2>${currentGames.length > 1 ? `${currentGames.length} games live` : currentGames.length ? "Live now" : "Next league game"}</h2>
      <span>${escapeHtml(game.date.split(" ").slice(1).join(" "))} &middot; ${escapeHtml(game.time)}</span>
    </div>
    <div class="featured-live-list">${liveGames.map((item, index) => featuredMatchupMarkup(item, index > 0)).join("")}</div>
    <p>${escapeHtml(game.division)} &middot; ${game.stage ? `${escapeHtml(game.stage)} &middot; ` : ""}${gameLocationMarkup(game)}</p>
    <a class="text-link" href="schedule.html">View game details</a>
  `;
}

function renderHomeSchedule() {
  const gameList = document.querySelector("[data-game-list]");
  if (!gameList) return;
  const { currentGames, next } = scheduleFocus();
  const featuredIds = new Set((currentGames.length ? currentGames : next ? [next] : []).map((game) => game.id));
  const games = upcomingScheduledGames(12)
    .filter((game) => scheduleDivision === "all" || game.division === scheduleDivision)
    .filter((game) => !featuredIds.has(game.id))
    .slice(0, 4);
  gameList.innerHTML = games.length
    ? games.map(gameMarkup).join("")
    : `<div class="schedule-empty"><strong>No upcoming games</strong><p>Check the full schedule for completed dates and postseason details.</p></div>`;
}

function renderScheduleSupport() {
  const support = document.querySelector("[data-schedule-support]");
  if (!support) return;
  const relevantGames = allScheduledGames().filter((game) => scheduleDivision === "all" || game.division === scheduleDivision);
  const results = relevantGames.filter((game) => FINAL_STATUSES.has(game.status)).slice(-2).reverse();
  const updates = relevantGames.filter((game) => game.status === "Postponed" || game.status === "Cancelled").slice(0, 2);
  const sections = [];

  if (results.length) {
    sections.push(`<section class="schedule-support-section"><h2>Recent results</h2>${results.map(scheduleSupportRowMarkup).join("")}</section>`);
  }
  if (updates.length) {
    sections.push(`<section class="schedule-support-section"><h2>Schedule updates</h2>${updates.map(scheduleSupportRowMarkup).join("")}</section>`);
  }

  support.hidden = sections.length === 0;
  support.innerHTML = sections.join("");
}

function renderSchedulePage() {
  const weekList = document.querySelector("[data-week-game-list]");
  const weekSelect = document.querySelector("[data-week-select]");
  const weekHeading = document.querySelector("[data-week-heading]");
  const weekNote = document.querySelector("[data-week-note]");
  if (!weekList || !weekSelect) return;

  const week = league.scheduleWeeks.find((item) => item.id === selectedWeekId) || league.scheduleWeeks[0];
  if (!week) return;
  const games = week.games.filter((game) => scheduleDivision === "all" || game.division === scheduleDivision);
  weekSelect.value = week.id;
  if (weekHeading) weekHeading.textContent = `${week.label} · ${week.range}`;
  if (weekNote) weekNote.textContent = week.note || league.scheduleNotice;
  weekList.innerHTML = games.length
    ? scheduleSlateMarkup(games)
    : `<div class="schedule-empty"><strong>No games planned</strong><p>${escapeHtml(week.note || "No games match this division filter.")}</p></div>`;
  const weekIndex = league.scheduleWeeks.indexOf(week);
  document.querySelectorAll("[data-week-step]").forEach((button) => {
    const direction = Number(button.dataset.weekStep);
    button.disabled = direction < 0 ? weekIndex <= 0 : weekIndex >= league.scheduleWeeks.length - 1;
  });
  renderScheduleSupport();
}

document.querySelectorAll("[data-schedule-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-schedule-filter]").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-pressed", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
    scheduleDivision = button.dataset.scheduleFilter;
    renderHomeSchedule();
    renderSchedulePage();
  });
});

const weekSelect = document.querySelector("[data-week-select]");
function populateWeekOptions() {
  if (!weekSelect) return;
  weekSelect.innerHTML = league.scheduleWeeks.map((week) => `<option value="${safeAttribute(week.id)}">${escapeHtml(week.label)} &middot; ${escapeHtml(week.range)}</option>`).join("");
}

if (weekSelect) {
  weekSelect.addEventListener("change", () => {
    selectedWeekId = weekSelect.value;
    renderSchedulePage();
  });
}

document.querySelectorAll("[data-week-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const currentIndex = league.scheduleWeeks.findIndex((week) => week.id === selectedWeekId);
    const direction = Number(button.dataset.weekStep);
    const nextIndex = Math.min(league.scheduleWeeks.length - 1, Math.max(0, currentIndex + direction));
    selectedWeekId = league.scheduleWeeks[nextIndex].id;
    renderSchedulePage();
  });
});

let standingsDivision = "Boys Varsity";

function standingsRows(division) {
  return (league.standings?.[division] || []).map((row, index) => {
    const program = programById(row.programId);
    if (!program) return "";
    const games = row.wins + row.losses;
    const pct = games ? (row.wins / games).toFixed(3).replace(/^0/, "") : ".000";
    const diff = row.pf - row.pa;
    return `
      <tr>
        <td class="seed-cell">${index + 1}</td>
        <td><a class="standings-team" href="${safeAttribute(teamProfileUrl(program.id, division))}"><img src="${safeAttribute(safeImageUrl(program.logo))}" alt="">${escapeHtml(program.name)}</a></td>
        <td>${row.wins}</td>
        <td>${row.losses}</td>
        <td>${pct}</td>
        <td>${row.pf}</td>
        <td>${row.pa}</td>
        <td>${diff > 0 ? `+${diff}` : diff}</td>
      </tr>
    `;
  }).join("");
}

function renderStandings() {
  document.querySelectorAll("[data-standings-body]").forEach((body) => {
    body.innerHTML = standingsRows(standingsDivision);
  });
}

function winnerFromParticipants(game, awayId, homeId) {
  if (!game || !FINAL_STATUSES.has(game.status)) return "";
  if (game.awayScore === null || game.homeScore === null || game.awayScore === game.homeScore) return "";
  return game.awayScore > game.homeScore ? awayId : homeId;
}

function bracketTeamName(programId, fallback) {
  return programById(programId)?.name || fallback;
}

function bracketTeamRecord(programId, standings) {
  const row = standings.find((entry) => entry.programId === programId);
  if (!row || row.wins + row.losses === 0) return "";
  return `${row.wins}-${row.losses}`;
}

function bracketLiveTeamMarkup(slotClass, programId, standings, game, side) {
  if (!programId) return "";
  const score = game && FINAL_STATUSES.has(game.status) && game[`${side}Score`] !== null
    ? String(game[`${side}Score`])
    : "";
  const detail = score || bracketTeamRecord(programId, standings);
  const detailLabel = score ? `${detail} points` : detail ? `${detail} record` : "";
  return `
    <span class="bracket-live-team bracket-live-team-${slotClass}" title="${safeAttribute(`${bracketTeamName(programId, "Team")}${detailLabel ? `, ${detailLabel}` : ""}`)}">
      <strong>${escapeHtml(bracketTeamName(programId, "Team"))}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </span>
  `;
}

function bracketSlotMarkup(label, programId, fallback, game, side, winner) {
  const score = game && FINAL_STATUSES.has(game.status) && game[`${side}Score`] !== null
    ? `<b>${game[`${side}Score`]}</b>`
    : "";
  return `
    <div class="bracket-slot${winner && winner === programId ? " bracket-slot-winner" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(bracketTeamName(programId, fallback))}</strong>
      ${score}
    </div>
  `;
}

function bracketMarkup(division, artwork) {
  const standings = league.standings?.[division] || [];
  const standingsStarted = standings.some((row) => row.wins + row.losses > 0);
  const seeds = standingsStarted ? standings.map((row) => row.programId) : [];
  const seed = (number) => seeds[number - 1] || "";
  const playoffGames = allScheduledGames().filter((game) => game.division === division && game.stage);
  const playIn = playoffGames.find((game) => game.stage === "Play-in");
  const semifinals = playoffGames.filter((game) => game.stage === "Semifinal").sort((a, b) => gameStartTime(a) - gameStartTime(b));
  const semifinalOne = semifinals[0];
  const semifinalTwo = semifinals[1];
  const championship = playoffGames.find((game) => game.stage === "Championship");

  const playInAway = playIn?.awayId || seed(5);
  const playInHome = playIn?.homeId || seed(4);
  const playInWinner = winnerFromParticipants(playIn, playInAway, playInHome);
  const semifinalOneAway = semifinalOne?.awayId || playInWinner;
  const semifinalOneHome = semifinalOne?.homeId || seed(1);
  const semifinalTwoAway = semifinalTwo?.awayId || seed(3);
  const semifinalTwoHome = semifinalTwo?.homeId || seed(2);
  const semifinalOneWinner = winnerFromParticipants(semifinalOne, semifinalOneAway, semifinalOneHome);
  const semifinalTwoWinner = winnerFromParticipants(semifinalTwo, semifinalTwoAway, semifinalTwoHome);
  const championshipAway = championship?.awayId || semifinalOneWinner;
  const championshipHome = championship?.homeId || semifinalTwoWinner;
  const champion = winnerFromParticipants(championship, championshipAway, championshipHome);
  const divisionName = division.startsWith("Boys") ? "Boys" : "Girls";

  return `
    <div class="bracket-live-artboard">
      <img class="bracket-live-art" src="${safeAttribute(safeImageUrl(artwork))}" alt="" width="1672" height="941" decoding="async">
      ${bracketLiveTeamMarkup("seed-5", playInAway, standings, playIn, "away")}
      ${bracketLiveTeamMarkup("seed-4", playInHome, standings, playIn, "home")}
      ${bracketLiveTeamMarkup("play-in-winner", semifinalOneAway, standings, semifinalOne, "away")}
      ${bracketLiveTeamMarkup("seed-1", semifinalOneHome, standings, semifinalOne, "home")}
      ${bracketLiveTeamMarkup("seed-3", semifinalTwoAway, standings, semifinalTwo, "away")}
      ${bracketLiveTeamMarkup("seed-2", semifinalTwoHome, standings, semifinalTwo, "home")}
      ${champion ? `<span class="bracket-live-champion"><small>2027 ${escapeHtml(divisionName)} champion</small><strong>${escapeHtml(bracketTeamName(champion, "Champion"))}</strong></span>` : ""}
    </div>
    <div class="sr-only bracket-accessible-summary">
      <h3>Play-in</h3>
      ${bracketSlotMarkup("Seed 5", playInAway, "Regular season seed", playIn, "away", playInWinner)}
      ${bracketSlotMarkup("Seed 4", playInHome, "Regular season seed", playIn, "home", playInWinner)}
      <p>Winner advances to play Seed 1</p>
      <h3>Semifinals</h3>
      ${bracketSlotMarkup("Play-in winner", semifinalOneAway, "Advancing team", semifinalOne, "away", semifinalOneWinner)}
      ${bracketSlotMarkup("Seed 1", semifinalOneHome, "Regular season leader", semifinalOne, "home", semifinalOneWinner)}
      ${bracketSlotMarkup("Seed 3", semifinalTwoAway, "Regular season seed", semifinalTwo, "away", semifinalTwoWinner)}
      ${bracketSlotMarkup("Seed 2", semifinalTwoHome, "Regular season seed", semifinalTwo, "home", semifinalTwoWinner)}
      <h3>Championship</h3>
      <p>2027 UBL ${escapeHtml(divisionName)} champion: ${escapeHtml(bracketTeamName(champion, "Crowned after the February playoffs"))}</p>
    </div>
  `;
}

function renderBrackets() {
  document.querySelectorAll("[data-bracket]").forEach((bracket) => {
    bracket.innerHTML = bracketMarkup(bracket.dataset.bracket, bracket.dataset.bracketArt);
  });
}

function renderDataFreshness() {
  const source = window.UBL_DATA_SOURCE || "bundled fallback";
  const updated = league.lastUpdated ? new Date(league.lastUpdated) : null;
  const validDate = updated && Number.isFinite(updated.getTime());
  let message = source === "updating live data"
    ? "Showing the saved schedule while live updates load."
    : source === "live score feed"
    ? "Schedule and scores synced from the league sheet."
    : validDate
    ? `Schedule updated ${new Intl.DateTimeFormat("en-US", { timeZone: league.settings?.timezone || "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(updated)}.`
    : "Using the bundled backup schedule.";
  if (source === "published snapshot") message += " Published snapshot.";
  if (source === "bundled fallback" || window.UBL_DATA_ERROR) message += " Live updates are temporarily unavailable.";
  document.querySelectorAll("[data-freshness]").forEach((element) => {
    element.textContent = message;
    element.classList.toggle("data-freshness-warning", source === "bundled fallback" || Boolean(window.UBL_DATA_ERROR));
    element.classList.toggle("data-freshness-loading", source === "updating live data");
  });
}

document.querySelectorAll("[data-standings-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-standings-filter]").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    standingsDivision = button.dataset.standingsFilter;
    renderStandings();
  });
});

function teamCardMarkup(program) {
  if (program.id === "tbd") {
    return `
      <a class="team-card team-card-open-spot" href="mailto:Info.upstatebasketballleague@gmail.com?subject=Interested%20in%20joining%20the%20UBL" aria-label="Email UBL about the open league spot">
        <img src="assets/icons/icon-192.png" alt="" width="192" height="192">
        <strong>Join the UBL</strong>
        <span>One league spot is open</span>
      </a>
    `;
  }
  return `
    <a class="team-card" href="${safeAttribute(teamProfileUrl(program.id, program.divisions[0]))}">
      <img src="${safeAttribute(safeImageUrl(program.logo))}" alt="">
      <strong>${escapeHtml(program.name)}</strong>
      <span>${program.divisions.map(escapeHtml).join(" &middot; ")}</span>
    </a>
  `;
}

function renderHomeTeams() {
  const grid = document.querySelector("[data-team-card-grid]");
  if (grid) grid.innerHTML = league.programs.map(teamCardMarkup).join("");
}

function coachInitials(name) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
}

function coachCardMarkup(coach, role) {
  const portrait = coach.photo
    ? `<img class="coach-photo" src="${safeAttribute(safeImageUrl(coach.photo))}" alt="${safeAttribute(coach.name)}">`
    : `<span class="coach-photo coach-initials" aria-hidden="true">${escapeHtml(coachInitials(coach.name))}</span>`;
  return `
    <article class="coach-card">
      ${portrait}
      <div>
        <span>${escapeHtml(role)}</span>
        <strong>${escapeHtml(coach.name)}</strong>
        <p>${escapeHtml(coach.experience)}</p>
      </div>
    </article>
  `;
}

function profileDivisionMarkup(program, division) {
  const team = program.teams[division];
  const coaches = [];
  if (team.headCoach?.name && team.headCoach.name !== "To be confirmed") {
    coaches.push(coachCardMarkup(team.headCoach, "Head coach"));
  }
  team.assistants
    .filter((coach) => coach?.name && coach.name !== "To be confirmed")
    .forEach((coach) => coaches.push(coachCardMarkup(coach, "Assistant coach")));
  return `
    <section class="program-division">
      <span>${escapeHtml(division)}</span>
      ${coaches.length ? `<div class="coach-list">${coaches.join("")}</div>` : `<p class="coach-vacancy">Coaching staff will be listed after the program approves its profile.</p>`}
    </section>
  `;
}

function programProfileMarkup(program) {
  if (program.id === "tbd") {
    return `
      <section class="program-profile open-spot-profile" id="tbd">
        <div class="open-spot-copy">
          <span>2026–27 opportunity</span>
          <h3>Bring your program to the UBL</h3>
          <p>${escapeHtml(program.summary)}</p>
        </div>
        <div class="open-spot-actions">
          <strong>Boys Varsity · Girls Varsity</strong>
          <a class="button button-primary" href="mailto:Info.upstatebasketballleague@gmail.com?subject=Interested%20in%20joining%20the%20UBL">Start a conversation</a>
        </div>
      </section>
    `;
  }
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(program.representativeEmail || "") ? program.representativeEmail : "";
  const facts = [];
  if (program.homeGym && program.homeGym !== "To be confirmed") {
    facts.push(`<div><dt>Home gym</dt><dd>${mapTriggerMarkup(program.homeGym, program.homeAddress, program.homeAddress)}</dd></div>`);
  }
  if (email) {
    facts.push(`<div><dt>Program representative</dt><dd><a href="mailto:${safeAttribute(email)}">${escapeHtml(email)}</a></dd></div>`);
  }
  return `
    <details class="program-profile" id="${safeAttribute(program.id)}" data-accordion-group="programs">
      <summary>
        <span class="program-profile-identity"><img src="${safeAttribute(safeImageUrl(program.logo))}" alt=""><span><strong>${escapeHtml(program.name)}</strong></span></span>
        <span class="program-profile-divisions">${program.divisions.map(escapeHtml).join(" &middot; ")}</span>
      </summary>
      <div class="program-profile-content">
        <p class="program-summary">${escapeHtml(program.summary)}</p>
        <div class="program-division-grid">${program.divisions.map((division) => profileDivisionMarkup(program, division)).join("")}</div>
        ${facts.length ? `<dl class="program-facts">${facts.join("")}</dl>` : ""}
      </div>
    </details>
  `;
}

function renderPrograms(filter = "all") {
  const list = document.querySelector("[data-program-list]");
  if (!list) return;
  const programs = filter === "all" ? league.programs : league.programs.filter((program) => program.divisions.includes(filter));
  list.innerHTML = programs.map(programProfileMarkup).join("");
  openHashProgram();
}

document.querySelectorAll("[data-program-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-program-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderPrograms(button.dataset.programFilter);
  });
});

function openHashProgram() {
  if (!location.hash) return;
  const profile = document.querySelector(location.hash);
  if (profile?.matches(".program-profile")) {
    if (profile instanceof HTMLDetailsElement) profile.open = true;
    setTimeout(() => profile.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
}

window.addEventListener("hashchange", openHashProgram);

function divisionTeamCardMarkup(program, division, order) {
  if (program.id === "tbd") {
    const inquiryHref = "mailto:Info.upstatebasketballleague@gmail.com?subject=Interested%20in%20joining%20the%20UBL";
    return `
      <a class="division-team-card division-team-card-open" href="${inquiryHref}" data-program-card="tbd" style="--card-order:${order}" aria-label="Open UBL program spot in ${safeAttribute(division)}, contact the league">
        <span class="team-card-court" aria-hidden="true"><i></i></span>
        <span class="team-card-view">Join UBL <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span>
        <span class="team-card-logo-stage team-card-logo-stage-open"><img src="${safeAttribute(safeImageUrl(program.logo))}" alt="" width="192" height="192" loading="lazy" decoding="async"></span>
        <span class="division-team-card-content">
          <small class="team-card-kicker">Now recruiting</small>
          <strong>Open League Spot</strong>
          <span>Bring your program into the UBL</span>
          <b>Start a conversation <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></b>
        </span>
      </a>
    `;
  }
  const headCoach = program.teams?.[division]?.headCoach?.name || "";
  const detail = headCoach && headCoach !== "To be confirmed" ? `Head coach ${headCoach}` : "Open program profile";
  const href = teamProfileUrl(program.id, division);
  const accessibleName = `View team ${program.short}, ${division}, ${program.name}. ${detail}. Meet the program`;
  return `
    <a class="division-team-card" href="${safeAttribute(href)}" data-program-card="${safeAttribute(program.id)}" style="--card-order:${order}" aria-label="${safeAttribute(accessibleName)}">
      <span class="team-card-court" aria-hidden="true"><i></i></span>
      <span class="team-card-view">View team <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span>
      <span class="team-card-logo-stage"><img src="${safeAttribute(safeImageUrl(program.logo))}" alt="" width="192" height="192" loading="lazy" decoding="async"></span>
      <span class="division-team-card-content">
        <small class="team-card-abbr">${escapeHtml(program.short)}</small>
        <strong>${escapeHtml(program.name)}</strong>
        <span>${escapeHtml(detail)}</span>
        <b>Meet the program <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></b>
      </span>
    </a>
  `;
}

function initializeTeamCardMotion(scope = document) {
  const directory = document.querySelector(".team-directory");
  const cards = [...scope.querySelectorAll(".division-team-card")];
  if (!directory || !cards.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }
  directory.classList.add("team-card-motion-ready");
  requestAnimationFrame(() => cards.forEach((card) => card.classList.add("is-visible")));
}

const teamDirectory = document.querySelector("[data-team-directory]");
const teamDivisionSelectors = [...document.querySelectorAll("[data-team-division-select]")];
let selectedTeamDivision = "";

function renderTeamDirectory() {
  if (!selectedTeamDivision) return;
  let didRender = false;
  let renderedGrid = null;
  document.querySelectorAll("[data-division-team-grid]").forEach((grid) => {
    const division = grid.dataset.divisionTeamGrid;
    if (division !== selectedTeamDivision) return;
    const programs = league.programs.filter((program) => program.divisions.includes(division));
    const signature = JSON.stringify(programs.map((program) => ({
      id: program.id,
      name: program.name,
      short: program.short,
      logo: program.logo,
      team: program.teams?.[division]
    })));
    if (grid.dataset.renderSignature !== signature) {
      const focusedHref = grid.contains(document.activeElement) ? document.activeElement.getAttribute("href") : "";
      grid.innerHTML = programs.map((program, index) => divisionTeamCardMarkup(program, division, index)).join("");
      grid.dataset.renderSignature = signature;
      if (focusedHref) [...grid.querySelectorAll("a[href]")].find((link) => link.getAttribute("href") === focusedHref)?.focus();
      didRender = true;
      renderedGrid = grid;
    }
  });
  if (didRender && renderedGrid) initializeTeamCardMotion(renderedGrid);
}

function showTeamDivision(division, { scroll = false, updateHash = false } = {}) {
  if (!teamDirectory || !teamDivisionSelectors.length) return;
  const activeSection = document.querySelector(`[data-division-column="${division}"]`);
  if (!activeSection) return;

  selectedTeamDivision = division;
  teamDirectory.hidden = false;
  document.querySelectorAll("[data-division-column]").forEach((section) => {
    section.hidden = section !== activeSection;
  });
  teamDivisionSelectors.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.teamDivisionSelect === division));
  });
  renderTeamDirectory();

  if (updateHash) history.replaceState(null, "", `#${activeSection.id}`);
  if (scroll) {
    requestAnimationFrame(() => activeSection.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    }));
  }
}

teamDivisionSelectors.forEach((button) => {
  button.addEventListener("click", () => showTeamDivision(button.dataset.teamDivisionSelect, { scroll: true, updateHash: true }));
});

if (location.hash === "#girls-division" || location.hash === "#boys-division") {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}

function requestedProfileDivision(program, value) {
  const requested = value === "girls" || value === "Girls Varsity" ? "Girls Varsity"
    : value === "boys" || value === "Boys Varsity" ? "Boys Varsity"
      : "";
  return program.divisions.includes(requested) ? requested : program.divisions[0];
}

function profileCoachMarkup(coach, role) {
  const portrait = coach.photo
    ? `<img src="${safeAttribute(safeImageUrl(coach.photo))}" alt="${safeAttribute(coach.name)}" width="192" height="192" loading="lazy" decoding="async">`
    : `<span aria-hidden="true">${escapeHtml(coachInitials(coach.name))}</span>`;
  return `
    <article class="team-profile-coach">
      <div class="team-profile-coach-photo">${portrait}</div>
      <div><span>${escapeHtml(role)}</span><h3>${escapeHtml(coach.name)}</h3><p>${escapeHtml(coach.experience || "Program biography not yet published.")}</p></div>
    </article>
  `;
}

function profileCoachesMarkup(program, division) {
  const team = program.teams?.[division] || {};
  const coaches = [];
  if (team.headCoach?.name && team.headCoach.name !== "To be confirmed") coaches.push(profileCoachMarkup(team.headCoach, "Head coach"));
  (team.assistants || [])
    .filter((coach) => coach?.name && coach.name !== "To be confirmed")
    .forEach((coach) => coaches.push(profileCoachMarkup(coach, "Assistant coach")));
  if (coaches.length) return `<div class="team-profile-coach-grid">${coaches.join("")}</div>`;
  return `
    <div class="team-profile-empty">
      <strong>Coaching staff not yet published</strong>
      <p>This program's representative has not submitted a public coaching profile yet.</p>
    </div>
  `;
}

function profileDivisionLinks(program, activeDivision) {
  if (program.divisions.length < 2) return "";
  return `
    <nav class="team-profile-division-nav" aria-label="${safeAttribute(program.name)} divisions">
      ${program.divisions.map((division) => `<a href="${safeAttribute(teamProfileUrl(program.id, division))}"${division === activeDivision ? ' aria-current="page"' : ""}>${escapeHtml(division.replace(" Varsity", ""))}</a>`).join("")}
    </nav>
  `;
}

function validProgramEmail(program) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(program.representativeEmail || "") ? program.representativeEmail : "";
}

function updateTeamProfileMetadata(program, division) {
  const title = `${program.name} ${division} | UBL`;
  const description = `${program.summary} View ${division.toLowerCase()} coaches, home-court information, and program contact details.`;
  document.title = title;
  document.querySelector('meta[name="robots"]')?.setAttribute("content", "index, follow");
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description);
  const canonicalUrl = `https://nickblanchard04.github.io/upstate-basketball-league/${teamProfileUrl(program.id, division)}`;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonicalUrl);
}

let renderedTeamProfileSignature = "";

function renderTeamProfile() {
  const container = document.querySelector("[data-team-profile]");
  if (!container) return;
  const params = new URLSearchParams(location.search);
  const program = programById(params.get("program"));
  if (!program || program.id === "tbd") {
    const missingSignature = `missing:${params.get("program") || ""}`;
    if (renderedTeamProfileSignature === missingSignature) return;
    renderedTeamProfileSignature = missingSignature;
    container.innerHTML = `
      <div class="team-profile-missing section-wrap">
        <a href="teams.html">Back to all teams</a>
        <span>UBL program directory</span>
        <h1>Choose a UBL team.</h1>
        <p>Open the Teams page to select a girls or boys varsity program.</p>
        <a class="button button-primary" href="teams.html">Explore teams</a>
      </div>
    `;
    return;
  }

  const division = requestedProfileDivision(program, params.get("division"));
  const email = validProgramEmail(program);
  const hasAddress = Boolean(program.homeAddress);
  const locationValue = / home court$/i.test(program.homeGym || "")
    ? "Home-court details not yet published"
    : program.homeGym || "Home-court information not yet published";
  const locationMarkup = hasAddress
    ? mapTriggerMarkup(locationValue, program.homeAddress, program.homeAddress, "Program home court")
    : `<span>${escapeHtml(locationValue)}</span><small>Street address not yet published</small>`;
  const contactMarkup = email
    ? `<a href="mailto:${safeAttribute(email)}">${escapeHtml(email)}</a>`
    : `<span>Public representative email not yet provided</span><a class="team-profile-fallback-link" href="mailto:Info.upstatebasketballleague@gmail.com?subject=${encodeURIComponent(`${program.name} program contact`)}">Ask UBL for the right contact</a>`;
  const logoAlt = program.logoStatus ? `${program.name} temporary league mark` : `${program.name} logo`;
  const logoStatusMarkup = program.logoStatus
    ? `<div><dt>Team mark</dt><dd><span>${escapeHtml(program.logoStatus)}</span></dd></div>`
    : "";
  const profileSignature = JSON.stringify({ program, division });

  updateTeamProfileMetadata(program, division);
  if (renderedTeamProfileSignature === profileSignature) return;
  renderedTeamProfileSignature = profileSignature;
  container.innerHTML = `
    <section class="team-profile-hero ${division === "Girls Varsity" ? "team-profile-hero-girls" : "team-profile-hero-boys"}">
      <div class="team-profile-court" aria-hidden="true"><span></span></div>
      <div class="team-profile-hero-inner">
        <a class="team-profile-back" href="teams.html"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>All teams</a>
        <div class="team-profile-hero-copy">
          <span>${escapeHtml(division)}</span>
          <h1>${escapeHtml(program.name)}</h1>
          <p>${escapeHtml(program.summary)}</p>
          ${profileDivisionLinks(program, division)}
        </div>
        <div class="team-profile-logo"><span>${escapeHtml(program.short)}</span><img src="${safeAttribute(safeImageUrl(program.logo))}" alt="${safeAttribute(logoAlt)}" width="192" height="192"></div>
      </div>
    </section>

    <div class="team-profile-content section-wrap">
      <section class="team-profile-coaches" aria-labelledby="team-profile-coaches-title">
        <header><span>On the sideline</span><h2 id="team-profile-coaches-title">${escapeHtml(division.replace(" Varsity", ""))} varsity coaching staff</h2><p>Meet the coaches whose information has been approved for this public program profile.</p></header>
        ${profileCoachesMarkup(program, division)}
      </section>

      <aside class="team-profile-facts" aria-labelledby="team-profile-facts-title">
        <header><span>Program information</span><h2 id="team-profile-facts-title">Plan your next step</h2></header>
        <dl>
          <div><dt>Division</dt><dd>${escapeHtml(division)}</dd></div>
          <div><dt>Home court</dt><dd>${locationMarkup}</dd></div>
          <div><dt>Program representative</dt><dd>${contactMarkup}</dd></div>
          ${logoStatusMarkup}
        </dl>
        <a class="team-profile-standings-link" href="standings.html">View league standings <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </aside>
    </div>

    <section class="team-profile-next section-wrap" aria-label="Continue exploring the UBL">
      <div><span>Keep exploring</span><strong>See where ${escapeHtml(program.name)} fits into the season.</strong></div>
      <div><a href="schedule.html">League schedule</a><a href="standings.html">Current standings</a><a href="teams.html">All teams</a></div>
    </section>
  `;
}

const GALLERY_DIVISIONS = new Set(["Boys Varsity", "Girls Varsity"]);
const GALLERY_IMAGE_HOSTS = new Set(["drive.google.com", "lh3.googleusercontent.com"]);

function galleryImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && GALLERY_IMAGE_HOSTS.has(url.hostname) ? url.href : "";
  } catch {
    return "";
  }
}

function bundledGalleryImageUrl(value) {
  const url = String(value || "").trim();
  return /^assets\/gallery\/[a-z0-9][a-z0-9/_-]*\.(?:avif|jpe?g|png|webp)$/i.test(url) ? url : "";
}

function bundledGallerySrcset(sources) {
  if (!Array.isArray(sources)) return "";
  return sources.map((source) => {
    const url = bundledGalleryImageUrl(source?.url);
    const width = Number(source?.width);
    return url && Number.isInteger(width) && width > 0 ? `${url} ${width}w` : "";
  }).filter(Boolean).join(", ");
}

function updateGallerySections() {
  document.querySelectorAll("[data-gallery-team]").forEach((gallery) => {
    const photoCount = gallery.querySelectorAll(".gallery-item").length;
    const count = gallery.querySelector("[data-gallery-count]");
    const grid = gallery.querySelector("[data-gallery-grid]");
    const empty = gallery.querySelector("[data-gallery-empty]");
    if (count) count.textContent = photoCount ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : "No photos published";
    if (grid) grid.hidden = photoCount === 0;
    if (empty) empty.hidden = photoCount > 0;
  });
}

function createGalleryPhoto(photo) {
  const figure = document.createElement("figure");
  figure.className = "gallery-item";
  figure.dataset.galleryDivision = photo.division;
  figure.dataset.galleryPhotoId = photo.id;

  const button = document.createElement("button");
  button.className = "gallery-open";
  button.type = "button";
  button.dataset.galleryFull = photo.fullUrl;

  const image = document.createElement("img");
  image.src = photo.previewUrl;
  const srcset = bundledGallerySrcset(photo.previewSrcset);
  if (srcset) image.srcset = srcset;
  if (srcset && typeof photo.sizes === "string" && photo.sizes.trim()) image.sizes = photo.sizes.trim();
  const width = Number(photo.width);
  const height = Number(photo.height);
  if (Number.isInteger(width) && width > 0) image.width = width;
  if (Number.isInteger(height) && height > 0) image.height = height;
  image.alt = photo.alt;
  image.loading = "lazy";
  button.append(image);

  const caption = document.createElement("figcaption");
  const title = document.createElement("strong");
  title.textContent = photo.division;
  const detail = document.createElement("span");
  detail.textContent = photo.season;
  caption.append(title, detail);
  figure.append(button, caption);
  return figure;
}

function renderBundledGallery() {
  const photos = Array.isArray(league.galleryPhotos) ? league.galleryPhotos : [];
  const renderedIds = new Set(
    [...document.querySelectorAll("[data-gallery-photo-id]")].map((item) => item.dataset.galleryPhotoId)
  );

  photos.forEach((entry) => {
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
    const division = GALLERY_DIVISIONS.has(entry.division) ? entry.division : "";
    const previewUrl = bundledGalleryImageUrl(entry.previewUrl);
    const fullUrl = bundledGalleryImageUrl(entry.fullUrl);
    const alt = typeof entry.alt === "string" ? entry.alt.trim() : "";
    const season = typeof entry.season === "string" ? entry.season.trim() : "";
    const gallery = document.querySelector(`[data-gallery-team="${CSS.escape(teamId)}"]`);
    const supportedDivisions = gallery?.dataset.galleryDivisions.split("|") || [];
    const grid = gallery?.querySelector("[data-gallery-grid]");
    if (!grid || !id || renderedIds.has(id) || !division || !supportedDivisions.includes(division) || !previewUrl || !fullUrl || !alt || !season) return;

    grid.append(createGalleryPhoto({
      ...entry,
      id,
      division,
      previewUrl,
      fullUrl,
      alt,
      season
    }));
    renderedIds.add(id);
  });

  updateGallerySections();
}

async function loadApprovedGallery() {
  if (!document.querySelector("[data-gallery-team]")) return;
  const feedUrl = window.UBL_CONFIG?.galleryFeedUrl?.trim();
  if (!feedUrl) {
    updateGallerySections();
    return;
  }

  try {
    const response = await fetch(feedUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Gallery feed returned ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.photos)) throw new Error("Gallery feed is malformed");

    const renderedIds = new Set(
      [...document.querySelectorAll("[data-gallery-photo-id]")].map((item) => item.dataset.galleryPhotoId)
    );

    payload.photos.forEach((entry) => {
      const teamId = typeof entry.teamId === "string" ? entry.teamId : "";
      const division = GALLERY_DIVISIONS.has(entry.division) ? entry.division : "";
      const id = typeof entry.id === "string" ? entry.id.trim() : "";
      const previewUrl = galleryImageUrl(entry.previewUrl);
      const fullUrl = galleryImageUrl(entry.fullUrl);
      const gallery = document.querySelector(`[data-gallery-team="${CSS.escape(teamId)}"]`);
      const supportedDivisions = gallery?.dataset.galleryDivisions.split("|") || [];
      if (!gallery || !id || renderedIds.has(id) || !division || !supportedDivisions.includes(division) || !previewUrl || !fullUrl) return;

      const photo = {
        id,
        division,
        previewUrl,
        fullUrl,
        alt: typeof entry.alt === "string" && entry.alt.trim() ? entry.alt.trim() : `${entry.teamName || "UBL"} basketball photo`,
        season: typeof entry.season === "string" && entry.season.trim() ? entry.season.trim() : "2026-27 season"
      };
      gallery.querySelector("[data-gallery-grid]")?.append(createGalleryPhoto(photo));
      renderedIds.add(id);
    });
  } catch (error) {
    console.warn("Approved gallery feed is temporarily unavailable.", error);
  }

  updateGallerySections();
}

let galleryFeedPromise = null;

function setGalleryLoading(gallery, loading) {
  if (!gallery) return;
  gallery.setAttribute("aria-busy", String(loading));
  const grid = gallery.querySelector("[data-gallery-grid]");
  if (!grid) return;
  grid.querySelectorAll(".gallery-skeleton").forEach((item) => item.remove());
  if (!loading || grid.querySelector(".gallery-item")) return;
  grid.hidden = false;
  for (let index = 0; index < 2; index += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "gallery-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.innerHTML = '<span class="gallery-skeleton-photo"></span><span class="gallery-skeleton-line"></span>';
    grid.append(skeleton);
  }
}

function ensureApprovedGalleryLoaded(gallery) {
  if (!galleryFeedPromise) galleryFeedPromise = loadApprovedGallery();
  setGalleryLoading(gallery, true);
  return galleryFeedPromise.finally(() => setGalleryLoading(gallery, false));
}

function initializeGallery() {
  if (!document.querySelector("[data-gallery-team]")) return;

  renderBundledGallery();

  document.querySelectorAll("[data-gallery-team]").forEach((gallery) => {
    gallery.addEventListener("toggle", () => {
      if (gallery.open) ensureApprovedGalleryLoaded(gallery);
    });
  });

  document.querySelectorAll("[data-gallery-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const division = button.dataset.galleryFilter;
      document.querySelectorAll("[data-gallery-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
        item.setAttribute("aria-selected", String(item === button));
      });
      document.querySelectorAll("[data-gallery-division]").forEach((item) => {
        item.hidden = division !== "all" && item.dataset.galleryDivision !== division;
      });
      document.querySelectorAll("[data-gallery-divisions]").forEach((gallery) => {
        const divisions = gallery.dataset.galleryDivisions.split("|");
        gallery.hidden = division !== "all" && !divisions.includes(division);
      });
    });
  });

  const lightbox = document.createElement("dialog");
  lightbox.className = "gallery-lightbox";
  lightbox.innerHTML = `
    <div class="gallery-lightbox-card">
      <button type="button" class="gallery-lightbox-close" aria-label="Close fullscreen photo">Close</button>
      <img data-gallery-lightbox-image alt="">
      <div class="gallery-lightbox-caption">
        <strong data-gallery-lightbox-title></strong>
        <span data-gallery-lightbox-detail></span>
      </div>
    </div>
  `;
  document.body.append(lightbox);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-gallery-full]");
    if (!trigger) return;
    const figure = trigger.closest(".gallery-item");
    const preview = trigger.querySelector("img");
    lightbox.querySelector("[data-gallery-lightbox-image]").src = trigger.dataset.galleryFull;
    lightbox.querySelector("[data-gallery-lightbox-image]").alt = preview.alt;
    lightbox.querySelector("[data-gallery-lightbox-title]").textContent = figure.querySelector("figcaption strong").textContent;
    lightbox.querySelector("[data-gallery-lightbox-detail]").textContent = figure.querySelector("figcaption span").textContent;
    lightbox.showModal();
  });

  lightbox.querySelector(".gallery-lightbox-close").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
}

const mapDialog = document.createElement("dialog");
mapDialog.className = "map-dialog";
mapDialog.setAttribute("aria-labelledby", "map-dialog-title");
mapDialog.innerHTML = `
  <div class="map-dialog-card">
    <div class="map-dialog-heading">
      <div><span data-map-dialog-context>Game location</span><h2 id="map-dialog-title" data-map-dialog-label></h2></div>
      <button type="button" data-map-dialog-close aria-label="Close map options"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg></button>
    </div>
    <p data-map-dialog-address></p>
    <div class="map-options">
      <a data-map-apple target="_blank" rel="noopener">Apple Maps</a>
      <a data-map-google target="_blank" rel="noopener">Google Maps</a>
      <a data-map-waze target="_blank" rel="noopener">Waze</a>
    </div>
  </div>
`;
document.body.append(mapDialog);

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-map-address]");
  if (!trigger) return;
  const address = trigger.dataset.mapAddress;
  const label = trigger.dataset.mapLabel;
  mapDialog.querySelector("[data-map-dialog-context]").textContent = trigger.dataset.mapContext || "Game location";
  mapDialog.querySelector("[data-map-dialog-label]").textContent = label;
  mapDialog.querySelector("[data-map-dialog-address]").textContent = address;
  mapDialog.querySelector("[data-map-apple]").href = `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
  mapDialog.querySelector("[data-map-google]").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  mapDialog.querySelector("[data-map-waze]").href = `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  mapDialog.showModal();
});

mapDialog.querySelector("[data-map-dialog-close]").addEventListener("click", () => mapDialog.close());
mapDialog.addEventListener("click", (event) => {
  if (event.target === mapDialog) mapDialog.close();
});

let countdownTarget = new Date("2026-12-03T18:00:00-05:00").getTime();
const countdownParts = {
  days: document.querySelector("[data-countdown-days]"),
  hours: document.querySelector("[data-countdown-hours]"),
  minutes: document.querySelector("[data-countdown-minutes]"),
  seconds: document.querySelector("[data-countdown-seconds]")
};
const countdownMessage = document.querySelector("[data-countdown-message]");

function configureCountdown() {
  const openingGame = allScheduledGames().find((game) => !game.stage && ACTIVE_STATUSES.has(game.status || "Scheduled"));
  if (!openingGame) return;
  countdownTarget = gameStartTime(openingGame);
  const label = document.querySelector("[data-tipoff-date]");
  if (label) label.textContent = `${openingGame.date.replace(/^\w+\s/, "")} · ${openingGame.time} ET`;
}

function updateCountdown() {
  if (!countdownParts.days || !countdownParts.hours || !countdownParts.minutes || !countdownParts.seconds) return;
  const remaining = Math.max(0, countdownTarget - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  countdownParts.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(3, "0");
  countdownParts.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
  countdownParts.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  countdownParts.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");
  if (remaining === 0 && countdownMessage) countdownMessage.textContent = "The 2026–27 UBL season is underway.";
}

function chooseScheduleWeek() {
  if (league.scheduleWeeks.some((week) => week.id === selectedWeekId)) return;
  const focus = scheduleFocus();
  const game = focus.current || focus.next;
  selectedWeekId = league.scheduleWeeks.find((week) => week.games.some((item) => item.id === game?.id))?.id || league.scheduleWeeks[0]?.id || "";
}

function renderLeagueData() {
  chooseScheduleWeek();
  populateWeekOptions();
  renderHomeSchedule();
  renderSchedulePage();
  renderStandings();
  renderHomeTeams();
  renderTeamDirectory();
  renderTeamProfile();
  renderUpcomingTicker();
  renderFeaturedGame();
  renderBrackets();
  renderDataFreshness();
  configureCountdown();
  updateCountdown();
}

let renderedLeagueSignature = "";

function leagueSignature(data) {
  try {
    return JSON.stringify(data);
  } catch {
    return String(Date.now());
  }
}

function applyLeagueData(data) {
  const nextSignature = leagueSignature(data);
  league = data;
  if (nextSignature === renderedLeagueSignature) {
    renderDataFreshness();
    return;
  }
  renderedLeagueSignature = nextSignature;
  renderLeagueData();
}

function initializeApp() {
  applyLeagueData(window.UBL_DATA);
  initializeGallery();
  Promise.resolve(window.UBL_DATA_READY || window.UBL_DATA)
    .then(applyLeagueData)
    .catch(() => renderDataFreshness());
}

document.addEventListener("ubl:data-updated", (event) => {
  applyLeagueData(event.detail.data);
});

initializeApp();

if (countdownParts.seconds) setInterval(updateCountdown, 1000);

if (document.querySelector("[data-featured-game]") || document.querySelector(".score-ticker")) {
  setInterval(() => {
    renderFeaturedGame();
    renderHomeSchedule();
    renderUpcomingTicker();
  }, 60000);
}
