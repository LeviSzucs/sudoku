import { getDailyDateKey, getDailyDateWindow } from "@/lib/daily";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const PAST_DAILY_COUNT = 7;
export const DAILY_HISTORY_COUNT = PAST_DAILY_COUNT + 1;

export interface PastDailySolvedResult {
  resultId: string;
  puzzleId: string | null;
  difficulty: string;
  score: number;
  elapsedSeconds: number;
  completedAt: string;
  mode: "daily";
}

export interface PastDailyHistoryEntry {
  dateKey: string;
  state: "loading" | "solved" | "missed" | "unavailable";
  result: PastDailySolvedResult | null;
}

export type DailyHistoryLoadStatus = "idle" | "loading" | "ready" | "unavailable";

export interface DailyHistoryLoadResult {
  entries: PastDailyHistoryEntry[];
  status: "ready" | "unavailable";
}

interface PastDailyResultRow {
  result_id: string;
  puzzle_id: string | null;
  difficulty: string;
  completed: boolean;
  won: boolean | null;
  elapsed_seconds: number;
  final_score: number;
  completed_at: string;
}

interface PastDailySessionRow {
  puzzle_id: string | null;
  difficulty: string;
  created_at: string;
  game_results: PastDailyResultRow[] | PastDailyResultRow | null;
}

export function getPastDailyDateKeys(todayKey = getDailyDateKey()): string[] {
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  return Array.from({ length: PAST_DAILY_COUNT }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - index - 1);
    return getDailyDateKey(date);
  });
}

export function getDailyHistoryDateKeys(todayKey = getDailyDateKey()): string[] {
  return [todayKey, ...getPastDailyDateKeys(todayKey)];
}

function resultRows(value: PastDailySessionRow["game_results"]): PastDailyResultRow[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function isStoredDailySolve(result: PastDailyResultRow): boolean {
  return (
    result.completed === true &&
    result.won !== false &&
    result.final_score > 0 &&
    !result.result_id.endsWith("_failed")
  );
}

function isBetterDailyResult(candidate: PastDailySolvedResult, current: PastDailySolvedResult): boolean {
  if (candidate.score !== current.score) return candidate.score > current.score;
  if (candidate.elapsedSeconds !== current.elapsedSeconds) return candidate.elapsedSeconds < current.elapsedSeconds;
  return candidate.completedAt > current.completedAt;
}

export async function fetchDailyHistory(
  userId: string,
  todayKey = getDailyDateKey()
): Promise<DailyHistoryLoadResult> {
  const dateKeys = getDailyHistoryDateKeys(todayKey);
  const unavailable = () =>
    ({
      status: "unavailable" as const,
      entries: dateKeys.map<PastDailyHistoryEntry>((dateKey) => ({
        dateKey,
        state: "unavailable",
        result: null,
      })),
    });

  if (!isSupabaseConfigured) return unavailable();

  const oldestWindow = getDailyDateWindow(dateKeys[dateKeys.length - 1]);
  const todayWindow = getDailyDateWindow(todayKey);
  let data: unknown[] | null = null;
  try {
    const response = await supabase
      .from("puzzle_sessions")
      .select(
        `
          puzzle_id,
          difficulty,
          created_at,
          game_results!game_results_session_id_fkey (
            result_id,
            puzzle_id,
            difficulty,
            completed,
            won,
            elapsed_seconds,
            final_score,
            completed_at
          )
        `
      )
      .eq("user_id", userId)
      .eq("mode", "daily")
      .gte("created_at", oldestWindow.startIso)
      .lt("created_at", todayWindow.endIso)
      .order("created_at", { ascending: false });

    if (response.error) {
      console.warn("[Past Dailies] History unavailable:", response.error.message);
      return unavailable();
    }
    data = response.data;
  } catch (error) {
    console.warn(
      "[Past Dailies] History unavailable:",
      error instanceof Error ? error.message : "Unknown history error"
    );
    return unavailable();
  }

  const requestedDates = new Set(dateKeys);
  const solvedByDate = new Map<string, PastDailySolvedResult>();

  for (const session of (data ?? []) as PastDailySessionRow[]) {
    const dateKey = getDailyDateKey(new Date(session.created_at));
    if (!requestedDates.has(dateKey)) continue;

    const storedResult = resultRows(session.game_results)
      .filter(isStoredDailySolve)
      .sort(
        (left, right) =>
          right.final_score - left.final_score
          || left.elapsed_seconds - right.elapsed_seconds
          || new Date(right.completed_at).getTime() - new Date(left.completed_at).getTime()
      )[0];
    if (!storedResult) continue;

    const candidate: PastDailySolvedResult = {
      resultId: storedResult.result_id,
      puzzleId: storedResult.puzzle_id ?? session.puzzle_id,
      difficulty: storedResult.difficulty || session.difficulty,
      score: storedResult.final_score,
      elapsedSeconds: storedResult.elapsed_seconds,
      completedAt: storedResult.completed_at,
      mode: "daily",
    };
    const current = solvedByDate.get(dateKey);
    if (!current || isBetterDailyResult(candidate, current)) solvedByDate.set(dateKey, candidate);
  }

  return {
    status: "ready",
    entries: dateKeys.map<PastDailyHistoryEntry>((dateKey) => {
      const result = solvedByDate.get(dateKey) ?? null;
      return {
        dateKey,
        state: result ? "solved" : "missed",
        result,
      };
    }),
  };
}

