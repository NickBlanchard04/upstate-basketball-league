const sponsorMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const sponsorRevealItems = [...document.querySelectorAll(".sponsor-reveal")];

if (!sponsorMotionPreference.matches && "IntersectionObserver" in window) {
  document.documentElement.classList.add("sponsor-motion");

  const sponsorRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      sponsorRevealObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.14 });

  sponsorRevealItems.forEach((item) => sponsorRevealObserver.observe(item));
}
