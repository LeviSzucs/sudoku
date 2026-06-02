const assert = require("node:assert/strict");

const starting = { Easy: 500, Medium: 800, Hard: 1200, Expert: 1600, Master: 2200 };
const placement = { Easy: 25, Medium: 40, Hard: 60, Expert: 85, Master: 115 };
const completion = { Easy: 600, Medium: 1000, Hard: 1500, Expert: 2200, Master: 3000 };
const target = { Easy: 300, Medium: 540, Hard: 900, Expert: 1440, Master: 2100 };

const solution = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8],
];
const givens = solution.map((row, r) => row.map((value, c) => (r < 7 || (r === 7 && c < 3) ? value : 0)));

function unitSolved(board, cells) {
  return cells.every(([r, c]) => board[r][c] === solution[r][c]);
}

function rowCells(r) { return Array.from({ length: 9 }, (_, c) => [r, c]); }
function colCells(c) { return Array.from({ length: 9 }, (_, r) => [r, c]); }
function boxCells(row, col) {
  const sr = Math.floor(row / 3) * 3;
  const sc = Math.floor(col / 3) * 3;
  const cells = [];
  for (let r = sr; r < sr + 3; r++) for (let c = sc; c < sc + 3; c++) cells.push([r, c]);
  return cells;
}

function countEmpty(board) {
  return board.flat().filter((value) => value < 1 || value > 9).length;
}

function candidates(board, row, column) {
  let count = 0;
  const sr = Math.floor(row / 3) * 3;
  const sc = Math.floor(column / 3) * 3;
  for (let value = 1; value <= 9; value++) {
    let valid = true;
    for (let c = 0; c < 9; c++) if (c !== column && board[row][c] === value) valid = false;
    for (let r = 0; r < 9; r++) if (r !== row && board[r][column] === value) valid = false;
    for (let r = sr; r < sr + 3; r++) for (let c = sc; c < sc + 3; c++) {
      if ((r !== row || c !== column) && board[r][c] === value) valid = false;
    }
    if (valid) count++;
  }
  return Math.max(1, count);
}

function candidateMultiplier(count) {
  if (count <= 1) return 0.75;
  if (count === 2) return 1;
  if (count === 3) return 1.15;
  return 1.3;
}

function progressMultiplier(empty) {
  const pct = empty / 81;
  if (pct >= 0.7) return 1.2;
  if (pct >= 0.4) return 1.1;
  if (pct >= 0.15) return 1;
  return 0.85;
}

function streakMultiplier(streak) {
  if (streak >= 20) return 1.35;
  if (streak >= 10) return 1.22;
  if (streak >= 5) return 1.12;
  if (streak >= 3) return 1.05;
  return 1;
}

function speedMultiplier(difficulty, elapsedSeconds) {
  const t = target[difficulty];
  const elapsed = Math.max(1, elapsedSeconds);
  const raw = elapsed <= t
    ? 1 + ((t - elapsed) / t) * 0.35
    : 1 - Math.min((elapsed - t) / t, 1) * 0.25;
  return Math.max(0.75, Math.min(1.35, raw));
}

function penalize(subtotal, percent) {
  const penalty = Math.round(subtotal * percent);
  return Math.max(0, subtotal - penalty);
}

function score({ difficulty = "Medium", moves, elapsedSeconds, mistakes = 0, hints = 0, undos = 0, completed = true, failed = false }) {
  if (failed || mistakes >= 3) return 0;
  const board = givens.map((row) => [...row]);
  const rows = new Set();
  const cols = new Set();
  const boxes = new Set();
  const scoredCells = new Set();
  let subtotal = starting[difficulty];
  let streak = 0;
  let replayedMistakes = 0;
  let replayedHints = 0;

  for (const move of moves) {
    const { row, column, value, type = "entry", wasCorrect = true } = move;
    if (type === "hint") {
      subtotal = penalize(subtotal, 0.15);
      replayedHints++;
      board[row][column] = solution[row][column];
      streak = 0;
      continue;
    }
    if (type === "undo" || type === "erase") {
      board[row][column] = 0;
      continue;
    }
    if (type !== "entry") continue;
    if (!wasCorrect || value !== solution[row][column]) {
      replayedMistakes++;
      subtotal = penalize(subtotal, replayedMistakes === 1 ? 0.08 : 0.12);
      board[row][column] = value;
      streak = 0;
      continue;
    }
    const key = `${row},${column}`;
    const alreadySolved = board[row][column] === solution[row][column];
    const alreadyScored = scoredCells.has(key);
    const empty = countEmpty(board);
    const candidateCount = candidates(board, row, column);
    board[row][column] = value;
    if (alreadySolved || alreadyScored) continue;
    scoredCells.add(key);
    streak++;
    subtotal += Math.round(placement[difficulty] * candidateMultiplier(candidateCount) * progressMultiplier(empty) * streakMultiplier(streak));
    if (!rows.has(row) && unitSolved(board, rowCells(row))) { rows.add(row); subtotal += 150; }
    if (!cols.has(column) && unitSolved(board, colCells(column))) { cols.add(column); subtotal += 150; }
    const box = `${Math.floor(row / 3)}:${Math.floor(column / 3)}`;
    if (!boxes.has(box) && unitSolved(board, boxCells(row, column))) { boxes.add(box); subtotal += 200; }
  }

  for (let i = replayedMistakes; i < mistakes; i++) subtotal = penalize(subtotal, i === 0 ? 0.08 : 0.12);
  for (let i = replayedHints; i < hints; i++) subtotal = penalize(subtotal, 0.15);
  for (let i = 3; i < undos; i++) subtotal = penalize(subtotal, 0.02);
  if (completed) subtotal += completion[difficulty];
  return Math.max(0, Math.round(subtotal * (completed ? speedMultiplier(difficulty, elapsedSeconds) : 1)));
}

const finalMoves = [];
for (let r = 7; r < 9; r++) {
  for (let c = 0; c < 9; c++) {
    if (givens[r][c] === 0) finalMoves.push({ row: r, column: c, value: solution[r][c] });
  }
}

const clean = score({ moves: finalMoves, elapsedSeconds: 300 });
const firstMistake = score({ moves: [{ row: 7, column: 3, value: 9, wasCorrect: false }, ...finalMoves], elapsedSeconds: 300, mistakes: 1 });
const messy = score({ moves: [{ row: 7, column: 3, value: 9, wasCorrect: false }, ...finalMoves], elapsedSeconds: 500, mistakes: 1, hints: 1, undos: 5 });
const slow = score({ moves: finalMoves, elapsedSeconds: 1200 });
const failed = score({ moves: finalMoves, elapsedSeconds: 300, mistakes: 3 });
const withUndo = score({ moves: finalMoves, elapsedSeconds: 300, undos: 5 });
const withHints = score({ moves: finalMoves, elapsedSeconds: 300, hints: 1 });
const hardEarly = score({ difficulty: "Master", moves: finalMoves.slice(0, 3), elapsedSeconds: 120, completed: false });
const easyEarly = score({ difficulty: "Easy", moves: finalMoves.slice(0, 3), elapsedSeconds: 120, completed: false });
const undoFarm = score({
  moves: [
    { row: 7, column: 3, value: solution[7][3] },
    { row: 7, column: 3, value: 0, type: "undo" },
    { row: 7, column: 3, value: solution[7][3] },
    ...finalMoves.slice(1),
  ],
  elapsedSeconds: 300,
});

assert(clean > starting.Medium, "score should start above zero and build on completion");
assert(firstMistake > 0, "first mistake should not wipe the run");
assert(clean > messy, "clean completion should beat messy completion");
assert(clean > slow, "faster completion should beat slower completion");
assert(clean > withUndo, "undos after the grace allowance should reduce score");
assert(clean > withHints, "hints should reduce score");
assert.equal(failed, 0, "failed attempt score should be 0");
assert(hardEarly > easyEarly, "harder placements should be worth more");
assert.equal(undoFarm, clean, "undo should not allow placement or unit bonus farming");
assert.equal(score({ moves: finalMoves, elapsedSeconds: 300 }), clean, "scoring should be deterministic");

console.log("Scoring validation passed.");
