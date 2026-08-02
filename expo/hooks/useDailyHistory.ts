import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchDailyHistory,
  getDailyHistoryDateKeys,
  type DailyHistoryLoadStatus,
  type PastDailyHistoryEntry,
} from "@/lib/pastDailies";
import { createDailyHistoryRequestStore, isCurrentDailyHistoryRequest } from "@/lib/dailyHistoryRequestStore";
import { shouldLoadDailyHistory } from "@/lib/weeklyDailySummary";

const CACHE_FRESH_MS = 5 * 60 * 1000;

interface HistoryValue {
  entries: PastDailyHistoryEntry[];
  status: "ready" | "unavailable";
}

interface DailyHistoryState {
  cacheKey: string | null;
  entries: PastDailyHistoryEntry[];
  status: DailyHistoryLoadStatus;
}

export interface DailyHistorySnapshot {
  entries: PastDailyHistoryEntry[];
  status: DailyHistoryLoadStatus;
  todayKey: string;
}

interface UseDailyHistoryInput {
  active: boolean;
  userId: string | null;
  todayKey: string;
  refreshKey?: string | null;
}

const historyRequests = createDailyHistoryRequestStore<HistoryValue>();

function placeholderEntries(todayKey: string, state: "loading" | "unavailable"): PastDailyHistoryEntry[] {
  return getDailyHistoryDateKeys(todayKey).map((dateKey) => ({
    dateKey,
    state,
    result: null,
  }));
}

export function useDailyHistory({
  active,
  userId,
  todayKey,
  refreshKey = null,
}: UseDailyHistoryInput): DailyHistorySnapshot {
  const cacheKey = userId ? `${userId}:${todayKey}` : null;
  const initialState = useMemo<DailyHistoryState>(() => ({
    cacheKey,
    entries: placeholderEntries(todayKey, "loading"),
    status: userId ? "loading" : "idle",
  }), [cacheKey, todayKey, userId]);
  const [state, setState] = useState<DailyHistoryState>(initialState);
  const requestIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldLoadDailyHistory(active, userId) || !userId || !cacheKey) return;

    const cached = historyRequests.peek(cacheKey);
    const cacheIsFresh = historyRequests.peekFresh(cacheKey, refreshKey, CACHE_FRESH_MS);

    if (cached) {
      setState({ cacheKey, entries: cached.value.entries, status: cached.value.status });
      if (cacheIsFresh) return;
    } else {
      setState(initialState);
    }

    const request = historyRequests.begin(cacheKey, refreshKey, () =>
      fetchDailyHistory(userId, todayKey).then((result) => ({
        entries: result.entries,
        status: result.status,
      }))
    );
    requestIdentityRef.current = request.identity;

    let cancelled = false;
    void request.promise
      .then((resolution) => {
        if (!cancelled && isCurrentDailyHistoryRequest(requestIdentityRef.current, resolution)) {
          setState({ cacheKey, entries: resolution.value.entries, status: resolution.value.status });
        }
      })
      .catch((error) => {
        console.warn("[Daily History] Request failed:", error instanceof Error ? error.message : "Unknown history error");
        const entries = placeholderEntries(todayKey, "unavailable");
        if (!cancelled && requestIdentityRef.current === request.identity) {
          setState({ cacheKey, entries, status: "unavailable" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, cacheKey, initialState, refreshKey, todayKey, userId]);

  if (!userId) return { entries: [], status: "idle", todayKey };
  if (state.cacheKey !== cacheKey) {
    return { entries: initialState.entries, status: initialState.status, todayKey };
  }
  return { entries: state.entries, status: state.status, todayKey };
}

