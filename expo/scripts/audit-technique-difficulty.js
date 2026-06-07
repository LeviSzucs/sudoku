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
  console.log("\nSummary by current label");
  for (const difficulty of DIFFICULTIES) {
    const group = byDifficulty(rows, difficulty);
    const suggestedCounts = Object.fromEntries(DIFFICULTIES.map((label) => [label, countBy(group, (row) => row.suggested_difficulty === label)]));
    const hardest = [...new Set(group.map((row) => row.hardest_technique))].sort().join(", ");
    console.log(`- ${difficulty}: ${group.length} puzzles | suggested ${JSON.stringify(suggestedCounts)} | hardest techniques: ${hardest}`);
  }

  console.log("\nMismatch counts");
  console.log(`- Total mismatches: ${mismatches.length}/${rows.length}`);
  console.log(`- Easy rated Medium+: ${countBy(rows, (row) => row.current_difficulty === "Easy" && row.suggested_difficulty !== "Easy")}`);
  console.log(`- Medium rated Easy: ${countBy(rows, (row) => row.current_difficulty === "Medium" && row.suggested_difficulty === "Easy")}`);
  console.log(`- Medium rated Hard+: ${countBy(rows, (row) => row.current_difficulty === "Medium" && ["Hard", "Expert", "Master"].includes(row.suggested_difficulty))}`);
  console.log(`- Hard rated Easy/Medium: ${countBy(rows, (row) => row.current_difficulty === "Hard" && ["Easy", "Medium"].includes(row.suggested_difficulty))}`);
  console.log(`- Expert/Master requiring advanced/search: ${countBy(rows, (row) => ["Expert", "Master"].includes(row.current_difficulty) && ["locked_candidate", "pointing_pair_triple", "box_line_reduction", "naked_pair", "naked_triple", "hidden_pair", "hidden_triple", "x_wing", "search"].includes(row.hardest_technique))}`);
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

  summarize(rows);
  printSamples(rows);

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
}

main();
