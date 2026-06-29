const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appJsonPath = path.join(root, 'app.json');
const easJsonPath = path.join(root, 'eas.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${path.basename(filePath)}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasPlugin(plugins, pluginName) {
  return plugins.some((plugin) => {
    if (typeof plugin === 'string') {
      return plugin === pluginName;
    }
    return Array.isArray(plugin) && plugin[0] === pluginName;
  });
}

const appJson = readJson(appJsonPath);
const easJson = readJson(easJsonPath);
const expo = appJson.expo || {};
const android = expo.android || {};
const adaptiveIcon = android.adaptiveIcon || {};
const build = easJson.build || {};
const preview = build.preview || {};
const production = build.production || {};
const plugins = expo.plugins || [];

assert(expo.name === 'SudoDuel', 'Expected expo.name to be SudoDuel.');
assert(expo.slug === 'sudoduel', 'Expected expo.slug to be sudoduel.');
assert(android.package === 'com.leviszucs.sudoduel', 'Expected Android package to be com.leviszucs.sudoduel.');
assert(Boolean(adaptiveIcon.foregroundImage), 'Expected Android adaptive icon foregroundImage to be configured.');
assert(Boolean(adaptiveIcon.backgroundColor), 'Expected Android adaptive icon backgroundColor to be configured.');
assert(hasPlugin(plugins, 'expo-notifications'), 'Expected expo-notifications plugin to be configured.');
assert(preview.distribution === 'internal', 'Expected preview profile to use internal distribution.');
assert(preview.android?.buildType === 'apk', 'Expected preview Android builds to produce an APK for device testing.');
assert(production.environment === 'production', 'Expected production profile to use production environment.');
assert(production.autoIncrement === true, 'Expected production profile to auto-increment store builds.');
assert(Boolean(expo.extra?.eas?.projectId), 'Expected Expo EAS projectId to be configured.');

console.log('Android store config check passed.');
console.log(`Package: ${android.package}`);
console.log(`Preview build type: ${preview.android.buildType}`);
console.log(`Production autoIncrement: ${production.autoIncrement}`);
