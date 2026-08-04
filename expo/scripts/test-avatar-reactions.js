const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.join(__dirname, "..");

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

const tracker = playback.createAvatarReactionPlaybackTracker(2);
assert.equal(tracker.claim("result-1:you"), true);
assert.equal(tracker.claim("result-1:you"), false, "the same result key must not replay");
assert.equal(tracker.claim("result-2:you"), true, "a new result key may react");
assert.equal(tracker.claim("result-3:you"), true);
assert.equal(tracker.hasPlayed("result-1:you"), false, "the tracker must stay bounded");
assert.equal(tracker.claim(null), false);

const avatarSource = fs.readFileSync(path.join(projectRoot, "components", "Avatar.tsx"), "utf8");
assert.match(avatarSource, /claimAvatarReactionPlayback\(reactionKey\)/);
assert.match(avatarSource, /cancelAnimation\(translateY\)/);
assert.doesNotMatch(avatarSource, /setTimeout|setInterval|Math\.random/);

const profileSource = fs.readFileSync(path.join(projectRoot, "app", "(tabs)", "profile.tsx"), "utf8");
assert.match(profileSource, /context="profile"[\s\S]*active=\{isFocused\}/);
const versusSource = fs.readFileSync(path.join(projectRoot, "app", "(tabs)", "versus.tsx"), "utf8");
assert.match(versusSource, /active=\{isFocused\}/);
assert.match(versusSource, /reactionKey=/);
const publicProfileSource = fs.readFileSync(path.join(projectRoot, "app", "player", "[id].tsx"), "utf8");
assert.match(publicProfileSource, /context="profile"[\s\S]*animated=\{false\}/);

console.log("Avatar reaction tests passed.");

