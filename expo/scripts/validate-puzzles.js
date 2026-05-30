const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIGRATION_PATH = path.join(ROOT, "supabase", "migrations", "202605290001_backend_setup.sql");
const SUDOKU_PATH = path.join(ROOT, "lib", "sudoku.ts");
const VALID_DIFFICULTIES = new Set(["Easy", "Medium", "Hard", "Expert", "Master"]);
const COMPLETE_SET = "123456789";

function sortedDigits(value) {
  return value.split("").sort().join("");
}

function validatePuzzle(puzzle) {
  const errors = [];
  const { source, puzzle_id, difficulty, givens, solution } = puzzle;
  const label = `${source}:${puzzle_id}`;

  if (!puzzle_id) errors.push("Missing puzzle_id.");
  if (!VALID_DIFFICULTIES.has(difficulty)) errors.push(`Invalid difficulty "${difficulty}".`);
  if (givens.length !== 81) errors.push(`Givens must be exactly 81 characters, got ${givens.length}.`);
  if (solution.length !== 81) errors.push(`Solution must be exactly 81 characters, got ${solution.length}.`);
  if (!/^[1-9]{81}$/.test(solution)) errors.push("Solution must contain only digits 1-9.");
  if (!/^[0-9.]{81}$/.test(givens)) errors.push("Givens must contain only digits 0-9 or blanks represented as dots.");

  if (givens.length === 81 && solution.length === 81 && /^[0-9.]{81}$/.test(givens) && /^[1-9]{81}$/.test(solution)) {
    for (let i = 0; i < 81; i += 1) {
      const given = givens[i];
      if (given !== "0" && given !== "." && given !== solution[i]) {
        const row = Math.floor(i / 9) + 1;
        const col = (i % 9) + 1;
        errors.push(`Given at row ${row}, col ${col} (${given}) does not match solution (${solution[i]}).`);
      }
    }

    for (let row = 0; row < 9; row += 1) {
      const values = solution.slice(row * 9, row * 9 + 9);
      if (sortedDigits(values) !== COMPLETE_SET) errors.push(`Solution row ${row + 1} must contain digits 1-9 exactly once.`);
    }

    for (let col = 0; col < 9; col += 1) {
      let values = "";
      for (let row = 0; row < 9; row += 1) values += solution[row * 9 + col];
      if (sortedDigits(values) !== COMPLETE_SET) errors.push(`Solution column ${col + 1} must contain digits 1-9 exactly once.`);
    }

    for (let box = 0; box < 9; box += 1) {
      let values = "";
      const startRow = Math.floor(box / 3) * 3;
      const startCol = (box % 3) * 3;
      for (let row = startRow; row < startRow + 3; row += 1) {
        for (let col = startCol; col < startCol + 3; col += 1) {
          values += solution[row * 9 + col];
        }
      }
      if (sortedDigits(values) !== COMPLETE_SET) errors.push(`Solution box ${box + 1} must contain digits 1-9 exactly once.`);
    }
  }

  return { label, errors };
}

function extractSqlSeedPuzzles() {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  const puzzles = [];
  const tuplePattern = /\('([^']+)','([^']+)','([^']*)','([^']*)',\s*\d+\s*,'([^']+)'\)/g;
  let match;

  while ((match = tuplePattern.exec(sql)) !== null) {
    puzzles.push({
      source: "sql-seed",
      puzzle_id: match[1],
      difficulty: match[2],
      givens: match[3],
      solution: match[4],
    });
  }

  return puzzles;
}

function extractJoinedString(expression) {
  const parts = [];
  const quotedPattern = /"([^"]*)"/g;
  let match;
  while ((match = quotedPattern.exec(expression)) !== null) parts.push(match[1]);
  return parts.join("");
}

function extractFallbackPuzzles() {
  const source = fs.readFileSync(SUDOKU_PATH, "utf8");
  const blockMatch = source.match(/const FALLBACK_PUZZLES:[\s\S]*?\n};/);
  if (!blockMatch) throw new Error("Could not find FALLBACK_PUZZLES block in lib/sudoku.ts.");

  const puzzles = [];
  const entryPattern = /\b(Easy|Medium|Hard|Expert|Master):\s*\{([\s\S]*?)\n  \},/g;
  let match;

  while ((match = entryPattern.exec(blockMatch[0])) !== null) {
    const fallbackKey = match[1];
    const body = match[2];
    const id = body.match(/puzzle_id:\s*"([^"]+)"/)?.[1] ?? "";
    const difficulty = body.match(/difficulty:\s*"([^"]+)"/)?.[1] ?? fallbackKey;
    const givensExpression = body.match(/givens:\s*parse\(([\s\S]*?)\),\s*solution:/)?.[1] ?? "";
    const solutionExpression = body.match(/solution:\s*parse\(([\s\S]*?)\),\s*$/)?.[1] ?? "";

    puzzles.push({
      source: "fallback",
      puzzle_id: id,
      difficulty,
      givens: extractJoinedString(givensExpression),
      solution: extractJoinedString(solutionExpression),
    });
  }

  return puzzles;
}

function main() {
  const sqlPuzzles = extractSqlSeedPuzzles();
  const fallbackPuzzles = extractFallbackPuzzles();
  const allPuzzles = [...sqlPuzzles, ...fallbackPuzzles];
  const failures = allPuzzles
    .map(validatePuzzle)
    .filter((result) => result.errors.length > 0);

  console.log(`Validated ${sqlPuzzles.length} SQL seed puzzles and ${fallbackPuzzles.length} fallback puzzles.`);

  if (failures.length > 0) {
    console.error(`\nInvalid puzzles found: ${failures.length}`);
    console.error(failures.map((failure) => failure.label).join(", "));
    for (const failure of failures) {
      console.error(`\n${failure.label}`);
      for (const error of failure.errors) console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("All puzzles passed validation.");
}

main();
