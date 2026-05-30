/**
 * Sudoku game state hook. Designed so its shape maps directly to a future
 * Supabase `game_sessions` row: puzzle_id, difficulty, solution, givens,
 * user_entries, notes, timer_seconds, mistakes, hints_used, mode.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  countFilled,
  getPuzzleByDifficulty,
  isComplete,
  makeEmptyNotes,
  type Board,
  type NotesBoard,
  type RawPuzzleData,
} from "@/lib/sudoku";
import type { Difficulty } from "@/constants/mockData";

export type GameMode = "daily" | "classic" | "duel" | "ranked";

export const MAX_MISTAKES = 3;

const COMPLETED_RESULTS_KEY = "sudoku.completed_results";

const DIFFICULTY_BASE: Record<Difficulty, number> = {
  Easy: 1000,
  Medium: 3000,
  Hard: 5000,
  Expert: 8000,
  Master: 12000,
};

export type MoveType = "entry" | "erase" | "note" | "undo" | "hint";

export interface MoveHistoryEntry {
  move_id: string;
  timestamp_seconds: number;
  type: MoveType;
  row: number;
  column: number;
  previous_value: number | number[] | null;
  new_value: number | number[] | null;
  was_correct?: boolean;
  mode: GameMode;
}

export interface SessionSnapshot {
  puzzle_id: string;
  mode: GameMode;
  difficulty: Difficulty;
  board_state: Board;
  notes_state: NotesBoard;
  elapsed_seconds: number;
  mistakes: number;
  hints_used: number;
  undo_count: number;
  move_history: MoveHistoryEntry[];
}

export interface PuzzleResult {
  session_id?: string;
  puzzle_id: string;
  mode: GameMode;
  difficulty: Difficulty;
  completed: true;
  elapsed_seconds: number;
  mistakes: number;
  hints_used: number;
  undo_count: number;
  move_count: number;
  final_score: number;
  eligible_for_leaderboard: boolean;
  eligible_for_ranked: boolean;
  completed_at: string;
}

export function calculateScore(
  difficulty: Difficulty,
  elapsedSeconds: number,
  mistakes: number,
  hintsUsed: number,
  undoCount: number
): number {
  const difficultyBase = DIFFICULTY_BASE[difficulty];
  const mistakePenalty = mistakes * 250;
  const hintPenalty = hintsUsed * 500;
  const undoPenalty = undoCount * 25;
  const bonuses = (mistakes === 0 ? 250 : 0) + (hintsUsed === 0 ? 250 : 0) + (undoCount === 0 ? 100 : 0);
  return Math.max(0, difficultyBase - elapsedSeconds - mistakePenalty - hintPenalty - undoPenalty + bonuses);
}

interface HistoryEntry {
  board: Board;
  notes: NotesBoard;
  errors: string[];
  row: number;
  column: number;
}

function getEligibleForLeaderboard(completed: boolean, hintsUsed: number, failed: boolean): boolean {
  return completed && hintsUsed === 0 && !failed;
}

function getEligibleForRanked(
  mode: GameMode,
  completed: boolean,
  hintsUsed: number,
  puzzleId: string,
  elapsedSeconds: number,
  finalScore: number
): boolean {
  return mode === "ranked" && completed && hintsUsed === 0 && puzzleId.length > 0 && elapsedSeconds > 0 && finalScore > 0;
}

export interface UseSudokuGame {
  // identity
  puzzleId: string;
  mode: GameMode;
  difficulty: Difficulty;
  // board
  initial: Board;
  solution: Board;
  board: Board;
  notes: NotesBoard;
  selected: { r: number; c: number } | null;
  errors: Set<string>;
  // meta
  mistakes: number;
  hintsUsed: number;
  undoCount: number;
  seconds: number;
  paused: boolean;
  notesMode: boolean;
  completed: boolean;
  gameOver: boolean;
  score: number;
  result: PuzzleResult | null;
  moveHistory: MoveHistoryEntry[];
  counts: Record<number, number>;
  hintAllowed: boolean;
  // actions
  select: (r: number, c: number) => void;
  clearTransientUi: () => void;
  enterNumber: (n: number) => void;
  erase: () => void;
  undo: () => void;
  hint: () => void;
  toggleNotes: () => void;
  togglePause: () => void;
  resume: () => void;
  restart: () => void;
  getSessionSnapshot: () => SessionSnapshot;
}

interface Options {
  mode: GameMode;
  difficulty: Difficulty;
  puzzleId?: string;
  restoreSnapshot?: SessionSnapshot;
  /** Raw puzzle data fetched from backend (preferred over difficulty lookup). */
  puzzleData?: RawPuzzleData;
}

/** Synchronous fallback for when puzzleData is not provided. */
function getFallbackGivens(difficulty: Difficulty): Board {
  const p = getPuzzleByDifficulty(difficulty);
  return p.givens.map((r) => [...r]);
}

function getFallbackSolution(difficulty: Difficulty): Board {
  const p = getPuzzleByDifficulty(difficulty);
  return p.solution.map((r) => [...r]);
}

export default function useSudokuGame({ mode, difficulty, puzzleId, restoreSnapshot, puzzleData }: Options): UseSudokuGame {
  // ── Resolve puzzle data ───────────────────────────────────────────
  const givens: Board = useMemo(
    () => puzzleData?.givens ?? getFallbackGivens(difficulty),
    [puzzleData?.givens, difficulty]
  );
  const solution: Board = useMemo(
    () => puzzleData?.solution ?? getFallbackSolution(difficulty),
    [puzzleData?.solution, difficulty]
  );
  const resolvedPuzzleId = puzzleId ?? restoreSnapshot?.puzzle_id ?? puzzleData?.puzzle_id ?? "unknown";

  const [board, setBoard] = useState<Board>(() => restoreSnapshot?.board_state ?? givens.map((r) => [...r]));
  const [notes, setNotes] = useState<NotesBoard>(() => restoreSnapshot?.notes_state ?? makeEmptyNotes());
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(() => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (givens[r][c] === 0) return { r, c };
    return null;
  });
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState<number>(restoreSnapshot?.mistakes ?? 0);
  const [hintsUsed, setHintsUsed] = useState<number>(restoreSnapshot?.hints_used ?? 0);
  const [undoCount, setUndoCount] = useState<number>(restoreSnapshot?.undo_count ?? 0);
  const [seconds, setSeconds] = useState<number>(restoreSnapshot?.elapsed_seconds ?? 0);
  const [notesMode, setNotesMode] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [result, setResult] = useState<PuzzleResult | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>(restoreSnapshot?.move_history ?? []);
  const history = useRef<HistoryEntry[]>([]);
  const moveSequence = useRef<number>(restoreSnapshot?.move_history?.length ?? 0);

  // Timer
  useEffect(() => {
    if (paused || completed || gameOver) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, completed, gameOver]);

  const addMove = useCallback(
    (move: Omit<MoveHistoryEntry, "move_id" | "timestamp_seconds" | "mode">, elapsedSeconds: number = seconds) => {
      moveSequence.current += 1;
      const nextMove: MoveHistoryEntry = {
        move_id: `${resolvedPuzzleId}-${moveSequence.current}`,
        timestamp_seconds: elapsedSeconds,
        mode,
        ...move,
      };
      setMoveHistory((prev) => [...prev, nextMove]);
      return nextMove;
    },
    [mode, resolvedPuzzleId, seconds]
  );

  const completePuzzle = useCallback(
    (
      completedBoard: Board,
      elapsedSeconds: number,
      completedMistakes: number,
      completedHints: number,
      completedUndoCount: number,
      nextMoveCount: number
    ) => {
      if (completed || gameOver || completedMistakes >= MAX_MISTAKES) return;
      if (countFilled(completedBoard) !== 81 || !isComplete(completedBoard, solution)) return;

      const computedScore = calculateScore(difficulty, elapsedSeconds, completedMistakes, completedHints, completedUndoCount);
      const eligibleForLeaderboard = getEligibleForLeaderboard(true, completedHints, false);
      const eligibleForRanked = getEligibleForRanked(mode, true, completedHints, resolvedPuzzleId, elapsedSeconds, computedScore);
      const completedResult: PuzzleResult = {
        puzzle_id: resolvedPuzzleId,
        mode,
        difficulty,
        completed: true,
        elapsed_seconds: elapsedSeconds,
        mistakes: completedMistakes,
        hints_used: completedHints,
        undo_count: completedUndoCount,
        move_count: nextMoveCount,
        final_score: computedScore,
        eligible_for_leaderboard: eligibleForLeaderboard,
        eligible_for_ranked: eligibleForRanked,
        completed_at: new Date().toISOString(),
      };

      setFinalScore(computedScore);
      setResult(completedResult);
      setCompleted(true);
      setPaused(false);
      setSelected(null);
      void AsyncStorage.mergeItem(
        COMPLETED_RESULTS_KEY,
        JSON.stringify({ [resolvedPuzzleId]: completedResult })
      ).catch(() => {});
    },
    [completed, difficulty, gameOver, mode, solution, resolvedPuzzleId]
  );

  // Auto-pause game-over
  useEffect(() => {
    if (mistakes >= MAX_MISTAKES && !completed) setGameOver(true);
  }, [completed, mistakes]);

  const pushHistory = useCallback((row: number, column: number) => {
    history.current.push({
      board: board.map((r) => [...r]),
      notes: notes.map((r) => r.map((c) => [...c])),
      errors: Array.from(errors),
      row,
      column,
    });
    if (history.current.length > 80) history.current.shift();
  }, [board, notes, errors]);

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (let n = 1; n <= 9; n++) c[n] = 9;
    for (let r = 0; r < 9; r++) {
      for (let col = 0; col < 9; col++) {
        const v = board[r][col];
        if (v !== 0 && !errors.has(`${r},${col}`)) c[v]--;
      }
    }
    return c;
  }, [board, errors]);

  const select = useCallback((r: number, c: number) => {
    if (completed || gameOver) return;
    setSelected({ r, c });
  }, [completed, gameOver]);

  const clearTransientUi = useCallback(() => {
    setSelected(null);
    setPaused(false);
    setNotesMode(false);
  }, []);

  const enterNumber = useCallback(
    (n: number) => {
      if (!selected || paused || completed || gameOver) return;
      const { r, c } = selected;
      if (givens[r][c] !== 0) return;
      if (board[r][c] === n && !notesMode) return;

      pushHistory(r, c);

      if (notesMode) {
        const previousNotes = [...notes[r][c]];
        const nextNotes = notes.map((row) => row.map((cell) => [...cell]));
        const cellNotes = nextNotes[r][c];
        const idx = cellNotes.indexOf(n);
        if (idx >= 0) cellNotes.splice(idx, 1);
        else cellNotes.push(n);
        setNotes(nextNotes);
        addMove({
          type: "note",
          row: r,
          column: c,
          previous_value: previousNotes,
          new_value: [...cellNotes],
        });
        return;
      }

      const previousValue = board[r][c];
      const nextBoard = board.map((row) => [...row]);
      nextBoard[r][c] = n;
      const wasCorrect = n === solution[r][c];
      const nextMistakes = wasCorrect ? mistakes : mistakes + 1;
      setBoard(nextBoard);
      setNotes((prev) => {
        const next = prev.map((row) => row.map((cell) => [...cell]));
        next[r][c] = [];
        return next;
      });

      if (!wasCorrect) {
        setErrors((prev) => new Set(prev).add(`${r},${c}`));
        setMistakes(nextMistakes);
      } else {
        setErrors((prev) => {
          const next = new Set(prev);
          next.delete(`${r},${c}`);
          return next;
        });
      }

      addMove({
        type: "entry",
        row: r,
        column: c,
        previous_value: previousValue,
        new_value: n,
        was_correct: wasCorrect,
      });
      completePuzzle(nextBoard, seconds, nextMistakes, hintsUsed, undoCount, moveHistory.length + 1);
    },
    [selected, paused, completed, gameOver, notesMode, pushHistory, board, mistakes, completePuzzle, seconds, hintsUsed, undoCount, moveHistory.length, addMove, notes, givens, solution]
  );

  const erase = useCallback(() => {
    if (!selected || paused || completed || gameOver) return;
    const { r, c } = selected;
    if (givens[r][c] !== 0) return;
    if (board[r][c] === 0 && notes[r][c].length === 0) return;
    pushHistory(r, c);
    const previousValue = board[r][c] !== 0 ? board[r][c] : [...notes[r][c]];
    setBoard((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = 0;
      return next;
    });
    setNotes((prev) => {
      const next = prev.map((row) => row.map((cell) => [...cell]));
      next[r][c] = [];
      return next;
    });
    setErrors((prev) => {
      const next = new Set(prev);
      next.delete(`${r},${c}`);
      return next;
    });
    addMove({
      type: "erase",
      row: r,
      column: c,
      previous_value: previousValue,
      new_value: board[r][c] !== 0 ? 0 : [],
    });
  }, [selected, paused, completed, gameOver, pushHistory, board, notes, addMove, givens]);

  const undo = useCallback(() => {
    if (paused || completed || gameOver) return;
    const last = history.current.pop();
    if (!last) return;
    setBoard(last.board);
    setNotes(last.notes);
    setErrors(new Set(last.errors));
    const nextUndoCount = undoCount + 1;
    setUndoCount(nextUndoCount);
    addMove({
      type: "undo",
      row: last.row,
      column: last.column,
      previous_value: board[last.row]?.[last.column] ?? null,
      new_value: last.board[last.row]?.[last.column] ?? null,
    });
  }, [paused, completed, gameOver, undoCount, addMove, board]);

  const hintAllowed = mode !== "ranked";

  const hint = useCallback(() => {
    if (!hintAllowed) return;
    if (!selected || paused || completed || gameOver) return;
    const { r, c } = selected;
    if (givens[r][c] !== 0) return;
    if (board[r][c] === solution[r][c]) return;
    pushHistory(r, c);
    const previousValue = board[r][c];
    setBoard((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = solution[r][c];
      return next;
    });
    setNotes((prev) => {
      const next = prev.map((row) => row.map((cell) => [...cell]));
      next[r][c] = [];
      return next;
    });
    setErrors((prev) => {
      const next = new Set(prev);
      next.delete(`${r},${c}`);
      return next;
    });
    const nextHintsUsed = hintsUsed + 1;
    const nextBoard = board.map((row) => [...row]);
    nextBoard[r][c] = solution[r][c];
    setHintsUsed(nextHintsUsed);
    addMove({
      type: "hint",
      row: r,
      column: c,
      previous_value: previousValue,
      new_value: solution[r][c],
      was_correct: true,
    });
    completePuzzle(nextBoard, seconds, mistakes, nextHintsUsed, undoCount, moveHistory.length + 1);
  }, [hintAllowed, selected, paused, completed, gameOver, pushHistory, board, hintsUsed, completePuzzle, seconds, mistakes, undoCount, moveHistory.length, addMove, givens, solution]);

  const toggleNotes = useCallback(() => {
    if (completed || gameOver || paused) return;
    setNotesMode((n) => !n);
  }, [completed, gameOver, paused]);
  const togglePause = useCallback(() => {
    if (completed || gameOver) return;
    setPaused((p) => !p);
  }, [completed, gameOver]);
  const resume = useCallback(() => setPaused(false), []);

  const restart = useCallback(() => {
    setBoard(givens.map((r) => [...r]));
    setNotes(makeEmptyNotes());
    setErrors(new Set());
    setMistakes(0);
    setHintsUsed(0);
    setUndoCount(0);
    setSeconds(0);
    setNotesMode(false);
    setPaused(false);
    setCompleted(false);
    setGameOver(false);
    setFinalScore(null);
    setResult(null);
    setMoveHistory([]);
    history.current = [];
    moveSequence.current = 0;
  }, [givens]);

  const getSessionSnapshot = useCallback((): SessionSnapshot => ({
    puzzle_id: resolvedPuzzleId,
    mode,
    difficulty,
    board_state: board.map((r) => [...r]),
    notes_state: notes.map((r) => r.map((c) => [...c])),
    elapsed_seconds: seconds,
    mistakes,
    hints_used: hintsUsed,
    undo_count: undoCount,
    move_history: moveHistory,
  }), [resolvedPuzzleId, mode, difficulty, board, notes, seconds, mistakes, hintsUsed, undoCount, moveHistory]);

  const score = useMemo(() => {
    if (finalScore !== null) return finalScore;
    return calculateScore(difficulty, seconds, mistakes, hintsUsed, undoCount);
  }, [difficulty, finalScore, hintsUsed, mistakes, seconds, undoCount]);

  return useMemo(() => ({
    puzzleId: resolvedPuzzleId,
    mode,
    difficulty,
    initial: givens,
    solution,
    board,
    notes,
    selected,
    errors,
    mistakes,
    hintsUsed,
    undoCount,
    seconds,
    paused,
    notesMode,
    completed,
    gameOver,
    score,
    result,
    moveHistory,
    counts,
    hintAllowed,
    select,
    clearTransientUi,
    enterNumber,
    erase,
    undo,
    hint,
    toggleNotes,
    togglePause,
    resume,
    restart,
    getSessionSnapshot,
  }), [
    resolvedPuzzleId, mode, difficulty,
    givens, solution,
    board, notes, selected, errors,
    mistakes, hintsUsed, undoCount, seconds,
    paused, notesMode, completed, gameOver,
    score, result, moveHistory, counts, hintAllowed,
    select, clearTransientUi, enterNumber, erase, undo, hint,
    toggleNotes, togglePause, resume, restart, getSessionSnapshot,
  ]);
}
