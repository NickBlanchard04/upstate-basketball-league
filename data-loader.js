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

  async function loadJsonFeed(url) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}v=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function loadFeed() {
    const failures = [];
    if (!core) {
      window.UBL_DATA_SOURCE = "bundled fallback";
      return fallback;
    }

    if (config.liveFeedUrl) {
      try {
        const normalized = core.normalizeFeed(await loadJsonFeed(config.liveFeedUrl), fallback);
        window.UBL_DATA_SOURCE = "live score feed";
        window.UBL_DATA_ERROR = "";
        window.UBL_DATA = normalized;
        return normalized;
      } catch (error) {
        failures.push(`live league feed: ${error.message}`);
      }
    }

    const [scoreResult, baseResult] = await Promise.allSettled([
      loadScoreFeed(),
      config.staticFeedUrl ? loadJsonFeed(config.staticFeedUrl) : Promise.resolve(null)
    ]);
    const scoreGames = scoreResult.status === "fulfilled" ? scoreResult.value : null;
    if (scoreResult.status === "rejected") failures.push(`live score feed: ${scoreResult.reason.message}`);
    if (baseResult.status === "rejected") failures.push(`published snapshot: ${baseResult.reason.message}`);

    try {
      const baseFeed = baseResult.status === "fulfilled" && baseResult.value ? baseResult.value : fallback;
      const mergedFeed = scoreGames ? core.mergeScoreFeed(baseFeed, scoreGames) : baseFeed;
      const normalized = core.normalizeFeed(mergedFeed, fallback);
      window.UBL_DATA_SOURCE = scoreGames ? "live score feed" : baseResult.value ? "published snapshot" : "bundled fallback";
      window.UBL_DATA_ERROR = failures.join(" ");
      window.UBL_DATA = normalized;
      return normalized;
    } catch (error) {
      failures.push(`backup schedule: ${error.message}`);
    }

    window.UBL_DATA_SOURCE = "bundled fallback";
    window.UBL_DATA_ERROR = failures.join(" ");
    window.UBL_DATA = fallback;
    return fallback;
  }

  window.UBL_DATA_SOURCE = "updating live data";
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
