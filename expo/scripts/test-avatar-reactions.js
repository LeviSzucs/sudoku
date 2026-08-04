const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve();

function loadTypeScript(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  const output = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath,
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, require);
  return loadedModule.exports;
}

const foundation = loadTypeScript("lib/avatarFoundation.ts");
const playback = loadTypeScript("lib/avatarReactionPlayback.ts");

assert.deepEqual(foundation.getAvatarReactionForOutcome("win"), { expression: "happy", motion: "celebrate" });
assert.deepEqual(foundation.getAvatarReactionForOutcome("loss"), { expression: "sad", motion: "defeated" });
assert.deepEqual(foundation.getAvatarReactionForOutcome("draw"), { expression: "neutral", motion: "static" });
for (const outcome of ["cancelled", "unresolved", "failed", "failed_save", null, undefined, "future_outcome"]) {
  assert.deepEqual(foundation.getAvatarReactionForOutcome(outcome), { expression: "neutral", motion: "static" });
}
assert.deepEqual(
  foundation.getAvatarReactionForOutcome("completed", { soloCompletion: true, resultSaveStatus: "saved" }),
  { expression: "happy", motion: "celebrate" },
);
for (const resultSaveStatus of ["pending", "failed"]) {
  assert.deepEqual(
    foundation.getAvatarReactionForOutcome("win", { resultSaveStatus }),
    { expression: "neutral", motion: "static" },
    `${resultSaveStatus} results must not celebrate`,
  );
}
assert.deepEqual(foundation.getOpponentAvatarReactionForOutcome("win"), { expression: "sad", motion: "defeated" });
assert.deepEqual(foundation.getOpponentAvatarReactionForOutcome("loss"), { expression: "happy", motion: "celebrate" });
assert.deepEqual(foundation.getOpponentAvatarReactionForOutcome("draw"), { expression: "neutral", motion: "static" });

for (const state of ["searching", "waiting", "waiting_for_opponent"]) {
  assert.deepEqual(foundation.getAvatarReactionForMatchState(state), { expression: "focused", motion: "thinking" });
}
assert.deepEqual(foundation.getAvatarReactionForMatchState("matched"), { expression: "neutral", motion: "idle" });

for (const context of ["home", "leaderboard", "friends", "search", "notification", "share"]) {
  const presentation = foundation.getAvatarPresentationForContext(context, { animated: true, motion: "celebrate" });
  assert.equal(presentation.motion, "static", `${context} must remain static`);
  assert.equal(presentation.animated, false);
}
assert.equal(foundation.getAvatarPresentationForContext("profile", { active: true }).motion, "idle");
assert.equal(foundation.getAvatarPresentationForContext("profile", { active: false }).motion, "static");
assert.equal(foundation.getAvatarPresentationForContext("versus", { active: false }).motion, "static");
assert.equal(foundation.getAvatarPresentationForContext("matchmaking").motion, "thinking");
assert.equal(foundation.getAvatarPresentationForContext("profile", { motion: "thinking" }).motion, "idle");

const reducedWin = foundation.getAvatarPresentationForContext("result", {
  expression: "happy",
  motion: "celebrate",
  reducedMotion: true,
});
assert.equal(reducedWin.expression, "happy");
assert.equal(reducedWin.motion, "static");
assert.equal(reducedWin.animated, false);

const tracker = playback.createAvatarReactionPlaybackTracker();
const gate = playback.createAvatarReactionPlaybackGate(tracker.claim);
gate.prepare("result-1:you");
gate.prepare("result-1:you");
assert.equal(gate.consume("result-1:you", true), true, "the first stable setup may play once");
assert.equal(gate.consume("result-1:you", true), false, "a rerender must not replay the same key");

const focusGate = playback.createAvatarReactionPlaybackGate(tracker.claim);
focusGate.prepare("result-focus:you");
assert.equal(focusGate.consume("result-focus:you", false), false, "an inactive result is consumed without motion");
assert.equal(focusGate.consume("result-focus:you", true), false, "focus returning must not replay");

const remountedGate = playback.createAvatarReactionPlaybackGate(tracker.claim);
assert.equal(remountedGate.consume("result-1:you", true), false, "remounting cannot reclaim an app-session key");

const reducedGate = playback.createAvatarReactionPlaybackGate(tracker.claim);
reducedGate.prepare("result-reduced:you");
assert.equal(reducedGate.consume("result-reduced:you", false), false, "Reduced Motion consumes without movement");
assert.equal(reducedGate.consume("result-reduced:you", true), false, "disabling Reduced Motion cannot revive the result");

assert.equal(gate.consume("result-2:you", true), true, "a genuinely new result key may react");
const sideTracker = playback.createAvatarReactionPlaybackTracker();
const playerGate = playback.createAvatarReactionPlaybackGate(sideTracker.claim);
const opponentGate = playback.createAvatarReactionPlaybackGate(sideTracker.claim);
assert.equal(playerGate.consume("result-side:you", true), true);
assert.equal(opponentGate.consume("result-side:opponent", true), true, "player and opponent keys are independent");
assert.equal(tracker.claim(null), false);

const avatarSource = fs.readFileSync(path.join(projectRoot, "components", "Avatar.tsx"), "utf8");
assert.match(avatarSource, /createAvatarReactionPlaybackGate\(\)/);
assert.match(avatarSource, /queueMicrotask/);
assert.match(avatarSource, /reactionGate\.consume\(reactionKey, false\)/);
assert.match(avatarSource, /cancelAnimation\(translateY\)/);
assert.doesNotMatch(avatarSource, /setTimeout|setInterval|Math\.random/);
assert.match(avatarSource, /resolvedMotion === "idle"[\s\S]*withRepeat/);
assert.match(avatarSource, /resolvedMotion === "thinking"[\s\S]*withRepeat/);

const profileSource = fs.readFileSync(path.join(projectRoot, "app", "(tabs)", "profile.tsx"), "utf8");
assert.match(profileSource, /context="profile"[\s\S]*active=\{isFocused\}/);
const versusSource = fs.readFileSync(path.join(projectRoot, "app", "(tabs)", "versus.tsx"), "utf8");
assert.match(versusSource, /active=\{isFocused\}/);
assert.match(versusSource, /reactionKey=/);
const publicProfileSource = fs.readFileSync(path.join(projectRoot, "app", "player", "[id].tsx"), "utf8");
assert.match(publicProfileSource, /context="profile"[\s\S]*animated=\{false\}/);

console.log("Avatar reaction tests passed.");

