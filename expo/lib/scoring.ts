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
  placementPoints: number;
  streakBonus: number;
  unitBonus: number;
  completionBonus: number;
  speedBonus: number;
  slowPenalty: number;
  mistakePenalty: number;
  hintPenalty: number;
  undoPenalty: number;
  finalScore: number;
}

export const PLACEMENT_POINTS: Record<Difficulty, number> = {
  Easy: 20,
  Medium: 30,
  Hard: 45,
  Expert: 60,
  Master: 80,
};

export const COMPLETION_BONUS: Record<Difficulty, number> = {
  Easy: 400,
  Medium: 700,
  Hard: 1000,
  Expert: 1400,
  Master: 1800,
};

export const TARGET_SECONDS: Record<Difficulty, number> = {
  Easy: 300,
  Medium: 600,
  Hard: 900,
  Expert: 1200,
  Master: 1800,
};

export const MAX_SPEED_BONUS: Record<Difficulty, number> = {
  Easy: 300,
  Medium: 500,
  Hard: 700,
  Expert: 900,
  Master: 1200,
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
  if (failed) {
    return {
      placementPoints: 0,
      streakBonus: 0,
      unitBonus: 0,
      completionBonus: 0,
      speedBonus: 0,
      slowPenalty: 0,
      mistakePenalty: 0,
      hintPenalty: 0,
      undoPenalty: 0,
      finalScore: 0,
    };
  }

  const board = cloneBoard(givens);
  const completedRows = new Set<number>();
  const completedColumns = new Set<number>();
  const completedBoxes = new Set<string>();
  let placementPoints = 0;
  let streakBonus = 0;
  let unitBonus = 0;
  let streak = 0;

  for (const move of moveHistory) {
    const { row, column } = move;
    if (row < 0 || row > 8 || column < 0 || column > 8) continue;

    if (move.type === "hint") {
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
      streak = 0;
      continue;
    }

    const alreadySolved = board[row][column] === solution[row][column];
    board[row][column] = value;
    if (alreadySolved) continue;

    placementPoints += PLACEMENT_POINTS[difficulty];
    streak += 1;
    if (streak === 3) streakBonus += 25;
    if (streak === 5) streakBonus += 60;
    if (streak === 10) streakBonus += 150;

    if (!completedRows.has(row) && isSolvedUnit(board, solution, rowCells(row))) {
      completedRows.add(row);
      unitBonus += 75;
    }
    if (!completedColumns.has(column) && isSolvedUnit(board, solution, columnCells(column))) {
      completedColumns.add(column);
      unitBonus += 75;
    }
    const key = boxKey(row, column);
    if (!completedBoxes.has(key) && isSolvedUnit(board, solution, boxCells(row, column))) {
      completedBoxes.add(key);
      unitBonus += 100;
    }
  }

  const completionBonus = completed ? COMPLETION_BONUS[difficulty] : 0;
  const target = TARGET_SECONDS[difficulty];
  const speedBonus = completed ? Math.max(0, Math.floor(MAX_SPEED_BONUS[difficulty] * Math.max(0, target - elapsedSeconds) / target)) : 0;
  const slowPenalty = completed && elapsedSeconds > target ? Math.floor((elapsedSeconds - target) / 30) * 10 : 0;
  const mistakePenalty = Math.max(0, mistakes) * 150;
  const hintPenalty = Math.max(0, hintsUsed) * 250;
  const undoPenalty = Math.max(0, undoCount - 3) * 25;

  const finalScore = Math.max(
    0,
    placementPoints +
      streakBonus +
      unitBonus +
      completionBonus +
      speedBonus -
      slowPenalty -
      mistakePenalty -
      hintPenalty -
      undoPenalty
  );

  return {
    placementPoints,
    streakBonus,
    unitBonus,
    completionBonus,
    speedBonus,
    slowPenalty,
    mistakePenalty,
    hintPenalty,
    undoPenalty,
    finalScore,
  };
}

export function calculateMasteryXpFromScore(difficulty: Difficulty, finalScore: number, mode: string, clean: boolean, fast: boolean, didWin = false): number {
  let xp = XP_BY_DIFFICULTY[difficulty] + Math.floor(Math.max(0, finalScore) / 100);
  if (clean) xp += 25;
  if (fast) xp += 25;
  if (mode === "daily") xp += 50;
  if (mode === "duel" && didWin) xp += 40;
  if (mode === "ranked" && didWin) xp += 60;
  return xp;
}
