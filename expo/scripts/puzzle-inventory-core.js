const fs = require("fs");
const path = require("path");

const {
  DIFFICULTIES,
  extractSqlSeedPuzzles,
  normalizeGivens,
  puzzleFingerprint,
  solutionFingerprint,
  validatePuzzle,
} = require("./puzzle-bank-utils");

const PREFERRED_SOURCE = "technique_calibrated_20260613";
const INVENTORY_TARGETS = {
  Easy: 200,
  Medium: 300,
  Hard: 300,
  Expert: 200,
  Master: 150,
};

function clueCount(givens) {
  return Array.from(normalizeGivens(givens)).filter((value) => value >= "1" && value <= "9").length;
}

function loadCanonicalInventory() {
  const { rawCount, puzzles } = extractSqlSeedPuzzles();
  return {
    source: "supabase/migrations (replayed locally in filename order)",
    rawCount,
    puzzles,
  };
}

function loadBatch(batchPath) {
  const resolvedPath = path.resolve(batchPath);
  if (!fs.existsSync(resolvedPath)) throw new Error(`Batch file not found: ${resolvedPath}`);
  if (path.extname(resolvedPath).toLowerCase() !== ".json") {
    throw new Error("Puzzle batches must use the repository's existing JSON format.");
  }
  const raw = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  const rows = Array.isArray(raw) ? raw : raw.puzzles;
  if (!Array.isArray(rows)) throw new Error(`${resolvedPath} must contain an array or { puzzles: [] }.`);
  return rows.map((row) => ({
    source: resolvedPath,
    puzzle_id: row.puzzle_id,
    difficulty: row.difficulty,
    givens: row.givens,
    solution: row.solution,
    rating_score: row.rating_score,
    source_name: row.source,
    active: row.is_active,
  }));
}

function validateInventoryRecord(puzzle, options = {}) {
  const issues = [];
  if (!puzzle || typeof puzzle !== "object") {
    return [{ severity: "error", type: "malformed record", detail: "Puzzle row must be an object." }];
  }

  if (!String(puzzle.source_name ?? "").trim()) {
    issues.push({ severity: "error", type: "missing source", detail: "source is required." });
  }
  if (options.requireCanonicalGivens && !/^[0-9]{81}$/.test(String(puzzle.givens ?? ""))) {
    issues.push({
      severity: "error",
      type: "invalid givens",
      detail: "Batch givens must be exactly 81 digits and use 0 for blanks.",
    });
  }
  if (options.requireBatchFields && typeof puzzle.active !== "boolean") {
    issues.push({ severity: "error", type: "missing active status", detail: "is_active must be true or false." });
  }
  if (options.requireBatchFields && !Number.isInteger(puzzle.rating_score)) {
    issues.push({ severity: "error", type: "invalid rating", detail: "rating_score must be an integer." });
  }

  for (const issue of validatePuzzle({
    ...puzzle,
    puzzle_id: String(puzzle.puzzle_id ?? ""),
    difficulty: String(puzzle.difficulty ?? ""),
    givens: String(puzzle.givens ?? ""),
    solution: String(puzzle.solution ?? ""),
  })) {
    if (issues.some((existing) => existing.type === issue.type && existing.detail === issue.detail)) continue;
    issues.push({ severity: "error", ...issue });
  }
  return issues;
}

function duplicateGroups(puzzles, keyFor) {
  const groups = new Map();
  puzzles.forEach((puzzle, index) => {
    const key = keyFor(puzzle);
    if (!key) return;
    const group = groups.get(key) ?? [];
    group.push({ puzzle, index });
    groups.set(key, group);
  });
  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([fingerprint, group]) => ({ fingerprint, group }));
}

function findDuplicateGroups(puzzles) {
  return {
    ids: duplicateGroups(puzzles, (puzzle) => String(puzzle.puzzle_id ?? "")),
    givens: duplicateGroups(puzzles, (puzzle) => puzzleFingerprint(puzzle.givens)),
    solutions: duplicateGroups(puzzles, (puzzle) => solutionFingerprint(puzzle.solution)),
  };
}

function countBy(values, keyFor) {
  const counts = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function auditInventory(puzzles) {
  const issues = [];
  for (const puzzle of puzzles) {
    for (const issue of validateInventoryRecord(puzzle)) issues.push({ puzzle, issue });
  }

  const activePuzzles = puzzles.filter((puzzle) => puzzle.active !== false);
  const inactivePuzzles = puzzles.filter((puzzle) => puzzle.active === false);
  const allDuplicates = findDuplicateGroups(puzzles);
  const activeDuplicates = findDuplicateGroups(activePuzzles);
  const clueRanges = {};
  for (const difficulty of DIFFICULTIES) {
    const counts = activePuzzles
      .filter((puzzle) => puzzle.difficulty === difficulty)
      .map((puzzle) => clueCount(puzzle.givens));
    clueRanges[difficulty] = counts.length
      ? { min: Math.min(...counts), max: Math.max(...counts) }
      : null;
  }

  return {
    total: puzzles.length,
    active: activePuzzles.length,
    inactive: inactivePuzzles.length,
    byDifficulty: countBy(puzzles, (puzzle) => puzzle.difficulty || "(missing)"),
    activeByDifficulty: countBy(activePuzzles, (puzzle) => puzzle.difficulty || "(missing)"),
    preferredByDifficulty: countBy(
      activePuzzles.filter((puzzle) => puzzle.source_name === PREFERRED_SOURCE),
      (puzzle) => puzzle.difficulty || "(missing)"
    ),
    bySourceAndStatus: countBy(
      puzzles,
      (puzzle) => `${puzzle.source_name || "(missing)"}|${puzzle.active === false ? "inactive" : "active"}`
    ),
    clueRanges,
    issues,
    allDuplicates,
    activeDuplicates,
  };
}

function validateBatch(batch, canonicalPuzzles = []) {
  const findings = [];
  batch.forEach((puzzle, index) => {
    for (const issue of validateInventoryRecord(puzzle, {
      requireBatchFields: true,
      requireCanonicalGivens: true,
    })) {
      findings.push({ index, puzzle, ...issue });
    }
  });

  const batchDuplicates = findDuplicateGroups(batch);
  addDuplicateFindings(findings, batchDuplicates.ids, "duplicate puzzle_id", "error");
  addDuplicateFindings(findings, batchDuplicates.givens, "duplicate givens", "error");
  addDuplicateFindings(findings, batchDuplicates.solutions, "duplicate solution", "warning");

  const canonicalIds = new Map(canonicalPuzzles.map((puzzle) => [puzzle.puzzle_id, puzzle]));
  const canonicalGivens = new Map(
    canonicalPuzzles.map((puzzle) => [puzzleFingerprint(puzzle.givens), puzzle])
  );
  const canonicalSolutions = new Map(
    canonicalPuzzles.map((puzzle) => [solutionFingerprint(puzzle.solution), puzzle])
  );

  batch.forEach((puzzle, index) => {
    const existingId = canonicalIds.get(puzzle.puzzle_id);
    if (existingId) {
      findings.push({
        index,
        puzzle,
        severity: "error",
        type: "existing puzzle_id",
        detail: `puzzle_id already exists in ${existingId.source_name}.`,
      });
    }
    const existingGivens = canonicalGivens.get(puzzleFingerprint(puzzle.givens));
    if (existingGivens) {
      findings.push({
        index,
        puzzle,
        severity: "error",
        type: "existing givens",
        detail: `givens already exist as ${existingGivens.puzzle_id}.`,
      });
    }
    const existingSolution = canonicalSolutions.get(solutionFingerprint(puzzle.solution));
    if (existingSolution) {
      findings.push({
        index,
        puzzle,
        severity: "warning",
        type: "existing solution",
        detail: `solution is also used by ${existingSolution.puzzle_id}.`,
      });
    }
  });

  return {
    findings,
    errors: findings.filter((finding) => finding.severity === "error"),
    warnings: findings.filter((finding) => finding.severity === "warning"),
  };
}

function addDuplicateFindings(findings, groups, type, severity) {
  for (const { group } of groups) {
    const first = group[0];
    for (const duplicate of group.slice(1)) {
      findings.push({
        index: duplicate.index,
        puzzle: duplicate.puzzle,
        severity,
        type,
        detail: `Duplicates row ${first.index + 1} (${first.puzzle.puzzle_id || "missing id"}).`,
      });
    }
  }
}

module.exports = {
  INVENTORY_TARGETS,
  PREFERRED_SOURCE,
  auditInventory,
  clueCount,
  findDuplicateGroups,
  loadBatch,
  loadCanonicalInventory,
  validateBatch,
  validateInventoryRecord,
};

