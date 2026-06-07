const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const SUDOKU_PATH = path.join(ROOT, "lib", "sudoku.ts");
const GENERATED_DIR = path.join(ROOT, "generated", "puzzle-bank");

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert", "Master"];
const VALID_DIFFICULTIES = new Set(DIFFICULTIES);
const COMPLETE_SET = "123456789";
const DEFAULT_TARGET_CLUES = {
  Easy: 40,
  Medium: 34,
  Hard: 30,
  Expert: 27,
  Master: 24,
};
const DEFAULT_RATING_BASE = {
  Easy: 1000,
  Medium: 2000,
  Hard: 3000,
  Expert: 4000,
  Master: 5000,
};

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

  for (let index = 0; index < 81; index += 1) {
    const given = givens[index];
    if (given !== "0" && given !== "." && given !== solution[index]) {
      const row = Math.floor(index / 9) + 1;
      const col = (index % 9) + 1;
      issues.push({ type: "givens do not match solution", detail: `Given at row ${row}, col ${col} (${given}) does not match solution (${solution[index]}).` });
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
      rating_score: Number(sql.slice(match.index).match(/,\s*(\d+)\s*,\s*'[^']+'\s*(?:,\s*(?:true|false))?\s*\)/)?.[1] ?? 1000),
      source_name: match[5],
      active: match[6] ? match[6].toLowerCase() === "true" : !/is_active\s*=\s*false/i.test(sql.slice(match.index, match.index + 500)),
    });
  }

  return puzzles;
}

function extractSqlSeedPuzzles() {
  const files = fs.existsSync(MIGRATIONS_DIR)
    ? fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql")).sort()
    : [];
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
  if (!fs.existsSync(SUDOKU_PATH)) return [];
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
      rating_score: 1000,
      source_name: "fallback",
      active: true,
    });
  }

  return puzzles;
}

function readJsonPuzzleFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const rows = Array.isArray(raw) ? raw : raw.puzzles;
  if (!Array.isArray(rows)) throw new Error(`${filePath} must contain an array or { puzzles: [] }.`);
  return rows.map((row) => ({
    source: path.relative(ROOT, filePath).replace(/\\/g, "/"),
    puzzle_id: row.puzzle_id,
    difficulty: row.difficulty,
    givens: row.givens,
    solution: row.solution,
    rating_score: row.rating_score ?? 1000,
    source_name: row.source ?? "generated",
    active: row.is_active !== false,
  }));
}

function extractGeneratedPuzzles() {
  if (!fs.existsSync(GENERATED_DIR)) return [];
  return fs.readdirSync(GENERATED_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap((file) => readJsonPuzzleFile(path.join(GENERATED_DIR, file)));
}

function findDuplicateIssues(puzzles) {
  const issues = [];
  const ids = new Map();
  const boards = new Map();

  for (const puzzle of puzzles) {
    const existingIdPuzzle = ids.get(puzzle.puzzle_id);
    if (existingIdPuzzle) {
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

function collectExistingPuzzleKeys(options = {}) {
  const { puzzles: sqlPuzzles } = extractSqlSeedPuzzles();
  const fallbackPuzzles = extractFallbackPuzzles();
  const generatedPuzzles = options.includeGenerated === false ? [] : extractGeneratedPuzzles();
  const all = [...sqlPuzzles, ...fallbackPuzzles, ...generatedPuzzles].filter((puzzle) => puzzle.active !== false);
  return {
    ids: new Set(all.map((puzzle) => puzzle.puzzle_id)),
    boards: new Set(all.map((puzzle) => normalizeGivens(puzzle.givens))),
    puzzles: all,
  };
}

function createSeededRandom(seedText) {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return function random() {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function solutionPattern(row, col) {
  return (row * 3 + Math.floor(row / 3) + col) % 9;
}

function generateSolution(random) {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const bands = shuffle([0, 1, 2], random);
  const stacks = shuffle([0, 1, 2], random);
  const rows = bands.flatMap((band) => shuffle([0, 1, 2], random).map((row) => band * 3 + row));
  const cols = stacks.flatMap((stack) => shuffle([0, 1, 2], random).map((col) => stack * 3 + col));
  let solution = "";
  for (const row of rows) {
    for (const col of cols) solution += digits[solutionPattern(row, col)];
  }
  return solution;
}

function generateUniquePuzzleForDifficulty(difficulty, options) {
  const targetClues = options.targetClues[difficulty];
  const random = options.random;
  for (let attempt = 0; attempt < options.maxAttemptsPerPuzzle; attempt += 1) {
    const solution = generateSolution(random);
    const givens = solution.split("");
    let clues = 81;
    let progress = true;
    const removalOrder = shuffle([...Array(81).keys()], random);

    while (clues > targetClues && progress) {
      progress = false;
      for (const index of removalOrder) {
        if (clues <= targetClues) break;
        if (givens[index] === "0") continue;
        const oldValue = givens[index];
        givens[index] = "0";
        if (countSolutions(givens.join(""), 2) === 1) {
          clues -= 1;
          progress = true;
        } else {
          givens[index] = oldValue;
        }
      }
    }

    if (clues <= targetClues) {
      const puzzle = { difficulty, givens: givens.join(""), solution, clues };
      if (validatePuzzle({ puzzle_id: "candidate", ...puzzle }).length === 0) return puzzle;
    }
  }
  throw new Error(`Could not generate a unique ${difficulty} puzzle after ${options.maxAttemptsPerPuzzle} attempts.`);
}

function padNumber(value, width) {
  return String(value).padStart(width, "0");
}

function nextPuzzleNumber(existingIds, prefix) {
  let max = 0;
  const pattern = new RegExp(`^${prefix}_(\\d+)$`);
  for (const id of existingIds) {
    const match = id.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function generatePuzzleBatch(config = {}) {
  const batch = config.batch ?? new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const countPerDifficulty = config.countPerDifficulty ?? Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, 50]));
  const targetClues = { ...DEFAULT_TARGET_CLUES, ...(config.targetClues ?? {}) };
  const random = createSeededRandom(config.seed ?? `${batch}-sudoku-bank`);
  const existing = config.existing ?? collectExistingPuzzleKeys();
  const ids = new Set(existing.ids);
  const boards = new Set(existing.boards);
  const puzzles = [];
  const nextNumbers = Object.fromEntries(
    DIFFICULTIES.map((difficulty) => {
      const prefix = `bank_${difficulty.toLowerCase()}_${batch}`;
      return [difficulty, nextPuzzleNumber(ids, prefix)];
    })
  );

  for (const difficulty of DIFFICULTIES) {
    const count = countPerDifficulty[difficulty] ?? 0;
    for (let index = 0; index < count; index += 1) {
      let candidate;
      do {
        candidate = generateUniquePuzzleForDifficulty(difficulty, {
          random,
          targetClues,
          maxAttemptsPerPuzzle: config.maxAttemptsPerPuzzle ?? 500,
        });
      } while (boards.has(normalizeGivens(candidate.givens)));

      const prefix = `bank_${difficulty.toLowerCase()}_${batch}`;
      const puzzleId = `${prefix}_${padNumber(nextNumbers[difficulty], 4)}`;
      nextNumbers[difficulty] += 1;
      const puzzle = {
        puzzle_id: puzzleId,
        difficulty,
        givens: candidate.givens,
        solution: candidate.solution,
        rating_score: (DEFAULT_RATING_BASE[difficulty] ?? 1000) + nextNumbers[difficulty],
        source: `generated_${batch}`,
        is_active: true,
      };
      ids.add(puzzleId);
      boards.add(normalizeGivens(puzzle.givens));
      puzzles.push(puzzle);
    }
  }

  return puzzles;
}

function sqlString(value) {
  return String(value).replace(/'/g, "''");
}

function puzzlesToInsertSql(puzzles, comment = "Append-only generated puzzle bank.") {
  const rows = puzzles.map((puzzle) =>
    `  ('${sqlString(puzzle.puzzle_id)}','${sqlString(puzzle.difficulty)}','${sqlString(puzzle.givens)}','${sqlString(puzzle.solution)}',${Number(puzzle.rating_score ?? 1000)},'${sqlString(puzzle.source ?? "generated")}',true)`
  );
  return [
    `-- ${comment}`,
    "-- Puzzle IDs are immutable; deactivate bad rows instead of editing existing givens/solutions.",
    "insert into public.puzzles (puzzle_id, difficulty, givens, solution, rating_score, source, is_active)",
    "values",
    `${rows.join(",\n")}`,
    "on conflict (puzzle_id) do nothing;",
    "",
  ].join("\n");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function parseCountArgs(args) {
  const defaultCount = Number(args.count ?? 50);
  return Object.fromEntries(
    DIFFICULTIES.map((difficulty) => [difficulty, Number(args[difficulty.toLowerCase()] ?? defaultCount)])
  );
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

module.exports = {
  ROOT,
  MIGRATIONS_DIR,
  GENERATED_DIR,
  DIFFICULTIES,
  DEFAULT_TARGET_CLUES,
  DEFAULT_RATING_BASE,
  countSolutions,
  validatePuzzle,
  normalizeGivens,
  extractSqlSeedPuzzles,
  extractFallbackPuzzles,
  extractGeneratedPuzzles,
  readJsonPuzzleFile,
  findDuplicateIssues,
  collectExistingPuzzleKeys,
  createSeededRandom,
  generateUniquePuzzleForDifficulty,
  generatePuzzleBatch,
  puzzlesToInsertSql,
  ensureDir,
  parseArgs,
  parseCountArgs,
  runRegressionFixture,
};
