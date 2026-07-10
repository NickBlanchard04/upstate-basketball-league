#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const core = require("../league-core.js");

async function main() {
  const endpoint = process.argv[2] || process.env.UBL_FEED_URL;
  if (!endpoint) {
    throw new Error("Pass the Apps Script /exec URL or set UBL_FEED_URL.");
  }

  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Feed returned HTTP " + response.status + ".");
  const feed = await response.json();
  const errors = core.validateFeed(feed);
  if (errors.length) throw new Error(errors.join(" "));

  const output = path.resolve(__dirname, "..", "league-data.json");
  await fs.writeFile(output, JSON.stringify(feed, null, 2) + "\n", "utf8");
  console.log("Updated " + output + " with " + feed.games.length + " games.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
