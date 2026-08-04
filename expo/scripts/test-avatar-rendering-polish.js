const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve();
const moduleCache = new Map();

function loadTypeScript(relativePath) {
  const normalizedPath = relativePath.endsWith(".ts") ? relativePath : `${relativePath}.ts`;
  if (moduleCache.has(normalizedPath)) return moduleCache.get(normalizedPath).exports;
  const filePath = path.join(projectRoot, normalizedPath);
  const output = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath,
  }).outputText;
  const loadedModule = { exports: {} };
  moduleCache.set(normalizedPath, loadedModule);
  const localRequire = (request) => request.startsWith("@/")
    ? loadTypeScript(request.slice(2))
    : require(request);
  new Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, localRequire);
  return loadedModule.exports;
}

const geometry = loadTypeScript("lib/avatarGeometry");
const avatarCatalogue = loadTypeScript("lib/avatar");
const rendererSource = fs.readFileSync(path.join(projectRoot, "components", "AvatarRenderer.tsx"), "utf8");
const avatarSource = fs.readFileSync(path.join(projectRoot, "components", "Avatar.tsx"), "utf8");
const editorSource = fs.readFileSync(path.join(projectRoot, "components", "AvatarEditor.tsx"), "utf8");
const completionSource = fs.readFileSync(path.join(projectRoot, "components", "CompletionModal.tsx"), "utf8");
const versusSource = fs.readFileSync(path.join(projectRoot, "app", "(tabs)", "versus.tsx"), "utf8");

const hairItems = avatarCatalogue.avatarItemsFor("hairStyle");
assert.deepEqual(hairItems.map((item) => item.value), [null, "buzz", "short", "side_part", "curly", "long", "bun"]);
for (const style of hairItems.map((item) => item.value).filter(Boolean)) {
  assert.equal(geometry.avatarHairKeepsEyesClear(style), true, `${style} must stop above the eye region`);
  assert.ok(geometry.AVATAR_HAIR_GEOMETRY[style].frontMaxY < geometry.AVATAR_EYE_REGION.top);
}
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.curly.frontMaxY, 41);
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.long.frontMaxY, 40);
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.side_part.frontMaxY, 41);
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.long.hasBackLayer, true);
assert.equal(geometry.avatarHairTranslateY(null), 0, "None hair remains a clean head shape");
assert.equal(geometry.avatarHairTranslateY("unknown_future_hair"), 0);

assert.equal((rendererSource.match(/<Circle cx="50" cy="50" r="50" fill=\{bg\}/g) || []).length, 1, "background circle renders once");
assert.doesNotMatch(rendererSource, /backgroundColor: renderBackground/, "the wrapper must not repaint the background");
assert.doesNotMatch(rendererSource, /r="47" stroke="#000000"/, "frames must not have a second black shadow ring");
assert.doesNotMatch(rendererSource, /r="39" stroke=\{frame\}/, "frames must not have a second inner ring");
assert.doesNotMatch(rendererSource, /cx="50" cy="45" rx="23" ry="25"/, "the offset face silhouette must not create a grey halo");
assert.equal((rendererSource.match(/<Circle cx="50" cy="50" r="46" stroke=\{frame\}/g) || []).length, 1, "selected frame renders once");

const longBackIndex = rendererSource.indexOf('avatar.avatar_hair_style === "long"');
const faceIndex = rendererSource.indexOf('<Ellipse cx="50" cy="42"');
const longFrontIndex = rendererSource.indexOf('avatar.avatar_hair_style === "long"', longBackIndex + 1);
const featuresIndex = rendererSource.indexOf("<ExpressionBrows");
const glassesIndex = rendererSource.indexOf('avatar.avatar_accessory === "glasses"');
const headbandIndex = rendererSource.indexOf('avatar.avatar_accessory === "headband"');
const headphonesIndex = rendererSource.indexOf('avatar.avatar_accessory === "headphones"');
const frameIndex = rendererSource.indexOf("renderFrame && frame");
assert.ok(longBackIndex < faceIndex, "long hair back renders behind the face");
assert.ok(faceIndex < longFrontIndex && longFrontIndex < featuresIndex, "long hair front remains above the face but below features");
for (const [name, index] of [["glasses", glassesIndex], ["headband", headbandIndex], ["headphones", headphonesIndex]]) {
  assert.ok(index > featuresIndex, `${name} remains visible over the face and hair`);
  assert.ok(index < frameIndex, `${name} remains inside the single frame`);
}

assert.equal((avatarSource.match(/layer="static"/g) || []).length, 1);
assert.equal((avatarSource.match(/layer="character"/g) || []).length, 1);
assert.match(avatarSource, /layer="static"[\s\S]*Animated\.View[\s\S]*layer="character"/);
assert.match(avatarSource, /cancelAnimation\(translateY\)/, "motion cleanup remains intact");

assert.doesNotMatch(editorSource, /previewHalo/);
assert.match(editorSource, /style=\{styles\.previewStage\}[\s\S]*context="share"[\s\S]*motion="static"[\s\S]*animated=\{false\}/);
assert.doesNotMatch(editorSource, /previewStage:[\s\S]{0,180}(borderWidth|backgroundColor|shadowColor|elevation)/);
assert.match(completionSource, /avatarWrap:\s*\{\s*marginBottom: 12,?\s*\}/);
assert.doesNotMatch(versusSource, /vsAvatarShell:[\s\S]{0,180}(backgroundColor|borderWidth|borderColor)/);
assert.doesNotMatch(versusSource, /rankedAvatarShell:[\s\S]{0,180}(backgroundColor|borderWidth|borderColor)/);

console.log("Avatar rendering polish tests passed.");

