const fs = require("fs");
const path = require("path");
const {
  DIFFICULTIES,
  DEFAULT_RATING_BASE,
  DEFAULT_TARGET_CLUES,
  collectExistingPuzzleKeys,
  ensureDir,
} = require("./puzzle-bank-utils");
const { REPORT_PATH, ratePuzzle } = require("./technique-difficulty-rater");

const CALIBRATION_REPORT_PATH = REPORT_PATH.replace(/\.json$/, "-calibration.md");
const ADVANCED_TECHNIQUES = new Set([
  "locked_candidate",
  "pointing_pair_triple",
  "box_line_reduction",
  "naked_pair",
  "naked_triple",
  "hidden_pair",
  "hidden_triple",
  "x_wing",
  "search",
]);

function countBy(rows, predicate) {
  return rows.filter(predicate).length;
}

function byDifficulty(rows, difficulty) {
  return rows.filter((row) => row.current_difficulty === difficulty);
}

function printMethodSummary() {
  console.log("Technique-aware Sudoku difficulty audit");
  console.log("=======================================");
  console.log("\nCurrent generator/rating system");
  console.log("- Generates a complete solved grid from a shuffled pattern.");
  console.log("- Removes clues in random order while `countSolutions(givens, 2)` remains exactly 1.");
  console.log("- Validates legal givens, legal solution, givens matching solution, and unique solution.");
  console.log("- Difficulty labels are currently chosen by target clue count.");
  console.log("- rating_score is currently assigned from a fixed label/range, not measured human solving complexity.");
  console.log("- No production human-solving technique rater is currently used for labels.");
  console.log("\nCurrent target clues and rating bases");
  for (const difficulty of DIFFICULTIES) {
    console.log(`- ${difficulty}: target clues ${DEFAULT_TARGET_CLUES[difficulty]}, rating base ${DEFAULT_RATING_BASE[difficulty]}`);
  }
}

function summarize(rows) {
  const mismatches = rows.filter((row) => row.mismatch);
  const mismatchByDifficulty = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, countBy(rows, (row) => row.current_difficulty === difficulty && row.mismatch)]));
  const hardGroup = byDifficulty(rows, "Hard");
  const expertGroup = byDifficulty(rows, "Expert");
  const masterGroup = byDifficulty(rows, "Master");
  console.log("\nSummary by current label");
  for (const difficulty of DIFFICULTIES) {
    const group = byDifficulty(rows, difficulty);
    const suggestedCounts = Object.fromEntries(DIFFICULTIES.map((label) => [label, countBy(group, (row) => row.suggested_difficulty === label)]));
    const hardest = [...new Set(group.map((row) => row.hardest_technique))].sort().join(", ");
    console.log(`- ${difficulty}: ${group.length} puzzles | suggested ${JSON.stringify(suggestedCounts)} | hardest techniques: ${hardest}`);
  }

  console.log("\nMismatch counts");
  console.log(`- Total mismatches: ${mismatches.length}/${rows.length}`);
  console.log(`- By current difficulty: ${JSON.stringify(mismatchByDifficulty)}`);
  console.log(`- Easy rated Medium+: ${countBy(rows, (row) => row.current_difficulty === "Easy" && row.suggested_difficulty !== "Easy")}`);
  console.log(`- Medium rated Easy: ${countBy(rows, (row) => row.current_difficulty === "Medium" && row.suggested_difficulty === "Easy")}`);
  console.log(`- Medium rated Hard+: ${countBy(rows, (row) => row.current_difficulty === "Medium" && ["Hard", "Expert", "Master"].includes(row.suggested_difficulty))}`);
  console.log(`- Hard rated Easy/Medium: ${countBy(rows, (row) => row.current_difficulty === "Hard" && ["Easy", "Medium"].includes(row.suggested_difficulty))}`);
  console.log(`- Hard rated Expert/Master: ${countBy(hardGroup, (row) => ["Expert", "Master"].includes(row.suggested_difficulty))}`);
  console.log(`- Expert rated easier: ${countBy(expertGroup, (row) => ["Easy", "Medium", "Hard"].includes(row.suggested_difficulty))}`);
  console.log(`- Master rated easier: ${countBy(masterGroup, (row) => row.suggested_difficulty !== "Master")}`);
  console.log(`- Expert/Master requiring advanced/search: ${countBy(rows, (row) => ["Expert", "Master"].includes(row.current_difficulty) && ADVANCED_TECHNIQUES.has(row.hardest_technique))}`);

  return {
    total: rows.length,
    mismatches: mismatches.length,
    mismatchByDifficulty,
    easyMediumPlus: countBy(rows, (row) => row.current_difficulty === "Easy" && row.suggested_difficulty !== "Easy"),
    mediumEasy: countBy(rows, (row) => row.current_difficulty === "Medium" && row.suggested_difficulty === "Easy"),
    mediumHardPlus: countBy(rows, (row) => row.current_difficulty === "Medium" && ["Hard", "Expert", "Master"].includes(row.suggested_difficulty)),
    hardEasyMedium: countBy(hardGroup, (row) => ["Easy", "Medium"].includes(row.suggested_difficulty)),
    hardExpertMaster: countBy(hardGroup, (row) => ["Expert", "Master"].includes(row.suggested_difficulty)),
    expertEasier: countBy(expertGroup, (row) => ["Easy", "Medium", "Hard"].includes(row.suggested_difficulty)),
    masterEasier: countBy(masterGroup, (row) => row.suggested_difficulty !== "Master"),
    expertMasterAdvanced: countBy(rows, (row) => ["Expert", "Master"].includes(row.current_difficulty) && ADVANCED_TECHNIQUES.has(row.hardest_technique)),
  };
}

function printSamples(rows) {
  const mismatches = rows.filter((row) => row.mismatch).slice(0, 30);
  console.log("\nSample mismatches");
  if (mismatches.length === 0) {
    console.log("- None");
    return;
  }
  for (const row of mismatches) {
    console.log(`- ${row.puzzle_id}: ${row.current_difficulty} -> ${row.suggested_difficulty}, score ${row.technique_score}, hardest ${row.hardest_technique}, givens ${row.givens_count}, rating_score ${row.rating_score}`);
  }
}

function topMismatchExamples(rows, difficulty, limit = 5) {
  const uniqueRows = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.puzzle_id)) continue;
    seen.add(row.puzzle_id);
    uniqueRows.push(row);
  }
  return uniqueRows
    .filter((row) => row.current_difficulty === difficulty && row.mismatch)
    .sort((a, b) => {
      const aDistance = Math.abs(DIFFICULTIES.indexOf(a.current_difficulty) - DIFFICULTIES.indexOf(a.suggested_difficulty));
      const bDistance = Math.abs(DIFFICULTIES.indexOf(b.current_difficulty) - DIFFICULTIES.indexOf(b.suggested_difficulty));
      return bDistance - aDistance || b.technique_score - a.technique_score || a.puzzle_id.localeCompare(b.puzzle_id);
    })
    .slice(0, limit);
}

function techniqueCounts(rows) {
  const counts = {};
  for (const row of rows) counts[row.hardest_technique] = (counts[row.hardest_technique] ?? 0) + 1;
  return counts;
}

function markdownTable(rows) {
  if (rows.length === 0) return "_No mismatches in this difficulty._\n";
  const lines = [
    "| puzzle_id | current | suggested | score | hardest | givens | rating_score |",
    "|---|---:|---:|---:|---|---:|---:|",
  ];
  for (const row of rows) {
    lines.push(`| ${row.puzzle_id} | ${row.current_difficulty} | ${row.suggested_difficulty} | ${row.technique_score} | ${row.hardest_technique} | ${row.givens_count} | ${row.rating_score ?? ""} |`);
  }
  return `${lines.join("\n")}\n`;
}

function writeCalibrationReport(rows, summary) {
  const generatedAt = new Date().toISOString();
  const byDifficultyLines = DIFFICULTIES.map((difficulty) => {
    const group = byDifficulty(rows, difficulty);
    const suggestedCounts = Object.fromEntries(DIFFICULTIES.map((label) => [label, countBy(group, (row) => row.suggested_difficulty === label)]));
    return `| ${difficulty} | ${group.length} | ${summary.mismatchByDifficulty[difficulty]} | ${JSON.stringify(suggestedCounts)} | ${JSON.stringify(techniqueCounts(group))} |`;
  });

  const report = `# Technique Difficulty Calibration

Generated: ${generatedAt}

## Scope

This is an audit and calibration artifact only. It does not relabel production puzzles, regenerate the puzzle bank, change puzzle selection, or alter gameplay/scoring/RP.

## Current Generator And Rating Summary

- Current generator creates a solved grid from a shuffled pattern, then removes clues while preserving exactly one solution.
- Current validation checks legal givens, legal solution, givens matching solution, and unique solution.
- Current difficulty labels are primarily driven by target clue count: Easy 40, Medium 34, Hard 30, Expert 27, Master 24.
- Current \`rating_score\` is fixed label/range metadata and is not currently a human solving complexity score.
- The new rater prototype solves with human-style techniques first, persists candidate eliminations through the solve path, then uses search/backtracking pressure as a fallback.

## Mismatch Summary

- Total mismatches: ${summary.mismatches}/${summary.total}
- Mismatch count by current difficulty: ${JSON.stringify(summary.mismatchByDifficulty)}
- Easy suggested Medium or harder: ${summary.easyMediumPlus}
- Medium suggested Easy: ${summary.mediumEasy}
- Medium suggested Hard or harder: ${summary.mediumHardPlus}
- Hard suggested Easy/Medium: ${summary.hardEasyMedium}
- Hard suggested Expert/Master: ${summary.hardExpertMaster}
- Expert suggested easier: ${summary.expertEasier}
- Master suggested easier: ${summary.masterEasier}
- Expert/Master requiring advanced/search: ${summary.expertMasterAdvanced}

| current difficulty | count | mismatches | suggested distribution | hardest technique distribution |
|---|---:|---:|---|---|
${byDifficultyLines.join("\n")}

## Five High-Signal Mismatch Examples Per Difficulty

### Easy

${markdownTable(topMismatchExamples(rows, "Easy"))}

### Medium

${markdownTable(topMismatchExamples(rows, "Medium"))}

### Hard

${markdownTable(topMismatchExamples(rows, "Hard"))}

### Expert

${markdownTable(topMismatchExamples(rows, "Expert"))}

### Master

${markdownTable(topMismatchExamples(rows, "Master"))}

## Rater Quality Notes

- Naked singles are detected from peer-eliminated candidate masks, so direct singles/basic scanning are represented.
- Hidden singles are detected per row, column, and box by finding the only candidate cell for a digit.
- Locked candidate logic covers pointing pairs/triples from box to line and claiming/box-line reductions from line to box.
- Naked and hidden pairs/triples are implemented as candidate subset eliminations in each unit.
- X-wing is implemented for row-pair and column-pair eliminations.
- Candidate eliminations persist across passes, so locked candidates/subsets are not repeatedly recounted from a freshly recomputed candidate grid.
- Search is only used after all implemented human techniques fail to make progress, so it is not used too early relative to the current technique stack.
- The largest rater limitation is missing advanced human techniques beyond X-wing, such as swordfish, XY-wing, XYZ-wing, coloring/chains, uniqueness techniques, and more nuanced candidate graph logic.
- Because those techniques are missing, some puzzles may be marked too hard when the rater falls back to search for a human-solvable advanced pattern.
- Puzzles are less likely to be marked too easy because the rater only gives credit for techniques it actually applies, but the current scoring bands are still preliminary and should be validated against hand-picked known examples.

## Proposed Technique Difficulty Bands

- Easy: score 0-35; mostly naked singles/basic scanning, with very small hidden-single usage; no locked candidates or search.
- Medium: score 36-60; hidden singles and light candidate logic; no sustained advanced eliminations; no search.
- Hard: score 61-95; locked candidates, pointing/claiming, pairs/triples, and multi-step candidate maintenance; no search fallback in accepted production Hard puzzles unless tightly bounded.
- Expert: score 96-220; advanced patterns such as X-wing or multiple locked/subset chains, or very limited search pressure where the missing technique set likely explains the fallback.
- Master: score > 220; advanced patterns plus substantial branching/search pressure, or repeated advanced eliminations with high candidate complexity.

## Recommended Future Generation Acceptance Rules

- Keep uniqueness validation as the first gate for every generated puzzle.
- Add technique rating as a second acceptance gate before export.
- Easy candidates should be accepted only when suggested difficulty is Easy, hardest technique is naked_single or hidden_single, and score is within the Easy band.
- Medium candidates should be accepted only when suggested difficulty is Medium and no search fallback is required.
- Hard candidates should require at least hidden singles plus candidate logic or bounded subset/locked-candidate usage, and should reject puzzles that rate Easy/Medium.
- Expert candidates should require advanced patterns or tightly bounded search pressure, and should reject puzzles that solve with singles-only paths.
- Master candidates should require advanced patterns plus deeper search/branch pressure, and should reject puzzles that do not exceed Expert complexity.
- Generated batches should record both the assigned label and the technique audit fields so future exports can be filtered without relabeling by clue count.
- Do not use mixed-source \`rating_score\` as a cross-source difficulty sorter until it is normalized or replaced by technique_score.

## Recommended Next Implementation Plan

1. Add regression fixtures with known technique requirements for singles, locked candidates, pairs, X-wing, and search-only examples.
2. Calibrate the score bands against those fixtures and a small hand-reviewed sample from each current difficulty.
3. Extend the rater with at least swordfish and XY-wing or another common next-tier family before using it for Expert/Master production generation.
4. Add generator acceptance filters that reject generated puzzles whose technique rating does not match the requested target label.
5. Run a small trial generation batch per difficulty and inspect mismatch rates before generating a production-sized bank.
6. Only after calibration, consider relabel/deactivation recommendations for current active puzzles in a separate migration.
`;

  ensureDir(path.dirname(CALIBRATION_REPORT_PATH));
  fs.writeFileSync(CALIBRATION_REPORT_PATH, report);
}

function main() {
  printMethodSummary();
  const puzzles = collectExistingPuzzleKeys().puzzles;
  const rows = puzzles.map(ratePuzzle);
  const invalid = rows.filter((row) => !row.valid);
  if (invalid.length > 0) {
    console.error(`\nInvalid puzzle rows found by technique audit: ${invalid.length}`);
    for (const row of invalid) console.error(`${row.puzzle_id}: ${JSON.stringify(row.issues)}`);
    process.exitCode = 1;
    return;
  }

  const summary = summarize(rows);
  printSamples(rows);
  writeCalibrationReport(rows, summary);

  ensureDir(path.dirname(REPORT_PATH));
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify({
    generated_at: new Date().toISOString(),
    method: {
      current_generation: "Solved grid + random clue removal while preserving unique solution.",
      current_rating: "Difficulty target clue count plus fixed rating_score band.",
      prototype_rater: "Human-style techniques followed by search/backtracking complexity fallback.",
    },
    rows,
  }, null, 2)}\n`);

  console.log(`\nWrote ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`Wrote ${path.relative(process.cwd(), CALIBRATION_REPORT_PATH)}`);
}

main();
