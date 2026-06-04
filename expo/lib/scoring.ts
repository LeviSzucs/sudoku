import type { Difficulty } from "@/constants/mockData";
import type { Board } from "@/lib/sudoku";

export type ScoringMoveType = "entry" | "erase" | "note" | "undo" | "hint";

export interface ScoringMove {
  type: ScoringMoveType;
  row: number;
  column: number;
  new_value: number | number[] | null;
  was_correct?: boolean;
}

export interface ScoreBreakdown {
  baseScore: number;
  placementPoints: number;
  streakBonus: number;
  unitBonus: number;
  completionBonus: number;
  speedBonus: number;
  slowPenalty: number;
  speedMultiplier: number;
  mistakePenalty: number;
  hintPenalty: number;
  undoPenalty: number;
  finalScore: number;
}

export const STARTING_SCORE: Record<Difficulty, number> = {
  Easy: 500,
  Medium: 800,
  Hard: 1200,
  Expert: 1600,
  Master: 2200,
};

export const PLACEMENT_POINTS: Record<Difficulty, number> = {
  Easy: 25,
  Medium: 40,
  Hard: 60,
  Expert: 85,
  Master: 115,
};

export const COMPLETION_BONUS: Record<Difficulty, number> = {
  Easy: 600,
  Medium: 1000,
  Hard: 1500,
  Expert: 2200,
  Master: 3000,
};

export const TARGET_SECONDS: Record<Difficulty, number> = {
  Easy: 300,
  Medium: 540,
  Hard: 900,
  Expert: 1440,
  Master: 2100,
};

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  Easy: 40,
  Medium: 70,
  Hard: 110,
  Expert: 160,
  Master: 220,
};

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function isSolvedUnit(board: Board, solution: Board, cells: { r: number; c: number }[]): boolean {
  return cells.every(({ r, c }) => board[r]?.[c] === solution[r]?.[c]);
}

function rowCells(row: number): { r: number; c: number }[] {
  return Array.from({ length: 9 }, (_, c) => ({ r: row, c }));
}

function columnCells(column: number): { r: number; c: number }[] {
  return Array.from({ length: 9 }, (_, r) => ({ r, c: column }));
}

function boxCells(row: number, column: number): { r: number; c: number }[] {
  const startRow = Math.floor(row / 3) * 3;
  const startColumn = Math.floor(column / 3) * 3;
  const cells: { r: number; c: number }[] = [];
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startColumn; c < startColumn + 3; c += 1) cells.push({ r, c });
  }
  return cells;
}

function boxKey(row: number, column: number): string {
  return `${Math.floor(row / 3)}:${Math.floor(column / 3)}`;
}

function moveValue(move: ScoringMove): number | null {
  return typeof move.new_value === "number" && move.new_value >= 1 && move.new_value <= 9 ? move.new_value : null;
}

function isFilled(value: number | undefined): boolean {
  return typeof value === "number" && value >= 1 && value <= 9;
}

function countEmptyCells(board: Board): number {
  let empty = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (!isFilled(board[r]?.[c])) empty += 1;
    }
  }
  return empty;
}

function countCandidates(board: Board, row: number, column: number): number {
  let count = 0;
  const startRow = Math.floor(row / 3) * 3;
  const startColumn = Math.floor(column / 3) * 3;

  for (let candidate = 1; candidate <= 9; candidate += 1) {
    let valid = true;
    for (let c = 0; c < 9; c += 1) {
      if (c !== column && board[row]?.[c] === candidate) valid = false;
    }
    for (let r = 0; r < 9; r += 1) {
      if (r !== row && board[r]?.[column] === candidate) valid = false;
    }
    for (let r = startRow; r < startRow + 3; r += 1) {
      for (let c = startColumn; c < startColumn + 3; c += 1) {
        if ((r !== row || c !== column) && board[r]?.[c] === candidate) valid = false;
      }
    }
    if (valid) count += 1;
  }

  return Math.max(1, count);
}

function candidateMultiplier(candidateCount: number): number {
  if (candidateCount <= 1) return 0.75;
  if (candidateCount === 2) return 1;
  if (candidateCount === 3) return 1.15;
  return 1.3;
}

function progressMultiplier(emptyCellsRemaining: number): number {
  const percentEmpty = emptyCellsRemaining / 81;
  if (percentEmpty >= 0.7) return 1.2;
  if (percentEmpty >= 0.4) return 1.1;
  if (percentEmpty >= 0.15) return 1;
  return 0.85;
}

function streakMultiplier(streak: number): number {
  if (streak >= 20) return 1.35;
  if (streak >= 10) return 1.22;
  if (streak >= 5) return 1.12;
  if (streak >= 3) return 1.05;
  return 1;
}

export function speedMultiplier(difficulty: Difficulty, elapsedSeconds: number): number {
  const target = TARGET_SECONDS[difficulty];
  if (target <= 0) return 1;
  const elapsed = Math.max(1, elapsedSeconds);
  const raw = elapsed <= target
    ? 1 + ((target - elapsed) / target) * 0.35
    : 1 - Math.min((elapsed - target) / target, 1) * 0.25;
  return Math.max(0.75, Math.min(1.35, raw));
}

function emptyBreakdown(finalScore = 0): ScoreBreakdown {
  return {
    baseScore: 0,
    placementPoints: 0,
    streakBonus: 0,
    unitBonus: 0,
    completionBonus: 0,
    speedBonus: 0,
    slowPenalty: 0,
    speedMultiplier: 1,
    mistakePenalty: 0,
    hintPenalty: 0,
    undoPenalty: 0,
    finalScore,
  };
}

function applyPercentPenalty(subtotal: number, percent: number): { nextSubtotal: number; penalty: number } {
  const penalty = Math.max(0, Math.round(subtotal * percent));
  return { nextSubtotal: Math.max(0, subtotal - penalty), penalty };
}

export function calculateSudokuScore({
  difficulty,
  givens,
  solution,
  moveHistory,
  elapsedSeconds,
  mistakes,
  hintsUsed,
  undoCount,
  completed,
  failed = false,
}: {
  difficulty: Difficulty;
  givens: Board;
  solution: Board;
  moveHistory: ScoringMove[];
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
  undoCount: number;
  completed: boolean;
  failed?: boolean;
}): ScoreBreakdown {
  if (failed || mistakes >= 3) return emptyBreakdown(0);

  const board = cloneBoard(givens);
  const completedRows = new Set<number>();
  const completedColumns = new Set<number>();
  const completedBoxes = new Set<string>();
  const scoredCells = new Set<string>();
  let subtotal = STARTING_SCORE[difficulty];
  let placementPoints = 0;
  let streakBonus = 0;
  let unitBonus = 0;
  let mistakePenalty = 0;
  let hintPenalty = 0;
  let undoPenalty = 0;
  let streak = 0;
  let replayedMistakes = 0;
  let replayedHints = 0;

  for (const move of moveHistory) {
    const { row, column } = move;
    if (row < 0 || row > 8 || column < 0 || column > 8) continue;

    if (move.type === "hint") {
      const { nextSubtotal, penalty } = applyPercentPenalty(subtotal, 0.15);
      subtotal = nextSubtotal;
      hintPenalty += penalty;
      replayedHints += 1;
      const value = moveValue(move);
      if (value !== null && value === solution[row]?.[column]) board[row][column] = value;
      streak = 0;
      continue;
    }

    if (move.type === "undo") {
      const value = moveValue(move);
      board[row][column] = value ?? 0;
      continue;
    }

    if (move.type === "erase") {
      board[row][column] = 0;
      continue;
    }

    if (move.type !== "entry") continue;

    const value = moveValue(move);
    const isCorrect = move.was_correct === true && value !== null && value === solution[row]?.[column];
    if (!isCorrect) {
      if (value !== null) board[row][column] = value;
      replayedMistakes += 1;
      const penaltyRate = replayedMistakes === 1 ? 0.08 : 0.12;
      const { nextSubtotal, penalty } = applyPercentPenalty(subtotal, penaltyRate);
      subtotal = nextSubtotal;
      mistakePenalty += penalty;
      streak = 0;
      continue;
    }

    const cellKey = `${row},${column}`;
    const alreadySolved = board[row][column] === solution[row][column];
    const alreadyScored = scoredCells.has(cellKey);
    const emptyBeforeMove = countEmptyCells(board);
    const candidatesBeforeMove = countCandidates(board, row, column);
    board[row][column] = value;
    if (alreadySolved || alreadyScored) continue;

    streak += 1;
    scoredCells.add(cellKey);

    const basePlacement = PLACEMENT_POINTS[difficulty];
    const placementGain = Math.max(
      1,
      Math.round(
        basePlacement *
          candidateMultiplier(candidatesBeforeMove) *
          progressMultiplier(emptyBeforeMove) *
          streakMultiplier(streak)
      )
    );
    placementPoints += placementGain;
    subtotal += placementGain;

    const noStreakGain = Math.round(basePlacement * candidateMultiplier(candidatesBeforeMove) * progressMultiplier(emptyBeforeMove));
    streakBonus += Math.max(0, placementGain - noStreakGain);

    if (!completedRows.has(row) && isSolvedUnit(board, solution, rowCells(row))) {
      completedRows.add(row);
      unitBonus += 150;
      subtotal += 150;
    }
    if (!completedColumns.has(column) && isSolvedUnit(board, solution, columnCells(column))) {
      completedColumns.add(column);
      unitBonus += 150;
      subtotal += 150;
    }
    const key = boxKey(row, column);
    if (!completedBoxes.has(key) && isSolvedUnit(board, solution, boxCells(row, column))) {
      completedBoxes.add(key);
      unitBonus += 200;
      subtotal += 200;
    }
  }

  for (let i = replayedMistakes; i < Math.max(0, mistakes); i += 1) {
    const { nextSubtotal, penalty } = applyPercentPenalty(subtotal, i === 0 ? 0.08 : 0.12);
    subtotal = nextSubtotal;
    mistakePenalty += penalty;
  }

  for (let i = replayedHints; i < Math.max(0, hintsUsed); i += 1) {
    const { nextSubtotal, penalty } = applyPercentPenalty(subtotal, 0.15);
    subtotal = nextSubtotal;
    hintPenalty += penalty;
  }

  for (let i = 3; i < Math.max(0, undoCount); i += 1) {
    const { nextSubtotal, penalty } = applyPercentPenalty(subtotal, 0.02);
    subtotal = nextSubtotal;
    undoPenalty += penalty;
  }

  const completionBonus = completed ? COMPLETION_BONUS[difficulty] : 0;
  subtotal += completionBonus;

  const multiplier = completed ? speedMultiplier(difficulty, elapsedSeconds) : 1;
  const speedAdjusted = Math.max(0, Math.round(subtotal * multiplier));
  const speedDelta = speedAdjusted - subtotal;
  const speedBonus = Math.max(0, speedDelta);
  const slowPenalty = Math.max(0, -speedDelta);

  return {
    baseScore: STARTING_SCORE[difficulty],
    placementPoints,
    streakBonus,
    unitBonus,
    completionBonus,
    speedBonus,
    slowPenalty,
    speedMultiplier: multiplier,
    mistakePenalty,
    hintPenalty,
    undoPenalty,
    finalScore: speedAdjusted,
  };
}

export function calculateMasteryXpFromScore(difficulty: Difficulty, finalScore: number, mode: string, clean: boolean, fast: boolean, didWin = false): number {
  let xp = XP_BY_DIFFICULTY[difficulty] + Math.floor(Math.max(0, finalScore) / 120);
  if (clean) xp += 25;
  if (fast) xp += 25;
  if (mode === "daily") xp += 50;
  if (mode === "duel" && didWin) xp += 40;
  if ((mode === "ranked" || mode === "ranked_duel") && didWin) xp += 60;
  return xp;
}
