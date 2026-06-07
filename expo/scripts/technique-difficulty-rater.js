const fs = require("fs");
const path = require("path");
const {
  DIFFICULTIES,
  ROOT,
  collectExistingPuzzleKeys,
  normalizeGivens,
  validatePuzzle,
} = require("./puzzle-bank-utils");

const ALL_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DIGIT_MASKS = Object.fromEntries(ALL_DIGITS.map((digit) => [digit, 1 << digit]));
const ALL_MASK = ALL_DIGITS.reduce((mask, digit) => mask | DIGIT_MASKS[digit], 0);

const TECHNIQUE_WEIGHT = {
  none: 0,
  naked_single: 10,
  hidden_single: 20,
  locked_candidate: 35,
  pointing_pair_triple: 38,
  box_line_reduction: 40,
  naked_pair: 52,
  naked_triple: 62,
  hidden_pair: 68,
  hidden_triple: 78,
  x_wing: 95,
  search: 125,
};

const SUGGESTED_DIFFICULTY = [
  { max: 35, label: "Easy" },
  { max: 60, label: "Medium" },
  { max: 95, label: "Hard" },
  { max: 220, label: "Expert" },
  { max: Infinity, label: "Master" },
];

const REPORT_DIR = path.join(ROOT, "generated", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "technique-difficulty-audit.json");

function bitCount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function maskToDigits(mask) {
  return ALL_DIGITS.filter((digit) => (mask & DIGIT_MASKS[digit]) !== 0);
}

function combinations(values, size) {
  const result = [];
  function visit(start, combo) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let index = start; index <= values.length - (size - combo.length); index += 1) {
      combo.push(values[index]);
      visit(index + 1, combo);
      combo.pop();
    }
  }
  visit(0, []);
  return result;
}

const UNITS = [];
const PEERS = Array.from({ length: 81 }, () => new Set());

for (let row = 0; row < 9; row += 1) {
  UNITS.push(Array.from({ length: 9 }, (_, col) => row * 9 + col));
}
for (let col = 0; col < 9; col += 1) {
  UNITS.push(Array.from({ length: 9 }, (_, row) => row * 9 + col));
}
for (let boxRow = 0; boxRow < 3; boxRow += 1) {
  for (let boxCol = 0; boxCol < 3; boxCol += 1) {
    const cells = [];
    for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
      for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
        cells.push(row * 9 + col);
      }
    }
    UNITS.push(cells);
  }
}

for (const unit of UNITS) {
  for (const cell of unit) {
    for (const peer of unit) {
      if (cell !== peer) PEERS[cell].add(peer);
    }
  }
}

function rowOf(index) {
  return Math.floor(index / 9);
}

function colOf(index) {
  return index % 9;
}

function boxOf(index) {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

function boardFromGivens(givens) {
  const normalized = normalizeGivens(givens);
  return Array.from({ length: 81 }, (_, index) => {
    const ch = normalized[index] ?? "0";
    return ch >= "1" && ch <= "9" ? Number(ch) : 0;
  });
}

function solutionBoard(solution) {
  return Array.from(solution, (ch) => Number(ch));
}

function clueCount(givens) {
  return normalizeGivens(givens).split("").filter((ch) => ch >= "1" && ch <= "9").length;
}

function computeCandidates(board) {
  const candidates = Array(81).fill(0);
  for (let index = 0; index < 81; index += 1) {
    if (board[index] !== 0) continue;
    let mask = ALL_MASK;
    for (const peer of PEERS[index]) {
      const value = board[peer];
      if (value !== 0) mask &= ~DIGIT_MASKS[value];
    }
    candidates[index] = mask;
  }
  return candidates;
}

function place(board, candidates, index, digit) {
  board[index] = digit;
  candidates[index] = 0;
  for (const peer of PEERS[index]) {
    if (board[peer] === 0) candidates[peer] &= ~DIGIT_MASKS[digit];
  }
}

function record(stats, technique, amount = 1) {
  stats.moves[technique] = (stats.moves[technique] ?? 0) + amount;
  stats.hardest = TECHNIQUE_WEIGHT[technique] > TECHNIQUE_WEIGHT[stats.hardest] ? technique : stats.hardest;
}

function applyNakedSingle(board, candidates, stats) {
  for (let index = 0; index < 81; index += 1) {
    if (board[index] !== 0) continue;
    if (bitCount(candidates[index]) === 1) {
      place(board, candidates, index, maskToDigits(candidates[index])[0]);
      record(stats, "naked_single");
      return true;
    }
  }
  return false;
}

function applyHiddenSingle(board, candidates, stats) {
  for (const unit of UNITS) {
    for (const digit of ALL_DIGITS) {
      const mask = DIGIT_MASKS[digit];
      const cells = unit.filter((index) => board[index] === 0 && (candidates[index] & mask) !== 0);
      if (cells.length === 1) {
        place(board, candidates, cells[0], digit);
        record(stats, "hidden_single");
        return true;
      }
    }
  }
  return false;
}

function eliminate(candidates, index, mask) {
  const next = candidates[index] & ~mask;
  if (next === candidates[index]) return false;
  candidates[index] = next;
  return true;
}

function applyLockedCandidates(board, candidates, stats) {
  for (let box = 0; box < 9; box += 1) {
    const boxCells = UNITS[18 + box];
    for (const digit of ALL_DIGITS) {
      const mask = DIGIT_MASKS[digit];
      const cells = boxCells.filter((index) => board[index] === 0 && (candidates[index] & mask) !== 0);
      if (cells.length < 2) continue;
      const rows = new Set(cells.map(rowOf));
      const cols = new Set(cells.map(colOf));
      if (rows.size === 1) {
        const row = [...rows][0];
        let changed = false;
        for (let col = 0; col < 9; col += 1) {
          const index = row * 9 + col;
          if (boxOf(index) !== box && board[index] === 0) changed = eliminate(candidates, index, mask) || changed;
        }
        if (changed) {
          record(stats, "pointing_pair_triple");
          return true;
        }
      }
      if (cols.size === 1) {
        const col = [...cols][0];
        let changed = false;
        for (let row = 0; row < 9; row += 1) {
          const index = row * 9 + col;
          if (boxOf(index) !== box && board[index] === 0) changed = eliminate(candidates, index, mask) || changed;
        }
        if (changed) {
          record(stats, "pointing_pair_triple");
          return true;
        }
      }
    }
  }

  for (let unitIndex = 0; unitIndex < 18; unitIndex += 1) {
    const unit = UNITS[unitIndex];
    for (const digit of ALL_DIGITS) {
      const mask = DIGIT_MASKS[digit];
      const cells = unit.filter((index) => board[index] === 0 && (candidates[index] & mask) !== 0);
      if (cells.length < 2) continue;
      const boxes = new Set(cells.map(boxOf));
      if (boxes.size !== 1) continue;
      const box = [...boxes][0];
      let changed = false;
      for (const index of UNITS[18 + box]) {
        if (!unit.includes(index) && board[index] === 0) changed = eliminate(candidates, index, mask) || changed;
      }
      if (changed) {
        record(stats, "box_line_reduction");
        return true;
      }
    }
  }
  return false;
}

function applyNakedSubset(board, candidates, stats, size) {
  const technique = size === 2 ? "naked_pair" : "naked_triple";
  for (const unit of UNITS) {
    const cells = unit.filter((index) => board[index] === 0 && bitCount(candidates[index]) >= 2 && bitCount(candidates[index]) <= size);
    for (const combo of combinations(cells, size)) {
      const union = combo.reduce((mask, index) => mask | candidates[index], 0);
      if (bitCount(union) !== size) continue;
      let changed = false;
      for (const index of unit) {
        if (board[index] !== 0 || combo.includes(index)) continue;
        changed = eliminate(candidates, index, union) || changed;
      }
      if (changed) {
        record(stats, technique);
        return true;
      }
    }
  }
  return false;
}

function applyHiddenSubset(board, candidates, stats, size) {
  const technique = size === 2 ? "hidden_pair" : "hidden_triple";
  for (const unit of UNITS) {
    for (const digits of combinations(ALL_DIGITS, size)) {
      const digitMask = digits.reduce((mask, digit) => mask | DIGIT_MASKS[digit], 0);
      const cells = unit.filter((index) => board[index] === 0 && (candidates[index] & digitMask) !== 0);
      if (cells.length !== size) continue;
      let allDigitsPresent = true;
      for (const digit of digits) {
        const mask = DIGIT_MASKS[digit];
        if (!cells.some((index) => (candidates[index] & mask) !== 0)) allDigitsPresent = false;
      }
      if (!allDigitsPresent) continue;
      let changed = false;
      for (const index of cells) {
        const next = candidates[index] & digitMask;
        if (next !== candidates[index]) {
          candidates[index] = next;
          changed = true;
        }
      }
      if (changed) {
        record(stats, technique);
        return true;
      }
    }
  }
  return false;
}

function applyXWing(board, candidates, stats) {
  for (const digit of ALL_DIGITS) {
    const mask = DIGIT_MASKS[digit];
    const rowPairs = [];
    for (let row = 0; row < 9; row += 1) {
      const cols = [];
      for (let col = 0; col < 9; col += 1) {
        const index = row * 9 + col;
        if (board[index] === 0 && (candidates[index] & mask) !== 0) cols.push(col);
      }
      if (cols.length === 2) rowPairs.push({ row, cols });
    }
    for (const [a, b] of combinations(rowPairs, 2)) {
      if (a.cols[0] !== b.cols[0] || a.cols[1] !== b.cols[1]) continue;
      let changed = false;
      for (const col of a.cols) {
        for (let row = 0; row < 9; row += 1) {
          if (row === a.row || row === b.row) continue;
          const index = row * 9 + col;
          if (board[index] === 0) changed = eliminate(candidates, index, mask) || changed;
        }
      }
      if (changed) {
        record(stats, "x_wing");
        return true;
      }
    }

    const colPairs = [];
    for (let col = 0; col < 9; col += 1) {
      const rows = [];
      for (let row = 0; row < 9; row += 1) {
        const index = row * 9 + col;
        if (board[index] === 0 && (candidates[index] & mask) !== 0) rows.push(row);
      }
      if (rows.length === 2) colPairs.push({ col, rows });
    }
    for (const [a, b] of combinations(colPairs, 2)) {
      if (a.rows[0] !== b.rows[0] || a.rows[1] !== b.rows[1]) continue;
      let changed = false;
      for (const row of a.rows) {
        for (let col = 0; col < 9; col += 1) {
          if (col === a.col || col === b.col) continue;
          const index = row * 9 + col;
          if (board[index] === 0) changed = eliminate(candidates, index, mask) || changed;
        }
      }
      if (changed) {
        record(stats, "x_wing");
        return true;
      }
    }
  }
  return false;
}

function solved(board) {
  return board.every((value) => value !== 0);
}

function searchComplexity(board, solution) {
  let nodes = 0;
  let maxDepth = 0;
  let branchEvents = 0;
  const work = [...board];

  function visit(depth) {
    nodes += 1;
    maxDepth = Math.max(maxDepth, depth);
    const candidates = computeCandidates(work);
    let bestIndex = -1;
    let bestDigits = null;
    for (let index = 0; index < 81; index += 1) {
      if (work[index] !== 0) continue;
      const digits = maskToDigits(candidates[index]);
      if (digits.length === 0) return false;
      if (!bestDigits || digits.length < bestDigits.length) {
        bestIndex = index;
        bestDigits = digits;
      }
    }
    if (bestIndex === -1) return true;
    if (bestDigits.length > 1) branchEvents += 1;
    const ordered = [...bestDigits].sort((a, b) => (a === solution[bestIndex] ? -1 : b === solution[bestIndex] ? 1 : a - b));
    for (const digit of ordered) {
      work[bestIndex] = digit;
      if (visit(depth + 1)) return true;
      work[bestIndex] = 0;
    }
    return false;
  }

  visit(0);
  return { nodes, maxDepth, branchEvents };
}

function scoreFromStats(stats, search) {
  const moveScore = Object.entries(stats.moves).reduce((total, [technique, count]) => {
    return total + (TECHNIQUE_WEIGHT[technique] ?? 0) * count;
  }, 0);
  const advancedMoves = Object.entries(stats.moves)
    .filter(([technique]) => (TECHNIQUE_WEIGHT[technique] ?? 0) >= TECHNIQUE_WEIGHT.locked_candidate)
    .reduce((total, [, count]) => total + count, 0);
  const searchScore = search ? TECHNIQUE_WEIGHT.search + search.maxDepth * 6 + search.branchEvents * 12 : 0;
  return TECHNIQUE_WEIGHT[stats.hardest] + Math.round(moveScore / 18) + advancedMoves * 3 + searchScore;
}

function advancedMoveCount(stats) {
  return Object.entries(stats.moves)
    .filter(([technique]) => (TECHNIQUE_WEIGHT[technique] ?? 0) >= TECHNIQUE_WEIGHT.locked_candidate)
    .reduce((total, [, count]) => total + count, 0);
}

function suggestedDifficulty(score, hardest) {
  if (hardest === "search") {
    if (score >= 220) return "Master";
    return "Expert";
  }
  return SUGGESTED_DIFFICULTY.find((entry) => score <= entry.max).label;
}

function difficultyBand(score) {
  return SUGGESTED_DIFFICULTY.find((entry) => score <= entry.max).label;
}

function isSinglesTechnique(technique) {
  return technique === "naked_single" || technique === "hidden_single";
}

function evaluateTechniqueAcceptance(row, intendedDifficulty) {
  if (!row.valid) {
    return { accepted: false, reason: "invalid puzzle" };
  }

  const searchDepth = row.search?.maxDepth ?? 0;
  const searchBranches = row.search?.branchEvents ?? 0;
  const score = row.technique_score;
  const advancedMoves = row.advanced_move_count ?? 0;
  const hardest = row.hardest_technique;

  if (intendedDifficulty === "Easy") {
    if (score <= 35 && searchDepth === 0 && advancedMoves === 0 && isSinglesTechnique(hardest)) {
      return { accepted: true, reason: "Easy singles-only solve path" };
    }
    return { accepted: false, reason: "Easy requires singles-only score <= 35" };
  }

  if (intendedDifficulty === "Medium") {
    if (score >= 36 && score <= 60 && searchDepth === 0 && advancedMoves <= 1) {
      return { accepted: true, reason: "Medium hidden-single/light candidate solve path" };
    }
    return { accepted: false, reason: "Medium requires score 36-60, no search, at most one advanced move" };
  }

  if (intendedDifficulty === "Hard") {
    if (score >= 61 && score <= 95 && searchDepth === 0 && advancedMoves >= 1) {
      return { accepted: true, reason: "Hard candidate-logic solve path" };
    }
    return { accepted: false, reason: "Hard requires score 61-95 with candidate logic and no search" };
  }

  if (intendedDifficulty === "Expert") {
    const limitedSearch = searchDepth > 0 && searchDepth <= 8 && searchBranches <= 5;
    if (score >= 96 && score <= 220 && (advancedMoves >= 2 || limitedSearch)) {
      return { accepted: true, reason: "Expert advanced-pattern or limited-search solve path" };
    }
    return { accepted: false, reason: "Expert requires score 96-220 with advanced moves or limited search" };
  }

  if (intendedDifficulty === "Master") {
    const deeperSearch = searchDepth >= 9 || searchBranches >= 6;
    if (score > 220 && (advancedMoves >= 3 || deeperSearch)) {
      return { accepted: true, reason: "Master advanced-pattern plus deep branching/search pressure" };
    }
    return { accepted: false, reason: "Master requires score > 220 with deeper advanced/search pressure" };
  }

  return { accepted: false, reason: `Unknown intended difficulty ${intendedDifficulty}` };
}

function ratePuzzle(puzzle) {
  const issues = validatePuzzle(puzzle);
  if (issues.length > 0) {
    return {
      valid: false,
      puzzle_id: puzzle.puzzle_id,
      current_difficulty: puzzle.difficulty,
      issues,
    };
  }

  const board = boardFromGivens(puzzle.givens);
  const solution = solutionBoard(puzzle.solution);
  const stats = { hardest: "none", moves: {} };
  const candidates = computeCandidates(board);
  let guard = 0;
  let search = null;

  while (!solved(board) && guard < 300) {
    guard += 1;
    const progress =
      applyNakedSingle(board, candidates, stats) ||
      applyHiddenSingle(board, candidates, stats) ||
      applyLockedCandidates(board, candidates, stats) ||
      applyNakedSubset(board, candidates, stats, 2) ||
      applyNakedSubset(board, candidates, stats, 3) ||
      applyHiddenSubset(board, candidates, stats, 2) ||
      applyHiddenSubset(board, candidates, stats, 3) ||
      applyXWing(board, candidates, stats);
    if (!progress) {
      search = searchComplexity(board, solution);
      stats.hardest = "search";
      break;
    }
  }

  const techniqueScore = scoreFromStats(stats, search);
  const suggested = suggestedDifficulty(techniqueScore, stats.hardest);
  return {
    valid: true,
    puzzle_id: puzzle.puzzle_id,
    source: puzzle.source_name ?? puzzle.source ?? "unknown",
    current_difficulty: puzzle.difficulty,
    givens_count: clueCount(puzzle.givens),
    rating_score: puzzle.rating_score ?? null,
    technique_score: techniqueScore,
    hardest_technique: stats.hardest,
    advanced_move_count: advancedMoveCount(stats),
    solve_path_length: Object.values(stats.moves).reduce((total, count) => total + count, 0),
    moves: stats.moves,
    search,
    suggested_difficulty: suggested,
    mismatch: puzzle.difficulty !== suggested,
  };
}

module.exports = {
  TECHNIQUE_WEIGHT,
  REPORT_PATH,
  evaluateTechniqueAcceptance,
  difficultyBand,
  ratePuzzle,
};
