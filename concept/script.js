const schedule = [
  { date: "Tue Dec 1", time: "6:00 PM", division: "Boys Varsity", home: "The King’s School", away: "Wilton Baptist", location: "The King’s School Gym" },
  { date: "Sat Dec 5", time: "5:30 PM", division: "Girls Varsity", home: "Perth", away: "Hudson Valley Rocks", location: "Perth" },
  { date: "Tue Dec 8", time: "6:30 PM", division: "Boys Varsity", home: "Hudson Valley Rocks", away: "Perth", location: "HV Rocks Home Gym" },
  { date: "Fri Dec 11", time: "5:30 PM", division: "Girls Varsity", home: "Wilton Baptist", away: "The King’s School", location: "Wilton Baptist" },
  { date: "Tue Dec 15", time: "6:00 PM", division: "Boys Varsity", home: "Perth", away: "The King’s School", location: "Perth" },
  { date: "Fri Dec 18", time: "6:00 PM", division: "Girls Varsity", home: "Hudson Valley Rocks", away: "Wilton Baptist", location: "HV Rocks Home Gym" },
];

const teams = [
  { name: "The King’s School", logo: "../assets/team-kings-school.png", wins: 0, losses: 0, pf: 0, pa: 0 },
  { name: "Perth", logo: "../assets/team-perth.png", wins: 0, losses: 0, pf: 0, pa: 0 },
  { name: "Wilton Baptist", logo: "../assets/team-wilton-baptist.png", wins: 0, losses: 0, pf: 0, pa: 0 },
  { name: "Hudson Valley Rocks", logo: "../assets/team-hudson-valley-rocks.png", wins: 0, losses: 0, pf: 0, pa: 0 },
];

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

const gameList = document.querySelector("[data-game-list]");

function renderSchedule(filter = "all") {
  if (!gameList) return;
  const games = filter === "all" ? schedule : schedule.filter((game) => game.division === filter);

  gameList.innerHTML = games.map((game) => {
    const [day, month, date] = game.date.split(" ");
    return `
      <article class="game-row">
        <div class="game-date">${day}<span>${month} ${date} · ${game.time}</span></div>
        <div class="game-info">
          <strong>${game.away} <em>vs</em> ${game.home}</strong>
          <p>${game.division} · ${game.location}</p>
        </div>
      </article>
    `;
  }).join("");
}

document.querySelectorAll("[data-schedule-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-schedule-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderSchedule(button.dataset.scheduleFilter);
  });
});

const standingsBody = document.querySelector("[data-standings-body]");

function renderStandings() {
  if (!standingsBody) return;
  standingsBody.innerHTML = teams.map((team) => `
    <tr>
      <td><span class="standings-team"><img src="${team.logo}" alt="">${team.name}</span></td>
      <td>${team.wins}</td>
      <td>${team.losses}</td>
      <td>.000</td>
      <td>${team.pf}</td>
      <td>${team.pa}</td>
    </tr>
  `).join("");
}

document.querySelectorAll("[data-standings-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-standings-filter]").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
  });
});

const countdownTarget = new Date("2026-12-01T18:00:00-05:00").getTime();
const countdownParts = {
  days: document.querySelector("[data-countdown-days]"),
  hours: document.querySelector("[data-countdown-hours]"),
  minutes: document.querySelector("[data-countdown-minutes]"),
  seconds: document.querySelector("[data-countdown-seconds]"),
};
const countdownMessage = document.querySelector("[data-countdown-message]");

function updateCountdown() {
  const remaining = Math.max(0, countdownTarget - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);

  countdownParts.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(3, "0");
  countdownParts.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
  countdownParts.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  countdownParts.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");

  if (remaining === 0) {
    countdownMessage.textContent = "The 2026–27 UBL season is underway.";
  }
}

renderSchedule();
renderStandings();
updateCountdown();
setInterval(updateCountdown, 1000);
