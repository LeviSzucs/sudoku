const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.join(__dirname, "..");
const moduleCache = new Map();

function loadTypeScript(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  if (moduleCache.has(filePath)) return moduleCache.get(filePath).exports;
  const loadedModule = { exports: {} };
  moduleCache.set(filePath, loadedModule);
  const output = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath,
  }).outputText;
  const localRequire = (request) => {
    if (request === "@/lib/avatarFoundation") return loadTypeScript("lib/avatarFoundation.ts");
    if (request === "@/constants/branding") return loadTypeScript("constants/branding.ts");
    return require(request);
  };
  new Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, localRequire);
  return loadedModule.exports;
}

const foundation = loadTypeScript("lib/avatarFoundation.ts");
const avatar = loadTypeScript("lib/avatar.ts");

assert.deepEqual(foundation.AVATAR_EMOTION_PRESETS.neutral, { expression: "neutral", motion: "idle" });
assert.deepEqual(foundation.AVATAR_EMOTION_PRESETS.happy, { expression: "happy", motion: "celebrate" });
assert.deepEqual(foundation.AVATAR_EMOTION_PRESETS.sad, { expression: "sad", motion: "defeated" });
assert.deepEqual(foundation.AVATAR_EMOTION_PRESETS.focused, { expression: "focused", motion: "thinking" });

for (const context of ["home", "leaderboard", "friends", "search", "notification", "share"]) {
  const presentation = foundation.getAvatarPresentationForContext(context, { motion: "celebrate", animated: true });
  assert.equal(presentation.animated, false, `${context} must remain static`);
  assert.equal(presentation.motion, "static");
}
for (const context of ["profile", "versus", "matchmaking", "result"]) {
  assert.equal(foundation.shouldAnimateAvatar(context), true, `${context} should permit animation`);
}

const reduced = foundation.getAvatarPresentationForContext("result", { expression: "happy", reducedMotion: true });
assert.equal(reduced.expression, "happy", "reduced motion must retain emotional expression");
assert.equal(reduced.motion, "static");
assert.equal(reduced.animated, false);

const limitedCharacter = {
  id: "limited",
  displayName: "Limited",
  assetStatus: "future",
  rendererId: "inline_character_v1",
  supportedExpressions: ["neutral"],
  supportedMotions: ["static", "idle"],
};
assert.deepEqual(
  foundation.resolveAvatarCapabilities(limitedCharacter, { expression: "happy", motion: "celebrate", animated: true }),
  { expression: "neutral", motion: "idle", animated: true },
);
assert.deepEqual(
  foundation.resolveAvatarCapabilities(limitedCharacter, { expression: "sad", motion: "defeated", animated: false }),
  { expression: "neutral", motion: "static", animated: false },
);

assert.equal(foundation.resolveAvatarCharacter("removed-character").id, foundation.DEFAULT_AVATAR_CHARACTER_ID);
const unknownLayers = avatar.resolveAvatarRenderModel({}, {}, {
  characterId: "removed-character",
  backgroundId: "missing-background",
  frameId: "missing-frame",
  outfitId: "missing-outfit",
  accessoryId: "missing-accessory",
}, "remote");
assert.equal(unknownLayers.appearance.characterId, foundation.DEFAULT_AVATAR_CHARACTER_ID);
assert.equal(unknownLayers.appearance.backgroundId, "bg_navy");
assert.equal(unknownLayers.appearance.frameId, "frame_none");
assert.equal(unknownLayers.appearance.outfitId, "top_tee");
assert.equal(unknownLayers.appearance.accessoryId, "accessory_none");

for (const source of ["guest", "loading"]) {
  const fallback = avatar.resolveAvatarRenderModel({}, {}, null, source);
  assert.equal(fallback.config.avatar_initials.length > 0, true);
  assert.equal(fallback.appearance.characterId, foundation.DEFAULT_AVATAR_CHARACTER_ID);
}

const legacy = avatar.resolveAvatarRenderModel(
  { avatar_bg_color: "#2F5D62", avatar_hair_style: "curly", avatar_accessory: "glasses" },
  { initials: "LS", color: "#2F5D62", symbol: "8" },
);
assert.equal(legacy.config.avatar_bg_color, "#2F5D62");
assert.equal(legacy.config.avatar_hair_style, "curly");
assert.equal(legacy.config.avatar_accessory, "glasses");
assert.equal(legacy.useLegacyFallback, true);

const duplicateRegistry = [foundation.AVATAR_CHARACTER_REGISTRY[0], foundation.AVATAR_CHARACTER_REGISTRY[0]];
assert.match(foundation.validateAvatarCharacterRegistry(duplicateRegistry).errors.join(" "), /Duplicate avatar character ID/);
const invalidRegistry = [{ ...foundation.AVATAR_CHARACTER_REGISTRY[0], rendererId: "missing-renderer" }];
assert.match(foundation.validateAvatarCharacterRegistry(invalidRegistry).errors.join(" "), /unknown renderer/);
assert.equal(foundation.validateAvatarCharacterRegistry(foundation.AVATAR_CHARACTER_REGISTRY).valid, true);

const avatarSource = fs.readFileSync(path.join(projectRoot, "components", "Avatar.tsx"), "utf8");
assert.doesNotMatch(avatarSource, /setTimeout|setInterval|Math\.random/, "avatar animation must not use unmanaged timers or randomness");
assert.match(avatarSource, /cancelAnimation/, "animated avatar must clean up native animations");

console.log("Avatar foundation tests passed.");

