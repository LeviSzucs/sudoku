import type { DailyHistoryLoadStatus, PastDailyHistoryEntry, PastDailySolvedResult } from "@/lib/pastDailies";

export type WeeklyDailyDayState =
  | "solved"
  | "missed"
  | "today_available"
  | "today_in_progress"
  | "today_solved"
  | "upcoming"
  | "unavailable";

export interface WeeklyDailyDay {
  dateKey: string;
  label: string;
  state: WeeklyDailyDayState;
  result: PastDailySolvedResult | null;
}

export interface WeeklyDailySummaryModel {
  days: WeeklyDailyDay[];
  elapsedDayCount: number;
  solvedCount: number;
  bestScore: number | null;
  todayState: WeeklyDailyDayState;
}

interface WeeklyDailySummaryInput {
  todayKey: string;
  entries: PastDailyHistoryEntry[];
  queryStatus: DailyHistoryLoadStatus;
  todayInProgress?: boolean;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function shiftUtcDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getCurrentWeekDateKeys(todayKey: string): string[] {
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const mondayKey = shiftUtcDateKey(todayKey, -mondayOffset);
  return DAY_LABELS.map((_, index) => shiftUtcDateKey(mondayKey, index));
}

export function shouldLoadDailyHistory(active: boolean, userId: string | null): boolean {
  return active && Boolean(userId);
}

function chooseResult(current: PastDailySolvedResult | null, candidate: PastDailySolvedResult): PastDailySolvedResult {
  if (!current) return candidate;
  if (candidate.score !== current.score) return candidate.score > current.score ? candidate : current;
  if (candidate.elapsedSeconds !== current.elapsedSeconds) return candidate.elapsedSeconds < current.elapsedSeconds ? candidate : current;
  return candidate.completedAt > current.completedAt ? candidate : current;
}

export function deriveWeeklyDailySummary({
  todayKey,
  entries,
  queryStatus,
  todayInProgress = false,
}: WeeklyDailySummaryInput): WeeklyDailySummaryModel {
  const weekDateKeys = getCurrentWeekDateKeys(todayKey);
  const todayIndex = weekDateKeys.indexOf(todayKey);
  const elapsedDayCount = Math.max(1, todayIndex + 1);
  const solvedByDate = new Map<string, PastDailySolvedResult>();

  for (const entry of entries) {
    if (entry.state !== "solved" || !entry.result || entry.result.mode !== "daily") continue;
    solvedByDate.set(entry.dateKey, chooseResult(solvedByDate.get(entry.dateKey) ?? null, entry.result));
  }

  const days = weekDateKeys.map<WeeklyDailyDay>((dateKey, index) => {
    const result = solvedByDate.get(dateKey) ?? null;
    if (index > todayIndex) return { dateKey, label: DAY_LABELS[index], state: "upcoming", result: null };
    if (queryStatus === "loading" || queryStatus === "idle" || queryStatus === "unavailable") {
      return { dateKey, label: DAY_LABELS[index], state: "unavailable", result: null };
    }
    if (result) {
      return { dateKey, label: DAY_LABELS[index], state: index === todayIndex ? "today_solved" : "solved", result };
    }
    if (index === todayIndex) {
      return { dateKey, label: DAY_LABELS[index], state: todayInProgress ? "today_in_progress" : "today_available", result: null };
    }
    return { dateKey, label: DAY_LABELS[index], state: "missed", result: null };
  });

  const solvedResults = days
    .slice(0, elapsedDayCount)
    .map((day) => day.result)
    .filter((result): result is PastDailySolvedResult => Boolean(result));

  return {
    days,
    elapsedDayCount,
    solvedCount: solvedResults.length,
    bestScore: solvedResults.length > 0 ? Math.max(...solvedResults.map((result) => result.score)) : null,
    todayState: days[todayIndex]?.state ?? "unavailable",
  };
}

