const fs = require("fs");
const path = require("path");
const {
  MIGRATIONS_DIR,
  collectExistingPuzzleKeys,
  ensureDir,
  findDuplicateIssues,
  parseArgs,
  puzzlesToInsertSql,
  readJsonPuzzleFile,
  validatePuzzle,
} = require("./puzzle-bank-utils");

function nextMigrationPath(name) {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  return path.join(MIGRATIONS_DIR, `${stamp}_${name}.sql`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input || args.in;
  if (!input) {
    console.error("Usage: npm run export:puzzles-sql -- --input generated/puzzle-bank/generated-puzzles-YYYYMMDD.json");
    process.exitCode = 1;
    return;
  }

  const inputPath = path.resolve(input);
  const outPath = path.resolve(args.out ?? nextMigrationPath("append_generated_puzzle_bank"));
  const puzzles = readJsonPuzzleFile(inputPath);
  const existing = collectExistingPuzzleKeys({ includeGenerated: false });
  const failures = [];

  for (const puzzle of puzzles) {
    for (const issue of validatePuzzle(puzzle)) failures.push({ puzzle, issue });
    if (existing.ids.has(puzzle.puzzle_id)) {
      failures.push({
        puzzle,
        issue: {
          type: "existing puzzle_id",
          detail: "Export is append-only; choose a new puzzle_id instead of overwriting an existing row.",
        },
      });
    }
    if (existing.boards.has(puzzle.givens.replace(/\./g, "0"))) {
      failures.push({
        puzzle,
        issue: {
          type: "duplicate puzzle",
          detail: "Export would insert a givens board that already exists.",
        },
      });
    }
  }
  failures.push(...findDuplicateIssues(puzzles));

  if (failures.length > 0) {
    console.error(`Cannot export invalid or duplicate puzzles: ${failures.length}`);
    for (const { puzzle, issue } of failures) {
      console.error(`${puzzle.puzzle_id}: ${issue.type} - ${issue.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  ensureDir(path.dirname(outPath));
  fs.writeFileSync(
    outPath,
    puzzlesToInsertSql(puzzles, `Append generated puzzle bank from ${path.basename(inputPath)}.`)
  );
  console.log(`Exported ${puzzles.length} puzzles to ${path.relative(process.cwd(), outPath)}`);
}

main();
