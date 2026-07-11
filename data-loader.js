(function () {
  const fallback = window.UBL_DATA;
  const config = window.UBL_CONFIG || {};
  const core = window.UBL_CORE;

  async function loadScoreFeed() {
    if (!config.scoreFeedUrl) return null;
    const separator = config.scoreFeedUrl.includes("?") ? "&" : "?";
    const response = await fetch(`${config.scoreFeedUrl}${separator}v=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "text/csv" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return core.parseScoreFeedCsv(await response.text());
  }

  async function loadFeed() {
    const sources = [
      config.liveFeedUrl && { url: config.liveFeedUrl, label: "Google Sheet" },
      config.staticFeedUrl && { url: config.staticFeedUrl, label: "published snapshot" }
    ].filter(Boolean);
    if (!sources.length || !core) {
      window.UBL_DATA_SOURCE = "bundled fallback";
      return fallback;
    }

    const failures = [];
    let scoreGames = null;
    try {
      scoreGames = await loadScoreFeed();
    } catch (error) {
      failures.push(`live score feed: ${error.message}`);
    }

    for (const source of sources) {
      try {
        const separator = source.url.includes("?") ? "&" : "?";
        const response = await fetch(`${source.url}${separator}v=${Date.now()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const baseFeed = await response.json();
        const mergedFeed = scoreGames ? core.mergeScoreFeed(baseFeed, scoreGames) : baseFeed;
        const normalized = core.normalizeFeed(mergedFeed, fallback);
        window.UBL_DATA_SOURCE = scoreGames ? "live score feed" : source.label;
        window.UBL_DATA_ERROR = failures.join(" ");
        window.UBL_DATA = normalized;
        return normalized;
      } catch (error) {
        failures.push(`${source.label}: ${error.message}`);
      }
    }

    window.UBL_DATA_SOURCE = "bundled fallback";
    window.UBL_DATA_ERROR = failures.join(" ");
    window.UBL_DATA = fallback;
    return fallback;
  }

  window.UBL_DATA_READY = loadFeed();
  window.UBL_RELOAD_DATA = async function () {
    const data = await loadFeed();
    document.dispatchEvent(new CustomEvent("ubl:data-updated", { detail: { data } }));
    return data;
  };

  const refreshMinutes = Number(config.refreshMinutes || 5);
  if (refreshMinutes > 0) {
    window.setInterval(window.UBL_RELOAD_DATA, refreshMinutes * 60 * 1000);
  }
})();
