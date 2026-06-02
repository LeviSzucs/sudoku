const assert = require("node:assert/strict");

const placement = { Easy: 20, Medium: 30, Hard: 45, Expert: 60, Master: 80 };
const completion = { Easy: 400, Medium: 700, Hard: 1000, Expert: 1400, Master: 1800 };
const target = { Easy: 300, Medium: 600, Hard: 900, Expert: 1200, Master: 1800 };
const speedCap = { Easy: 300, Medium: 500, Hard: 700, Expert: 900, Master: 1200 };

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

function score({ difficulty = "Medium", moves, elapsedSeconds, mistakes = 0, hints = 0, undos = 0, completed = true, failed = false }) {
  if (failed) return 0;
  const board = givens.map((row) => [...row]);
  const rows = new Set();
  const cols = new Set();
  const boxes = new Set();
  let placementPoints = 0;
  let streakBonus = 0;
  let unitBonus = 0;
  let streak = 0;

  for (const move of moves) {
    const { row, column, value, type = "entry", wasCorrect = true } = move;
    if (type === "hint") {
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
      streak = 0;
      board[row][column] = value;
      continue;
    }
    if (board[row][column] === solution[row][column]) continue;
    board[row][column] = value;
    placementPoints += placement[difficulty];
    streak += 1;
    if (streak === 3) streakBonus += 25;
    if (streak === 5) streakBonus += 60;
    if (streak === 10) streakBonus += 150;
    if (!rows.has(row) && unitSolved(board, rowCells(row))) { rows.add(row); unitBonus += 75; }
    if (!cols.has(column) && unitSolved(board, colCells(column))) { cols.add(column); unitBonus += 75; }
    const box = `${Math.floor(row / 3)}:${Math.floor(column / 3)}`;
    if (!boxes.has(box) && unitSolved(board, boxCells(row, column))) { boxes.add(box); unitBonus += 100; }
  }

  const speed = completed ? Math.max(0, Math.floor(speedCap[difficulty] * Math.max(0, target[difficulty] - elapsedSeconds) / target[difficulty])) : 0;
  const slow = completed && elapsedSeconds > target[difficulty] ? Math.floor((elapsedSeconds - target[difficulty]) / 30) * 10 : 0;
  return Math.max(0, placementPoints + streakBonus + unitBonus + (completed ? completion[difficulty] : 0) + speed - slow - mistakes * 150 - hints * 250 - Math.max(0, undos - 3) * 25);
}

const finalMoves = [];
for (let r = 7; r < 9; r++) {
  for (let c = 0; c < 9; c++) {
    if (givens[r][c] === 0) finalMoves.push({ row: r, column: c, value: solution[r][c] });
  }
}

const clean = score({ moves: finalMoves, elapsedSeconds: 300 });
const messy = score({ moves: [{ row: 7, column: 3, value: 1, wasCorrect: false }, ...finalMoves], elapsedSeconds: 500, mistakes: 1, hints: 1, undos: 5 });
const slow = score({ moves: finalMoves, elapsedSeconds: 900 });
const failed = score({ moves: finalMoves, elapsedSeconds: 300, failed: true });
const withUndo = score({ moves: finalMoves, elapsedSeconds: 300, undos: 5 });
const withHints = score({ moves: finalMoves, elapsedSeconds: 300, hints: 1 });

assert(clean > 0, "clean completion should earn points");
assert(clean > messy, "clean completion should beat messy completion");
assert(clean > slow, "faster completion should beat slower completion");
assert(clean > withUndo, "undos after the grace allowance should reduce score");
assert(clean > withHints, "hints should reduce score");
assert.equal(failed, 0, "failed attempt score should be 0");
assert.equal(score({ moves: finalMoves, elapsedSeconds: 300 }), clean, "scoring should be deterministic");

console.log("Scoring validation passed.");
