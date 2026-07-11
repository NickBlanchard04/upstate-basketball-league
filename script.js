let league = window.UBL_DATA;
const core = window.UBL_CORE;
const { ACTIVE_STATUSES, FINAL_STATUSES, escapeHtml, safeImageUrl } = core;

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
siteNav?.querySelector("a.active")?.setAttribute("aria-current", "page");

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  siteNav.classList.toggle("open", !open);
  document.body.classList.toggle("menu-open", !open);
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle?.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("open");
    document.body.classList.remove("menu-open");
  });
});

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

function gameTeamName(game, side) {
  const directName = game[`${side}Name`];
  if (directName) return directName;
  return programById(game[`${side}Id`])?.name || "TBD";
}

function safeAttribute(value) {
  return escapeHtml(value);
}

function mapTriggerMarkup(label, address, detail = "") {
  if (!address) return escapeHtml(label);
  return `
    <button class="map-trigger" type="button" data-map-label="${safeAttribute(label)}" data-map-address="${safeAttribute(address)}">
      <span>${escapeHtml(label)}</span>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </button>
  `;
}

function gameLocationMarkup(game) {
  return mapTriggerMarkup(game.location || "Location TBD", game.locationAddress || "");
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
  const dateParts = String(game.date || "Date TBD").split(" ");
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

function tickerGameMarkup(game) {
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
    <a class="ticker-game" href="schedule.html" data-ticker-state="${state}" aria-label="${safeAttribute(away.name)} versus ${safeAttribute(home.name)}, ${safeAttribute(shortDate)} at ${safeAttribute(game.time)}${isFinal ? ", final" : ""}.">
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
  const group = games.map(tickerGameMarkup).join("");
  ticker.innerHTML = `
    <div class="ticker-window">
      <div class="ticker-track">
        <div class="ticker-group">${group}</div>
        <div class="ticker-group" aria-hidden="true">${group}</div>
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
    ? games.map(gameMarkup).join("")
    : `<div class="schedule-empty"><strong>No games planned</strong><p>${escapeHtml(week.note || "No games match this division filter.")}</p></div>`;
}

document.querySelectorAll("[data-schedule-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-schedule-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
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
        <td><a class="standings-team" href="teams.html#${safeAttribute(program.id)}"><img src="${safeAttribute(safeImageUrl(program.logo))}" alt="">${escapeHtml(program.name)}</a></td>
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

function bracketMarkup(division) {
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
    <div class="bracket-round"><h3>Play-in</h3><article class="bracket-game">
      ${bracketSlotMarkup("Seed 5", playInAway, "TBD", playIn, "away", playInWinner)}
      ${bracketSlotMarkup("Seed 4", playInHome, "TBD", playIn, "home", playInWinner)}
      <p>Winner advances to play Seed 1</p>
    </article></div>
    <div class="bracket-arrow" aria-hidden="true">&rarr;</div>
    <div class="bracket-round"><h3>Semifinals</h3>
      <article class="bracket-game">
        ${bracketSlotMarkup("Play-in winner", semifinalOneAway, "TBD", semifinalOne, "away", semifinalOneWinner)}
        ${bracketSlotMarkup("Seed 1", semifinalOneHome, "Regular season leader", semifinalOne, "home", semifinalOneWinner)}
      </article>
      <article class="bracket-game">
        ${bracketSlotMarkup("Seed 3", semifinalTwoAway, "TBD", semifinalTwo, "away", semifinalTwoWinner)}
        ${bracketSlotMarkup("Seed 2", semifinalTwoHome, "TBD", semifinalTwo, "home", semifinalTwoWinner)}
      </article>
    </div>
    <div class="bracket-arrow" aria-hidden="true">&rarr;</div>
    <div class="bracket-round championship-round"><h3>Championship</h3><article class="champion-card">
      <span>2027 UBL ${divisionName}</span><strong>${escapeHtml(bracketTeamName(champion, "Champion"))}</strong><p>${champion ? "Division champion" : "Semifinal winners"}</p>
    </article></div>
  `;
}

function renderBrackets() {
  document.querySelectorAll("[data-bracket]").forEach((bracket) => {
    bracket.innerHTML = bracketMarkup(bracket.dataset.bracket);
  });
}

function renderDataFreshness() {
  const source = window.UBL_DATA_SOURCE || "bundled fallback";
  const updated = league.lastUpdated ? new Date(league.lastUpdated) : null;
  const validDate = updated && Number.isFinite(updated.getTime());
  let message = source === "live score feed"
    ? "Schedule and scores synced from the league sheet."
    : validDate
    ? `Schedule updated ${new Intl.DateTimeFormat("en-US", { timeZone: league.settings?.timezone || "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(updated)}.`
    : "Using the bundled backup schedule.";
  if (source === "published snapshot") message += " Published snapshot.";
  if (source === "bundled fallback" || window.UBL_DATA_ERROR) message += " Live updates are temporarily unavailable.";
  document.querySelectorAll("[data-freshness]").forEach((element) => {
    element.textContent = message;
    element.classList.toggle("data-freshness-warning", source === "bundled fallback" || Boolean(window.UBL_DATA_ERROR));
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
      <a class="team-card team-card-open-spot" href="teams.html#tbd">
        <span class="open-spot-mark" aria-hidden="true">+</span>
        <strong>Join the UBL</strong>
        <span>One league spot is open</span>
      </a>
    `;
  }
  return `
    <a class="team-card" href="teams.html#${safeAttribute(program.id)}">
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
  if (name === "To be confirmed") return "TBD";
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
  const coaches = [
    coachCardMarkup(team.headCoach, "Head coach"),
    ...team.assistants.map((coach) => coachCardMarkup(coach, "Assistant coach"))
  ].join("");
  return `
    <section class="program-division">
      <span>${escapeHtml(division)}</span>
      <div class="coach-list">${coaches}</div>
      ${team.assistants.length ? "" : `<p class="coach-vacancy">Assistant coach to be confirmed.</p>`}
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
  const contact = email
    ? `<a href="mailto:${safeAttribute(email)}">${escapeHtml(email)}</a>`
    : "To be confirmed";
  return `
    <details class="program-profile" id="${safeAttribute(program.id)}" data-accordion-group="programs">
      <summary>
        <span class="program-profile-identity"><img src="${safeAttribute(safeImageUrl(program.logo))}" alt=""><span><strong>${escapeHtml(program.name)}</strong></span></span>
        <span class="program-profile-divisions">${program.divisions.map(escapeHtml).join(" &middot; ")}</span>
      </summary>
      <div class="program-profile-content">
        <p class="program-summary">${escapeHtml(program.summary)}</p>
        <div class="program-division-grid">${program.divisions.map((division) => profileDivisionMarkup(program, division)).join("")}</div>
        <dl class="program-facts">
          <div><dt>Home gym</dt><dd>${mapTriggerMarkup(program.homeGym, program.homeAddress, program.homeAddress)}</dd></div>
          <div><dt>Program representative</dt><dd>${contact}</dd></div>
        </dl>
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

function initializeGallery() {
  const galleryItems = [...document.querySelectorAll("[data-gallery-division]")];
  if (!galleryItems.length) return;

  document.querySelectorAll("[data-gallery-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const division = button.dataset.galleryFilter;
      document.querySelectorAll("[data-gallery-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
        item.setAttribute("aria-selected", String(item === button));
      });
      galleryItems.forEach((item) => {
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
mapDialog.innerHTML = `
  <div class="map-dialog-card">
    <div class="map-dialog-heading">
      <div><span>Game location</span><h2 data-map-dialog-label></h2></div>
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
  renderPrograms();
  renderUpcomingTicker();
  renderFeaturedGame();
  renderBrackets();
  renderDataFreshness();
  configureCountdown();
  updateCountdown();
}

async function initializeApp() {
  league = await (window.UBL_DATA_READY || Promise.resolve(window.UBL_DATA));
  renderLeagueData();
  initializeGallery();
}

document.addEventListener("ubl:data-updated", (event) => {
  league = event.detail.data;
  renderLeagueData();
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
