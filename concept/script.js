const league = window.UBL_DATA;

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

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

function mapTriggerMarkup(label, address, detail = "") {
  if (!address) return label;
  return `
    <button class="map-trigger" type="button" data-map-label="${label}" data-map-address="${address}">
      <span>${label}</span>${detail ? `<small>${detail}</small>` : ""}
    </button>
  `;
}

function gameLocationMarkup(game) {
  const homeProgram = game.homeId ? programById(game.homeId) : null;
  return mapTriggerMarkup(game.location, homeProgram?.homeAddress || "");
}

function gameMarkup(game) {
  return `
    <article class="game-row">
      <div class="game-date">${game.date.split(" ")[0]}<span>${game.date.split(" ").slice(1).join(" ")} · ${game.time}</span></div>
      <div class="game-info">
        <strong>${gameTeamName(game, "away")} <em>vs</em> ${gameTeamName(game, "home")}</strong>
        <p>${game.division} · ${game.stage ? `${game.stage} · ` : ""}${gameLocationMarkup(game)}</p>
      </div>
    </article>
  `;
}

function allScheduledGames() {
  return league.scheduleWeeks.flatMap((week) => week.games);
}

function tickerTeam(game, side) {
  const program = game[`${side}Id`] ? programById(game[`${side}Id`]) : null;
  const name = gameTeamName(game, side);
  return {
    name,
    short: program?.short || name,
    logo: program?.logo || "../assets/ubl-logo.png"
  };
}

function tickerGameMarkup(game) {
  const away = tickerTeam(game, "away");
  const home = tickerTeam(game, "home");
  const shortDate = game.date.split(" ").slice(1).join(" ");
  return `
    <a class="ticker-game" href="schedule.html" aria-label="${away.name} versus ${home.name}, ${shortDate} at ${game.time}. Planning schedule.">
      <time><span>${shortDate}</span><small>${game.time}</small></time>
      <img src="${away.logo}" alt="">
      <b>${away.short}</b>
      <em>vs</em>
      <b>${home.short}</b>
      <img src="${home.logo}" alt="">
      <span class="ticker-status">Planning schedule</span>
    </a>
  `;
}

function renderUpcomingTicker() {
  const ticker = document.querySelector(".score-ticker");
  if (!ticker) return;
  const games = allScheduledGames().filter((game) => !game.stage).slice(0, 4);
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
let selectedWeekId = league.scheduleWeeks[0]?.id;

function renderHomeSchedule() {
  const gameList = document.querySelector("[data-game-list]");
  if (!gameList) return;
  const games = allScheduledGames()
    .filter((game) => scheduleDivision === "all" || game.division === scheduleDivision)
    .slice(0, 4);
  gameList.innerHTML = games.map(gameMarkup).join("");
}

function renderSchedulePage() {
  const weekList = document.querySelector("[data-week-game-list]");
  const weekSelect = document.querySelector("[data-week-select]");
  const weekHeading = document.querySelector("[data-week-heading]");
  const weekNote = document.querySelector("[data-week-note]");
  if (!weekList || !weekSelect) return;

  const week = league.scheduleWeeks.find((item) => item.id === selectedWeekId) || league.scheduleWeeks[0];
  const games = week.games.filter((game) => scheduleDivision === "all" || game.division === scheduleDivision);
  weekSelect.value = week.id;
  if (weekHeading) weekHeading.textContent = `${week.label} · ${week.range}`;
  if (weekNote) weekNote.textContent = week.note || league.scheduleNotice;
  weekList.innerHTML = games.length
    ? games.map(gameMarkup).join("")
    : `<div class="schedule-empty"><strong>No games planned</strong><p>${week.note || "No games match this division filter."}</p></div>`;
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
if (weekSelect) {
  weekSelect.innerHTML = league.scheduleWeeks.map((week) => `<option value="${week.id}">${week.label} · ${week.range}</option>`).join("");
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
  return league.standings[division].map((row, index) => {
    const program = programById(row.programId);
    const games = row.wins + row.losses;
    const pct = games ? (row.wins / games).toFixed(3).replace(/^0/, "") : ".000";
    const diff = row.pf - row.pa;
    return `
      <tr>
        <td class="seed-cell">${index + 1}</td>
        <td><a class="standings-team" href="teams.html#${program.id}"><img src="${program.logo}" alt="">${program.name}</a></td>
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
  return `
    <a class="team-card" href="teams.html#${program.id}">
      <img src="${program.logo}" alt="">
      <strong>${program.name}</strong>
      <span>${program.divisions.join(" · ")}</span>
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
    ? `<img class="coach-photo" src="${coach.photo}" alt="${coach.name}">`
    : `<span class="coach-photo coach-initials" aria-hidden="true">${coachInitials(coach.name)}</span>`;
  return `
    <article class="coach-card">
      ${portrait}
      <div>
        <span>${role}</span>
        <strong>${coach.name}</strong>
        <p>${coach.experience}</p>
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
      <span>${division}</span>
      <div class="coach-list">${coaches}</div>
      ${team.assistants.length ? "" : `<p class="coach-vacancy">Assistant coach to be confirmed.</p>`}
    </section>
  `;
}

function programProfileMarkup(program) {
  const contact = program.representativeEmail
    ? `<a href="mailto:${program.representativeEmail}">${program.representativeEmail}</a>`
    : "To be confirmed";
  return `
    <details class="program-profile" id="${program.id}" data-accordion-group="programs">
      <summary>
        <span class="program-profile-identity"><img src="${program.logo}" alt=""><span><strong>${program.name}</strong></span></span>
        <span class="program-profile-divisions">${program.divisions.join(" · ")}</span>
      </summary>
      <div class="program-profile-content">
        <p class="program-summary">${program.summary}</p>
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
    profile.open = true;
    setTimeout(() => profile.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
}

window.addEventListener("hashchange", openHashProgram);

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

const countdownTarget = new Date("2026-12-03T18:00:00-05:00").getTime();
const countdownParts = {
  days: document.querySelector("[data-countdown-days]"),
  hours: document.querySelector("[data-countdown-hours]"),
  minutes: document.querySelector("[data-countdown-minutes]"),
  seconds: document.querySelector("[data-countdown-seconds]")
};
const countdownMessage = document.querySelector("[data-countdown-message]");

function updateCountdown() {
  if (!countdownParts.days || !countdownParts.hours || !countdownParts.minutes || !countdownParts.seconds) return;
  const remaining = Math.max(0, countdownTarget - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  countdownParts.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(3, "0");
  countdownParts.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
  countdownParts.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  countdownParts.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");
  if (remaining === 0) countdownMessage.textContent = "The 2026–27 UBL season is underway.";
}

renderHomeSchedule();
renderSchedulePage();
renderStandings();
renderHomeTeams();
renderPrograms();
renderUpcomingTicker();
updateCountdown();

if (countdownParts.seconds) setInterval(updateCountdown, 1000);
