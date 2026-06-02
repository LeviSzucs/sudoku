/**
 * Sudoku data model + helpers.
 * Puzzles are fetched from Supabase via RPC or direct queries.
 * Fallback hardcoded puzzles exist only for offline/guest mode.
 */

import type { Difficulty } from "@/constants/mockData";
import { isSupabaseConfigured, supabase, type PuzzleRow, type DailyPuzzleRow } from "@/lib/supabase";
import { parseTextToBoard, validatePuzzle } from "@/lib/puzzleValidator";

export type Board = number[][]; // 9x9, 0 = empty
export type NotesBoard = number[][][]; // 9x9 of arrays of pencil marks

export interface SudokuPuzzle {
  puzzle_id: string;
  difficulty: Difficulty;
  givens: Board;
  initial?: Board;
  solution: Board;
  mode: "daily" | "classic" | "duel" | "friend_challenge" | "ranked";
}

/** Raw puzzle data needed to initialise the game hook. */
export interface RawPuzzleData {
  puzzle_id: string;
  difficulty: Difficulty;
  givens: Board;
  solution: Board;
}

// ── Hardcoded fallback puzzles (used when offline or guest mode) ──────

const FALLBACK_PUZZLES: Record<Difficulty, SudokuPuzzle> = {
  Easy: {
    puzzle_id: "seed_easy_001",
    difficulty: "Easy",
    mode: "classic",
    givens: parse(
      "507040201" +
      "804301090" +
      "060708050" +
      "050070108" +
      "102080509" +
      "308205070" +
      "040807010" +
      "080160905" +
      "209030807"
    ),
    solution: parse(
      "537649281" +
      "824351796" +
      "961728453" +
      "456973128" +
      "172486539" +
      "398215674" +
      "645897312" +
      "783162945" +
      "219534867"
    ),
  },
  Medium: {
    puzzle_id: "seed_medium_001",
    difficulty: "Medium",
    mode: "classic",
    givens: parse(
      "209060000" +
      "040203090" +
      "080409000" +
      "403050908" +
      "106090000" +
      "070301040" +
      "090608000" +
      "807030402" +
      "504070800"
    ),
    solution: parse(
      "239567184" +
      "641283597" +
      "785419326" +
      "423756918" +
      "156894273" +
      "978321645" +
      "392648751" +
      "817935462" +
      "564172839"
    ),
  },
  Hard: {
    puzzle_id: "seed_hard_001",
    difficulty: "Hard",
    mode: "classic",
    givens: parse(
      "000004060" +
      "080207010" +
      "000000402" +
      "802010709" +
      "500000040" +
      "040605080" +
      "000000608" +
      "608050304" +
      "400000020"
    ),
    solution: parse(
      "129534867" +
      "384267915" +
      "756189432" +
      "862413759" +
      "573928146" +
      "941675283" +
      "295341678" +
      "618752394" +
      "437896521"
    ),
  },
  Expert: {
    puzzle_id: "seed_expert_001",
    difficulty: "Expert",
    mode: "classic",
    givens: parse(
      "060903020" +
      "000000000" +
      "304050706" +
      "700000000" +
      "010709060" +
      "030000000" +
      "008030605" +
      "100000000" +
      "040807090"
    ),
    solution: parse(
      "861973524" +
      "257684139" +
      "394152786" +
      "789316452" +
      "415729863" +
      "632548917" +
      "978231645" +
      "126495378" +
      "543867291"
    ),
  },
  Master: {
    puzzle_id: "seed_master_001",
    difficulty: "Master",
    mode: "classic",
    givens: parse(
      "060801020" +
      "000000001" +
      "108040600" +
      "000000000" +
      "080207010" +
      "000000000" +
      "605070100" +
      "000000000" +
      "090405060"
    ),
    solution: parse(
      "563891427" +
      "974526831" +
      "128743659" +
      "756189342" +
      "489237516" +
      "312654978" +
      "635972184" +
      "241368795" +
      "897415263"
    ),
  },
};

function parse(s: string): Board {
  return parseTextToBoard(s);
}

// ── Backend-driven puzzle fetching ──────────────────────────────────

/** Convert a PuzzleRow from Supabase to RawPuzzleData. */
export function puzzleRowToData(row: PuzzleRow): RawPuzzleData {
  // Validate before serving
  const result = validatePuzzle(row.givens, row.solution);
  if (!result.valid) {
    throw new Error(
      `Puzzle ${row.puzzle_id} is invalid: ${result.errors.join(" | ")}`
    );
  }
  return {
    puzzle_id: row.puzzle_id,
    difficulty: row.difficulty as Difficulty,
    givens: parseTextToBoard(row.givens),
    solution: parseTextToBoard(row.solution),
  };
}

export async function fetchPuzzleById(puzzleId: string | null | undefined, difficulty: Difficulty): Promise<RawPuzzleData> {
  if (puzzleId && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("puzzles")
      .select("*")
      .eq("puzzle_id", puzzleId)
      .maybeSingle();

    if (!error && data) {
      return puzzleRowToData(data as PuzzleRow);
    }

    if (error) {
      console.warn(`[Puzzle] puzzle_id lookup failed: ${error.message}. Falling back.`);
    }
  }

  return {
    puzzle_id: FALLBACK_PUZZLES[difficulty].puzzle_id,
    difficulty,
    givens: FALLBACK_PUZZLES[difficulty].givens.map((r) => [...r]),
    solution: FALLBACK_PUZZLES[difficulty].solution.map((r) => [...r]),
  };
}

/** Fetch a classic puzzle from the backend RPC, falling back to hardcoded. */
export async function fetchClassicPuzzle(
  userId: string | null,
  difficulty: Difficulty,
  excludedPuzzleId?: string | null
): Promise<RawPuzzleData> {
  if (isSupabaseConfigured && userId) {
    if (excludedPuzzleId) {
      const { data: replacementPuzzles, error: replacementError } = await supabase
        .from("puzzles")
        .select("*")
        .eq("difficulty", difficulty)
        .eq("is_active", true)
        .neq("puzzle_id", excludedPuzzleId)
        .order("rating_score", { ascending: true })
        .limit(1);

      if (!replacementError && replacementPuzzles && replacementPuzzles.length > 0) {
        return puzzleRowToData(replacementPuzzles[0] as PuzzleRow);
      }
    }

    const { data, error } = await supabase.rpc("get_classic_puzzle", {
      p_user_id: userId,
      p_difficulty: difficulty,
    });

    if (error) {
      console.warn(
        `[Puzzle] RPC get_classic_puzzle failed: ${error.message}. Falling back.`
      );
    } else if (data && Array.isArray(data) && data.length > 0) {
      const row = data[0] as {
        puzzle_id: string;
        difficulty: string;
        givens: string;
        solution: string;
      };
      return puzzleRowToData({
        puzzle_id: row.puzzle_id,
        difficulty: row.difficulty,
        givens: row.givens,
        solution: row.solution,
        rating_score: 1000,
        source: "rpc",
        is_active: true,
      });
    }

    // RPC returned no rows — try direct query as fallback
    const { data: puzzles, error: queryError } = await supabase
      .from("puzzles")
      .select("*")
      .eq("difficulty", difficulty)
      .eq("is_active", true)
      .limit(1)
      .order("rating_score", { ascending: true });

    if (!queryError && puzzles && puzzles.length > 0) {
      return puzzleRowToData(puzzles[0] as PuzzleRow);
    }

    if (excludedPuzzleId) {
      const { data: fallbackPuzzles, error: fallbackQueryError } = await supabase
        .from("puzzles")
        .select("*")
        .eq("difficulty", difficulty)
        .eq("is_active", true)
        .limit(1)
        .order("rating_score", { ascending: true });

      if (!fallbackQueryError && fallbackPuzzles && fallbackPuzzles.length > 0) {
        return puzzleRowToData(fallbackPuzzles[0] as PuzzleRow);
      }
    }
  }

  // Fallback: use hardcoded puzzle
  return {
    puzzle_id: FALLBACK_PUZZLES[difficulty].puzzle_id,
    difficulty,
    givens: FALLBACK_PUZZLES[difficulty].givens.map((r) => [...r]),
    solution: FALLBACK_PUZZLES[difficulty].solution.map((r) => [...r]),
  };
}

/** Fetch the daily puzzle for a given date and mode. */
export async function fetchDailyPuzzle(
  dateStr: string,
  mode: "daily" | "daily_duel" = "daily"
): Promise<RawPuzzleData> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("get_daily_puzzle", {
      p_date: dateStr,
      p_mode: mode,
    });

    if (error) {
      console.warn(
        `[Puzzle] RPC get_daily_puzzle failed: ${error.message}. Falling back.`
      );
    } else if (data && Array.isArray(data) && data.length > 0) {
      const row = data[0] as {
        puzzle_id: string;
        difficulty: string;
        givens: string;
        solution: string;
      };
      return puzzleRowToData({
        puzzle_id: row.puzzle_id,
        difficulty: row.difficulty,
        givens: row.givens,
        solution: row.solution,
        rating_score: 1000,
        source: "daily_rpc",
        is_active: true,
      });
    }

    // Fallback: direct query on daily_puzzles table
    const { data: dpRows, error: dpError } = await supabase
      .from("daily_puzzles")
      .select("puzzle_id, difficulty, puzzles!inner(givens, solution)")
      .eq("date", dateStr)
      .eq("mode", mode)
      .limit(1);

    if (!dpError && dpRows && dpRows.length > 0 && dpRows[0]?.puzzles) {
      const dp = dpRows[0] as {
        puzzle_id: string;
        difficulty: string;
        puzzles: { givens: string; solution: string } | { givens: string; solution: string }[];
      };
      const inner = Array.isArray(dp.puzzles) ? dp.puzzles[0] : dp.puzzles;
      if (inner) {
        return puzzleRowToData({
          puzzle_id: dp.puzzle_id,
          difficulty: dp.difficulty,
          givens: inner.givens,
          solution: inner.solution,
          rating_score: 1000,
          source: "daily_direct",
          is_active: true,
        });
      }
    }
  }

  // Fallback: hardcoded Medium puzzle for daily
  const fallback = FALLBACK_PUZZLES.Medium;
  return {
    puzzle_id: fallback.puzzle_id,
    difficulty: fallback.difficulty,
    givens: fallback.givens.map((r) => [...r]),
    solution: fallback.solution.map((r) => [...r]),
  };
}

/** Legacy sync accessor for useSudokuGame fallback path. */
export function getPuzzleByDifficulty(d: Difficulty): SudokuPuzzle {
  return clonePuzzle(FALLBACK_PUZZLES[d]);
}

export function getDailyPuzzle(): SudokuPuzzle {
  return clonePuzzle(FALLBACK_PUZZLES.Medium);
}

function clonePuzzle(p: SudokuPuzzle): SudokuPuzzle {
  return {
    puzzle_id: p.puzzle_id,
    difficulty: p.difficulty,
    mode: p.mode,
    givens: p.givens.map((r) => [...r]),
    initial: p.givens.map((r) => [...r]),
    solution: p.solution.map((r) => [...r]),
  };
}

export function makeEmptyNotes(): NotesBoard {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
}

export function isComplete(board: Board, solution: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

export function countFilled(board: Board): number {
  let n = 0;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] !== 0) n++;
  return n;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
