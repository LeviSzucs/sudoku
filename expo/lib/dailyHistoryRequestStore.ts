export interface DailyHistoryCacheRecord<T> {
  fetchedAt: number;
  refreshKey: string | null;
  value: T;
}

export interface DailyHistoryRequestResolution<T> {
  accepted: boolean;
  identity: string;
  value: T;
}

export interface DailyHistoryRequest<T> {
  coalesced: boolean;
  identity: string;
  promise: Promise<DailyHistoryRequestResolution<T>>;
}

export interface DailyHistoryRequestStore<T> {
  begin(cacheKey: string, refreshKey: string | null, loader: () => Promise<T>): DailyHistoryRequest<T>;
  peek(cacheKey: string): DailyHistoryCacheRecord<T> | undefined;
  peekFresh(cacheKey: string, refreshKey: string | null, freshForMs: number): DailyHistoryCacheRecord<T> | undefined;
}

export function isCurrentDailyHistoryRequest<T>(
  currentIdentity: string | null,
  resolution: DailyHistoryRequestResolution<T>
): boolean {
  return resolution.accepted && currentIdentity === resolution.identity;
}

function requestIdentity(cacheKey: string, refreshKey: string | null): string {
  return JSON.stringify([cacheKey, refreshKey]);
}

export function createDailyHistoryRequestStore<T>(now: () => number = Date.now): DailyHistoryRequestStore<T> {
  const cache = new Map<string, DailyHistoryCacheRecord<T>>();
  const inFlight = new Map<string, Promise<DailyHistoryRequestResolution<T>>>();
  const latestIdentity = new Map<string, string>();

  return {
    begin(cacheKey, refreshKey, loader) {
      const identity = requestIdentity(cacheKey, refreshKey);
      latestIdentity.set(cacheKey, identity);

      const existing = inFlight.get(identity);
      if (existing) return { coalesced: true, identity, promise: existing };

      const promise = Promise.resolve()
        .then(loader)
        .then((value) => {
          const accepted = latestIdentity.get(cacheKey) === identity;
          if (accepted) {
            cache.set(cacheKey, {
              fetchedAt: now(),
              refreshKey,
              value,
            });
          }
          return { accepted, identity, value };
        });

      inFlight.set(identity, promise);
      const clearInFlight = () => {
        if (inFlight.get(identity) === promise) inFlight.delete(identity);
      };
      void promise.then(clearInFlight, clearInFlight);

      return { coalesced: false, identity, promise };
    },

    peek(cacheKey) {
      return cache.get(cacheKey);
    },

    peekFresh(cacheKey, refreshKey, freshForMs) {
      const cached = cache.get(cacheKey);
      if (!cached || cached.refreshKey !== refreshKey || now() - cached.fetchedAt >= freshForMs) return undefined;
      return cached;
    },
  };
}

