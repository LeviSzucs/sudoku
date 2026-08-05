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

const geometry = loadTypeScript("lib/avatarGeometry.ts");
const foundation = loadTypeScript("lib/avatarFoundation.ts");
const rendererSource = fs.readFileSync(path.join(projectRoot, "components", "AvatarRenderer.tsx"), "utf8");
const avatarSource = fs.readFileSync(path.join(projectRoot, "components", "Avatar.tsx"), "utf8");
const profileSource = fs.readFileSync(path.join(projectRoot, "app", "(tabs)", "profile.tsx"), "utf8");
const editorSource = fs.readFileSync(path.join(projectRoot, "components", "AvatarEditor.tsx"), "utf8");

for (const style of Object.keys(geometry.AVATAR_HAIR_GEOMETRY)) {
  assert.equal(geometry.avatarHairKeepsPupilsClear(style), true, `${style} keeps pupils visible`);
  assert.equal(geometry.avatarHairIsAttached(style), true, `${style} remains attached`);
}
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.short.foreheadAnchorY, 41);
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.side_part.foreheadAnchorY, 40);
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.curly.foreheadAnchorY, 40);
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.long.hasBackLayer, true);
assert.equal(geometry.avatarHairTransform(null), null);

const firstClipId = geometry.avatarClipPathId(":r1:");
const secondClipId = geometry.avatarClipPathId(":r2:");
assert.notEqual(firstClipId, secondClipId, "multiple avatars receive distinct clip IDs");
assert.match(firstClipId, /^[a-zA-Z][a-zA-Z0-9_-]+$/);
assert.equal(geometry.avatarCharacterClipRadius(null), 49);
for (const frame of ["bronze", "silver", "gold", "premium_crown", "ranked_crown"]) {
  assert.equal(geometry.avatarCharacterClipRadius(frame), 43, `${frame} clips character inside its inner edge`);
  assert.ok(geometry.avatarCharacterClipInset(84, frame) > geometry.avatarCharacterClipInset(84, null));
}

const clipDefinitionIndex = rendererSource.indexOf("<ClipPath id={clipPathId}>");
const clippedCharacterIndex = rendererSource.indexOf('<G clipPath={`url(#${clipPathId})`}>');
const bodyIndex = rendererSource.indexOf("M17 100");
const frameIndex = rendererSource.indexOf("renderFrame && frame");
assert.ok(clipDefinitionIndex >= 0 && clipDefinitionIndex < clippedCharacterIndex);
assert.ok(clippedCharacterIndex < bodyIndex && bodyIndex < frameIndex, "body is clipped before frame rendering");
assert.equal((rendererSource.match(/<ClipPath id=\{clipPathId\}>/g) || []).length, 1);
assert.equal((rendererSource.match(/r="46" stroke=\{frame\}/g) || []).length, 1, "all selected frame types share one frame stroke");

assert.match(avatarSource, /avatarCharacterClipInset\(props\.resolvedSize, resolvedFrame\)/);
assert.match(avatarSource, /styles\.characterClip[\s\S]*borderRadius: characterClipSize \/ 2/);
assert.match(avatarSource, /characterClip:\s*\{[\s\S]*overflow: "hidden"/);
assert.match(avatarSource, /withTiming\(-0\.55/);
assert.match(avatarSource, /withTiming\(0\.65/);
assert.match(avatarSource, /withTiming\(1\.008/);

assert.match(profileSource, /context="profile"[\s\S]*active=\{isFocused\}/);
const focusedProfile = foundation.getAvatarPresentationForContext("profile", { active: true });
assert.deepEqual({ animated: focusedProfile.animated, motion: focusedProfile.motion }, { animated: true, motion: "idle" });
assert.equal(foundation.getAvatarPresentationForContext("profile", { active: false }).motion, "static");
assert.equal(foundation.getAvatarPresentationForContext("profile", { reducedMotion: true }).motion, "static");
assert.deepEqual(foundation.getAvatarReactionForMatchState("waiting"), { expression: "focused", motion: "thinking" });
assert.match(editorSource, /context="share"[\s\S]*motion="static"[\s\S]*animated=\{false\}/);

console.log("Avatar geometry and clipping tests passed.");

