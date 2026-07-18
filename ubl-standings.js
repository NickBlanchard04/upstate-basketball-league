let league = window.UBL_DATA;

function programById(id) {
  return league?.programs?.find((program) => program.id === id);
}

function safeImageUrl(value) {
  return window.UBL_CORE?.safeImageUrl?.(value) || "assets/optimized/ubl-logo-192.webp";
}

function formatPercentage(wins, losses) {
  const gamesPlayed = wins + losses;
  return gamesPlayed ? (wins / gamesPlayed).toFixed(3).replace(/^0/, "") : ".000";
}

function formatDifferential(pointsFor, pointsAgainst) {
  const differential = pointsFor - pointsAgainst;
  return differential > 0 ? `+${differential}` : String(differential);
}

function createCell(text, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function createTeamCell(program) {
  const cell = document.createElement("td");
  const link = document.createElement("a");
  const logo = document.createElement("img");
  const fullName = document.createElement("span");
  const shortName = document.createElement("span");

  link.className = "team-link";
  link.href = `teams.html#${encodeURIComponent(program.id)}`;
  link.setAttribute("aria-label", `View ${program.name} team details`);

  logo.src = safeImageUrl(program.logo);
  logo.alt = "";
  logo.loading = "eager";
  logo.decoding = "async";

  fullName.className = "team-name";
  fullName.textContent = program.name;

  shortName.className = "team-short";
  shortName.textContent = program.short;

  link.append(logo, fullName, shortName);
  cell.append(link);
  return cell;
}

function renderDivision(division, body) {
  const standings = league?.standings?.[division] || [];
  const fragment = document.createDocumentFragment();

  standings.forEach((row, index) => {
    const program = programById(row.programId);
    if (!program) return;

    const tableRow = document.createElement("tr");
    const seedCell = createCell(String(index + 1), "seed-column");
    const recordCell = createCell(`${row.wins}\u2013${row.losses}`);
    const percentageCell = createCell(formatPercentage(row.wins, row.losses));
    const pointsForCell = createCell(String(row.pf));
    const pointsAgainstCell = createCell(String(row.pa));
    const differentialCell = createCell(formatDifferential(row.pf, row.pa));

    tableRow.append(
      seedCell,
      createTeamCell(program),
      recordCell,
      percentageCell,
      pointsForCell,
      pointsAgainstCell,
      differentialCell
    );
    fragment.append(tableRow);
  });

  body.replaceChildren(fragment);
}

function renderFreshness() {
  const source = window.UBL_DATA_SOURCE || "bundled fallback";
  const updated = league?.lastUpdated ? new Date(league.lastUpdated) : null;
  const validDate = updated && Number.isFinite(updated.getTime());
  let message = source === "updating live data"
    ? "Showing the saved standings while live updates load."
    : source === "live score feed"
      ? "Standings and scores synced from the league sheet."
      : validDate
        ? `Standings updated ${new Intl.DateTimeFormat("en-US", {
          timeZone: league?.settings?.timezone || "America/New_York",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short"
        }).format(updated)}.`
        : "Using the bundled backup standings.";

  if (source === "published snapshot") message += " Published snapshot.";
  if (source === "bundled fallback" || window.UBL_DATA_ERROR) message += " Live updates are temporarily unavailable.";

  document.querySelectorAll("[data-freshness]").forEach((element) => {
    element.textContent = message;
    element.classList.toggle("data-freshness-warning", source === "bundled fallback" || Boolean(window.UBL_DATA_ERROR));
  });
}

function renderStandingsPage() {
  document.querySelectorAll("[data-standings-division]").forEach((body) => {
    renderDivision(body.dataset.standingsDivision, body);
  });
  renderFreshness();
}

function applyLeagueData(data) {
  if (!data) return;
  league = data;
  renderStandingsPage();
}

renderStandingsPage();

Promise.resolve(window.UBL_DATA_READY || window.UBL_DATA)
  .then(applyLeagueData)
  .catch(renderFreshness);

document.addEventListener("ubl:data-updated", (event) => {
  applyLeagueData(event.detail.data);
});
