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

  async function loadBaseFeed(sources) {
    const failures = [];
    for (const source of sources) {
      try {
        const separator = source.url.includes("?") ? "&" : "?";
        const response = await fetch(`${source.url}${separator}v=${Date.now()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return { feed: await response.json(), label: source.label, failures };
      } catch (error) {
        failures.push(`${source.label}: ${error.message}`);
      }
    }
    return { feed: null, label: "", failures };
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

    const [scoreResult, baseResult] = await Promise.allSettled([
      loadScoreFeed(),
      loadBaseFeed(sources)
    ]);
    const failures = baseResult.status === "fulfilled" ? [...baseResult.value.failures] : [];
    const scoreGames = scoreResult.status === "fulfilled" ? scoreResult.value : null;
    if (scoreResult.status === "rejected") failures.push(`live score feed: ${scoreResult.reason.message}`);
    if (baseResult.status === "rejected") failures.push(`published schedule: ${baseResult.reason.message}`);

    if (baseResult.status === "fulfilled" && baseResult.value.feed) {
      try {
        const mergedFeed = scoreGames ? core.mergeScoreFeed(baseResult.value.feed, scoreGames) : baseResult.value.feed;
        const normalized = core.normalizeFeed(mergedFeed, fallback);
        window.UBL_DATA_SOURCE = scoreGames ? "live score feed" : baseResult.value.label;
        window.UBL_DATA_ERROR = failures.join(" ");
        window.UBL_DATA = normalized;
        return normalized;
      } catch (error) {
        failures.push(`published schedule: ${error.message}`);
      }
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
