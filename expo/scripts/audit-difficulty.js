const {
  DIFFICULTIES,
  DEFAULT_RATING_BASE,
  DEFAULT_TARGET_CLUES,
  collectExistingPuzzleKeys,
} = require("./puzzle-bank-utils");

function clueCount(givens) {
  return String(givens).split("").filter((ch) => ch >= "1" && ch <= "9").length;
}

function summarize(values) {
  if (values.length === 0) return "n/a";
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  const avg = sum / values.length;
  return `min ${sorted[0]}, avg ${avg.toFixed(1)}, max ${sorted[sorted.length - 1]}`;
}

function generatedRows(puzzles) {
  return puzzles.filter((puzzle) => String(puzzle.source_name ?? puzzle.source ?? "").includes("generated"));
}

function byDifficulty(puzzles, difficulty) {
  return puzzles.filter((puzzle) => puzzle.difficulty === difficulty);
}

function printDistribution(label, puzzles) {
  console.log(`\n${label}`);
  for (const difficulty of DIFFICULTIES) {
    const rows = byDifficulty(puzzles, difficulty);
    const clues = rows.map((puzzle) => clueCount(puzzle.givens));
    const ratings = rows.map((puzzle) => Number(puzzle.rating_score ?? 0)).filter((value) => Number.isFinite(value));
    console.log(
      `- ${difficulty}: ${rows.length} puzzles | clues ${summarize(clues)} | rating_score ${summarize(ratings)}`
    );
  }
}

function main() {
  const existing = collectExistingPuzzleKeys();
  const puzzles = existing.puzzles;
  const generated = generatedRows(puzzles);

  console.log("Sudoku difficulty calibration audit");
  console.log("===================================");
  console.log("\nCurrent generation method");
  console.log("- Generates a full solved grid, then removes values while preserving exactly one solution.");
  console.log("- Difficulty is currently driven by target clue count plus a fixed rating_score base per label.");
  console.log("- The generator does not yet grade required solving techniques such as hidden singles, locked candidates, pairs, chains, or search depth.");
  console.log("- Uniqueness validation is enforced by validatePuzzle/countSolutions and duplicate givens checks.");

  console.log("\nCurrent target clues and rating bases");
  for (const difficulty of DIFFICULTIES) {
    console.log(`- ${difficulty}: target clues ${DEFAULT_TARGET_CLUES[difficulty]}, rating base ${DEFAULT_RATING_BASE[difficulty]}`);
  }

  printDistribution("Active puzzle distribution", puzzles);
  printDistribution("Generated puzzle distribution", generated);

  console.log("\nCalibration finding");
  console.log("- Hard is separated from Medium mostly by fewer givens and a higher rating_score band.");
  console.log("- Because rating_score is assigned from the label/base instead of measured solve complexity, some Hard puzzles can be easier than expected.");
  console.log("- Givens count alone does not guarantee that Hard requires multi-step logic.");

  console.log("\nRecommended next step");
  console.log("- Add a technique-aware rater before regenerating or relabelling a production-sized bank.");
  console.log("- Conservative first milestone: score puzzles by singles-only solve rate, hidden singles, locked candidates, naked/hidden pairs, and controlled backtracking/search depth.");
  console.log("- Then use calibrated thresholds from measured scores rather than changing labels based only on clue count.");
}

main();
