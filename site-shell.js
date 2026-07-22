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
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  if (menuToggleLabel) menuToggleLabel.textContent = isOpen ? "Open menu" : "Close menu";
  siteNav?.classList.toggle("open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeSiteMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSiteMenu();
});
window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) closeSiteMenu();
});
