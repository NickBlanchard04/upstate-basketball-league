const test = require("node:test");
const assert = require("node:assert/strict");
const { runWorkflowSimulation } = require("../../scripts/workflow-simulation.cjs");

test("isolated solo workflow simulation completes without public leakage or outbound email", () => {
  const result = runWorkflowSimulation();
  assert.equal(result.passed, true);
  assert.equal(result.checks.length, 15);
  assert.equal(result.counts.outboundEmails, 0);
  assert.equal(result.counts.publicPilotRecords, 0);
  assert.equal(result.counts.auditEntries, 2);
  assert.equal(result.counts.moderatedPhotos, 2);
});
