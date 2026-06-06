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

const openStatus = document.querySelector("[data-open-status]");

function updateOpenStatus() {
  if (!openStatus) return;

  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const day = values.weekday;
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  const schedule = {
    Mon: [600, 1080],
    Tue: null,
    Wed: [600, 1080],
    Thu: [600, 1080],
    Fri: [600, 1080],
    Sat: [600, 1080],
    Sun: [540, 1020],
  };
  const today = schedule[day];

  if (!today) {
    openStatus.textContent = "Closed today · Reopens Wednesday at 10:00 am";
    return;
  }

  const [opens, closes] = today;
  if (minutes >= opens && minutes < closes) {
    const closeTime = day === "Sun" ? "5:00 pm" : "6:00 pm";
    openStatus.textContent = `Open now · Closes at ${closeTime}`;
  } else {
    const openTime = day === "Sun" ? "9:00 am" : "10:00 am";
    openStatus.textContent = `Closed now · Today's hours ${openTime}–${day === "Sun" ? "5:00 pm" : "6:00 pm"}`;
  }
}

updateOpenStatus();
