const reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const sponsorCounts = [...document.querySelectorAll("[data-count-up]")];

sponsorCounts.forEach((count) => {
  const target = Number(count.dataset.countUp);
  if (!Number.isFinite(target) || reducedMotionPreference.matches || !("IntersectionObserver" in window)) return;

  count.textContent = "0";
  const countObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    countObserver.disconnect();
    const startedAt = performance.now();
    const duration = 1100;

    function updateCount(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      count.textContent = String(Math.round(target * easedProgress));
      if (progress < 1) requestAnimationFrame(updateCount);
    }

    requestAnimationFrame(updateCount);
  }, { threshold: 0.65 });
  countObserver.observe(count);
});

const sponsorStory = document.querySelector("[data-sponsor-story]");

if (sponsorStory) {
  const sponsorSteps = [...sponsorStory.querySelectorAll("[data-sponsor-step]")];
  const sponsorScenes = [...sponsorStory.querySelectorAll("[data-sponsor-scene]")];
  const sponsorControls = [...sponsorStory.querySelectorAll("[data-sponsor-target]")];

  function activateSponsorScene(id) {
    if (!sponsorScenes.some((scene) => scene.dataset.sponsorScene === id)) return;
    sponsorStory.dataset.activeScene = id;
    sponsorSteps.forEach((step) => step.classList.toggle("is-active", step.dataset.sponsorStep === id));
    sponsorScenes.forEach((scene) => scene.classList.toggle("is-active", scene.dataset.sponsorScene === id));
    sponsorControls.forEach((control) => {
      const active = control.dataset.sponsorTarget === id;
      control.classList.toggle("is-active", active);
      control.setAttribute("aria-pressed", String(active));
    });
  }

  sponsorControls.forEach((control) => {
    control.addEventListener("click", () => {
      const id = control.dataset.sponsorTarget;
      activateSponsorScene(id);
      sponsorSteps.find((step) => step.dataset.sponsorStep === id)?.scrollIntoView({
        behavior: reducedMotionPreference.matches ? "auto" : "smooth",
        block: "center"
      });
    });
  });

  sponsorSteps.forEach((step) => {
    step.addEventListener("focus", () => activateSponsorScene(step.dataset.sponsorStep));
    step.addEventListener("pointerenter", () => activateSponsorScene(step.dataset.sponsorStep));
  });

  if ("IntersectionObserver" in window) {
    const visibleSteps = new Map();
    const sponsorObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSteps.set(entry.target, entry.intersectionRatio);
        else visibleSteps.delete(entry.target);
      });
      const activeEntry = [...visibleSteps.entries()].sort((a, b) => b[1] - a[1])[0];
      if (activeEntry) activateSponsorScene(activeEntry[0].dataset.sponsorStep);
    }, { rootMargin: "-22% 0px -30%", threshold: [0.25, 0.5, 0.7] });
    sponsorSteps.forEach((step) => sponsorObserver.observe(step));
  }
}
