/* UBL division-first Team Gallery experience.
   Loaded after script.js so the gallery renderer can use the production data layer. */
function galleryDivisionSummary(program) {
  const hasBoys = program.divisions.includes("Boys Varsity");
  const hasGirls = program.divisions.includes("Girls Varsity");
  if (hasBoys && hasGirls) return "Boys & Girls Varsity";
  return program.divisions[0] || "Varsity";
}

function galleryShareUrl(teamId, { division = activeGalleryDivision(), photoId = "" } = {}) {
  const url = new URL("gallery.html", window.location.href);
  const divisionSlug = division === "Girls Varsity" ? "girls" : division === "Boys Varsity" ? "boys" : "";
  url.searchParams.set("program", teamId);
  if (divisionSlug) url.searchParams.set("division", divisionSlug);
  if (photoId) url.searchParams.set("photo", photoId);
  url.hash = `team-album-${teamId}`;
  return url.href;
}

function setGalleryShareFeedback(message) {
  const status = document.querySelector("[data-gallery-share-status]");
  if (status) status.textContent = message;
}

async function copyGalleryShareUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    const field = document.createElement("textarea");
    field.value = url;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  setGalleryShareFeedback("Gallery link copied.");
}

async function shareGallery({ title, text, url, copyOnly = false }) {
  if (!copyOnly && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      setGalleryShareFeedback("Sharing options opened.");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  await copyGalleryShareUrl(url);
}

function ensureGalleryShareControls() {
  if (!document.querySelector("[data-gallery-share-status]")) {
    const status = document.createElement("span");
    status.className = "sr-only";
    status.dataset.galleryShareStatus = "";
    status.setAttribute("aria-live", "polite");
    document.body.append(status);
  }

  document.querySelectorAll("[data-gallery-team]").forEach((gallery) => {
    const actions = gallery.querySelector(".team-gallery-heading-actions");
    const close = actions?.querySelector("[data-gallery-close]");
    if (!actions || !close || actions.querySelector("[data-gallery-share-album]")) return;

    const program = programById(gallery.dataset.galleryTeam);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-album-share";
    button.dataset.galleryShareAlbum = gallery.dataset.galleryTeam;
    button.setAttribute("aria-label", `Share ${program?.name || "team"} photo album`);
    button.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">ios_share</span><span class="gallery-share-label">Share</span>';
    actions.insertBefore(button, close);
  });
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
        <article class="team-gallery-card division-team-card" data-gallery-card data-gallery-program="${safeAttribute(program.id)}" data-gallery-divisions="${safeAttribute(divisions)}" data-expanded="false" style="--card-order:${index}">
          <button class="team-gallery-card-trigger" type="button" data-gallery-trigger="${safeAttribute(program.id)}" aria-expanded="false" aria-controls="team-album-${safeAttribute(program.id)}" aria-label="${safeAttribute(`Open ${program.name} photo album`)}"></button>
          <span class="team-card-court" aria-hidden="true"><i></i></span>
          <span class="team-card-view"><span data-gallery-action-label>Open album</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span>
          <span class="team-card-logo-stage"><img src="${safeAttribute(logo)}" alt="" width="192" height="192" loading="lazy" decoding="async"></span>
          <span class="division-team-card-content"><small class="team-card-abbr">${escapeHtml(program.short)}</small><strong>${teamEntityLinkMarkup(program.id, program.divisions[0], program.name, { className: "team-gallery-profile-link" })}</strong><span><span data-gallery-card-division-label>${escapeHtml(divisionSummary)}</span> &middot; <span data-gallery-count-for="${safeAttribute(program.id)}">No photos published</span></span><b><span data-gallery-cta-label>View photos</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></b></span>
        </article>
      `);
    }
    if (!document.querySelector(`[data-gallery-team="${CSS.escape(program.id)}"]`)) {
      albums.insertAdjacentHTML("beforeend", `
        <section class="team-gallery" id="team-album-${safeAttribute(program.id)}" data-gallery-team="${safeAttribute(program.id)}" data-gallery-divisions="${safeAttribute(divisions)}" aria-labelledby="team-album-${safeAttribute(program.id)}-title" hidden>
          <header class="team-gallery-heading"><span class="team-gallery-identity"><img src="${safeAttribute(logo)}" alt="" width="192" height="192"><span><strong id="team-album-${safeAttribute(program.id)}-title">${teamEntityLinkMarkup(program.id, program.divisions[0], program.name, { className: "team-gallery-profile-link" })}</strong><small>${escapeHtml(divisionSummary)} album</small></span></span><span class="team-gallery-heading-actions"><span class="team-gallery-count" data-gallery-count>No photos published</span><button type="button" data-gallery-close="${safeAttribute(program.id)}">Close album</button></span></header>
          <div class="team-gallery-content"><div class="gallery-grid" data-gallery-grid></div><p class="gallery-empty" data-gallery-empty>${escapeHtml(program.name)} photos will appear here as the season gets underway.</p></div>
        </section>
      `);
    }
  });

  const directoryCount = document.querySelector("[data-gallery-program-count]");
  if (directoryCount) directoryCount.textContent = `${programs.length} program${programs.length === 1 ? "" : "s"} \u00b7 1 open spot`;
  ensureGalleryShareControls();
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
    const card = trigger.closest("[data-gallery-card]");
    trigger.setAttribute("aria-expanded", String(expanded));
    if (card) card.dataset.expanded = String(expanded);
    card?.querySelectorAll("[data-gallery-action-label]").forEach((actionLabel) => {
      actionLabel.textContent = expanded ? "Album open" : "Open album";
    });
    card?.querySelectorAll("[data-gallery-cta-label]").forEach((actionLabel) => {
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
    card.querySelectorAll(".team-gallery-profile-link").forEach((link) => {
      const program = programById(card.dataset.galleryProgram);
      if (program) link.href = teamProfileUrl(program.id, canonicalTeamDivision(program, selectedDivision));
    });
    if (visible) visibleCards.push(card);
  });
  document.querySelectorAll("[data-gallery-team]").forEach((gallery) => {
    const program = programById(gallery.dataset.galleryTeam);
    gallery.querySelectorAll(".team-gallery-profile-link").forEach((link) => {
      if (program) link.href = teamProfileUrl(program.id, canonicalTeamDivision(program, selectedDivision));
    });
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
  if (expandedCard?.closest("[data-gallery-card]")?.hidden) closeGalleryAlbum();
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

  document.addEventListener("click", (event) => {
    const shareButton = event.target.closest("[data-gallery-share-album]");
    if (!shareButton) return;
    const teamId = shareButton.dataset.galleryShareAlbum;
    const program = programById(teamId);
    const division = activeGalleryDivision();
    shareGallery({
      title: `${program?.name || "UBL"} photo album`,
      text: `View the ${program?.name || "UBL"} ${division === "all" ? "varsity" : division} photo album.`,
      url: galleryShareUrl(teamId, { division })
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
  lightbox.tabIndex = -1;
  lightbox.setAttribute("aria-labelledby", "gallery-lightbox-team");
  lightbox.innerHTML = `
    <div class="gallery-lightbox-card">
      <header class="gallery-lightbox-site-header" aria-label="UBL website header"></header>
      <header class="gallery-lightbox-header">
        <span class="gallery-lightbox-team">
          <img data-gallery-lightbox-logo alt="" width="192" height="192">
          <span><strong id="gallery-lightbox-team" data-gallery-lightbox-team></strong><small data-gallery-lightbox-team-division></small></span>
        </span>
        <span class="gallery-lightbox-header-actions">
          <strong data-gallery-lightbox-album-count></strong>
          <span class="gallery-lightbox-divider" aria-hidden="true"></span>
          <button type="button" class="gallery-lightbox-share" data-gallery-lightbox-share aria-label="Share this photo">
            <span class="material-symbols-rounded" aria-hidden="true">ios_share</span><span class="sr-only">Share</span>
          </button>
          <span class="gallery-lightbox-divider" aria-hidden="true"></span>
          <button type="button" class="gallery-lightbox-close" aria-label="Close fullscreen photo">
            <span>Close</span><span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </span>
      </header>
      <div class="gallery-lightbox-body">
        <div class="gallery-lightbox-stage">
          <button type="button" class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="View previous photo">
            <span class="material-symbols-rounded" aria-hidden="true">east</span>
          </button>
          <div class="gallery-lightbox-media">
            <img data-gallery-lightbox-image alt="">
            <button type="button" class="gallery-lightbox-mobile-close" aria-label="Close fullscreen photo">
              <span class="material-symbols-rounded" aria-hidden="true">close</span>
            </button>
          </div>
          <button type="button" class="gallery-lightbox-nav gallery-lightbox-next" aria-label="View next photo">
            <span class="material-symbols-rounded" aria-hidden="true">east</span>
          </button>
        </div>
        <aside class="gallery-lightbox-details" aria-label="Photo details">
          <span class="gallery-lightbox-kicker">Photo details</span>
          <strong data-gallery-lightbox-title></strong>
          <span data-gallery-lightbox-detail></span>
          <p data-gallery-lightbox-description></p>
          <span class="gallery-lightbox-position" data-gallery-lightbox-position></span>
          <section class="gallery-lightbox-sharing" aria-label="Share this photo">
            <strong>Share this photo</strong>
            <div>
              <button type="button" data-gallery-lightbox-copy>
                <span class="material-symbols-rounded" aria-hidden="true">link</span><span>Copy link</span>
              </button>
              <a data-gallery-lightbox-facebook target="_blank" rel="noopener noreferrer">Facebook</a>
            </div>
          </section>
        </aside>
        <div class="gallery-lightbox-caption">
          <strong data-gallery-lightbox-mobile-title></strong>
          <span data-gallery-lightbox-mobile-detail></span>
        </div>
      </div>
      <footer class="gallery-lightbox-footer">
        <div class="gallery-lightbox-filmstrip" data-gallery-lightbox-filmstrip aria-label="Choose another photo"></div>
        <span class="gallery-lightbox-helper">Use arrow keys to browse</span>
      </footer>
    </div>
  `;
  document.body.append(lightbox);

  const sourceHeader = document.querySelector(".site-header .header-inner");
  const lightboxSiteHeader = lightbox.querySelector(".gallery-lightbox-site-header");
  if (sourceHeader && lightboxSiteHeader) {
    const headerInner = sourceHeader.cloneNode(true);
    headerInner.querySelector(".menu-toggle")?.remove();
    const siteNav = headerInner.querySelector(".site-nav");
    if (siteNav) {
      siteNav.id = "gallery-lightbox-site-nav";
      siteNav.classList.remove("open");
    }
    lightboxSiteHeader.append(headerInner);
  }

  let lightboxFigures = [];
  let lightboxIndex = 0;
  let lightboxTeamId = "";
  let lightboxShareData = null;

  function updateLightboxShareLinks() {
    if (!lightboxShareData) return;
    const encodedUrl = encodeURIComponent(lightboxShareData.url);
    lightbox.querySelector("[data-gallery-lightbox-facebook]").href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }

  function updateLightboxPhoto(index) {
    if (!lightboxFigures.length) return;
    lightboxIndex = (index + lightboxFigures.length) % lightboxFigures.length;
    const figure = lightboxFigures[lightboxIndex];
    const trigger = figure.querySelector("[data-gallery-full]");
    const preview = trigger.querySelector("img");
    const title = figure.querySelector("figcaption strong").textContent;
    const detail = figure.querySelector("figcaption span").textContent;
    const photoId = figure.dataset.galleryPhotoId;
    const program = programById(lightboxTeamId);
    const image = lightbox.querySelector("[data-gallery-lightbox-image]");
    image.src = trigger.dataset.galleryFull;
    image.alt = preview.alt;
    lightbox.querySelector("[data-gallery-lightbox-title]").textContent = title;
    lightbox.querySelector("[data-gallery-lightbox-detail]").textContent = detail;
    lightbox.querySelector("[data-gallery-lightbox-description]").textContent = preview.alt;
    lightbox.querySelector("[data-gallery-lightbox-mobile-title]").textContent = title;
    lightbox.querySelector("[data-gallery-lightbox-mobile-detail]").textContent = detail;
    lightbox.querySelector("[data-gallery-lightbox-position]").textContent = `${lightboxIndex + 1} of ${lightboxFigures.length}`;
    lightbox.querySelector(".gallery-lightbox-prev").setAttribute("aria-label", `View previous photo (${lightboxIndex + 1} of ${lightboxFigures.length})`);
    lightbox.querySelector(".gallery-lightbox-next").setAttribute("aria-label", `View next photo (${lightboxIndex + 1} of ${lightboxFigures.length})`);
    lightbox.querySelectorAll("[data-gallery-lightbox-thumbnail]").forEach((thumbnail, thumbnailIndex) => {
      const current = thumbnailIndex === lightboxIndex;
      thumbnail.classList.toggle("is-current", current);
      thumbnail.setAttribute("aria-current", current ? "true" : "false");
    });
    lightboxShareData = {
      title: `${program?.name || "UBL"} ${title} photo`,
      text: preview.alt,
      url: galleryShareUrl(lightboxTeamId, { division: title, photoId })
    };
    updateLightboxShareLinks();
  }

  function renderLightboxFilmstrip() {
    const filmstrip = lightbox.querySelector("[data-gallery-lightbox-filmstrip]");
    filmstrip.replaceChildren();
    lightboxFigures.forEach((figure, index) => {
      const source = figure.querySelector("img");
      const button = document.createElement("button");
      const image = document.createElement("img");
      button.type = "button";
      button.dataset.galleryLightboxThumbnail = String(index);
      button.setAttribute("aria-label", `View photo ${index + 1} of ${lightboxFigures.length}`);
      image.src = source.src;
      if (source.srcset) image.srcset = source.srcset;
      image.sizes = "9rem";
      image.alt = "";
      image.loading = "lazy";
      button.append(image);
      filmstrip.append(button);
    });
  }

  function openLightbox(trigger) {
    const figure = trigger.closest(".gallery-item");
    const gallery = figure.closest("[data-gallery-team]");
    const identity = gallery.querySelector(".team-gallery-identity");
    const program = programById(gallery.dataset.galleryTeam);
    lightboxFigures = [...gallery.querySelectorAll(".gallery-item:not([hidden])")];
    lightboxIndex = Math.max(0, lightboxFigures.indexOf(figure));
    lightboxTeamId = gallery.dataset.galleryTeam;
    lightbox.querySelector("[data-gallery-lightbox-logo]").src = identity.querySelector("img").src;
    lightbox.querySelector("[data-gallery-lightbox-team]").textContent = program?.name || identity.querySelector("strong").textContent;
    lightbox.querySelector("[data-gallery-lightbox-team-division]").textContent = figure.querySelector("figcaption strong").textContent;
    lightbox.querySelector("[data-gallery-lightbox-album-count]").textContent = gallery.querySelector("[data-gallery-count]").textContent;
    renderLightboxFilmstrip();
    updateLightboxPhoto(lightboxIndex);
    if (!lightbox.open) {
      document.body.classList.add("gallery-lightbox-open");
      lightbox.showModal();
      requestAnimationFrame(() => lightbox.focus({ preventScroll: true }));
    }
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-gallery-full]");
    if (trigger) openLightbox(trigger);
  });

  lightbox.querySelectorAll(".gallery-lightbox-close, .gallery-lightbox-mobile-close").forEach((button) => {
    button.addEventListener("click", () => lightbox.close());
  });
  lightbox.querySelector(".gallery-lightbox-prev").addEventListener("click", () => updateLightboxPhoto(lightboxIndex - 1));
  lightbox.querySelector(".gallery-lightbox-next").addEventListener("click", () => updateLightboxPhoto(lightboxIndex + 1));
  lightbox.querySelector("[data-gallery-lightbox-filmstrip]").addEventListener("click", (event) => {
    const thumbnail = event.target.closest("[data-gallery-lightbox-thumbnail]");
    if (thumbnail) updateLightboxPhoto(Number(thumbnail.dataset.galleryLightboxThumbnail));
  });
  lightbox.querySelector("[data-gallery-lightbox-share]").addEventListener("click", () => {
    if (lightboxShareData) shareGallery(lightboxShareData);
  });
  lightbox.querySelector("[data-gallery-lightbox-copy]").addEventListener("click", () => {
    if (lightboxShareData) shareGallery({ ...lightboxShareData, copyOnly: true });
  });
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateLightboxPhoto(lightboxIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      updateLightboxPhoto(lightboxIndex + 1);
    }
  });
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener("close", () => document.body.classList.remove("gallery-lightbox-open"));

  const routePhotoId = routeParams.get("photo");
  if (routeProgram && routePhotoId) {
    requestAnimationFrame(() => {
      document.querySelector(`[data-gallery-team="${CSS.escape(routeProgram.id)}"] [data-gallery-photo-id="${CSS.escape(routePhotoId)}"] [data-gallery-full]`)?.click();
    });
  }
}



initializeApp();
