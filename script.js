const teams = [
  "The King’s School",
  "Perth",
  "Wilton Baptist",
  "Hudson Valley Rocks",
];

const schedule = [
  { date: "Dec 1", iso: "2026-12-01", time: "6:00 PM", division: "Boys Varsity", home: "The King’s School", away: "Wilton Baptist", location: "The King’s School Gym", result: "Scheduled" },
  { date: "Dec 5", iso: "2026-12-05", time: "5:30 PM", division: "Girls Varsity", home: "Perth", away: "Hudson Valley Rocks", location: "Perth", result: "Scheduled" },
  { date: "Dec 8", iso: "2026-12-08", time: "6:30 PM", division: "Boys Varsity", home: "Hudson Valley Rocks", away: "Perth", location: "HV Rocks Home Gym", result: "Scheduled" },
  { date: "Dec 11", iso: "2026-12-11", time: "5:30 PM", division: "Girls Varsity", home: "Wilton Baptist", away: "The King’s School", location: "Wilton Baptist", result: "Scheduled" },
  { date: "Dec 15", iso: "2026-12-15", time: "6:00 PM", division: "Boys Varsity", home: "Perth", away: "The King’s School", location: "Perth", result: "Scheduled" },
  { date: "Dec 18", iso: "2026-12-18", time: "6:00 PM", division: "Girls Varsity", home: "Hudson Valley Rocks", away: "Wilton Baptist", location: "HV Rocks Home Gym", result: "Scheduled" },
];

const standings = {
  "Boys Varsity": [
    { team: "The King’s School", wins: 0, losses: 0, pf: 0, pa: 0 },
    { team: "Perth", wins: 0, losses: 0, pf: 0, pa: 0 },
    { team: "Wilton Baptist", wins: 0, losses: 0, pf: 0, pa: 0 },
    { team: "Hudson Valley Rocks", wins: 0, losses: 0, pf: 0, pa: 0 },
  ],
  "Girls Varsity": [
    { team: "The King’s School", wins: 0, losses: 0, pf: 0, pa: 0 },
    { team: "Perth", wins: 0, losses: 0, pf: 0, pa: 0 },
    { team: "Wilton Baptist", wins: 0, losses: 0, pf: 0, pa: 0 },
    { team: "Hudson Valley Rocks", wins: 0, losses: 0, pf: 0, pa: 0 },
  ],
};

const sampleScores = [
  { date: "Season preview", division: "Boys Varsity", home: "The King’s School", homeScore: 48, away: "Perth", awayScore: 42, note: "Example result · replace with official final scores" },
  { date: "Season preview", division: "Girls Varsity", home: "Wilton Baptist", homeScore: 39, away: "Hudson Valley Rocks", awayScore: 44, note: "Example result · replace with official final scores" },
];

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  siteNav.classList.toggle("open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle?.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("open");
    document.body.classList.remove("menu-open");
  });
});

const scheduleBody = document.querySelector("[data-schedule-body]");

function renderSchedule(division = "all") {
  if (!scheduleBody) return;
  const games = division === "all" ? schedule : schedule.filter((game) => game.division === division);

  scheduleBody.innerHTML = games.map((game) => `
    <tr>
      <td><time datetime="${game.iso}">${game.date}</time></td>
      <td>${game.time}</td>
      <td>${game.division}</td>
      <td>${game.away} <span aria-hidden="true">@</span> ${game.home}</td>
      <td>${game.location}</td>
      <td>${game.result}</td>
    </tr>
  `).join("");
}

document.querySelectorAll("[data-division]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-division]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderSchedule(button.dataset.division);
  });
});

const standingsBody = document.querySelector("[data-standings-body]");

function renderStandings(division = "Boys Varsity") {
  if (!standingsBody) return;

  standingsBody.innerHTML = standings[division].map((row, index) => {
    const games = row.wins + row.losses;
    const percentage = games ? (row.wins / games).toFixed(3).replace(/^0/, "") : ".000";
    const differential = row.pf - row.pa;
    const formattedDiff = differential > 0 ? `+${differential}` : String(differential);

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${row.team}</td>
        <td>${row.wins}</td>
        <td>${row.losses}</td>
        <td>${percentage}</td>
        <td>${row.pf}</td>
        <td>${row.pa}</td>
        <td>${formattedDiff}</td>
      </tr>
    `;
  }).join("");
}

document.querySelectorAll("[data-standings-division]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-standings-division]").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    renderStandings(button.dataset.standingsDivision);
  });
});

const scoreList = document.querySelector("[data-score-list]");

function renderScores() {
  if (!scoreList) return;

  const savedScores = JSON.parse(localStorage.getItem("ublScores") || "[]");
  const scores = [...savedScores, ...sampleScores].slice(0, 4);

  scoreList.innerHTML = scores.map((game) => `
    <article class="score-card">
      <div class="score-card-top">
        <span>${game.date} · ${game.division}</span>
        <span class="score-card-final">Final</span>
      </div>
      <div class="score-line"><strong>${game.home}</strong><span>${game.homeScore}</span></div>
      <div class="score-line"><strong>${game.away}</strong><span>${game.awayScore}</span></div>
      ${game.note ? `<p class="score-note">${game.note}</p>` : ""}
    </article>
  `).join("");
}

document.querySelectorAll("[data-team-select]").forEach((select) => {
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team;
    option.textContent = team;
    select.append(option);
  });
});

const scoreForm = document.querySelector("[data-score-form]");
const formStatus = document.querySelector("[data-form-status]");

scoreForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(scoreForm);
  const entry = Object.fromEntries(formData.entries());

  if (entry.homeTeam === entry.awayTeam) {
    formStatus.textContent = "Home and away teams must be different.";
    return;
  }

  if (entry.homeScore === entry.awayScore) {
    formStatus.textContent = "A final basketball score cannot end in a tie.";
    return;
  }

  const savedScores = JSON.parse(localStorage.getItem("ublScores") || "[]");
  savedScores.unshift({
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${entry.date}T12:00:00`)),
    division: entry.division,
    home: entry.homeTeam,
    homeScore: Number(entry.homeScore),
    away: entry.awayTeam,
    awayScore: Number(entry.awayScore),
    note: entry.notes ? `${entry.notes} · Submitted by ${entry.submittedBy}` : `Submitted by ${entry.submittedBy}`,
  });
  localStorage.setItem("ublScores", JSON.stringify(savedScores.slice(0, 10)));

  scoreForm.reset();
  formStatus.textContent = "Score saved in this browser and added to the latest results.";
  renderScores();
});

renderSchedule();
renderStandings();
renderScores();
