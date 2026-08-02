import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchDailyHistory,
  getDailyHistoryDateKeys,
  type DailyHistoryLoadStatus,
  type PastDailyHistoryEntry,
} from "@/lib/pastDailies";
import { shouldLoadDailyHistory } from "@/lib/weeklyDailySummary";

const CACHE_FRESH_MS = 5 * 60 * 1000;

interface HistoryCacheEntry {
  fetchedAt: number;
  refreshKey: string | null;
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

const historyCache = new Map<string, HistoryCacheEntry>();
const inFlightHistory = new Map<string, Promise<HistoryCacheEntry>>();

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
  const requestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldLoadDailyHistory(active, userId) || !userId || !cacheKey) return;

    const cached = historyCache.get(cacheKey);
    const cacheIsFresh = cached
      && Date.now() - cached.fetchedAt < CACHE_FRESH_MS
      && cached.refreshKey === refreshKey;

    if (cached) {
      setState({ cacheKey, entries: cached.entries, status: cached.status });
      if (cacheIsFresh) return;
    } else {
      setState(initialState);
    }

    requestKeyRef.current = cacheKey;
    const inFlightKey = `${cacheKey}:${refreshKey ?? "no-result"}`;
    let request = inFlightHistory.get(inFlightKey);
    if (!request) {
      request = fetchDailyHistory(userId, todayKey).then((result) => ({
        fetchedAt: Date.now(),
        refreshKey,
        entries: result.entries,
        status: result.status,
      }));
      inFlightHistory.set(inFlightKey, request);
      const clearInFlight = () => {
        if (inFlightHistory.get(inFlightKey) === request) inFlightHistory.delete(inFlightKey);
      };
      void request.then(clearInFlight, clearInFlight);
    }

    let cancelled = false;
    void request
      .then((next) => {
        historyCache.set(cacheKey, next);
        if (!cancelled && requestKeyRef.current === cacheKey) {
          setState({ cacheKey, entries: next.entries, status: next.status });
        }
      })
      .catch((error) => {
        console.warn("[Daily History] Request failed:", error instanceof Error ? error.message : "Unknown history error");
        const entries = placeholderEntries(todayKey, "unavailable");
        if (!cancelled && requestKeyRef.current === cacheKey) {
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

