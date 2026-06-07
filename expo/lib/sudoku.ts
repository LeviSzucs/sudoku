/**
 * Sudoku data model + helpers.
 * Puzzles are fetched from Supabase via RPC or direct queries.
 * Fallback hardcoded puzzles exist only for offline/guest mode.
 */

import type { Difficulty } from "@/constants/mockData";
import { isSupabaseConfigured, supabase, type PuzzleRow, type DailyPuzzleRow } from "@/lib/supabase";
import { parseTextToBoard, validatePuzzle } from "@/lib/puzzleValidator";

const PREFERRED_PUZZLE_SOURCE = "technique_calibrated_20260607";

export type Board = number[][]; // 9x9, 0 = empty
export type NotesBoard = number[][][]; // 9x9 of arrays of pencil marks

export interface SudokuPuzzle {
  puzzle_id: string;
  difficulty: Difficulty;
  givens: Board;
  initial?: Board;
  solution: Board;
  mode: "daily" | "classic" | "duel" | "friend_challenge" | "ranked" | "ranked_duel";
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
      "000082073" +
      "804700015" +
      "300156208" +
      "905000002" +
      "070591006" +
      "040320050" +
      "186000597" +
      "002900060" +
      "700010320"
    ),
    solution: parse(
      "561482973" +
      "824739615" +
      "397156248" +
      "915864732" +
      "273591486" +
      "648327159" +
      "186243597" +
      "432975861" +
      "759618324"
    ),
  },
  Medium: {
    puzzle_id: "seed_medium_001",
    difficulty: "Medium",
    mode: "classic",
    givens: parse(
      "020000300" +
      "907050810" +
      "480307005" +
      "000000007" +
      "098003020" +
      "140978030" +
      "360125000" +
      "800039150" +
      "005000000"
    ),
    solution: parse(
      "526841379" +
      "937256814" +
      "481397265" +
      "653412987" +
      "798563421" +
      "142978536" +
      "369125748" +
      "874639152" +
      "215784693"
    ),
  },
  Hard: {
    puzzle_id: "seed_hard_001",
    difficulty: "Hard",
    mode: "classic",
    givens: parse(
      "800060503" +
      "000070410" +
      "100005007" +
      "000309000" +
      "780600002" +
      "002000005" +
      "009080040" +
      "401506020" +
      "200007609"
    ),
    solution: parse(
      "827164593" +
      "953872416" +
      "146935287" +
      "615329874" +
      "784651932" +
      "392748165" +
      "569283741" +
      "471596328" +
      "238417659"
    ),
  },
  Expert: {
    puzzle_id: "seed_expert_001",
    difficulty: "Expert",
    mode: "classic",
    givens: parse(
      "100072000" +
      "205800000" +
      "090060050" +
      "930200040" +
      "000007010" +
      "000030005" +
      "000000002" +
      "000040891" +
      "800600574"
    ),
    solution: parse(
      "163572489" +
      "275894136" +
      "498361257" +
      "931256748" +
      "652487913" +
      "784139625" +
      "547918362" +
      "326745891" +
      "819623574"
    ),
  },
  Master: {
    puzzle_id: "seed_master_001",
    difficulty: "Master",
    mode: "classic",
    givens: parse(
      "000070000" +
      "512000003" +
      "083001009" +
      "070000000" +
      "000094001" +
      "008000020" +
      "000513060" +
      "005060080" +
      "024000000"
    ),
    solution: parse(
      "469378152" +
      "512946873" +
      "783251649" +
      "371625498" +
      "256894731" +
      "948137526" +
      "897513264" +
      "135462987" +
      "624789315"
    ),
  },
};

function parse(s: string): Board {
  return parseTextToBoard(s);
}

async function fetchRandomActivePuzzleByDifficulty(
  difficulty: Difficulty,
  excludedPuzzleId?: string | null
): Promise<PuzzleRow | null> {
  const preferredCountQuery = supabase
    .from("puzzles")
    .select("puzzle_id", { count: "exact", head: true })
    .eq("difficulty", difficulty)
    .eq("is_active", true)
    .eq("source", PREFERRED_PUZZLE_SOURCE);
  const { count: preferredCount, error: preferredCountError } = excludedPuzzleId
    ? await preferredCountQuery.neq("puzzle_id", excludedPuzzleId)
    : await preferredCountQuery;

  if (!preferredCountError && preferredCount && preferredCount > 0) {
    const preferredOffset = Math.floor(Math.random() * preferredCount);
    const preferredRowQuery = supabase
      .from("puzzles")
      .select("*")
      .eq("difficulty", difficulty)
      .eq("is_active", true)
      .eq("source", PREFERRED_PUZZLE_SOURCE)
      .range(preferredOffset, preferredOffset);
    const { data: preferredData, error: preferredError } = excludedPuzzleId
      ? await preferredRowQuery.neq("puzzle_id", excludedPuzzleId)
      : await preferredRowQuery;

    if (!preferredError && preferredData && preferredData.length > 0) {
      return preferredData[0] as PuzzleRow;
    }
  }

  const countQuery = supabase
    .from("puzzles")
    .select("puzzle_id", { count: "exact", head: true })
    .eq("difficulty", difficulty)
    .eq("is_active", true);
  const { count, error: countError } = excludedPuzzleId
    ? await countQuery.neq("puzzle_id", excludedPuzzleId)
    : await countQuery;

  if (countError || !count) return null;

  const offset = Math.floor(Math.random() * count);
  const rowQuery = supabase
    .from("puzzles")
    .select("*")
    .eq("difficulty", difficulty)
    .eq("is_active", true)
    .range(offset, offset);
  const { data, error } = excludedPuzzleId
    ? await rowQuery.neq("puzzle_id", excludedPuzzleId)
    : await rowQuery;

  if (error || !data || data.length === 0) return null;
  return data[0] as PuzzleRow;
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
      const replacementPuzzle = await fetchRandomActivePuzzleByDifficulty(difficulty, excludedPuzzleId);
      if (replacementPuzzle) {
        return puzzleRowToData(replacementPuzzle);
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
    const fallbackPuzzle = await fetchRandomActivePuzzleByDifficulty(difficulty);
    if (fallbackPuzzle) {
      return puzzleRowToData(fallbackPuzzle);
    }

    if (excludedPuzzleId) {
      const retryPuzzle = await fetchRandomActivePuzzleByDifficulty(difficulty);
      if (retryPuzzle) {
        return puzzleRowToData(retryPuzzle);
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
      .select("puzzle_id, difficulty, puzzles!inner(givens, solution, is_active)")
      .eq("date", dateStr)
      .eq("mode", mode)
      .eq("puzzles.is_active", true)
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
