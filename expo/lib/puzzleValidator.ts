/**
 * Puzzle validation utilities.
 * Validates puzzle givens and solutions before serving to users.
 */

import type { Board } from "@/lib/sudoku";
import { givenCellToBoardValue, isEmptyGiven, isGivenCell } from "@/lib/givenCells";

/** A puzzle row from Supabase (81-char text fields). */
export interface PuzzleRow {
  puzzle_id: string;
  difficulty: string;
  givens: string;
  solution: string;
  rating_score?: number;
  source?: string;
  is_active?: boolean;
}

export interface PuzzleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  solutionCount?: number;
}

/** Convert an 81-char string to a 9x9 Board (0 = empty). */
export function parseTextToBoard(s: string): Board {
  const board: Board = [];
  for (let r = 0; r < 9; r++) {
    const row: number[] = [];
    for (let c = 0; c < 9; c++) {
      const ch = s[r * 9 + c] ?? "0";
      row.push(givenCellToBoardValue(ch));
    }
    board.push(row);
  }
  return board;
}

function flatGivensToBoard(givens: string): number[] {
  return Array.from({ length: 81 }, (_, index) => givenCellToBoardValue(givens[index] ?? "0"));
}

function hasDuplicateUnitValues(board: number[]): boolean {
  const hasDupes = (values: number[]): boolean => {
    const seen = new Set<number>();
    for (const value of values) {
      if (value === 0) continue;
      if (seen.has(value)) return true;
      seen.add(value);
    }
    return false;
  };

  for (let row = 0; row < 9; row++) {
    if (hasDupes(board.slice(row * 9, row * 9 + 9))) return true;
  }
  for (let col = 0; col < 9; col++) {
    const values: number[] = [];
    for (let row = 0; row < 9; row++) values.push(board[row * 9 + col]);
    if (hasDupes(values)) return true;
  }
  for (let box = 0; box < 9; box++) {
    const values: number[] = [];
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    for (let row = startRow; row < startRow + 3; row++) {
      for (let col = startCol; col < startCol + 3; col++) values.push(board[row * 9 + col]);
    }
    if (hasDupes(values)) return true;
  }
  return false;
}

function candidatesFor(board: number[], index: number): number[] {
  if (board[index] !== 0) return [];
  const used = new Set<number>();
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let c = 0; c < 9; c++) used.add(board[row * 9 + c]);
  for (let r = 0; r < 9; r++) used.add(board[r * 9 + col]);
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) used.add(board[r * 9 + c]);
  }

  const result: number[] = [];
  for (let digit = 1; digit <= 9; digit++) {
    if (!used.has(digit)) result.push(digit);
  }
  return result;
}

export function countPuzzleSolutions(givens: string, limit = 2): number {
  const board = flatGivensToBoard(givens);
  if (hasDuplicateUnitValues(board)) return 0;
  let count = 0;

  function search(): void {
    if (count >= limit) return;
    let bestIndex = -1;
    let bestCandidates: number[] | null = null;

    for (let index = 0; index < 81; index++) {
      if (board[index] !== 0) continue;
      const candidates = candidatesFor(board, index);
      if (candidates.length === 0) return;
      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        bestIndex = index;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }

    if (bestIndex === -1 || bestCandidates === null) {
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

/** Validate a puzzle's givens and solution. */
export function validatePuzzle(givens: string, solution: string): PuzzleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Length checks ──
  if (givens.length !== 81) {
    errors.push(`Givens must be exactly 81 characters, got ${givens.length}.`);
  }
  if (solution.length !== 81) {
    errors.push(`Solution must be exactly 81 characters, got ${solution.length}.`);
  }

  // If fundamental errors exist, stop early
  if (errors.length > 0) return { valid: false, errors, warnings };

  // ── Content checks ──

  // Solution must contain only digits 1-9
  const validSolutionChars = /^[1-9]{81}$/;
  if (!validSolutionChars.test(solution)) {
    errors.push("Solution must contain only digits 1-9.");
    return { valid: false, errors, warnings };
  }

  // Givens must contain only digits 1-9 or editable blanks represented by 0 or .
  const validGivensChars = /^[0-9.]{81}$/;
  if (!validGivensChars.test(givens)) {
    errors.push("Givens must contain only digits 0-9 or blanks represented as dots.");
    return { valid: false, errors, warnings };
  }

  // ── Structural validation ──

  const solBoard = parseTextToBoard(solution);
  const givenBoard = parseTextToBoard(givens);

  // Validate solution: every row, column, box must be valid
  for (let r = 0; r < 9; r++) {
    const rowVals = new Set<number>();
    for (let c = 0; c < 9; c++) {
      const v = solBoard[r][c];
      if (v < 1 || v > 9) {
        errors.push(`Solution has invalid value at row ${r + 1}, col ${c + 1}.`);
        break;
      }
      rowVals.add(v);
    }
    if (rowVals.size !== 9) {
      errors.push(`Solution row ${r + 1} is not a valid row (must contain 1-9).`);
    }
  }

  for (let c = 0; c < 9; c++) {
    const colVals = new Set<number>();
    for (let r = 0; r < 9; r++) {
      colVals.add(solBoard[r][c]);
    }
    if (colVals.size !== 9) {
      errors.push(`Solution column ${c + 1} is not a valid column (must contain 1-9).`);
    }
  }

  for (let box = 0; box < 9; box++) {
    const boxVals = new Set<number>();
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        boxVals.add(solBoard[r][c]);
      }
    }
    if (boxVals.size !== 9) {
      errors.push(`Solution box ${box + 1} is not a valid box (must contain 1-9).`);
    }
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  // ── Givens vs Solution consistency ──
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const givenRaw = givens[r * 9 + c];
      const givenVal = givenBoard[r][c];
      const solVal = solBoard[r][c];
      if (isGivenCell(givenRaw) && givenVal !== solVal) {
        errors.push(
          `Given value at row ${r + 1}, col ${c + 1} (${givenVal}) does not match solution (${solVal}).`
        );
      } else if (!isGivenCell(givenRaw) && !isEmptyGiven(givenRaw)) {
        errors.push(`Givens has invalid editable value at row ${r + 1}, col ${c + 1}.`);
      }
    }
  }

  // ── Difficulty hints (warnings only) ──
  const givenCount = Array.from(givens).filter(isGivenCell).length;
  if (givenCount < 17) {
    warnings.push(`Only ${givenCount} givens — puzzle may not have a unique solution.`);
  }
  if (givenCount >= 50) {
    warnings.push(`${givenCount} givens — this puzzle may be too easy.`);
  }

  const solutionCount = countPuzzleSolutions(givens, 2);
  if (solutionCount === 0) {
    errors.push("Puzzle has no valid solution.");
  } else if (solutionCount > 1) {
    errors.push("Puzzle has more than one valid solution.");
  }

  return { valid: errors.length === 0, errors, warnings, solutionCount };
}

/** Check if a puzzle is valid (throws if not). Use for runtime guarding. */
export function assertValidPuzzle(givens: string, solution: string, puzzleId: string): void {
  const result = validatePuzzle(givens, solution);
  if (!result.valid) {
    throw new Error(
      `Invalid puzzle ${puzzleId}: ${result.errors.join(" | ")}`
    );
  }
}
