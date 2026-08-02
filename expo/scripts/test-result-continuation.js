const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const helperPath = path.join(__dirname, "..", "lib", "resultContinuation.ts");
const source = fs.readFileSync(helperPath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: helperPath,
}).outputText;
const loadedModule = { exports: {} };
new Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, require);
const { createResultContinuationTapGuard, getResultContinuation } = loadedModule.exports;

const completed = (overrides = {}) => ({
  mode: "classic",
  difficulty: "Easy",
  outcome: "completed",
  resultRecorded: true,
  rankedAvailable: true,
  friendRematchSupported: false,
  ...overrides,
});

const cases = [
  ["Easy", "Medium", "Try Medium"],
  ["Medium", "Hard", "Try Hard"],
  ["Hard", "Expert", "Try Expert"],
  ["Expert", "Master", "Try Master"],
  ["Master", "Master", "Play another Master"],
];

for (const [difficulty, targetDifficulty, label] of cases) {
  const result = getResultContinuation(completed({ difficulty }));
  assert.equal(result?.targetDifficulty, targetDifficulty);
  assert.equal(result?.label, label);
}

assert.equal(getResultContinuation(completed({ mode: "daily" }))?.actionKind, "open_daily_duel");
assert.equal(getResultContinuation(completed({ mode: "daily_duel", rankedAvailable: true }))?.actionKind, "open_ranked_duel");
assert.equal(getResultContinuation(completed({ mode: "daily_duel", rankedAvailable: false }))?.actionKind, "open_classic");

for (const outcome of ["win", "loss", "draw"]) {
  assert.equal(getResultContinuation(completed({ mode: "ranked_duel", outcome }))?.actionKind, "open_ranked_duel");
}

assert.equal(getResultContinuation(completed({ mode: "friend_challenge", outcome: "win", friendRematchSupported: true }))?.actionKind, "challenge_again");
assert.equal(getResultContinuation(completed({ mode: "friend_challenge", outcome: "loss", friendRematchSupported: false }))?.actionKind, "open_friends");

for (const outcome of ["unresolved", "failed", "abandoned", "error"]) {
  assert.equal(getResultContinuation(completed({ outcome })), null);
}
assert.equal(getResultContinuation(completed({ resultRecorded: false })), null);
assert.equal(getResultContinuation(completed({ mode: "mystery" })), null);

const guard = createResultContinuationTapGuard();
assert.equal(guard.tryStart(), true);
assert.equal(guard.tryStart(), false, "a repeated tap must be ignored while navigation is pending");
assert.equal(guard.isPending(), true);
guard.reset();
assert.equal(guard.tryStart(), true);

console.log("Result continuation decision tests passed.");
