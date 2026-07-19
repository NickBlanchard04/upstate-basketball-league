#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const core = require("../league-core.js");

async function configuredEndpoint() {
  const configPath = path.resolve(__dirname, "..", "config.js");
  const source = await fs.readFile(configPath, "utf8");
  const match = source.match(/\bliveFeedUrl\s*:\s*["'](https:\/\/[^"']+)["']/);
  return match ? match[1] : "";
}

async function main() {
  const endpoint = process.argv[2] || process.env.UBL_FEED_URL || await configuredEndpoint();
  if (!endpoint) {
    throw new Error("Pass the Apps Script /exec URL, set UBL_FEED_URL, or configure liveFeedUrl in config.js.");
  }

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error("Feed returned HTTP " + response.status + ".");
  const feed = await response.json();
  if (feed.error) throw new Error("Feed reported an error: " + String(feed.error));
  const errors = core.validateFeed(feed);
  if (errors.length) throw new Error(errors.join(" "));
  if (feed.games.some((game) => /^pilot-/i.test(game.id || "") || String(game.weekId || "").toLowerCase() === "pilot-test")) {
    throw new Error("Pilot data was found in the public feed.");
  }

  const output = path.resolve(__dirname, "..", "league-data.json");
  const next = JSON.stringify(feed, null, 2) + "\n";
  const previous = await fs.readFile(output, "utf8").catch(() => "");
  if (previous === next) {
    console.log("Snapshot is already current: " + feed.games.length + " games.");
    return;
  }
  await fs.writeFile(output, next, "utf8");
  console.log("Validated and updated " + output + " with " + feed.games.length + " games.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
