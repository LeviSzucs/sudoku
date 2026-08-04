/* global __dirname */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const expoRoot = path.join(__dirname, "..");
const homePath = path.join(expoRoot, "app", "(tabs)", "index.tsx");
const home = fs.readFileSync(homePath, "utf8");

for (const removedReference of [
  "PastDailiesRail",
  "WeeklyDailySummary",
  "useDailyHistory",
  "dailyHistoryRefreshKey",
  "todayDailyInProgress",
]) {
  assert.equal(home.includes(removedReference), false, `Home must not reference ${removedReference}`);
}

assert.match(home, /onPress=\{openDaily\}/, "Daily Sudoku hero remains wired to its existing opening flow");
assert.match(home, /Daily Sudoku[^]*Daily Duel/, "Daily Sudoku remains before Daily Duel on Home");
assert.match(home, /<DailyDuelVignette active=\{isFocused\} \/>/, "Daily Duel vignette remains mounted");
assert.match(home, /onPress=\{openDuel\}/, "Daily Duel retains its existing opening flow");

for (const removedPath of [
  "components/PastDailiesRail.tsx",
  "components/WeeklyDailySummary.tsx",
  "hooks/useDailyHistory.ts",
  "lib/dailyHistoryRequestStore.ts",
  "lib/pastDailies.ts",
  "lib/weeklyDailySummary.ts",
  "scripts/test-weekly-daily-summary.js",
]) {
  assert.equal(fs.existsSync(path.join(expoRoot, removedPath)), false, `${removedPath} must be removed`);
}

const packageJson = fs.readFileSync(path.join(expoRoot, "package.json"), "utf8");
assert.equal(packageJson.includes("test:weekly-daily-summary"), false, "obsolete weekly-summary command must be removed");

console.log("Home Daily history removal checks passed.");

