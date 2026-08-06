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

function pathNumbers(value) {
  return [...value.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
}

const geometry = loadTypeScript("lib/avatarGeometry.ts");
const rendererSource = fs.readFileSync(path.join(projectRoot, "components", "AvatarRenderer.tsx"), "utf8");
const editorSource = fs.readFileSync(path.join(projectRoot, "components", "AvatarEditor.tsx"), "utf8");
const avatarSource = fs.readFileSync(path.join(projectRoot, "components", "Avatar.tsx"), "utf8");

const { back, front } = geometry.AVATAR_LONG_HAIR_PATHS;
const anchors = geometry.AVATAR_LONG_HAIR_ANCHORS;
const frontNumbers = pathNumbers(front);
const frontX = frontNumbers.filter((_, index) => index % 2 === 0);
const frontY = frontNumbers.filter((_, index) => index % 2 === 1);

assert.equal(geometry.AVATAR_HAIR_GEOMETRY.long.hasBackLayer, true);
assert.equal(geometry.AVATAR_HAIR_GEOMETRY.long.translateY, 0, "Long is fixed through its paths, not another vertical offset");
assert.ok(back.length > 165 && (back.match(/C/g) || []).length >= 7, "Long back hair has a complete rear and side mass");
assert.ok(front.length > 115, "Long front hair has a substantial scalp layer");
assert.ok((front.match(/C/g) || []).length >= 5, "front hair uses a curved crown and parted hairline");
assert.ok(Math.min(...frontY) <= anchors.scalpTopY, "front hair covers the upper scalp");
assert.ok(Math.max(...frontY) - Math.min(...frontY) >= 24, "front hair is not a narrow horizontal band");
assert.ok(Math.min(...frontX) <= anchors.leftTempleX && Math.max(...frontX) >= anchors.rightTempleX, "front hair spans both temples");
assert.match(back, new RegExp(`29 ${anchors.sideBottomY}`));
assert.match(back, new RegExp(`71 ${anchors.sideBottomY}`));
assert.match(front, new RegExp(`M${anchors.leftTempleX} ${anchors.frontHairlineY}`));
assert.match(front, new RegExp(`${anchors.rightTempleX} ${anchors.frontHairlineY}`));
assert.equal(geometry.avatarHairKeepsPupilsClear("long"), true);
assert.equal(geometry.avatarHairIsAttached("long"), true);

const backIndex = rendererSource.indexOf("AVATAR_LONG_HAIR_PATHS.back");
const faceIndex = rendererSource.indexOf('<Ellipse cx="50" cy="42"');
const frontIndex = rendererSource.indexOf("AVATAR_LONG_HAIR_PATHS.front");
const featuresIndex = rendererSource.indexOf("<ExpressionBrows");
const glassesIndex = rendererSource.indexOf('avatar.avatar_accessory === "glasses"');
const headbandIndex = rendererSource.indexOf('avatar.avatar_accessory === "headband"');
const headphonesIndex = rendererSource.indexOf('avatar.avatar_accessory === "headphones"');
const frameIndex = rendererSource.indexOf("renderFrame && frame");
assert.ok(backIndex < faceIndex && faceIndex < frontIndex, "Long back and front layers surround the face in canonical order");
assert.ok(frontIndex < featuresIndex, "facial expression remains readable above Long front hair");
for (const index of [glassesIndex, headbandIndex, headphonesIndex]) {
  assert.ok(index > frontIndex && index < frameIndex, "Long accessories remain visible and clipped inside the frame");
}
assert.equal((rendererSource.match(/AVATAR_LONG_HAIR_PATHS\.back/g) || []).length, 1);
assert.equal((rendererSource.match(/AVATAR_LONG_HAIR_PATHS\.front/g) || []).length, 1);
assert.match(rendererSource, /<G clipPath=\{`url\(#\$\{clipPathId\}\)`\}>[\s\S]*AVATAR_LONG_HAIR_PATHS\.back[\s\S]*AVATAR_LONG_HAIR_PATHS\.front[\s\S]*renderFrame && frame/);
assert.match(avatarSource, /layer="static"[\s\S]*layer="character"/, "static and animated placements share the canonical Long geometry");
assert.match(editorSource, /context="share"[\s\S]*motion="static"[\s\S]*animated=\{false\}/, "editor preview remains static");

console.log("Long hairstyle geometry tests passed.");
