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
  mode: "daily" | "classic" | "duel" | "ranked";
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
      "530070000" +
        "600195000" +
        "098000060" +
        "800060003" +
        "400803001" +
        "700020006" +
        "060000280" +
        "000419005" +
        "000080079"
    ),
    solution: parse(
      "534678912" +
        "672195348" +
        "198342567" +
        "859761423" +
        "426853791" +
        "713924856" +
        "961537284" +
        "287419635" +
        "345286179"
    ),
  },
  Medium: {
    puzzle_id: "seed_medium_001",
    difficulty: "Medium",
    mode: "classic",
    givens: parse(
      "000260701" +
        "680070090" +
        "190004500" +
        "820100040" +
        "004602900" +
        "050003028" +
        "009300074" +
        "040050036" +
        "703018000"
    ),
    solution: parse(
      "435269781" +
        "682571493" +
        "197834562" +
        "826195347" +
        "374682915" +
        "951743628" +
        "519326874" +
        "248957136" +
        "763418259"
    ),
  },
  Hard: {
    puzzle_id: "seed_hard_001",
    difficulty: "Hard",
    mode: "classic",
    givens: parse(
      "000000907" +
        "000420180" +
        "000705026" +
        "100904000" +
        "050000040" +
        "000507009" +
        "920108000" +
        "034059000" +
        "507000000"
    ),
    solution: parse(
      "462831957" +
        "795426183" +
        "381795426" +
        "173984265" +
        "659312748" +
        "248567319" +
        "926178534" +
        "834259671" +
        "517643892"
    ),
  },
  Expert: {
    puzzle_id: "seed_expert_001",
    difficulty: "Expert",
    mode: "classic",
    givens: parse(
      "100007090" +
        "030020008" +
        "009600500" +
        "005300900" +
        "010080002" +
        "600004000" +
        "300000010" +
        "040000007" +
        "007000300"
    ),
    solution: parse(
      "162857493" +
        "534129678" +
        "879643521" +
        "425316789" +
        "913785642" +
        "687294135" +
        "356478912" +
        "241935867" +
        "798261354"
    ),
  },
  Master: {
    puzzle_id: "seed_master_001",
    difficulty: "Master",
    mode: "classic",
    givens: parse(
      "000000010" +
        "400000000" +
        "020000000" +
        "000050407" +
        "008000300" +
        "001090000" +
        "300400200" +
        "050100000" +
        "000806000"
    ),
    solution: parse(
      "693784512" +
        "487512936" +
        "125963874" +
        "932651487" +
        "568247391" +
        "741398625" +
        "319475268" +
        "856129743" +
        "274836159"
    ),
  },
};

function parse(s: string): Board {
  const b: Board = [];
  for (let r = 0; r < 9; r++) {
    const row: number[] = [];
    for (let c = 0; c < 9; c++) {
      row.push(parseInt(s[r * 9 + c] ?? "0", 10));
    }
    b.push(row);
  }
  return b;
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

/** Fetch a classic puzzle from the backend RPC, falling back to hardcoded. */
export async function fetchClassicPuzzle(
  userId: string | null,
  difficulty: Difficulty
): Promise<RawPuzzleData> {
  if (isSupabaseConfigured && userId) {
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

    if (
      !dpError &&
      dpRows &&
      dpRows.length > 0 &&
      Array.isArray(dpRows[0]?.puzzles)
    ) {
      const dp = dpRows[0] as {
        puzzle_id: string;
        difficulty: string;
        puzzles: { givens: string; solution: string }[];
      };
      const inner = dp.puzzles[0];
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
