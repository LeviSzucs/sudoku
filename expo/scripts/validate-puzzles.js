const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const SUDOKU_PATH = path.join(ROOT, "lib", "sudoku.ts");
const VALID_DIFFICULTIES = new Set(["Easy", "Medium", "Hard", "Expert", "Master"]);
const COMPLETE_SET = "123456789";

function sortedDigits(value) {
  return value.split("").sort().join("");
}

function normalizeGivens(value) {
  return value.replace(/\./g, "0");
}

function parseBoard(givens) {
  return Array.from({ length: 81 }, (_, index) => {
    const ch = givens[index] ?? "0";
    return ch >= "1" && ch <= "9" ? Number(ch) : 0;
  });
}

function candidatesFor(board, index) {
  if (board[index] !== 0) return [];
  const used = new Set();
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let c = 0; c < 9; c += 1) used.add(board[row * 9 + c]);
  for (let r = 0; r < 9; r += 1) used.add(board[r * 9 + col]);
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) used.add(board[r * 9 + c]);
  }

  const result = [];
  for (let digit = 1; digit <= 9; digit += 1) {
    if (!used.has(digit)) result.push(digit);
  }
  return result;
}

function hasDuplicateUnitValues(board) {
  const hasDupes = (values) => {
    const seen = new Set();
    for (const value of values) {
      if (value === 0) continue;
      if (seen.has(value)) return true;
      seen.add(value);
    }
    return false;
  };

  for (let row = 0; row < 9; row += 1) {
    if (hasDupes(board.slice(row * 9, row * 9 + 9))) return true;
  }
  for (let col = 0; col < 9; col += 1) {
    const values = [];
    for (let row = 0; row < 9; row += 1) values.push(board[row * 9 + col]);
    if (hasDupes(values)) return true;
  }
  for (let box = 0; box < 9; box += 1) {
    const values = [];
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    for (let row = startRow; row < startRow + 3; row += 1) {
      for (let col = startCol; col < startCol + 3; col += 1) values.push(board[row * 9 + col]);
    }
    if (hasDupes(values)) return true;
  }
  return false;
}

function countSolutions(givens, limit = 2) {
  const board = parseBoard(givens);
  if (hasDuplicateUnitValues(board)) return 0;
  let count = 0;

  function search() {
    if (count >= limit) return;
    let bestIndex = -1;
    let bestCandidates = null;

    for (let index = 0; index < 81; index += 1) {
      if (board[index] !== 0) continue;
      const candidates = candidatesFor(board, index);
      if (candidates.length === 0) return;
      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        bestIndex = index;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }

    if (bestIndex === -1) {
      count += 1;
      return;
    }

    for (const candidate of bestCandidates) {
      board[bestIndex] = candidate;
      search();
      board[bestIndex] = 0;
      if (count >= limit) return;
    }
  }

  search();
  return count;
}

function validatePuzzle(puzzle) {
  const issues = [];
  const { puzzle_id, difficulty, givens, solution } = puzzle;

  if (!puzzle_id) issues.push({ type: "malformed board", detail: "Missing puzzle_id." });
  if (!VALID_DIFFICULTIES.has(difficulty)) issues.push({ type: "invalid difficulty", detail: `Invalid difficulty "${difficulty}".` });
  if (givens.length !== 81) issues.push({ type: "malformed board", detail: `Givens must be exactly 81 characters, got ${givens.length}.` });
  if (solution.length !== 81) issues.push({ type: "malformed board", detail: `Solution must be exactly 81 characters, got ${solution.length}.` });
  if (!/^[1-9]{81}$/.test(solution)) issues.push({ type: "invalid solution", detail: "Solution must contain only digits 1-9." });
  if (!/^[0-9.]{81}$/.test(givens)) issues.push({ type: "invalid givens", detail: "Givens must contain only digits 0-9 or blanks represented as dots." });

  if (issues.length > 0) return issues;

  for (let i = 0; i < 81; i += 1) {
    const given = givens[i];
    if (given !== "0" && given !== "." && given !== solution[i]) {
      const row = Math.floor(i / 9) + 1;
      const col = (i % 9) + 1;
      issues.push({ type: "givens do not match solution", detail: `Given at row ${row}, col ${col} (${given}) does not match solution (${solution[i]}).` });
    }
  }

  for (let row = 0; row < 9; row += 1) {
    const values = solution.slice(row * 9, row * 9 + 9);
    if (sortedDigits(values) !== COMPLETE_SET) issues.push({ type: "invalid solution", detail: `Solution row ${row + 1} must contain digits 1-9 exactly once.` });
  }

  for (let col = 0; col < 9; col += 1) {
    let values = "";
    for (let row = 0; row < 9; row += 1) values += solution[row * 9 + col];
    if (sortedDigits(values) !== COMPLETE_SET) issues.push({ type: "invalid solution", detail: `Solution column ${col + 1} must contain digits 1-9 exactly once.` });
  }

  for (let box = 0; box < 9; box += 1) {
    let values = "";
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    for (let row = startRow; row < startRow + 3; row += 1) {
      for (let col = startCol; col < startCol + 3; col += 1) values += solution[row * 9 + col];
    }
    if (sortedDigits(values) !== COMPLETE_SET) issues.push({ type: "invalid solution", detail: `Solution box ${box + 1} must contain digits 1-9 exactly once.` });
  }

  if (issues.length === 0) {
    const solutionCount = countSolutions(givens, 2);
    if (solutionCount === 0) issues.push({ type: "zero solutions", detail: "Puzzle has no valid solution." });
    if (solutionCount > 1) issues.push({ type: "multiple solutions", detail: "Puzzle has more than one valid solution." });
  }

  return issues;
}

function extractSqlPuzzlesFromFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const puzzles = [];
  const tuplePattern = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*\d+\s*,\s*'([^']+)'\s*(?:,\s*(true|false))?\s*\)/g;
  let match;

  while ((match = tuplePattern.exec(sql)) !== null) {
    puzzles.push({
      source: path.relative(ROOT, filePath).replace(/\\/g, "/"),
      puzzle_id: match[1],
      difficulty: match[2],
      givens: match[3],
      solution: match[4],
      active: match[6] ? match[6].toLowerCase() === "true" : !/is_active\s*=\s*false/i.test(sql.slice(match.index, match.index + 500)),
    });
  }

  return puzzles;
}

function extractSqlSeedPuzzles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const byId = new Map();
  let rawCount = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const rows = extractSqlPuzzlesFromFile(filePath);
    rawCount += rows.length;
    for (const row of rows) byId.set(row.puzzle_id, row);
  }

  return { rawCount, puzzles: Array.from(byId.values()) };
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
      source: "lib/sudoku.ts fallback",
      puzzle_id: id,
      difficulty,
      givens: extractJoinedString(givensExpression),
      solution: extractJoinedString(solutionExpression),
      active: true,
    });
  }

  return puzzles;
}

function findDuplicateIssues(puzzles) {
  const issues = [];
  const ids = new Map();
  const boards = new Map();

  for (const puzzle of puzzles) {
    const existingIdPuzzle = ids.get(puzzle.puzzle_id);
    if (ids.has(puzzle.puzzle_id)) {
      const samePuzzle =
        existingIdPuzzle.difficulty === puzzle.difficulty &&
        normalizeGivens(existingIdPuzzle.givens) === normalizeGivens(puzzle.givens) &&
        existingIdPuzzle.solution === puzzle.solution;
      if (!samePuzzle) {
        issues.push({
          puzzle,
          issue: {
            type: "duplicate puzzle_id",
            detail: `Duplicate puzzle_id also appears in ${existingIdPuzzle.source} with different puzzle data.`,
          },
        });
      }
    } else {
      ids.set(puzzle.puzzle_id, puzzle);
    }

    const boardKey = normalizeGivens(puzzle.givens);
    const existingBoardPuzzle = boards.get(boardKey);
    if (existingBoardPuzzle && existingBoardPuzzle.puzzle_id !== puzzle.puzzle_id) {
      issues.push({
        puzzle,
        issue: {
          type: "duplicate puzzle",
          detail: `Same givens board as ${existingBoardPuzzle.puzzle_id} (${existingBoardPuzzle.source}).`,
        },
      });
    } else if (!existingBoardPuzzle) {
      boards.set(boardKey, puzzle);
    }
  }

  return issues;
}

function runRegressionFixture() {
  const solution = "129534867384267915756189432862413759573928146941675283295341678618752394437896521";
  const givens = solution.split("");
  for (const index of [0, 2, 45, 47]) givens[index] = "0";
  const issues = validatePuzzle({
    source: "regression fixture",
    puzzle_id: "two_solution_rectangle_fixture",
    difficulty: "Hard",
    givens: givens.join(""),
    solution,
  });
  if (!issues.some((issue) => issue.type === "multiple solutions")) {
    throw new Error("Regression fixture should fail with multiple solutions.");
  }
}

function main() {
  runRegressionFixture();

  const { rawCount, puzzles: sqlPuzzles } = extractSqlSeedPuzzles();
  const fallbackPuzzles = extractFallbackPuzzles();
  const allPuzzles = [...sqlPuzzles, ...fallbackPuzzles].filter((puzzle) => puzzle.active !== false);
  const failures = [];

  for (const puzzle of allPuzzles) {
    for (const issue of validatePuzzle(puzzle)) failures.push({ puzzle, issue });
  }
  failures.push(...findDuplicateIssues(allPuzzles));

  console.log(`Scanned ${rawCount} SQL puzzle rows across migrations.`);
  console.log(`Validated ${sqlPuzzles.length} current SQL puzzles and ${fallbackPuzzles.length} fallback puzzles.`);
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

  console.log("All active puzzles are valid and uniquely solvable.");
}

main();

module.exports = { countSolutions, validatePuzzle };
