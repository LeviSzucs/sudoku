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
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
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

const editor = loadTypeScript("lib/avatarEditor");

const persisted = editor.createAvatarDraft({
  initials: "LS",
  avatar_color: "#2F5D62",
  avatar_symbol: "legacy-star",
  avatar_style_version: "character_v1",
  avatar_bg_color: "#2F5D62",
  avatar_initials: "LS",
  avatar_skin_tone: "#D19A6E",
  avatar_hair_style: "short",
  avatar_hair_color: "#6E432D",
  avatar_top_style: "tee",
  avatar_top_color: "#1E1B4B",
  avatar_accessory: "glasses",
  avatar_frame: "bronze",
});

assert.equal(persisted.avatar_hair_style, "short");
assert.equal(persisted.avatar_symbol, "legacy-star");
assert.equal(persisted.initials, "LS");

const changedHair = editor.updateAvatarDraftField(persisted, "avatar_hair_style", "curly");
assert.equal(changedHair.avatar_hair_style, "curly");
assert.equal(persisted.avatar_hair_style, "short", "editing must not mutate persisted state");
assert.equal(editor.avatarDraftsEqual(persisted, changedHair), false);
assert.equal(editor.avatarDraftsEqual(persisted, { ...persisted }), true, "unchanged drafts disable Save");

const changedColour = editor.updateAvatarDraftField(persisted, "avatar_bg_color", "#4169A8");
assert.equal(changedColour.avatar_bg_color, "#4169A8");
assert.equal(changedColour.avatar_color, "#4169A8");
assert.equal(persisted.avatar_color, "#2F5D62");

const cancelled = { ...persisted };
assert.equal(editor.avatarDraftsEqual(cancelled, persisted), true, "Cancel restores the persisted snapshot");
assert.equal(editor.updateAvatarDraftField(persisted, "avatar_accessory", null).avatar_accessory, null);
assert.equal(editor.updateAvatarDraftField(persisted, "avatar_frame", null).avatar_frame, null);
assert.equal(editor.sanitizeAvatarInitials(" l!2x "), "L2X");

const unknown = editor.createAvatarDraft({
  ...persisted,
  avatar_hair_style: "retired_hair",
  avatar_frame: "retired_frame",
});
assert.equal(unknown.avatar_hair_style, "retired_hair", "unknown persisted values stay intact until explicitly replaced");
assert.equal(unknown.avatar_frame, "retired_frame");

assert.deepEqual(
  editor.AVATAR_EDITOR_CATEGORIES.map((category) => category.id),
  ["appearance", "hair", "outfit", "accessories", "background", "frame"],
);
assert.equal(editor.AVATAR_EDITOR_CATEGORIES[0].includesInitials, true);
assert.equal(editor.avatarOptionAccessibilityLabel("Hair style", "Short", true), "Hair style, Short, selected");
assert.equal(editor.avatarOptionAccessibilityLabel("Accessory", "None", false), "Accessory, None, not selected");

const editorSource = fs.readFileSync(path.join(projectRoot, "components", "AvatarEditor.tsx"), "utf8");
assert.match(editorSource, /context="share"/);
assert.match(editorSource, /motion="static"/);
assert.match(editorSource, /animated=\{false\}/);
assert.match(editorSource, /accessibilityRole="tab"/);
assert.match(editorSource, /accessibilityState=\{\{ selected/);
assert.match(editorSource, /keyboardShouldPersistTaps="handled"/);
assert.doesNotMatch(editorSource, /setTimeout|setInterval|Math\.random/);

const settingsSource = fs.readFileSync(path.join(projectRoot, "app", "settings.tsx"), "utf8");
assert.match(settingsSource, /avatarSaveInFlightRef\.current \|\| !avatarDirty/);
assert.match(settingsSource, /setAvatarError\(result\.error/);
assert.match(settingsSource, /setAvatarPersistedDraft\(avatarDraft\);[\s\S]*setPanel\(null\)/);
assert.match(settingsSource, /Discard avatar changes\?/);
assert.match(settingsSource, /disabled=\{avatarSaving \|\| !avatarDirty\}/);
assert.match(settingsSource, /accessibilityLiveRegion="polite"/);

const profileSource = fs.readFileSync(path.join(projectRoot, "app", "(tabs)", "profile.tsx"), "utf8");
assert.match(profileSource, /accessibilityLabel="Edit your avatar"/);
assert.match(profileSource, /params: \{ panel: "avatar" \}/);
const publicProfileSource = fs.readFileSync(path.join(projectRoot, "app", "player", "[id].tsx"), "utf8");
assert.doesNotMatch(publicProfileSource, /AvatarEditor|panel: "avatar"/);

const profileHookSource = fs.readFileSync(path.join(projectRoot, "hooks", "usePlayerProfile.ts"), "utf8");
for (const field of [
  "avatar_style_version",
  "avatar_bg_color",
  "avatar_initials",
  "avatar_skin_tone",
  "avatar_hair_style",
  "avatar_hair_color",
  "avatar_top_style",
  "avatar_top_color",
  "avatar_accessory",
  "avatar_frame",
]) {
  assert.match(profileHookSource, new RegExp(`${field}: next\\.${field}`), `${field} must use the authoritative profile update`);
}
assert.match(profileHookSource, /auth\.isGuest[\s\S]*persistLocal\(next\)/);

console.log("Avatar editor tests passed.");

