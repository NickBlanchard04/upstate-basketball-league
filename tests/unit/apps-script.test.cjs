const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require.resolve("../../apps-script/Code.gs"), "utf8");
const context = vm.createContext({ console, Number, Date, Math, String, Object, Array, JSON, RegExp, isFinite });
vm.runInContext(source, context);

test("coach score validation accepts a complete final result", () => {
  assert.equal(context.coachScoreError_("ubl-001", 41, 50, "Coach Name"), "");
});

test("coach score validation rejects missing, tied, and invalid results", () => {
  assert.match(context.coachScoreError_("ubl-001", "", 50, "Coach Name"), /both final scores/);
  assert.match(context.coachScoreError_("ubl-001", 50, 50, "Coach Name"), /cannot be tied/);
  assert.match(context.coachScoreError_("ubl-001", -1, 50, "Coach Name"), /whole numbers/);
  assert.match(context.coachScoreError_("ubl-001", 41.5, 50, "Coach Name"), /whole numbers/);
  assert.match(context.coachScoreError_("ubl-001", 41, 50, ""), /full name/);
});
