/* UBL interactive team-profile experience.
   Loaded after script.js so these focused renderers replace the legacy profile layout. */
const TEAM_PROFILE_ASSET_VERSION = "20260723-2";

function teamGalleryUrl(programId, division = "") {
  const params = new URLSearchParams({ program: programId });
  if (division) params.set("division", division === "Girls Varsity" ? "girls" : "boys");
  return `gallery.html?${params.toString()}#team-album-${encodeURIComponent(programId)}`;
}

function teamProfileCoach(program, division, slot) {
  const team = program.teams?.[division] || {};
  if (slot === "head") return team.headCoach || {};
  return (team.assistants || []).find((coach) => coach?.name && coach.name !== "To be confirmed") || {};
}

function teamProfileNameParts(name) {
  const words = String(name || "UBL Program").trim().split(/\s+/);
  const hasThe = words[0]?.toLowerCase() === "the";
  if (hasThe) words.shift();
  let primary = words.shift() || "Program";
  let suffix = words.join(" ") || "Basketball";
  if (primary.length <= 2 && words.length) {
    const acronym = primary;
    primary = words.shift();
    suffix = [acronym, ...words].join(" ");
  }
  return {
    prefix: hasThe ? "The" : "UBL",
    primary,
    suffix
  };
}

function teamProfileBannerTrigger(label, detailId) {
  return `<button class="team-banner-trigger" type="button" aria-expanded="false" aria-controls="${safeAttribute(detailId)}"><span class="sr-only">Focus ${escapeHtml(label)} banner</span></button>`;
}

function teamProfileCoachBannerMarkup(coach, role, key, number) {
  const hasCoach = coach?.name && coach.name !== "To be confirmed";
  const name = hasCoach ? coach.name : "Profile pending";
  const portrait = hasCoach && coach.photo
    ? `<img class="team-banner-coach-photo" src="${safeAttribute(safeImageUrl(coach.photo))}" alt="${safeAttribute(name)}" width="192" height="192" loading="lazy" decoding="async">`
    : "";
  const experience = hasCoach
    ? coach.experience || "Program biography not yet published."
    : "This program's representative has not submitted a public coaching profile for this position yet.";
  const detailId = `team-banner-${key}-detail`;
  return `
    <section class="team-banner team-banner-coach" data-team-banner data-banner-name="${safeAttribute(role)}" data-banner-key="${safeAttribute(key)}" aria-labelledby="team-banner-${safeAttribute(key)}-title">
      ${teamProfileBannerTrigger(role, detailId)}
      <span class="team-banner-number" aria-hidden="true">${escapeHtml(number)}</span>
      <div class="team-banner-content">
        <span class="team-banner-kicker">${escapeHtml(role)}</span>
        <span class="team-banner-ghost" aria-hidden="true">${escapeHtml(hasCoach ? coachInitials(name) : "UBL")}</span>
        <h2 id="team-banner-${safeAttribute(key)}-title">${escapeHtml(name)}</h2>
        <div class="team-banner-detail" id="${safeAttribute(detailId)}" hidden>
          ${portrait}
          <p>${escapeHtml(experience)}</p>
        </div>
      </div>
      <span class="team-banner-rule" aria-hidden="true"></span>
    </section>
  `;
}

function teamProfileDivisionBannerMarkup(program, activeDivision) {
  const detailId = "team-banner-division-detail";
  const orderedDivisions = [activeDivision, ...program.divisions.filter((division) => division !== activeDivision)];
  return `
    <section class="team-banner team-banner-division" data-team-banner data-banner-name="Division" data-banner-key="division" aria-labelledby="team-banner-division-title">
      ${teamProfileBannerTrigger("division", detailId)}
      <span class="team-banner-number" aria-hidden="true">02</span>
      <div class="team-banner-content">
        <span class="team-banner-kicker">Division</span>
        <h2 id="team-banner-division-title">${escapeHtml(activeDivision.replace(" Varsity", ""))}</h2>
        <nav class="team-banner-division-nav" aria-label="${safeAttribute(program.name)} divisions">
          ${orderedDivisions.map((division) => `
            <a href="${safeAttribute(teamProfileUrl(program.id, division))}"${division === activeDivision ? ' aria-current="page"' : ""}>
              <span aria-hidden="true">${division.startsWith("Girls") ? "G" : "B"}</span>${escapeHtml(division.replace(" Varsity", ""))}
            </a>
          `).join("")}
        </nav>
        <div class="team-banner-detail" id="${detailId}" hidden>
          <p>Switch divisions to meet the corresponding varsity coaching staff.</p>
        </div>
      </div>
      <span class="team-banner-rule" aria-hidden="true"></span>
    </section>
  `;
}

function teamProfileGalleryBannerMarkup(program, division) {
  const galleryPhotos = (Array.isArray(league.galleryPhotos) ? league.galleryPhotos : []).filter((photo) =>
    photo.teamId === program.id && photo.division === division && bundledGalleryImageUrl(photo.previewUrl)
  );
  const featuredPhoto = galleryPhotos[0];
  const galleryHref = teamGalleryUrl(program.id, division);
  const divisionLabel = division.replace(" Varsity", "");
  const mediaMarkup = featuredPhoto
    ? `<img src="${safeAttribute(bundledGalleryImageUrl(featuredPhoto.previewUrl))}" alt="" width="${Number(featuredPhoto.width) || 480}" height="${Number(featuredPhoto.height) || 320}" decoding="async">`
    : `<img class="team-banner-gallery-logo" src="${safeAttribute(safeImageUrl(program.logo))}" alt="" width="192" height="192" decoding="async">`;
  const photoSummary = galleryPhotos.length
    ? `${galleryPhotos.length} ${divisionLabel.toLowerCase()} photo${galleryPhotos.length === 1 ? "" : "s"} published.`
    : `${divisionLabel} photos will appear here as the season gets underway.`;

  return `
    <section class="team-banner team-banner-gallery" data-team-banner data-team-gallery-banner data-banner-name="Team gallery" data-banner-key="gallery" aria-labelledby="team-banner-gallery-title">
      ${teamProfileBannerTrigger("team gallery", "team-banner-gallery-detail")}
      <span class="team-banner-number" aria-hidden="true">06</span>
      <div class="team-banner-content">
        <span class="team-banner-kicker">Team gallery</span>
        <div class="team-banner-gallery-media${featuredPhoto ? " has-photo" : " has-logo"}" aria-hidden="true">${mediaMarkup}</div>
        <h2 id="team-banner-gallery-title">View the album</h2>
        <p class="team-banner-gallery-summary">${escapeHtml(photoSummary)}</p>
        <div class="team-banner-detail team-banner-gallery-detail" id="team-banner-gallery-detail" hidden>
          <a class="team-banner-gallery-cta" href="${safeAttribute(galleryHref)}" data-team-gallery-link aria-label="Open ${safeAttribute(program.name)} ${safeAttribute(divisionLabel)} gallery">Open team gallery <span aria-hidden="true">&#8599;</span></a>
        </div>
      </div>
      <span class="team-banner-rule" aria-hidden="true"></span>
    </section>
  `;
}

let teamBannerExperienceCleanup = null;

function initTeamBannerExperience(root) {
  if (teamBannerExperienceCleanup) teamBannerExperienceCleanup();

  const scene = root.querySelector("[data-team-banner-scene]");
  const stage = root.querySelector("[data-team-banner-stage]");
  const lightRig = root.querySelector("[data-team-banner-light-rig]");
  const banners = Array.from(root.querySelectorAll("[data-team-banner]"));
  const visualBanners = Array.from(root.querySelectorAll(".team-banner"));
  if (!scene || !stage || !banners.length) return;

  const triggers = banners.map((banner) => banner.querySelector(".team-banner-trigger"));
  const sectionNav = root.querySelector("[data-team-section-nav]");
  const sectionButtons = Array.from(root.querySelectorAll("[data-team-section-target]"));
  const sectionItems = Array.from(root.querySelectorAll("[data-team-section-nav] button, [data-team-section-nav] a"));
  const status = root.querySelector("[data-team-banner-status]");
  const previousButton = root.querySelector("[data-team-banner-previous]");
  const nextButton = root.querySelector("[data-team-banner-next]");
  const resetButton = root.querySelector("[data-team-banner-reset]");
  const previousLabel = root.querySelector("[data-team-banner-previous-label]");
  const nextLabel = root.querySelector("[data-team-banner-next-label]");
  const progressCurrent = root.querySelector("[data-team-banner-progress-current]");
  const identityWordFrame = root.querySelector(".team-banner-identity .team-banner-content h1");
  const identityWord = identityWordFrame?.querySelector("span");
  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animation = window.gsap;
  let entranceTimeline = null;
  let entranceTrigger = null;
  let identityFitFrame = 0;
  let identityFitActive = true;
  let activeIndex = -1;

  function fitIdentityWord() {
    identityFitFrame = 0;
    if (!identityWordFrame || !identityWord) return;
    if (!desktopQuery.matches) {
      identityWord.style.removeProperty("--identity-word-scale");
      return;
    }
    const availableHeight = Math.max(1, identityWordFrame.clientHeight - 20);
    const naturalWidth = Math.max(1, identityWord.offsetWidth);
    const fittedScale = Math.min(1, availableHeight / naturalWidth);
    identityWord.style.setProperty("--identity-word-scale", fittedScale.toFixed(4));
  }

  function queueIdentityWordFit() {
    if (!identityFitActive) return;
    if (identityFitFrame) cancelAnimationFrame(identityFitFrame);
    identityFitFrame = requestAnimationFrame(fitIdentityWord);
  }

  function lightPositionFor(element) {
    const sceneBounds = scene.getBoundingClientRect();
    const elementBounds = element?.getBoundingClientRect();
    const rawPosition = elementBounds
      ? elementBounds.left - sceneBounds.left + elementBounds.width / 2
      : scene.clientWidth / 2;
    const safeInset = Math.min(176, scene.clientWidth * 0.16);
    return Math.max(safeInset, Math.min(scene.clientWidth - safeInset, rawPosition));
  }

  if (animation && window.ScrollTrigger) animation.registerPlugin(window.ScrollTrigger);

  function bannerLabel(index) {
    return banners[index]?.dataset.bannerName || `Banner ${index + 1}`;
  }

  function updateControls(index) {
    sectionButtons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const hasSelection = index >= 0;
    if (progressCurrent) progressCurrent.textContent = String(Math.max(0, index) + 1).padStart(2, "0");
    if (previousButton) {
      previousButton.disabled = !hasSelection || index === 0;
      const label = index > 0 ? `Previous: ${bannerLabel(index - 1)}` : "Previous";
      previousButton.setAttribute("aria-label", label);
      if (previousLabel) previousLabel.textContent = label;
    }
    if (nextButton) {
      nextButton.disabled = !hasSelection || index === banners.length - 1;
      const label = hasSelection && index < banners.length - 1 ? `Next: ${bannerLabel(index + 1)}` : "Next";
      nextButton.setAttribute("aria-label", label);
      if (nextLabel) nextLabel.textContent = label;
    }
    resetButton?.toggleAttribute("hidden", !desktopQuery.matches || !hasSelection);
  }

  function setBannerState(index) {
    banners.forEach((banner, bannerIndex) => {
      const selected = bannerIndex === index;
      banner.hidden = !desktopQuery.matches && !selected;
      banner.classList.toggle("is-selected", selected);
      banner.classList.toggle("is-muted", index >= 0 && !selected);
      triggers[bannerIndex]?.setAttribute("aria-expanded", String(selected));
      const detail = banner.querySelector(".team-banner-detail");
      if (detail) detail.hidden = !selected;
    });
    scene.classList.toggle("is-camera-active", desktopQuery.matches && index >= 0);
    scene.classList.toggle("is-light-focused", desktopQuery.matches && index >= 0);
    root.dataset.activeTeamSection = index >= 0 ? banners[index].dataset.bannerKey : "lineup";
    updateControls(index);
    if (status) {
      status.textContent = index >= 0
        ? `Viewing ${bannerLabel(index)}, section ${index + 1} of ${banners.length}.`
        : `Full team banner lineup. ${visualBanners.length} destinations.`;
    }
  }

  function resetCamera({ focusReset = false, animate = true } = {}) {
    if (!desktopQuery.matches) {
      const mobileIndex = activeIndex >= 0 ? activeIndex : 0;
      activeIndex = -1;
      moveCamera(mobileIndex, { focusBanner: focusReset, animate: false });
      return;
    }
    activeIndex = -1;
    setBannerState(-1);
    if (animation) {
      const duration = animate && !reducedMotionQuery.matches ? 0.42 : 0;
      animation.killTweensOf(stage);
      if (lightRig) animation.killTweensOf(lightRig);
      animation.killTweensOf(root.querySelectorAll(".team-banner-detail > *"));
      animation.to(stage, {
        x: 0,
        scale: 1,
        rotationY: 0,
        duration,
        ease: "power2.out",
        force3D: true,
        overwrite: true,
        onComplete: () => animation.set(stage, { clearProps: "transform,transformOrigin" })
      });
      if (lightRig) {
        animation.to(lightRig, {
          x: scene.clientWidth / 2,
          opacity: 0.46,
          duration: Math.min(duration, 0.34),
          ease: "power2.out",
          force3D: true,
          overwrite: true
        });
      }
      animation.set(visualBanners, { clearProps: "transform,opacity" });
    } else {
      stage.removeAttribute("style");
      visualBanners.forEach((banner) => banner.removeAttribute("style"));
      if (lightRig) lightRig.style.transform = `translate3d(${scene.clientWidth / 2}px, 0, 0)`;
    }
    if (focusReset) resetButton?.focus({ preventScroll: true });
  }

  function moveCamera(index, { focusBanner = false, animate = true } = {}) {
    const target = banners[index];
    if (!target) return;

    if (activeIndex === index) return;

    activeIndex = index;
    setBannerState(index);

    const targetCenter = target.offsetLeft + target.offsetWidth / 2;

    if (!desktopQuery.matches || reducedMotionQuery.matches || !animation) {
      if (lightRig && desktopQuery.matches) {
        const lightPosition = lightPositionFor(target);
        if (animation) animation.set(lightRig, { x: lightPosition, opacity: 1, force3D: true });
        else lightRig.style.transform = `translate3d(${lightPosition}px, 0, 0)`;
      }
      if (focusBanner) triggers[index]?.focus({ preventScroll: true });
      return;
    }

    const stageCenter = stage.offsetWidth / 2;
    const distanceFromCenter = targetCenter - stageCenter;
    const normalizedPosition = Math.max(-1, Math.min(1, distanceFromCenter / Math.max(stageCenter, 1)));
    const cameraScale = target.classList.contains("team-banner-program") ? 1.085 : 1.07;
    const duration = animate ? 0.48 : 0;
    const projectedLightPosition = Math.max(
      Math.min(176, scene.clientWidth * 0.16),
      Math.min(
        scene.clientWidth - Math.min(176, scene.clientWidth * 0.16),
        stage.offsetLeft + stageCenter + distanceFromCenter * 0.08
      )
    );

    animation.killTweensOf(stage);
    if (lightRig) animation.killTweensOf(lightRig);
    animation.killTweensOf(root.querySelectorAll(".team-banner-detail > *"));
    animation.to(stage, {
      x: -distanceFromCenter * 0.92,
      scale: cameraScale,
      rotationY: normalizedPosition * -4.25,
      transformOrigin: `${targetCenter}px 48%`,
      duration,
      ease: "power2.out",
      force3D: true,
      overwrite: true,
      onComplete: () => {
        if (lightRig) animation.set(lightRig, { x: lightPositionFor(target), opacity: 1, force3D: true });
      }
    });
    if (lightRig) {
      animation.to(lightRig, {
        x: projectedLightPosition,
        opacity: 1,
        duration: Math.min(duration, 0.42),
        ease: "power2.out",
        force3D: true,
        overwrite: true
      });
    }

    const revealItems = target.querySelectorAll(".team-banner-detail > *");
    if (revealItems.length) {
      animation.fromTo(revealItems, { y: 6, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.24,
        delay: duration ? 0.08 : 0,
        stagger: 0.035,
        ease: "power2.out",
        overwrite: true
      });
    }
    if (focusBanner) triggers[index]?.focus({ preventScroll: true });
  }

  function moveRelative(direction) {
    if (activeIndex < 0) return;
    if (direction < 0 && activeIndex === 0) return;
    if (direction > 0 && activeIndex === banners.length - 1) return;
    const nextIndex = activeIndex + direction;
    moveCamera(nextIndex, { focusBanner: true });
  }

  function onSceneKeydown(event) {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".team-banner-trigger")) {
      event.preventDefault();
      const banner = event.target.closest("[data-team-banner]");
      const index = banners.indexOf(banner);
      if (index >= 0) moveCamera(index);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveRelative(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveRelative(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveCamera(0, { focusBanner: true });
    } else if (event.key === "End") {
      event.preventDefault();
      moveCamera(banners.length - 1, { focusBanner: true });
    }
  }

  function onSceneClick(event) {
    if (event.target.closest("a, button:not(.team-banner-trigger), .map-trigger")) return;
    const trigger = event.target.closest(".team-banner-trigger");
    const banner = trigger?.closest("[data-team-banner]") || banners.find((item) => {
      const bounds = item.getBoundingClientRect();
      return event.clientX >= bounds.left && event.clientX <= bounds.right
        && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    });
    const index = banners.indexOf(banner);
    if (index >= 0) moveCamera(index);
  }

  function onDocumentKeydown(event) {
    if (event.key === "Escape" && desktopQuery.matches && activeIndex >= 0) {
      event.preventDefault();
      resetCamera({ focusReset: true });
    }
  }

  function onViewportChange() {
    if (!desktopQuery.matches) {
      const selectedIndex = activeIndex >= 0 ? activeIndex : 0;
      activeIndex = -1;
      moveCamera(selectedIndex, { animate: false });
    } else if (activeIndex >= 0) {
      const selectedIndex = activeIndex;
      activeIndex = -1;
      visualBanners.forEach((banner) => { banner.hidden = false; });
      moveCamera(selectedIndex, { animate: false });
    } else {
      resetCamera({ animate: false });
    }
    queueIdentityWordFit();
    window.ScrollTrigger?.refresh();
  }

  function onPreviousClick() { moveRelative(-1); }
  function onNextClick() { moveRelative(1); }
  function onResetClick() { resetCamera(); }
  function onSectionNavClick(event) {
    const button = event.target.closest("[data-team-section-target]");
    if (!button) return;
    const index = banners.findIndex((banner) => banner.dataset.bannerKey === button.dataset.teamSectionTarget);
    if (index >= 0) moveCamera(index);
  }
  function onSectionNavKeydown(event) {
    const item = event.target.closest("button, a");
    if (!item || !sectionNav?.contains(item) || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = sectionItems.indexOf(item);
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? sectionItems.length - 1
        : Math.max(0, Math.min(sectionItems.length - 1, currentIndex + (event.key === "ArrowLeft" ? -1 : 1)));
    const nextItem = sectionItems[nextIndex];
    nextItem?.focus();
    const targetKey = nextItem?.dataset.teamSectionTarget;
    const bannerIndex = banners.findIndex((banner) => banner.dataset.bannerKey === targetKey);
    if (bannerIndex >= 0) moveCamera(bannerIndex);
  }

  previousButton?.addEventListener("click", onPreviousClick);
  nextButton?.addEventListener("click", onNextClick);
  resetButton?.addEventListener("click", onResetClick);
  sectionNav?.addEventListener("click", onSectionNavClick);
  sectionNav?.addEventListener("keydown", onSectionNavKeydown);
  scene.addEventListener("click", onSceneClick);
  scene.addEventListener("keydown", onSceneKeydown);
  document.addEventListener("keydown", onDocumentKeydown);
  desktopQuery.addEventListener("change", onViewportChange);
  reducedMotionQuery.addEventListener("change", onViewportChange);
  window.addEventListener("resize", queueIdentityWordFit, { passive: true });

  queueIdentityWordFit();
  document.fonts?.ready.then(() => {
    if (identityFitActive && root.isConnected) queueIdentityWordFit();
  });

  if (lightRig) {
    if (animation) animation.set(lightRig, { x: scene.clientWidth / 2, opacity: 0.46, force3D: true });
    else lightRig.style.transform = `translate3d(${scene.clientWidth / 2}px, 0, 0)`;
    scene.classList.add("is-light-ready");
  }

  if (desktopQuery.matches) setBannerState(-1);
  else moveCamera(0, { animate: false });

  if (animation && !reducedMotionQuery.matches) {
    const entranceBanners = desktopQuery.matches ? visualBanners : [banners[0]];
    entranceTimeline = animation.timeline({ paused: true });
    entranceTimeline
      .fromTo(entranceBanners, { y: 54, scale: 0.94, opacity: 0 }, {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.72,
        stagger: 0.085,
        ease: "power3.out",
        clearProps: "transform,opacity"
      })
      .fromTo(root.querySelectorAll(".team-banner-kicker, .team-banner-content h1, .team-banner-content h2"), { y: 10, opacity: 0.15 }, {
        y: 0,
        opacity: 1,
        duration: 0.42,
        stagger: 0.035,
        ease: "power2.out",
        clearProps: "transform,opacity"
      }, "-=0.35");

    if (window.ScrollTrigger) {
      entranceTrigger = window.ScrollTrigger.create({
        trigger: scene,
        start: "top 92%",
        once: true,
        onEnter: () => entranceTimeline.play()
      });
    } else {
      entranceTimeline.play();
    }
  }

  teamBannerExperienceCleanup = () => {
    identityFitActive = false;
    if (identityFitFrame) cancelAnimationFrame(identityFitFrame);
    entranceTrigger?.kill();
    entranceTimeline?.kill();
    if (animation && lightRig) animation.killTweensOf(lightRig);
    previousButton?.removeEventListener("click", onPreviousClick);
    nextButton?.removeEventListener("click", onNextClick);
    resetButton?.removeEventListener("click", onResetClick);
    sectionNav?.removeEventListener("click", onSectionNavClick);
    sectionNav?.removeEventListener("keydown", onSectionNavKeydown);
    scene.removeEventListener("click", onSceneClick);
    scene.removeEventListener("keydown", onSceneKeydown);
    document.removeEventListener("keydown", onDocumentKeydown);
    desktopQuery.removeEventListener("change", onViewportChange);
    reducedMotionQuery.removeEventListener("change", onViewportChange);
    window.removeEventListener("resize", queueIdentityWordFit);
  };
}

function validProgramEmail(program) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(program.representativeEmail || "") ? program.representativeEmail : "";
}

function updateTeamProfileMetadata(program, division) {
  const title = `${program.name} ${division} | UBL`;
  const description = `${program.summary} View ${division.toLowerCase()} coaches, home-court information, and program contact details.`;
  document.title = title;
  const isStaticProfile = Boolean(document.body.dataset.teamProgram && document.body.dataset.teamDivision);
  document.querySelector('meta[name="robots"]')?.setAttribute("content", isStaticProfile ? "index, follow" : "noindex, follow");
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description);
  const canonicalUrl = `https://upstatebasketballleague.com/${teamProfileUrl(program.id, division)}`;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonicalUrl);
}

function renderTeamProfile() {
  const container = document.querySelector("[data-team-profile]");
  if (!container) return;
  if (window.matchMedia("(max-width: 767px)").matches) {
    if (typeof renderStackedTeamProfile !== "function") {
      const refreshUrl = new URL(location.href);
      if (refreshUrl.searchParams.get("profileBuild") !== TEAM_PROFILE_ASSET_VERSION) {
        refreshUrl.searchParams.set("profileBuild", TEAM_PROFILE_ASSET_VERSION);
        location.replace(refreshUrl.toString());
      }
      return;
    }
    if (!container.querySelector(".team-profile-hero")) renderedTeamProfileSignature = "";
    renderStackedTeamProfile();
    return;
  }
  const route = requestedTeamProfileRoute();
  const program = programById(route.programId);
  if (!program || program.id === "tbd") {
    const missingSignature = `missing:${route.programId}`;
    if (renderedTeamProfileSignature === missingSignature) return;
    renderedTeamProfileSignature = missingSignature;
    container.innerHTML = `
      <div class="team-profile-missing section-wrap">
        <a href="teams.html">Back to all teams</a>
        <span>UBL program directory</span>
        <h1>Choose a UBL team.</h1>
        <p>Open the Teams page to select a girls or boys varsity program.</p>
        <a class="button button-primary" href="teams.html">Explore teams</a>
      </div>
    `;
    return;
  }

  const division = requestedProfileDivision(program, route.division);
  const email = validProgramEmail(program);
  const hasAddress = Boolean(program.homeAddress);
  const locationValue = / home court$/i.test(program.homeGym || "")
    ? "Home-court details not yet published"
    : program.homeGym || "Home-court information not yet published";
  const locationMarkup = hasAddress
    ? mapTriggerMarkup(locationValue, program.homeAddress, program.homeAddress, "Program home court")
    : `<span>${escapeHtml(locationValue)}</span><small>Street address not yet published</small>`;
  const contactMarkup = email
    ? `<a href="mailto:${safeAttribute(email)}">${escapeHtml(email)}</a>`
    : `<span>Public representative email not yet provided</span><a class="team-profile-fallback-link" href="mailto:Info.upstatebasketballleague@gmail.com?subject=${encodeURIComponent(`${program.name} program contact`)}">Ask UBL for the right contact</a>`;
  const logoAlt = program.logoStatus ? `${program.name} temporary league mark` : `${program.name} logo`;
  const logoStatusMarkup = program.logoStatus
    ? `<div><dt>Team mark</dt><dd><span>${escapeHtml(program.logoStatus)}</span></dd></div>`
    : "";
  const nameParts = teamProfileNameParts(program.name);
  const headCoach = teamProfileCoach(program, division, "head");
  const assistantCoach = teamProfileCoach(program, division, "assistant");
  const profileSignature = JSON.stringify({ program, division });

  updateTeamProfileMetadata(program, division);
  if (renderedTeamProfileSignature === profileSignature) return;
  renderedTeamProfileSignature = profileSignature;
  container.innerHTML = `
    <section class="team-banner-experience ${division === "Girls Varsity" ? "team-banner-experience-girls" : "team-banner-experience-boys"}" aria-label="${safeAttribute(program.name)} interactive team profile">
      <div class="team-banner-toolbar">
        ${program.divisions.length > 1 ? `
          <nav class="team-profile-division-switch" aria-label="${safeAttribute(program.name)} division">
            ${program.divisions.map((item) => `<a href="${safeAttribute(teamProfileUrl(program.id, item))}"${item === division ? ' aria-current="page"' : ""}>${escapeHtml(item.replace(" Varsity", ""))}</a>`).join("")}
          </nav>
        ` : ""}
        <span class="team-banner-instruction"><span class="team-banner-instruction-mobile">Choose a profile section</span><span class="team-banner-instruction-desktop">Select a banner to move closer</span></span>
      </div>

      <nav class="team-banner-section-nav" data-team-section-nav aria-label="${safeAttribute(program.name)} profile sections">
        <div class="team-banner-section-track">
          <button type="button" data-team-section-target="identity" aria-pressed="false">Team</button>
          <button type="button" data-team-section-target="division" aria-pressed="false">Division</button>
          <button type="button" data-team-section-target="head-coach" aria-pressed="false">Head coach</button>
          <button type="button" data-team-section-target="assistant-coach" aria-pressed="false">Assistant</button>
          <button type="button" data-team-section-target="program" aria-pressed="false">Program</button>
          <button type="button" data-team-section-target="gallery" aria-pressed="false">Gallery</button>
        </div>
      </nav>

      <div class="team-banner-scene" data-team-banner-scene>
        <div class="team-banner-light-rig" data-team-banner-light-rig aria-hidden="true">
          <span class="team-banner-light-pool"></span>
        </div>
        <div class="team-banner-stage" data-team-banner-stage>
          <section class="team-banner team-banner-identity" data-team-banner data-banner-name="Team identity" data-banner-key="identity" aria-labelledby="team-banner-identity-title">
            ${teamProfileBannerTrigger("team identity", "team-banner-identity-detail")}
            <span class="team-banner-number" aria-hidden="true">01</span>
            <div class="team-banner-content">
              <span class="team-banner-kicker">${escapeHtml(nameParts.prefix)}</span>
              <h1 id="team-banner-identity-title"><span class="sr-only">${escapeHtml(program.name)}</span><span aria-hidden="true">${escapeHtml(nameParts.primary)}</span></h1>
              <strong class="team-banner-name-suffix">${escapeHtml(nameParts.suffix)}</strong>
              <div class="team-banner-logo-lockup">
                <img src="${safeAttribute(safeImageUrl(program.logo))}" alt="${safeAttribute(logoAlt)}" width="192" height="192">
                <span>${escapeHtml(program.short)}</span>
              </div>
              ${nameParts.suffix.toLowerCase() === "basketball" ? "" : '<span class="team-banner-sport">Basketball</span>'}
              <div class="team-banner-detail" id="team-banner-identity-detail" hidden>
                <p>${escapeHtml(program.summary)}</p>
                <a href="teams.html">View all UBL programs</a>
              </div>
            </div>
            <span class="team-banner-rule" aria-hidden="true"></span>
          </section>

          ${teamProfileDivisionBannerMarkup(program, division)}
          ${teamProfileCoachBannerMarkup(headCoach, "Head coach", "head-coach", "03")}
          ${teamProfileCoachBannerMarkup(assistantCoach, "Assistant coach", "assistant-coach", "04")}

          <section class="team-banner team-banner-program" data-team-banner data-banner-name="Program information" data-banner-key="program" aria-labelledby="team-banner-program-title">
            ${teamProfileBannerTrigger("program information", "team-banner-program-detail")}
            <span class="team-banner-number" aria-hidden="true">05</span>
            <div class="team-banner-content">
              <span class="team-banner-kicker">Program information</span>
              <h2 id="team-banner-program-title">Program details</h2>
              <dl class="team-banner-facts">
                <div><dt>Division</dt><dd>${escapeHtml(division)}</dd></div>
                <div><dt>Home court</dt><dd>${locationMarkup}</dd></div>
                <div><dt>Program representative</dt><dd>${contactMarkup}</dd></div>
                ${logoStatusMarkup}
              </dl>
              <div class="team-banner-detail" id="team-banner-program-detail" hidden>
                <a class="team-profile-standings-link" href="standings.html">View league standings <span aria-hidden="true">&#8594;</span></a>
                <a class="team-banner-secondary-link" href="schedule.html">League schedule</a>
              </div>
            </div>
            <span class="team-banner-rule" aria-hidden="true"></span>
          </section>

          ${teamProfileGalleryBannerMarkup(program, division)}
        </div>

        <div class="team-banner-controls" role="group" aria-label="Team banner camera controls">
          <button type="button" data-team-banner-previous disabled><span aria-hidden="true">&#8592;</span><span data-team-banner-previous-label>Previous</span></button>
          <button type="button" data-team-banner-reset hidden>View all banners</button>
          <span class="team-banner-progress" aria-hidden="true"><b data-team-banner-progress-current>01</b><i></i><span>06</span></span>
          <button type="button" data-team-banner-next disabled><span data-team-banner-next-label>Next</span><span aria-hidden="true">&#8594;</span></button>
        </div>
        <p class="sr-only" data-team-banner-status aria-live="polite">Full team banner lineup. Six destinations.</p>
      </div>

      <div class="team-banner-return">
        <a class="team-banner-return-link" href="teams.html"><span aria-hidden="true">&#8592;</span><strong>Back to all teams</strong></a>
      </div>
    </section>

    <section class="explore-panel section-wrap" aria-labelledby="team-profile-explore-title">
      <div class="explore-panel-copy"><span class="explore-panel-eyebrow">Keep exploring</span><h2 id="team-profile-explore-title">See where ${escapeHtml(program.name)} fits into the season.</h2></div>
      <nav class="explore-panel-links" aria-label="Keep exploring the UBL"><a href="schedule.html">League schedule</a><a href="standings.html">Current standings</a><a href="gallery.html?program=${encodeURIComponent(program.id)}&division=${division === "Girls Varsity" ? "girls" : "boys"}#team-album-${encodeURIComponent(program.id)}">Team gallery</a><a href="teams.html">All teams</a></nav>
    </section>
  `;
  initTeamBannerExperience(container);
}



const teamProfileLayoutMedia = window.matchMedia("(max-width: 767px)");
teamProfileLayoutMedia.addEventListener("change", () => {
  renderedTeamProfileSignature = "";
  renderTeamProfile();
});

initializeApp();
