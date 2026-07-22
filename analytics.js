(function () {
  const config = window.UBL_CONFIG || {};
  const consentStorageKey = "ubl-analytics-consent-v1";
  const granted = "granted";
  const denied = "denied";
  const endpoint = String(config.analyticsEndpoint || "").trim();
  const measurementId = String(config.googleAnalyticsMeasurementId || "").trim();
  const allowedHosts = Array.isArray(config.analyticsAllowedHosts)
    ? config.analyticsAllowedHosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean)
    : [];
  const allowedHost = allowedHosts.includes(location.hostname.toLowerCase());
  const doNotTrack = navigator.doNotTrack === "1" || window.doNotTrack === "1";
  const canTrack = allowedHost && !doNotTrack;
  let sessionPreference = "";
  let analyticsStarted = false;
  let consentBanner;

  function readPreference() {
    if (sessionPreference) return sessionPreference;
    try {
      const stored = window.localStorage.getItem(consentStorageKey);
      return stored === granted || stored === denied ? stored : "";
    } catch (_error) {
      return "";
    }
  }

  function writePreference(value) {
    sessionPreference = value;
    try {
      window.localStorage.setItem(consentStorageKey, value);
    } catch (_error) {
      // The current page still respects the choice when browser storage is unavailable.
    }
  }

  function pageName() {
    return location.pathname.split("/").filter(Boolean).at(-1) || "index.html";
  }

  function referrerHost() {
    if (!document.referrer) return "direct";
    try {
      return new URL(document.referrer).hostname.slice(0, 100) || "direct";
    } catch (_error) {
      return "unknown";
    }
  }

  function deviceClass() {
    if (window.innerWidth < 768) return "mobile";
    if (window.innerWidth < 1100) return "tablet";
    return "desktop";
  }

  function startGoogleAnalytics() {
    if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: true
    });

    const googleTag = document.createElement("script");
    googleTag.async = true;
    googleTag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(googleTag);
  }

  function startLeagueAnalytics() {
    if (!config.analyticsEnabled || !endpoint) return;

    let cls = 0;
    let lcp = 0;
    const observers = [];

    try {
      const layoutObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) cls += entry.value;
        });
      });
      layoutObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(layoutObserver);

      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) lcp = entries.at(-1).startTime;
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch (_error) {
      // Older browsers still report a page view without Web Vitals.
    }

    function reportPageView() {
      if (readPreference() !== granted) return;
      const navigation = performance.getEntriesByType("navigation")[0];
      const body = new URLSearchParams({
        event: "pageview",
        channel: String(config.analyticsChannel || "ubl-public-v1"),
        page: pageName(),
        referrer: referrerHost(),
        device: deviceClass(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        loadMs: String(Math.round(navigation?.loadEventEnd || 0)),
        lcpMs: String(Math.round(lcp || 0)),
        cls: String(Math.round(cls * 1000) / 1000)
      });

      fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        cache: "no-store",
        keepalive: true,
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: body.toString()
      }).catch(() => {});
      observers.forEach((observer) => observer.disconnect());
    }

    if (document.readyState === "complete") {
      window.setTimeout(reportPageView, 250);
    } else {
      window.addEventListener("load", () => window.setTimeout(reportPageView, 1500), { once: true });
    }
  }

  function startAnalytics() {
    if (analyticsStarted || !canTrack || readPreference() !== granted) return;
    analyticsStarted = true;
    startGoogleAnalytics();
    startLeagueAnalytics();
  }

  function clearGoogleAnalyticsCookies() {
    document.cookie.split(";").forEach((part) => {
      const name = part.split("=")[0].trim();
      if (!/^_(?:ga(?:_|$)|gid$|gat(?:_|$))/.test(name)) return;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname}; SameSite=Lax`;
    });
  }

  function statusMessage() {
    if (!allowedHost) return "Analytics is disabled on this preview address.";
    if (doNotTrack) return "Your browser's Do Not Track setting is enabled, so analytics remains disabled.";
    if (readPreference() === granted) return "You currently allow optional analytics.";
    if (readPreference() === denied) return "You currently decline optional analytics.";
    return "You have not made an analytics choice on this browser.";
  }

  function updateStatus() {
    document.querySelectorAll("[data-consent-status]").forEach((element) => {
      element.textContent = statusMessage();
    });
  }

  function buildConsentBanner() {
    if (consentBanner) return consentBanner;
    consentBanner = document.createElement("section");
    consentBanner.className = "consent-banner";
    consentBanner.hidden = true;
    consentBanner.setAttribute("role", "dialog");
    consentBanner.setAttribute("aria-modal", "false");
    consentBanner.setAttribute("aria-labelledby", "ubl-consent-title");
    consentBanner.setAttribute("aria-describedby", "ubl-consent-description");
    consentBanner.innerHTML = `
      <div class="consent-banner__inner">
        <div class="consent-banner__copy">
          <span>Privacy</span>
          <h2 id="ubl-consent-title">Help improve the UBL site</h2>
          <p id="ubl-consent-description">Allow optional analytics to improve the site and show sponsors our combined audience reach. We do not share individual browsing histories.</p>
          <a href="privacy.html">Learn more</a>
        </div>
        <div class="consent-banner__actions">
          <button class="button button-primary" type="button" data-consent-choice="granted">Allow analytics</button>
          <button class="button button-outline" type="button" data-consent-choice="denied">No thanks</button>
        </div>
      </div>`;
    document.body.appendChild(consentBanner);

    consentBanner.querySelectorAll("[data-consent-choice]").forEach((button) => {
      button.addEventListener("click", () => setPreference(button.dataset.consentChoice));
    });
    return consentBanner;
  }

  function showConsentBanner(focusChoice) {
    if (!allowedHost) return;
    const banner = buildConsentBanner();
    banner.hidden = false;
    window.requestAnimationFrame(() => banner.classList.add("is-visible"));
    if (focusChoice) banner.querySelector("[data-consent-choice='granted']")?.focus();
  }

  function hideConsentBanner() {
    if (!consentBanner) return;
    consentBanner.classList.remove("is-visible");
    window.setTimeout(() => {
      if (!consentBanner.classList.contains("is-visible")) consentBanner.hidden = true;
    }, 220);
  }

  function setPreference(value) {
    if (value !== granted && value !== denied) return;
    writePreference(value);
    hideConsentBanner();
    if (value === granted) {
      startAnalytics();
    } else {
      if (typeof window.gtag === "function") {
        window.gtag("consent", "update", {
          analytics_storage: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied"
        });
      }
      clearGoogleAnalyticsCookies();
    }
    updateStatus();
    window.dispatchEvent(new CustomEvent("ubl:consent-change", { detail: { analytics: value } }));
  }

  function setupConsentControls() {
    document.querySelectorAll("[data-consent-open]").forEach((button) => {
      button.addEventListener("click", () => showConsentBanner(true));
    });
    updateStatus();
    if (canTrack && !readPreference()) showConsentBanner(false);
  }

  window.UBLConsent = Object.freeze({
    getPreference: readPreference,
    open: () => showConsentBanner(true)
  });

  if (readPreference() === granted) startAnalytics();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupConsentControls, { once: true });
  } else {
    setupConsentControls();
  }
})();
