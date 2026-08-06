const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.join(__dirname, "..");

function loadTypeScriptModule(relativePath, requireOverrides = {}) {
  const filePath = path.join(projectRoot, relativePath);
  const output = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath,
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (id) => requireOverrides[id] ?? require(id);
  new Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, localRequire);
  return loadedModule.exports;
}

const policy = loadTypeScriptModule("lib/storeReviewPolicy.ts");
const storeReview = loadTypeScriptModule("lib/storeReview.ts", {
  "@react-native-async-storage/async-storage": {},
  "expo-store-review": {},
  "@/lib/performanceDiagnostics": { logDevDiagnostic: () => {} },
  "@/lib/storeReviewPolicy": policy,
});

const NOW = Date.parse("2026-08-06T12:00:00.000Z");
const eligibleContext = (overrides = {}) => ({
  event: "daily_completion",
  signedIn: true,
  appVersion: "1.0.2",
  puzzlesCompleted: 8,
  dailyCompletions: 3,
  authoritativeDuelWins: 2,
  resultSaved: true,
  resultAuthoritative: true,
  resultOutcome: "completed",
  resultKey: "result-a",
  resultIsFresh: true,
  modalVisible: true,
  modalSettled: true,
  blockingUiActive: false,
  nowMs: NOW,
  ...overrides,
});

const emptyState = () => policy.createEmptyReviewRequestState();
const decision = (overrides = {}, state = emptyState()) => policy.getReviewRequestDecision(eligibleContext(overrides), state);

assert.equal(decision({ signedIn: false }).reason, "guest");
assert.equal(decision({ puzzlesCompleted: 4 }).reason, "insufficient_completions");
assert.equal(decision().eligible, true, "third successful Daily completion should qualify");
assert.equal(decision({ event: "daily_duel_win", resultOutcome: "win", authoritativeDuelWins: 2 }).eligible, true);
assert.equal(decision({ event: "classic_completion", puzzlesCompleted: 10 }).eligible, true);
assert.equal(decision({ event: "ranked_duel_win", resultOutcome: "loss" }).reason, "unsafe_outcome");
assert.equal(decision({ event: "ranked_duel_win", resultOutcome: "draw" }).reason, "unsafe_outcome");
assert.equal(decision({ resultSaved: false }).reason, "result_not_saved");
assert.equal(decision({ resultAuthoritative: false, resultOutcome: "unresolved" }).reason, "result_not_authoritative");
assert.equal(decision({ resultIsFresh: false }).reason, "old_result");

const attempted = policy.recordReviewRequestAttempt(emptyState(), eligibleContext());
assert.equal(decision({}, attempted).reason, "result_already_attempted");
assert.equal(decision({ resultKey: "result-b" }, attempted).reason, "already_attempted_version");
const priorVersionAttempt = { ...attempted, lastAttemptedVersion: "1.0.1", attemptedResultKeys: ["old-result"] };
assert.equal(decision({ resultKey: "result-b", appVersion: "1.0.3" }, priorVersionAttempt).reason, "cooldown");
assert.equal(decision({ resultKey: "result-b", appVersion: "1.0.3", nowMs: NOW + policy.STORE_REVIEW_COOLDOWN_MS }, priorVersionAttempt).eligible, true);
assert.deepEqual(policy.parseReviewRequestState("not-json"), emptyState());
assert.deepEqual(policy.parseReviewRequestState(JSON.stringify({ schemaVersion: 99 })), emptyState());

assert.equal(policy.getReviewRequestEventForMode("classic"), "classic_completion");
assert.equal(policy.getReviewRequestEventForMode("daily"), "daily_completion");
assert.equal(policy.getReviewRequestEventForMode("daily_duel"), "daily_duel_win");
assert.equal(policy.getReviewRequestEventForMode("ranked_duel"), "ranked_duel_win");
assert.equal(policy.getReviewRequestEventForMode("friend_challenge"), "friend_challenge_win");
assert.equal(policy.getReviewRequestEventForMode("unknown"), null);

function createDependencies({ available = true, requestError = null, raw = null } = {}) {
  let stored = raw;
  let requests = 0;
  return {
    dependencies: {
      getItem: async () => stored,
      setItem: async (_key, value) => { stored = value; },
      isAvailable: async () => available,
      requestReview: async () => {
        requests += 1;
        if (requestError) throw requestError;
      },
    },
    getStored: () => stored,
    getRequests: () => requests,
  };
}

(async () => {
  const unavailable = createDependencies({ available: false });
  assert.equal(await storeReview.attemptStoreReview(eligibleContext(), unavailable.dependencies), "unavailable");
  assert.equal(unavailable.getRequests(), 0);
  assert.equal(unavailable.getStored(), null, "capability failure must not consume eligibility");

  const once = createDependencies();
  assert.equal(await storeReview.attemptStoreReview(eligibleContext(), once.dependencies), "attempted");
  assert.equal(await storeReview.attemptStoreReview(eligibleContext(), once.dependencies), "ineligible");
  assert.equal(once.getRequests(), 1, "same result must never invoke twice");
  const storedAttempt = policy.parseReviewRequestState(once.getStored());
  assert.equal(storedAttempt.lastAttemptedVersion, "1.0.2");
  assert.equal("rated" in storedAttempt, false, "storage must not claim that a rating was submitted");

  const concurrent = createDependencies();
  const concurrentResults = await Promise.all([
    storeReview.attemptStoreReview(eligibleContext({ resultKey: "concurrent" }), concurrent.dependencies),
    storeReview.attemptStoreReview(eligibleContext({ resultKey: "concurrent" }), concurrent.dependencies),
  ]);
  assert.equal(concurrentResults.filter((result) => result === "attempted").length, 1);
  assert.equal(concurrent.getRequests(), 1, "simultaneous effects must share one claimed attempt");

  const invocationFailure = createDependencies({ requestError: new Error("native failure") });
  assert.equal(await storeReview.attemptStoreReview(eligibleContext({ resultKey: "failure" }), invocationFailure.dependencies), "error");
  assert.equal(policy.parseReviewRequestState(invocationFailure.getStored()).attemptedResultKeys.includes("failure"), true);

  const later = createDependencies({ raw: JSON.stringify(priorVersionAttempt) });
  const laterContext = eligibleContext({ resultKey: "new-result", appVersion: "1.0.3", nowMs: NOW + policy.STORE_REVIEW_COOLDOWN_MS });
  assert.equal(await storeReview.attemptStoreReview(laterContext, later.dependencies), "attempted");

  const callbacks = new Map();
  let nextHandle = 0;
  const fakeScheduler = {
    setTimeout: (callback) => { const handle = ++nextHandle; callbacks.set(handle, callback); return handle; },
    clearTimeout: (handle) => callbacks.delete(handle),
  };
  let delayedAttempts = 0;
  const cancelForClose = policy.scheduleReviewRequest(() => { delayedAttempts += 1; }, 2000, fakeScheduler);
  cancelForClose();
  for (const callback of callbacks.values()) callback();
  assert.equal(delayedAttempts, 0, "modal close/unmount must cancel a pending attempt");

  const release = policy.scheduleReviewRequest(() => { delayedAttempts += 1; }, 2000, fakeScheduler);
  const pendingCallback = [...callbacks.values()][0];
  pendingCallback();
  release();
  assert.equal(delayedAttempts, 1);

  const modalSource = fs.readFileSync(path.join(projectRoot, "components", "CompletionModal.tsx"), "utf8");
  for (const action of ["onContinue", "onShare", "onHome"]) assert.match(modalSource, new RegExp(action));
  const gameSource = fs.readFileSync(path.join(projectRoot, "app", "game.tsx"), "utf8");
  assert.match(gameSource, /officialResultOutcome/);
  assert.match(gameSource, /resultIsFresh: reviewFreshResultKey === completionCelebrationKey/);
  const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "app.json"), "utf8"));
  assert.equal(appJson.expo.version, "1.0.2");
  assert.equal("buildNumber" in appJson.expo.ios, false, "build-number configuration must remain unchanged");

  console.log("Store review policy, persistence, capability, and cancellation tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
