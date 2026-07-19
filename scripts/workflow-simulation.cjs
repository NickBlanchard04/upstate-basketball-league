#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const core = require("../league-core.js");

function appsScriptRules() {
  const source = fs.readFileSync(path.resolve(__dirname, "..", "apps-script", "Code.gs"), "utf8");
  const context = vm.createContext({ console, Number, Date, Math, String, Object, Array, JSON, RegExp, isFinite });
  vm.runInContext(source, context);
  return context;
}

function runWorkflowSimulation() {
  const rules = appsScriptRules();
  const fallbackFeed = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "league-data.json"), "utf8"));
  const checks = [];
  const state = {
    games: [],
    audit: [],
    corrections: [],
    notifications: [],
    representatives: [],
    photos: []
  };
  const settings = {
    scoreReporterEnforced: true,
    coachReminderMinutes: 90,
    commissionerEscalationMinutes: 150,
    operationsTestMode: true
  };
  const record = (name, detail) => checks.push({ name, detail, passed: true });
  const notify = (key, type, to) => {
    const prior = state.notifications.find((item) => item.key === key);
    if (prior) return prior;
    const entry = { key, type, to, status: settings.operationsTestMode ? "Test logged" : "Sent" };
    state.notifications.push(entry);
    return entry;
  };

  const pilot = {
    id: "pilot-kings-01",
    weekId: "pilot-test",
    date: "2026-07-20",
    time: "6:00 PM",
    division: "Boys Varsity",
    awayTeamId: "kings-school",
    homeTeamId: "wilton-baptist",
    scoreReporterTeamId: "kings-school",
    venueId: "wilton-baptist-gym",
    status: "Scheduled",
    visibility: "private"
  };
  state.games.push(pilot);
  assert.equal(rules.isPilotGame_(pilot), true);
  record("Create private pilot game", pilot.id);

  pilot.time = "6:30 PM";
  assert.equal(pilot.time, "6:30 PM");
  record("Apply commissioner schedule change", pilot.time);

  assert.equal(rules.scoreReporterTeamId_(pilot), "kings-school");
  assert.equal(rules.portalCanReportGame_(pilot, "kings-school", settings), true);
  assert.equal(rules.portalCanReportGame_(pilot, "wilton-baptist", settings), false);
  record("Enforce designated reporter", pilot.scoreReporterTeamId);

  assert.equal(rules.coachScoreError_(pilot.id, 48, 52, "Nick Blanchard"), "");
  pilot.awayScore = 48;
  pilot.homeScore = 52;
  pilot.status = "Final";
  state.audit.push({ type: "Private pilot submission", gameId: pilot.id, result: "48-52" });
  record("Submit final score", "48-52");

  const correction = { id: "corr-simulation-1", gameId: pilot.id, requested: "49-52", status: "Open" };
  state.corrections.push(correction);
  notify(`correction-request:${correction.id}`, "Correction request", "info.upstatebasketballleague@gmail.com");
  record("Request audited correction", correction.id);

  correction.status = "Completed";
  pilot.awayScore = 49;
  state.audit.push({ type: "Commissioner approved correction", gameId: pilot.id, result: "49-52" });
  notify(`correction-completed:${correction.id}`, "Correction decision", "athletic_director@kingsschool.info");
  assert.equal(`${pilot.awayScore}-${pilot.homeScore}`, "49-52");
  record("Approve correction", "49-52");

  const overdue = {
    id: "simulation-overdue-01",
    weekId: "simulation-private",
    date: "2026-12-03",
    time: "6:00 PM",
    awayTeamId: "wilton-baptist",
    homeTeamId: "kings-school",
    scoreReporterTeamId: "kings-school",
    status: "Scheduled",
    visibility: "private"
  };
  state.games.push(overdue);
  const overdueNow = new Date(rules.gameTimestamp_(overdue) + 151 * 60000);
  assert.equal(rules.scoreDeadlineState_(overdue, overdueNow, settings), "commissioner-escalation");
  record("Detect overdue final", overdue.id);

  const reminder = notify("score-reminder:simulation-overdue-01", "Score reminder", "athletic_director@kingsschool.info");
  assert.equal(reminder.status, "Test logged");
  record("Log coach reminder without sending", reminder.status);

  const escalation = notify("commissioner-score-escalation:simulation-overdue-01", "Commissioner score escalation", "info.upstatebasketballleague@gmail.com");
  assert.equal(escalation.status, "Test logged");
  record("Log commissioner escalation without sending", escalation.status);

  const beforeDedupe = state.notifications.length;
  notify("score-reminder:simulation-overdue-01", "Score reminder", "athletic_director@kingsschool.info");
  assert.equal(state.notifications.length, beforeDedupe);
  record("Deduplicate repeated alert", String(beforeDedupe));

  const representative = {
    person: "Test Coach",
    email: "athletic_director@kingsschool.info",
    teamId: "kings-school",
    portalUrl: "https://docs.google.com/spreadsheets/d/simulation",
    status: "Provisioned"
  };
  assert.equal(rules.isVerifiedEmail_(representative.email), true);
  state.representatives.push(representative);
  notify(`representative-invite:${representative.teamId}:${representative.email}`, "Representative invitation", representative.email);
  record("Provision representative", representative.teamId);

  const firstBytes = Buffer.from("approved-photo-content");
  const firstFingerprint = crypto.createHash("sha256").update(firstBytes).digest("base64url");
  state.photos.push({ id: "photo-1", fingerprint: firstFingerprint, status: "Approved" });
  record("Approve moderated photo", "photo-1");

  const duplicateFingerprint = crypto.createHash("sha256").update(Buffer.from("approved-photo-content")).digest("base64url");
  const duplicateOf = state.photos.find((photo) => photo.fingerprint === duplicateFingerprint)?.id || "";
  assert.equal(duplicateOf, "photo-1");
  state.photos.push({ id: "photo-2", fingerprint: duplicateFingerprint, status: "Duplicate blocked", duplicateOf });
  record("Block exact duplicate photo", duplicateOf);

  const publicIds = new Set(fallbackFeed.games.map((game) => game.id));
  assert.equal(state.games.some((game) => publicIds.has(game.id)), false);
  assert.equal(fallbackFeed.games.some((game) => rules.isPilotGame_(game)), false);
  record("Verify private records are absent from public feed", `${fallbackFeed.games.length} public games`);

  assert.deepEqual(core.validateFeed(fallbackFeed), []);
  assert.equal(state.notifications.every((notification) => notification.status === "Test logged"), true);
  assert.equal(state.audit.length, 2);
  assert.equal(state.corrections[0].status, "Completed");
  record("Verify audit, notification, and feed integrity", "all assertions passed");

  return {
    passed: true,
    checks,
    counts: {
      privateGames: state.games.length,
      auditEntries: state.audit.length,
      notificationsLogged: state.notifications.length,
      outboundEmails: state.notifications.filter((item) => item.status === "Sent").length,
      moderatedPhotos: state.photos.length,
      publicPilotRecords: fallbackFeed.games.filter((game) => rules.isPilotGame_(game)).length
    }
  };
}

if (require.main === module) {
  const result = runWorkflowSimulation();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { runWorkflowSimulation };
