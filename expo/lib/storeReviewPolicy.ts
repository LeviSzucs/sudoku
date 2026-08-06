export const STORE_REVIEW_SCHEMA_VERSION = 1 as const;
export const STORE_REVIEW_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const STORE_REVIEW_DELAY_MS = 2000;
export const MAX_ATTEMPTED_RESULT_KEYS = 20;

export type ReviewRequestEvent =
  | "classic_completion"
  | "daily_completion"
  | "daily_duel_win"
  | "ranked_duel_win"
  | "friend_challenge_win";

export type ReviewResultOutcome =
  | "completed"
  | "win"
  | "loss"
  | "draw"
  | "pending"
  | "failed"
  | "cancelled"
  | "unresolved";

export interface ReviewRequestContext {
  event: ReviewRequestEvent;
  signedIn: boolean;
  appVersion: string;
  puzzlesCompleted: number;
  dailyCompletions: number;
  authoritativeDuelWins: number;
  resultSaved: boolean;
  resultAuthoritative: boolean;
  resultOutcome: ReviewResultOutcome;
  resultKey: string;
  resultIsFresh: boolean;
  modalVisible: boolean;
  modalSettled: boolean;
  blockingUiActive: boolean;
  nowMs?: number;
}

export interface ReviewRequestState {
  schemaVersion: typeof STORE_REVIEW_SCHEMA_VERSION;
  lastAttemptedAt: string | null;
  lastAttemptedVersion: string | null;
  attemptedResultKeys: string[];
}

export type ReviewRequestIneligibleReason =
  | "guest"
  | "result_not_saved"
  | "result_not_authoritative"
  | "unsafe_outcome"
  | "insufficient_completions"
  | "milestone_not_reached"
  | "already_attempted_version"
  | "cooldown"
  | "result_already_attempted"
  | "old_result"
  | "modal_not_visible"
  | "modal_not_settled"
  | "blocking_ui"
  | "invalid_result_key";

export type ReviewRequestDecision =
  | { eligible: true; reason: "eligible" }
  | { eligible: false; reason: ReviewRequestIneligibleReason };

export function getReviewRequestEventForMode(mode: string): ReviewRequestEvent | null {
  switch (mode.trim().toLowerCase()) {
    case "classic":
      return "classic_completion";
    case "daily":
      return "daily_completion";
    case "daily_duel":
    case "duel":
      return "daily_duel_win";
    case "ranked":
    case "ranked_duel":
      return "ranked_duel_win";
    case "friend_challenge":
      return "friend_challenge_win";
    default:
      return null;
  }
}

export function createEmptyReviewRequestState(): ReviewRequestState {
  return {
    schemaVersion: STORE_REVIEW_SCHEMA_VERSION,
    lastAttemptedAt: null,
    lastAttemptedVersion: null,
    attemptedResultKeys: [],
  };
}

export function parseReviewRequestState(raw: string | null): ReviewRequestState {
  if (!raw) return createEmptyReviewRequestState();
  try {
    const value = JSON.parse(raw) as Partial<ReviewRequestState> | null;
    if (!value || value.schemaVersion !== STORE_REVIEW_SCHEMA_VERSION) {
      return createEmptyReviewRequestState();
    }
    return {
      schemaVersion: STORE_REVIEW_SCHEMA_VERSION,
      lastAttemptedAt: typeof value.lastAttemptedAt === "string" ? value.lastAttemptedAt : null,
      lastAttemptedVersion: typeof value.lastAttemptedVersion === "string" ? value.lastAttemptedVersion : null,
      attemptedResultKeys: Array.isArray(value.attemptedResultKeys)
        ? value.attemptedResultKeys.filter((key): key is string => typeof key === "string" && key.length > 0).slice(-MAX_ATTEMPTED_RESULT_KEYS)
        : [],
    };
  } catch {
    return createEmptyReviewRequestState();
  }
}

function isSuccessfulOutcome(context: ReviewRequestContext): boolean {
  if (context.event === "classic_completion" || context.event === "daily_completion") {
    return context.resultOutcome === "completed";
  }
  return context.resultOutcome === "win";
}

function hasReachedMilestone(context: ReviewRequestContext): boolean {
  if (context.event === "daily_completion") return context.dailyCompletions >= 3;
  if (context.event === "classic_completion") return context.puzzlesCompleted >= 10;
  return context.authoritativeDuelWins >= 2;
}

export function getReviewRequestDecision(
  context: ReviewRequestContext,
  state: ReviewRequestState,
): ReviewRequestDecision {
  if (!context.signedIn) return { eligible: false, reason: "guest" };
  if (!context.resultSaved) return { eligible: false, reason: "result_not_saved" };
  if (!context.resultAuthoritative) return { eligible: false, reason: "result_not_authoritative" };
  if (!isSuccessfulOutcome(context)) return { eligible: false, reason: "unsafe_outcome" };
  if (context.puzzlesCompleted < 5) return { eligible: false, reason: "insufficient_completions" };
  if (!hasReachedMilestone(context)) return { eligible: false, reason: "milestone_not_reached" };
  if (!context.resultKey.trim()) return { eligible: false, reason: "invalid_result_key" };
  if (!context.resultIsFresh) return { eligible: false, reason: "old_result" };
  if (!context.modalVisible) return { eligible: false, reason: "modal_not_visible" };
  if (!context.modalSettled) return { eligible: false, reason: "modal_not_settled" };
  if (context.blockingUiActive) return { eligible: false, reason: "blocking_ui" };
  if (state.attemptedResultKeys.includes(context.resultKey)) return { eligible: false, reason: "result_already_attempted" };
  if (state.lastAttemptedVersion === context.appVersion) return { eligible: false, reason: "already_attempted_version" };

  const lastAttemptMs = state.lastAttemptedAt ? Date.parse(state.lastAttemptedAt) : Number.NaN;
  const nowMs = context.nowMs ?? Date.now();
  if (Number.isFinite(lastAttemptMs) && nowMs - lastAttemptMs < STORE_REVIEW_COOLDOWN_MS) {
    return { eligible: false, reason: "cooldown" };
  }
  return { eligible: true, reason: "eligible" };
}

export function recordReviewRequestAttempt(
  state: ReviewRequestState,
  context: ReviewRequestContext,
): ReviewRequestState {
  const attemptedResultKeys = [...state.attemptedResultKeys.filter((key) => key !== context.resultKey), context.resultKey]
    .slice(-MAX_ATTEMPTED_RESULT_KEYS);
  return {
    schemaVersion: STORE_REVIEW_SCHEMA_VERSION,
    lastAttemptedAt: new Date(context.nowMs ?? Date.now()).toISOString(),
    lastAttemptedVersion: context.appVersion,
    attemptedResultKeys,
  };
}

export interface ReviewDelayScheduler {
  setTimeout: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
}

const nativeReviewDelayScheduler: ReviewDelayScheduler = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle),
};

export function scheduleReviewRequest(
  attempt: () => void,
  delayMs = STORE_REVIEW_DELAY_MS,
  scheduler: ReviewDelayScheduler = nativeReviewDelayScheduler,
): () => void {
  let active = true;
  const handle = scheduler.setTimeout(() => {
    if (!active) return;
    active = false;
    attempt();
  }, delayMs);
  return () => {
    if (!active) return;
    active = false;
    scheduler.clearTimeout(handle);
  };
}
