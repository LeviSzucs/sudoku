const {
  extractSqlSeedPuzzles,
  extractFallbackPuzzles,
  extractGeneratedPuzzles,
  findDuplicateIssues,
  runRegressionFixture,
  validatePuzzle,
} = require("./puzzle-bank-utils");

function main() {
  runRegressionFixture();

  const { rawCount, puzzles: sqlPuzzles } = extractSqlSeedPuzzles();
  const fallbackPuzzles = extractFallbackPuzzles();
  const generatedPuzzles = extractGeneratedPuzzles();
  const allPuzzles = [...sqlPuzzles, ...fallbackPuzzles, ...generatedPuzzles].filter((puzzle) => puzzle.active !== false);
  const failures = [];

  for (const puzzle of allPuzzles) {
    for (const issue of validatePuzzle(puzzle)) failures.push({ puzzle, issue });
  }
  failures.push(...findDuplicateIssues(allPuzzles));

  console.log(`Scanned ${rawCount} SQL puzzle rows across migrations.`);
  console.log(`Validated ${sqlPuzzles.length} current SQL puzzles, ${fallbackPuzzles.length} fallback puzzles, and ${generatedPuzzles.length} generated puzzle candidates.`);
  console.log("Regression fixture: multiple-solution rectangle correctly failed validation.");

  if (failures.length > 0) {
    console.error(`\nInvalid puzzles found: ${failures.length}`);
    for (const { puzzle, issue } of failures) {
      console.error(`\n${puzzle.puzzle_id || "(missing id)"} [${puzzle.difficulty || "unknown"}]`);
      console.error(`  source: ${puzzle.source}`);
      console.error(`  issue: ${issue.type}`);
      console.error(`  detail: ${issue.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("All active and generated puzzles are valid and uniquely solvable.");
}

main();
