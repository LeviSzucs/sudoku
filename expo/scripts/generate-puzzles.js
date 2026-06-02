const fs = require("fs");
const path = require("path");
const {
  DIFFICULTIES,
  GENERATED_DIR,
  collectExistingPuzzleKeys,
  ensureDir,
  findDuplicateIssues,
  generatePuzzleBatch,
  parseArgs,
  parseCountArgs,
  validatePuzzle,
} = require("./puzzle-bank-utils");

function summarize(puzzles) {
  return DIFFICULTIES
    .map((difficulty) => `${difficulty}: ${puzzles.filter((puzzle) => puzzle.difficulty === difficulty).length}`)
    .join(", ");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const batch = args.batch ?? new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = path.resolve(args.out ?? path.join(GENERATED_DIR, `generated-puzzles-${batch}.json`));
  const countPerDifficulty = parseCountArgs(args);

  console.log(`Generating puzzles for batch ${batch}: ${summarize(Object.entries(countPerDifficulty).flatMap(([difficulty, count]) => Array.from({ length: count }, () => ({ difficulty }))))}`);
  const existing = collectExistingPuzzleKeys();
  const puzzles = generatePuzzleBatch({
    batch,
    countPerDifficulty,
    seed: args.seed ?? `${batch}-sudoku-bank`,
    existing,
  });

  const failures = [];
  for (const puzzle of puzzles) {
    for (const issue of validatePuzzle(puzzle)) failures.push({ puzzle, issue });
  }
  failures.push(...findDuplicateIssues([...existing.puzzles, ...puzzles]));
  if (failures.length > 0) {
    console.error(`Generated invalid puzzles: ${failures.length}`);
    for (const { puzzle, issue } of failures) {
      console.error(`${puzzle.puzzle_id}: ${issue.type} - ${issue.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  ensureDir(path.dirname(outPath));
  fs.writeFileSync(
    outPath,
    `${JSON.stringify({ batch, generated_at: new Date().toISOString(), puzzles }, null, 2)}\n`
  );

  console.log(`Generated ${puzzles.length} unique puzzles: ${summarize(puzzles)}`);
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
}

main();
