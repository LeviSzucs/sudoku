import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

import { logDevDiagnostic } from "@/lib/performanceDiagnostics";
import {
  getReviewRequestDecision,
  parseReviewRequestState,
  recordReviewRequestAttempt,
  type ReviewRequestContext,
  type ReviewRequestState,
} from "@/lib/storeReviewPolicy";

export const STORE_REVIEW_STORAGE_KEY = "@sudoduel/store-review/v1";

export interface StoreReviewDependencies {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  isAvailable: () => Promise<boolean>;
  requestReview: () => Promise<void>;
}

const nativeDependencies: StoreReviewDependencies = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  isAvailable: () => StoreReview.isAvailableAsync(),
  requestReview: () => StoreReview.requestReview(),
};

export type StoreReviewAttemptResult = "attempted" | "ineligible" | "unavailable" | "error";

let claimQueue: Promise<void> = Promise.resolve();

async function claimReviewAttempt(
  context: ReviewRequestContext,
  dependencies: StoreReviewDependencies,
): Promise<{ claimed: boolean; state: ReviewRequestState; reason: string }> {
  let result: { claimed: boolean; state: ReviewRequestState; reason: string } | null = null;
  claimQueue = claimQueue.then(async () => {
    const state = parseReviewRequestState(await dependencies.getItem(STORE_REVIEW_STORAGE_KEY));
    const decision = getReviewRequestDecision(context, state);
    if (!decision.eligible) {
      result = { claimed: false, state, reason: decision.reason };
      return;
    }
    const nextState = recordReviewRequestAttempt(state, context);
    await dependencies.setItem(STORE_REVIEW_STORAGE_KEY, JSON.stringify(nextState));
    result = { claimed: true, state: nextState, reason: "eligible" };
  }).catch((error: unknown) => {
    logDevDiagnostic("store review persistence error", {
      message: error instanceof Error ? error.message : "Unknown persistence error",
    });
    result = { claimed: false, state: parseReviewRequestState(null), reason: "persistence_error" };
  });
  await claimQueue;
  return result ?? { claimed: false, state: parseReviewRequestState(null), reason: "persistence_error" };
}

export async function attemptStoreReview(
  context: ReviewRequestContext,
  dependencies: StoreReviewDependencies = nativeDependencies,
): Promise<StoreReviewAttemptResult> {
  const initialState = parseReviewRequestState(await dependencies.getItem(STORE_REVIEW_STORAGE_KEY).catch(() => null));
  const initialDecision = getReviewRequestDecision(context, initialState);
  if (!initialDecision.eligible) {
    logDevDiagnostic("store review ineligible", { event: context.event, reason: initialDecision.reason });
    return "ineligible";
  }
  logDevDiagnostic("store review eligible", { event: context.event, appVersion: context.appVersion });

  try {
    if (!(await dependencies.isAvailable())) {
      logDevDiagnostic("store review unavailable", { event: context.event });
      return "unavailable";
    }
  } catch (error: unknown) {
    logDevDiagnostic("store review capability error", {
      event: context.event,
      message: error instanceof Error ? error.message : "Unknown capability error",
    });
    return "unavailable";
  }

  const claim = await claimReviewAttempt(context, dependencies);
  if (!claim.claimed) {
    logDevDiagnostic("store review ineligible", { event: context.event, reason: claim.reason });
    return claim.reason === "persistence_error" ? "error" : "ineligible";
  }

  try {
    logDevDiagnostic("store review attempt invoked", { event: context.event, appVersion: context.appVersion });
    await dependencies.requestReview();
    return "attempted";
  } catch (error: unknown) {
    logDevDiagnostic("store review invocation error", {
      event: context.event,
      message: error instanceof Error ? error.message : "Unknown invocation error",
    });
    return "error";
  }
}
