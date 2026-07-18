const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const mobileHeader = window.matchMedia("(max-width: 55rem)");

siteNav?.querySelector("a.active")?.setAttribute("aria-current", "page");

function closeSiteMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  if (menuToggle) menuToggle.textContent = "Menu";
  siteNav?.classList.remove("open");
  document.body.classList.remove("menu-open");
}

menuToggle?.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  menuToggle.textContent = willOpen ? "Close" : "Menu";
  siteNav?.classList.toggle("open", willOpen);
  document.body.classList.toggle("menu-open", willOpen);
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeSiteMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSiteMenu();
});

mobileHeader.addEventListener("change", (event) => {
  if (!event.matches) closeSiteMenu();
});
