/* UBL division-first Team Gallery experience.
   Loaded after script.js so the gallery renderer can use the production data layer. */
function galleryDivisionSummary(program) {
  const hasBoys = program.divisions.includes("Boys Varsity");
  const hasGirls = program.divisions.includes("Girls Varsity");
  if (hasBoys && hasGirls) return "Boys & Girls Varsity";
  return program.divisions[0] || "Varsity";
}

function ensureGalleryProgramSections() {
  const cardGrid = document.querySelector(".team-gallery-card-grid");
  const albums = document.querySelector(".team-gallery-albums");
  if (!cardGrid || !albums) return;

  const programs = league.programs.filter((program) => program.id !== "tbd" && program.divisions.length);
  programs.forEach((program, index) => {
    const divisions = program.divisions.join("|");
    const divisionSummary = galleryDivisionSummary(program);
    const logo = safeImageUrl(program.logo) || "assets/icons/icon-192.png";
    if (!document.querySelector(`[data-gallery-trigger="${CSS.escape(program.id)}"]`)) {
      cardGrid.insertAdjacentHTML("beforeend", `
        <button class="team-gallery-card division-team-card" type="button" data-gallery-card data-gallery-trigger="${safeAttribute(program.id)}" data-gallery-divisions="${safeAttribute(divisions)}" aria-expanded="false" aria-controls="team-album-${safeAttribute(program.id)}" aria-label="${safeAttribute(`Open ${program.name} photo album`)}" style="--card-order:${index}">
          <span class="team-card-court" aria-hidden="true"><i></i></span>
          <span class="team-card-view"><span data-gallery-action-label>Open album</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span>
          <span class="team-card-logo-stage"><img src="${safeAttribute(logo)}" alt="" width="192" height="192" loading="lazy" decoding="async"></span>
          <span class="division-team-card-content"><small class="team-card-abbr">${escapeHtml(program.short)}</small><strong>${escapeHtml(program.name)}</strong><span><span data-gallery-card-division-label>${escapeHtml(divisionSummary)}</span> &middot; <span data-gallery-count-for="${safeAttribute(program.id)}">No photos published</span></span><b><span data-gallery-cta-label>View photos</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></b></span>
        </button>
      `);
    }
    if (!document.querySelector(`[data-gallery-team="${CSS.escape(program.id)}"]`)) {
      albums.insertAdjacentHTML("beforeend", `
        <section class="team-gallery" id="team-album-${safeAttribute(program.id)}" data-gallery-team="${safeAttribute(program.id)}" data-gallery-divisions="${safeAttribute(divisions)}" aria-labelledby="team-album-${safeAttribute(program.id)}-title" hidden>
          <header class="team-gallery-heading"><span class="team-gallery-identity"><img src="${safeAttribute(logo)}" alt="" width="192" height="192"><span><strong id="team-album-${safeAttribute(program.id)}-title">${escapeHtml(program.name)}</strong><small>${escapeHtml(divisionSummary)} album</small></span></span><span class="team-gallery-heading-actions"><span class="team-gallery-count" data-gallery-count>No photos published</span><button type="button" data-gallery-close="${safeAttribute(program.id)}">Close album</button></span></header>
          <div class="team-gallery-content"><div class="gallery-grid" data-gallery-grid></div><p class="gallery-empty" data-gallery-empty>${escapeHtml(program.name)} photos will appear here as the season gets underway.</p></div>
        </section>
      `);
    }
  });

  const directoryCount = document.querySelector("[data-gallery-program-count]");
  if (directoryCount) directoryCount.textContent = `${programs.length} program${programs.length === 1 ? "" : "s"} \u00b7 1 open spot`;
}

function updateGallerySections() {
  document.querySelectorAll("[data-gallery-team]").forEach((gallery) => {
    const photoCount = gallery.querySelectorAll(".gallery-item").length;
    const count = gallery.querySelector("[data-gallery-count]");
    const grid = gallery.querySelector("[data-gallery-grid]");
    const empty = gallery.querySelector("[data-gallery-empty]");
    const countText = photoCount ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : "No photos published";
    if (count) count.textContent = countText;
    document.querySelectorAll(`[data-gallery-count-for="${CSS.escape(gallery.dataset.galleryTeam)}"]`).forEach((cardCount) => {
      cardCount.textContent = countText;
    });
    if (grid) grid.hidden = photoCount === 0;
    if (empty) empty.hidden = photoCount > 0;
  });
}

function setExpandedGallery(teamId) {
  let expandedGallery = null;

  document.querySelectorAll("[data-gallery-trigger]").forEach((trigger) => {
    const expanded = Boolean(teamId) && trigger.dataset.galleryTrigger === teamId;
    trigger.setAttribute("aria-expanded", String(expanded));
    trigger.querySelectorAll("[data-gallery-action-label]").forEach((actionLabel) => {
      actionLabel.textContent = expanded ? "Album open" : "Open album";
    });
    trigger.querySelectorAll("[data-gallery-cta-label]").forEach((actionLabel) => {
      actionLabel.textContent = expanded ? "Close album" : "View photos";
    });
  });

  document.querySelectorAll("[data-gallery-team]").forEach((gallery) => {
    const expanded = Boolean(teamId) && gallery.dataset.galleryTeam === teamId;
    gallery.hidden = !expanded;
    if (expanded) expandedGallery = gallery;
  });

  return expandedGallery;
}

function activeGalleryDivision() {
  return document.querySelector("[data-gallery-division-select][aria-pressed=\"true\"]")?.dataset.galleryDivisionSelect
    || document.querySelector("[data-gallery-directory]")?.dataset.activeGalleryDivision
    || "all";
}

function applyGalleryDivisionFilter(division) {
  const selectedDivision = division === "Boys Varsity" || division === "Girls Varsity" ? division : "all";
  const hasSelectedDivision = selectedDivision !== "all";
  const directory = document.querySelector("[data-gallery-directory]");
  const divisionColumn = document.querySelector("[data-gallery-division-column]");
  const divisionTitle = document.querySelector("[data-gallery-division-title]");

  document.querySelectorAll("[data-gallery-division-select]").forEach((button) => {
    const selected = button.dataset.galleryDivisionSelect === selectedDivision;
    button.setAttribute("aria-pressed", String(selected));
  });
  if (directory) {
    directory.hidden = !hasSelectedDivision;
    directory.dataset.activeGalleryDivision = hasSelectedDivision ? selectedDivision : "";
  }
  if (divisionColumn) {
    divisionColumn.classList.toggle("division-column-girls", selectedDivision === "Girls Varsity");
    divisionColumn.classList.toggle("division-column-boys", selectedDivision === "Boys Varsity");
  }
  if (divisionTitle && hasSelectedDivision) {
    divisionTitle.textContent = `${selectedDivision === "Girls Varsity" ? "Girls" : "Boys"} galleries`;
  }
  document.querySelectorAll("[data-gallery-division]").forEach((item) => {
    item.hidden = hasSelectedDivision && item.dataset.galleryDivision !== selectedDivision;
  });
  const visibleCards = [];
  document.querySelectorAll("[data-gallery-card]").forEach((card) => {
    const divisions = card.dataset.galleryDivisions.split("|");
    const visible = hasSelectedDivision && divisions.includes(selectedDivision);
    card.hidden = !visible;
    card.classList.remove("is-gallery-last-single");
    const divisionLabel = card.querySelector("[data-gallery-card-division-label]");
    if (divisionLabel && hasSelectedDivision) divisionLabel.textContent = selectedDivision;
    if (visible) visibleCards.push(card);
  });
  if (visibleCards.length % 3 === 1) visibleCards.at(-1)?.classList.add("is-gallery-last-single");
  if (hasSelectedDivision && directory) initializeTeamCardMotion(directory);
  return selectedDivision;
}

function showGalleryDivision(division, { scroll = false, updateHash = false } = {}) {
  const selectedDivision = applyGalleryDivisionFilter(division);
  if (selectedDivision === "all") return;

  const directory = document.querySelector("[data-gallery-directory]");
  const divisionColumn = document.querySelector("[data-gallery-division-column]");
  directory?.classList.remove("is-direct-album");
  const expandedCard = document.querySelector('[data-gallery-trigger][aria-expanded="true"]');
  if (expandedCard?.hidden) closeGalleryAlbum();
  if (updateHash) {
    const divisionSlug = selectedDivision === "Girls Varsity" ? "girls" : "boys";
    history.replaceState(null, "", `#gallery-${divisionSlug}-division`);
  }
  if (scroll && divisionColumn) {
    requestAnimationFrame(() => divisionColumn.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    }));
  }
}

function openGalleryAlbum(teamId, { direct = false, division = "all", focus = false, scroll = false } = {}) {
  const gallery = setExpandedGallery(teamId);
  if (!gallery) return null;

  const panel = gallery.closest("[data-gallery-directory]");
  panel?.classList.toggle("is-direct-album", direct);
  const selectedDivision = applyGalleryDivisionFilter(division);
  const program = programById(teamId);
  const headingActions = gallery.querySelector(".team-gallery-heading-actions");
  const albumLabel = gallery.querySelector(".team-gallery-identity small");
  if (albumLabel && !albumLabel.dataset.defaultLabel) albumLabel.dataset.defaultLabel = albumLabel.textContent;
  if (albumLabel) {
    albumLabel.textContent = direct && selectedDivision !== "all"
      ? `${selectedDivision} album`
      : albumLabel.dataset.defaultLabel;
  }

  let returnLink = gallery.querySelector("[data-gallery-team-return]");
  if (direct && program && headingActions) {
    if (!returnLink) {
      returnLink = document.createElement("a");
      returnLink.className = "gallery-team-return";
      returnLink.dataset.galleryTeamReturn = "";
      returnLink.innerHTML = '<span aria-hidden="true">&#8592;</span> Team profile';
      headingActions.prepend(returnLink);
    }
    returnLink.href = teamProfileUrl(teamId, selectedDivision === "all" ? program.divisions[0] : selectedDivision);
    returnLink.setAttribute("aria-label", `Back to ${program.name} team profile`);
  } else {
    returnLink?.remove();
  }

  gallery.tabIndex = -1;
  const revealAlbum = () => {
    applyGalleryDivisionFilter(selectedDivision);
    if (focus) gallery.focus({ preventScroll: true });
    if (scroll) gallery.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  };
  requestAnimationFrame(() => requestAnimationFrame(revealAlbum));
  ensureApprovedGalleryLoaded(gallery).finally(() => applyGalleryDivisionFilter(selectedDivision));
  return gallery;
}

function closeGalleryAlbum({ focusTeamId = "", clearRoute = false } = {}) {
  const expandedGallery = document.querySelector("[data-gallery-team]:not([hidden])");
  const albumLabel = expandedGallery?.querySelector(".team-gallery-identity small");
  if (albumLabel?.dataset.defaultLabel) albumLabel.textContent = albumLabel.dataset.defaultLabel;
  expandedGallery?.querySelector("[data-gallery-team-return]")?.remove();
  document.querySelector("[data-gallery-directory]")?.classList.remove("is-direct-album");
  setExpandedGallery("");
  if (clearRoute) history.replaceState(null, "", location.pathname);
  if (focusTeamId) document.querySelector(`[data-gallery-trigger="${CSS.escape(focusTeamId)}"]`)?.focus();
}

function createGalleryPhoto(photo) {
  const figure = document.createElement("figure");
  figure.className = "gallery-item";
  figure.dataset.galleryDivision = photo.division;
  figure.dataset.galleryPhotoId = photo.id;

  const button = document.createElement("button");
  button.className = "gallery-open";
  button.type = "button";
  button.dataset.galleryFull = photo.fullUrl;

  const image = document.createElement("img");
  image.src = photo.previewUrl;
  const srcset = bundledGallerySrcset(photo.previewSrcset);
  if (srcset) image.srcset = srcset;
  if (srcset && typeof photo.sizes === "string" && photo.sizes.trim()) image.sizes = photo.sizes.trim();
  const width = Number(photo.width);
  const height = Number(photo.height);
  if (Number.isInteger(width) && width > 0) image.width = width;
  if (Number.isInteger(height) && height > 0) image.height = height;
  image.alt = photo.alt;
  image.loading = "lazy";
  button.append(image);

  const caption = document.createElement("figcaption");
  const title = document.createElement("strong");
  title.textContent = photo.division;
  const detail = document.createElement("span");
  detail.textContent = photo.season;
  caption.append(title, detail);
  figure.append(button, caption);
  return figure;
}

function renderBundledGallery() {
  const photos = Array.isArray(league.galleryPhotos) ? league.galleryPhotos : [];
  const renderedIds = new Set(
    [...document.querySelectorAll("[data-gallery-photo-id]")].map((item) => item.dataset.galleryPhotoId)
  );

  photos.forEach((entry) => {
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
    const division = GALLERY_DIVISIONS.has(entry.division) ? entry.division : "";
    const previewUrl = bundledGalleryImageUrl(entry.previewUrl);
    const fullUrl = bundledGalleryImageUrl(entry.fullUrl);
    const alt = typeof entry.alt === "string" ? entry.alt.trim() : "";
    const season = typeof entry.season === "string" ? entry.season.trim() : "";
    const gallery = document.querySelector(`[data-gallery-team="${CSS.escape(teamId)}"]`);
    const supportedDivisions = gallery?.dataset.galleryDivisions.split("|") || [];
    const grid = gallery?.querySelector("[data-gallery-grid]");
    if (!grid || !id || renderedIds.has(id) || !division || !supportedDivisions.includes(division) || !previewUrl || !fullUrl || !alt || !season) return;

    grid.append(createGalleryPhoto({
      ...entry,
      id,
      division,
      previewUrl,
      fullUrl,
      alt,
      season
    }));
    renderedIds.add(id);
  });

  updateGallerySections();
}

async function loadApprovedGallery() {
  if (!document.querySelector("[data-gallery-team]")) return;
  const feedUrl = window.UBL_CONFIG?.galleryFeedUrl?.trim();
  if (!feedUrl) {
    updateGallerySections();
    return;
  }

  try {
    const response = await fetch(feedUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Gallery feed returned ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.photos)) throw new Error("Gallery feed is malformed");

    const renderedIds = new Set(
      [...document.querySelectorAll("[data-gallery-photo-id]")].map((item) => item.dataset.galleryPhotoId)
    );

    payload.photos.forEach((entry) => {
      const teamId = typeof entry.teamId === "string" ? entry.teamId : "";
      const division = GALLERY_DIVISIONS.has(entry.division) ? entry.division : "";
      const id = typeof entry.id === "string" ? entry.id.trim() : "";
      const previewUrl = galleryImageUrl(entry.previewUrl);
      const fullUrl = galleryImageUrl(entry.fullUrl);
      const gallery = document.querySelector(`[data-gallery-team="${CSS.escape(teamId)}"]`);
      const supportedDivisions = gallery?.dataset.galleryDivisions.split("|") || [];
      if (!gallery || !id || renderedIds.has(id) || !division || !supportedDivisions.includes(division) || !previewUrl || !fullUrl) return;

      const photo = {
        id,
        division,
        previewUrl,
        fullUrl,
        alt: typeof entry.alt === "string" && entry.alt.trim() ? entry.alt.trim() : `${entry.teamName || "UBL"} basketball photo`,
        season: typeof entry.season === "string" && entry.season.trim() ? entry.season.trim() : "2026-27 season"
      };
      gallery.querySelector("[data-gallery-grid]")?.append(createGalleryPhoto(photo));
      renderedIds.add(id);
    });
  } catch (error) {
    console.warn("Approved gallery feed is temporarily unavailable.", error);
  }

  updateGallerySections();
}

function setGalleryLoading(gallery, loading) {
  if (!gallery) return;
  gallery.setAttribute("aria-busy", String(loading));
  const grid = gallery.querySelector("[data-gallery-grid]");
  if (!grid) return;
  grid.querySelectorAll(".gallery-skeleton").forEach((item) => item.remove());
  if (!loading || grid.querySelector(".gallery-item")) return;
  grid.hidden = false;
  for (let index = 0; index < 2; index += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "gallery-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.innerHTML = '<span class="gallery-skeleton-photo"></span><span class="gallery-skeleton-line"></span>';
    grid.append(skeleton);
  }
}

function ensureApprovedGalleryLoaded(gallery) {
  if (!galleryFeedPromise) galleryFeedPromise = loadApprovedGallery();
  setGalleryLoading(gallery, true);
  return galleryFeedPromise.finally(() => {
    setGalleryLoading(gallery, false);
    applyGalleryDivisionFilter(activeGalleryDivision());
  });
}

function initializeGallery() {
  if (!document.querySelector("[data-gallery-team]")) return;

  ensureGalleryProgramSections();
  renderBundledGallery();

  const routeParams = new URLSearchParams(location.search);
  const routeProgram = programById(routeParams.get("program"));
  const routeDivision = routeProgram && routeProgram.id !== "tbd"
    ? requestedProfileDivision(routeProgram, routeParams.get("division"))
    : "";

  document.querySelectorAll("[data-gallery-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const teamId = trigger.dataset.galleryTrigger;
      if (trigger.getAttribute("aria-expanded") === "true") {
        closeGalleryAlbum({ focusTeamId: teamId });
        return;
      }
      openGalleryAlbum(teamId, { division: activeGalleryDivision(), scroll: true });
    });
  });

  document.querySelectorAll("[data-gallery-close]").forEach((button) => {
    button.addEventListener("click", () => {
      closeGalleryAlbum({
        focusTeamId: button.dataset.galleryClose,
        clearRoute: document.querySelector("[data-gallery-directory]")?.classList.contains("is-direct-album")
      });
    });
  });

  document.querySelectorAll("[data-gallery-division-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const division = button.dataset.galleryDivisionSelect;
      showGalleryDivision(division, { scroll: true, updateHash: true });
      const returnLink = document.querySelector("[data-gallery-team-return]");
      if (returnLink && routeProgram) {
        returnLink.href = teamProfileUrl(routeProgram.id, division);
      }
    });
  });

  if (routeProgram && routeProgram.id !== "tbd" && document.querySelector(`[data-gallery-team="${CSS.escape(routeProgram.id)}"]`)) {
    openGalleryAlbum(routeProgram.id, {
      direct: true,
      division: routeDivision,
      focus: true,
      scroll: true
    });
  } else {
    setExpandedGallery("");
    applyGalleryDivisionFilter("all");
    if (location.hash === "#gallery-girls-division" || location.hash === "#gallery-boys-division") {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
  }

  const lightbox = document.createElement("dialog");
  lightbox.className = "gallery-lightbox";
  lightbox.innerHTML = `
    <div class="gallery-lightbox-card">
      <button type="button" class="gallery-lightbox-close" aria-label="Close fullscreen photo">Close</button>
      <img data-gallery-lightbox-image alt="">
      <div class="gallery-lightbox-caption">
        <strong data-gallery-lightbox-title></strong>
        <span data-gallery-lightbox-detail></span>
      </div>
    </div>
  `;
  document.body.append(lightbox);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-gallery-full]");
    if (!trigger) return;
    const figure = trigger.closest(".gallery-item");
    const preview = trigger.querySelector("img");
    lightbox.querySelector("[data-gallery-lightbox-image]").src = trigger.dataset.galleryFull;
    lightbox.querySelector("[data-gallery-lightbox-image]").alt = preview.alt;
    lightbox.querySelector("[data-gallery-lightbox-title]").textContent = figure.querySelector("figcaption strong").textContent;
    lightbox.querySelector("[data-gallery-lightbox-detail]").textContent = figure.querySelector("figcaption span").textContent;
    lightbox.showModal();
  });

  lightbox.querySelector(".gallery-lightbox-close").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
}



initializeApp();
