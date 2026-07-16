(function () {
  const config = window.UBL_CONFIG || {};
  const endpoint = String(config.analyticsEndpoint || "").trim();
  const allowedHosts = Array.isArray(config.analyticsAllowedHosts)
    ? config.analyticsAllowedHosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean)
    : [];
  const allowedHost = allowedHosts.includes(location.hostname.toLowerCase());
  const doNotTrack = navigator.doNotTrack === "1" || window.doNotTrack === "1";
  if (!config.analyticsEnabled || !endpoint || !allowedHost || doNotTrack) return;

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

  function reportPageView() {
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

  window.addEventListener("load", () => window.setTimeout(reportPageView, 1500), { once: true });
})();
