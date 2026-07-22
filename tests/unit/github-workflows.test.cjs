const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const siteRoot = path.resolve(__dirname, "..", "..");

function readWorkflow(name) {
  return fs.readFileSync(path.join(siteRoot, ".github", "workflows", name), "utf8");
}

test("website CI runs for pull requests and production pushes without duplicating feature-branch pushes", () => {
  const workflow = readWorkflow("website-tests.yml");
  assert.match(workflow, /^\s*pull_request:\s*$/m);
  assert.match(workflow, /^\s*push:\s*\n\s*branches:\s*\n\s*- main\s*$/m);
  assert.doesNotMatch(workflow, /^\s*push:\s*\n\s*pull_request:\s*$/m);
});

test("feed snapshot workflow uses the current runner and maintains one recoverable failure issue", () => {
  const workflow = readWorkflow("league-feed-snapshot.yml");
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /node-version:\s*24/);
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node)@v4/);
  assert.match(workflow, /gh issue comment "\$existing"/);
  assert.match(workflow, /gh issue close "\$existing" --reason completed/);
  assert.match(workflow, /if: failure\(\)/);
  assert.match(workflow, /if: success\(\)/);
});
