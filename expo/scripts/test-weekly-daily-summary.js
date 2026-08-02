/* global __dirname */

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
const {
  createDailyHistoryRequestStore,
  isCurrentDailyHistoryRequest,
} = loadTypeScriptModule("lib/dailyHistoryRequestStore.ts");

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

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

async function testRequestOrdering() {
  let clock = 100;
  const store = createDailyHistoryRequestStore(() => clock++);
  const stale = deferred();
  const refreshed = deferred();
  let visible = null;

  const requestA = store.begin("user-a:2026-08-05", "old-result", () => stale.promise);
  const requestB = store.begin("user-a:2026-08-05", "new-result", () => refreshed.promise);
  let currentIdentity = requestB.identity;
  const apply = async (request) => {
    const resolution = await request.promise;
    if (isCurrentDailyHistoryRequest(currentIdentity, resolution)) visible = resolution.value;
  };
  const appliedA = apply(requestA);
  const appliedB = apply(requestB);

  refreshed.resolve({ today: "solved" });
  await appliedB;
  stale.resolve({ today: "unsolved" });
  await appliedA;

  assert.deepEqual(visible, { today: "solved" }, "stale request cannot replace the latest visible value");
  assert.deepEqual(store.peek("user-a:2026-08-05").value, { today: "solved" }, "stale request cannot replace the latest cache value");
  assert.deepEqual(store.peekFresh("user-a:2026-08-05", "new-result", 300_000).value, { today: "solved" }, "later consumer receives the refreshed cache value");

  const shared = deferred();
  let loaderCalls = 0;
  const first = store.begin("user-a:2026-08-06", "same-result", () => {
    loaderCalls += 1;
    return shared.promise;
  });
  const second = store.begin("user-a:2026-08-06", "same-result", () => {
    loaderCalls += 1;
    return shared.promise;
  });
  assert.equal(second.coalesced, true);
  assert.equal(first.promise, second.promise, "identical request identities share one promise");
  shared.resolve({ today: "solved" });
  await Promise.all([first.promise, second.promise]);
  assert.equal(loaderCalls, 1, "identical request identities call the loader once");

  const staleUser = deferred();
  const oldUser = store.begin("user-a:2026-08-08", "result", () => staleUser.promise);
  const otherUser = store.begin("user-b:2026-08-05", "new-result", async () => ({ owner: "user-b" }));
  currentIdentity = otherUser.identity;
  const otherUserResolution = await otherUser.promise;
  assert.equal(isCurrentDailyHistoryRequest(currentIdentity, otherUserResolution), true);
  staleUser.resolve({ owner: "user-a" });
  const oldUserResolution = await oldUser.promise;
  assert.equal(isCurrentDailyHistoryRequest(currentIdentity, oldUserResolution), false, "switching users rejects the prior user's visible result");
  assert.deepEqual(store.peek("user-a:2026-08-05").value, { today: "solved" }, "switching users cannot replace another user's cache");
  assert.deepEqual(store.peek("user-b:2026-08-05").value, { owner: "user-b" });

  const staleDate = deferred();
  const oldDate = store.begin("user-c:2026-08-06", "result", () => staleDate.promise);
  const otherDate = store.begin("user-c:2026-08-07", "new-result", async () => ({ date: "2026-08-07" }));
  currentIdentity = otherDate.identity;
  const otherDateResolution = await otherDate.promise;
  assert.equal(isCurrentDailyHistoryRequest(currentIdentity, otherDateResolution), true);
  staleDate.resolve({ date: "2026-08-06" });
  const oldDateResolution = await oldDate.promise;
  assert.equal(isCurrentDailyHistoryRequest(currentIdentity, oldDateResolution), false, "changing dates rejects the older date's visible result");
  assert.deepEqual(store.peek("user-c:2026-08-06").value, { date: "2026-08-06" });
  assert.deepEqual(store.peek("user-c:2026-08-07").value, { date: "2026-08-07" });
}

testRequestOrdering()
  .then(() => console.log("Weekly Daily Summary tests passed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

