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
  siteNav?.classList.toggle("open", !open);
  document.body.classList.toggle("menu-open", !open);
});

siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeSiteMenu));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSiteMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) closeSiteMenu();
});

function initializeSeasonMotion() {
  const section = document.querySelector(".season-section");
  const desktopLayout = window.matchMedia("(min-width: 768px)");
  if (!section || !desktopLayout.matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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

function initializeSeasonProgress() {
  const rail = document.querySelector(".season-path");
  const stages = [...document.querySelectorAll(".season-stage")];
  const current = document.querySelector("[data-season-current]");
  const dots = [...document.querySelectorAll(".season-mobile-dots i")];
  if (!rail || !stages.length || !current) return;

  let updateFrame = 0;
  let activeIndex = -1;

  const updateProgress = () => {
    updateFrame = 0;
    const railBox = rail.getBoundingClientRect();
    const railCenter = railBox.left + railBox.width / 2;
    const nextIndex = stages.reduce((closestIndex, stage, index) => {
      const stageBox = stage.getBoundingClientRect();
      const stageCenter = stageBox.left + stageBox.width / 2;
      const closestBox = stages[closestIndex].getBoundingClientRect();
      const closestCenter = closestBox.left + closestBox.width / 2;
      return Math.abs(stageCenter - railCenter) < Math.abs(closestCenter - railCenter) ? index : closestIndex;
    }, 0);

    if (nextIndex === activeIndex) return;
    activeIndex = nextIndex;
    current.textContent = String(nextIndex + 1);
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === nextIndex));
  };

  const requestProgressUpdate = () => {
    if (updateFrame) return;
    updateFrame = window.requestAnimationFrame(updateProgress);
  };

  rail.addEventListener("scroll", requestProgressUpdate, { passive: true });
  stages.forEach((stage) => stage.addEventListener("focusin", requestProgressUpdate));
  window.addEventListener("resize", requestProgressUpdate);
  requestProgressUpdate();
}

function setLeagueProfileCardFlipped(card, flipped) {
  const title = card.dataset.profileTitle || "League profile";
  const front = card.querySelector(".league-profile-front");
  const back = card.querySelector(".league-profile-back");
  card.classList.toggle("is-flipped", flipped);
  card.setAttribute("aria-pressed", String(flipped));
  card.setAttribute("aria-label", `${title}: ${flipped ? "return to front" : "show details"}`);
  front?.setAttribute("aria-hidden", String(flipped));
  back?.setAttribute("aria-hidden", String(!flipped));
}

function initializeLeagueProfileCards() {
  const cards = [...document.querySelectorAll(".league-profile-card")];
  cards.forEach((card) => {
    setLeagueProfileCardFlipped(card, false);
    card.addEventListener("click", () => {
      const nextState = card.getAttribute("aria-pressed") !== "true";
      cards.forEach((item) => setLeagueProfileCardFlipped(item, item === card && nextState));
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || card.getAttribute("aria-pressed") !== "true") return;
      event.preventDefault();
      setLeagueProfileCardFlipped(card, false);
    });
  });
}

document.addEventListener("toggle", (event) => {
  const item = event.target;
  if (!(item instanceof HTMLDetailsElement) || !item.open) return;
  const group = item.dataset.accordionGroup;
  if (!group) return;
  document.querySelectorAll(`[data-accordion-group="${group}"][open]`).forEach((openItem) => {
    if (openItem !== item) openItem.open = false;
  });
}, true);

initializeSeasonMotion();
initializeSeasonFlipCards();
initializeSeasonProgress();
initializeLeagueProfileCards();
