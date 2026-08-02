const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
  const filePath = path.join(__dirname, "..", relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath,
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, require);
  return loadedModule.exports;
}

const { getDailyDateKey } = loadTypeScriptModule("lib/daily.ts");
const {
  deriveWeeklyDailySummary,
  getCurrentWeekDateKeys,
  shouldLoadDailyHistory,
} = loadTypeScriptModule("lib/weeklyDailySummary.ts");

function solved(dateKey, score = 800, elapsedSeconds = 240, mode = "daily") {
  return {
    dateKey,
    state: "solved",
    result: {
      resultId: `${mode}:${dateKey}:${score}`,
      puzzleId: `puzzle:${dateKey}`,
      difficulty: "Medium",
      score,
      elapsedSeconds,
      completedAt: `${dateKey}T12:00:00.000Z`,
      mode,
    },
  };
}

function missed(dateKey, result = null) {
  return { dateKey, state: "missed", result };
}

assert.deepEqual(getCurrentWeekDateKeys("2026-08-03"), [
  "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09",
]);
assert.deepEqual(getCurrentWeekDateKeys("2026-08-09"), [
  "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09",
]);

assert.equal(deriveWeeklyDailySummary({
  todayKey: "2026-08-03",
  entries: [],
  queryStatus: "ready",
}).elapsedDayCount, 1, "Monday denominator is one");
assert.equal(deriveWeeklyDailySummary({
  todayKey: "2026-08-09",
  entries: [],
  queryStatus: "ready",
}).elapsedDayCount, 7, "Sunday denominator is seven");

const midweek = deriveWeeklyDailySummary({
  todayKey: "2026-08-05",
  entries: [solved("2026-08-03", 700), missed("2026-08-04")],
  queryStatus: "ready",
});
assert.equal(midweek.elapsedDayCount, 3, "Wednesday denominator uses three elapsed days");
assert.equal(midweek.solvedCount, 1);
assert.equal(midweek.days[1].state, "missed");
assert.equal(midweek.days[2].state, "today_available");
assert.equal(midweek.days[3].state, "upcoming");

const todaySolved = deriveWeeklyDailySummary({
  todayKey: "2026-08-05",
  entries: [solved("2026-08-05", 812)],
  queryStatus: "ready",
});
assert.equal(todaySolved.todayState, "today_solved");
assert.equal(todaySolved.solvedCount, 1);
assert.equal(todaySolved.bestScore, 812);

const todayInProgress = deriveWeeklyDailySummary({
  todayKey: "2026-08-05",
  entries: [],
  queryStatus: "ready",
  todayInProgress: true,
});
assert.equal(todayInProgress.todayState, "today_in_progress");

const unavailable = deriveWeeklyDailySummary({
  todayKey: "2026-08-05",
  entries: [],
  queryStatus: "unavailable",
});
assert.equal(unavailable.days[0].state, "unavailable");
assert.equal(unavailable.days[2].state, "unavailable");
assert.equal(unavailable.days[3].state, "upcoming");

const ignoredModes = deriveWeeklyDailySummary({
  todayKey: "2026-08-05",
  entries: [solved("2026-08-03", 999, 100, "daily_duel"), missed("2026-08-04", solved("2026-08-04").result)],
  queryStatus: "ready",
});
assert.equal(ignoredModes.solvedCount, 0, "Daily Duel and non-solved entries never count");

const duplicateResults = deriveWeeklyDailySummary({
  todayKey: "2026-08-05",
  entries: [solved("2026-08-03", 700, 250), solved("2026-08-03", 850, 300), solved("2026-08-04", 800, 220)],
  queryStatus: "ready",
});
assert.equal(duplicateResults.solvedCount, 2, "duplicate stored results do not double-count a date");
assert.equal(duplicateResults.bestScore, 850, "best score is the primary weekly metric");

assert.equal(getDailyDateKey(new Date("2026-08-02T23:59:59.999Z")), "2026-08-02");
assert.equal(getDailyDateKey(new Date("2026-08-03T00:00:00.000Z")), "2026-08-03");
assert.deepEqual(getCurrentWeekDateKeys("2026-08-01").slice(0, 2), ["2026-07-27", "2026-07-28"]);
assert.deepEqual(getCurrentWeekDateKeys("2027-01-01"), [
  "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03",
]);

assert.equal(shouldLoadDailyHistory(true, "user-id"), true);
assert.equal(shouldLoadDailyHistory(false, "user-id"), false);
assert.equal(shouldLoadDailyHistory(true, null), false, "signed-out and guest states issue no protected request");

console.log("Weekly Daily Summary tests passed.");

