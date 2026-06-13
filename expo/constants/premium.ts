export type PremiumFeatureStatus = "free" | "future_premium";
export type PremiumFeatureCategory = "core" | "duel" | "solo" | "stats" | "cosmetics" | "experience";
export type PremiumPlan = "free" | "premium";
export type PremiumFeatureKey =
  | "ad_free"
  | "basic_achievements"
  | "basic_avatar_customisation"
  | "basic_result_history"
  | "basic_stats"
  | "classic_all_difficulties"
  | "more_friend_challenges"
  | "duel_archive"
  | "advanced_stats"
  | "full_result_history"
  | "head_to_head_records"
  | "puzzle_archive"
  | "premium_themes"
  | "avatar_cosmetics"
  | "season_recaps";

export interface PremiumFeature {
  key?: PremiumFeatureKey;
  title: string;
  description: string;
  category: PremiumFeatureCategory;
  status: PremiumFeatureStatus;
}

export interface PremiumUsageState {
  friendChallengesCreatedToday?: number;
}

export interface PremiumLimitDecision {
  allowed: boolean;
  limit: number | null;
  remaining: number | null;
  reason?: string;
}

export const PREMIUM_V1_LIMITS = {
  freeFriendChallengesPerDay: 3,
  premiumFriendChallengesPerDay: null,
  freeResultHistoryLimit: 20,
  premiumResultHistoryLimit: null,
  freeAdvancedStats: false,
  premiumAdvancedStats: true,
} as const;

export const FREE_FEATURES: PremiumFeature[] = [
  { key: "classic_all_difficulties", title: "Unlimited Classic Sudoku", description: "Easy, Medium, Hard, Expert, and Master are playable for free.", category: "solo", status: "free" },
  { title: "Daily Sudoku", description: "One shared solo puzzle each day.", category: "core", status: "free" },
  { title: "Daily Duel", description: "Fair same-puzzle asynchronous duels.", category: "core", status: "free" },
  { title: "Ranked Duel", description: "Competitive RP matchmaking stays open to everyone.", category: "core", status: "free" },
  { title: "Accept Friend Challenges", description: "Receiving and playing friend challenges remains free.", category: "duel", status: "free" },
  { title: "Limited Friend Challenge creation", description: `Free accounts include ${PREMIUM_V1_LIMITS.freeFriendChallengesPerDay} friend challenge creations per day.`, category: "duel", status: "free" },
  { key: "basic_stats", title: "Basic stats", description: "Level, XP, streaks, best times, and rank overview.", category: "stats", status: "free" },
  { key: "basic_achievements", title: "Basic achievements", description: "Launch achievements remain available without Premium.", category: "stats", status: "free" },
  { key: "basic_avatar_customisation", title: "Basic profile and avatar customisation", description: "Core character avatar and profile options remain free.", category: "cosmetics", status: "free" },
  { key: "basic_result_history", title: "Basic result history", description: `Free accounts include access to the latest ${PREMIUM_V1_LIMITS.freeResultHistoryLimit} results.`, category: "stats", status: "free" },
  { title: "Future ads at natural breaks", description: "Free accounts may see occasional ads at natural breaks in a future version.", category: "experience", status: "free" },
];

export const FUTURE_PREMIUM_FEATURES: PremiumFeature[] = [
  { key: "ad_free", title: "Ad-free experience", description: "Remove occasional ad breaks for a cleaner Free-to-Premium upgrade path.", category: "experience", status: "future_premium" },
  { key: "more_friend_challenges", title: "Higher Friend Challenge creation", description: "More or unlimited friend challenge creation while keeping each match fair.", category: "duel", status: "future_premium" },
  { key: "advanced_stats", title: "Advanced stats", description: "Deeper solve trends, difficulty splits, and performance insights.", category: "stats", status: "future_premium" },
  { key: "full_result_history", title: "Full result history", description: "Complete results history and richer filtering.", category: "stats", status: "future_premium" },
  { key: "head_to_head_records", title: "Head-to-head history", description: "Expanded friend and rival comparison history.", category: "stats", status: "future_premium" },
  { key: "duel_archive", title: "More challenge and duel tools", description: "Deeper access to fair challenge review tools where applicable.", category: "duel", status: "future_premium" },
  { key: "premium_themes", title: "Premium themes", description: "Extra visual themes without changing gameplay outcomes.", category: "cosmetics", status: "future_premium" },
  { key: "avatar_cosmetics", title: "Premium avatar items and frames", description: "Premium clothing, frames, and profile cosmetics.", category: "cosmetics", status: "future_premium" },
  { key: "season_recaps", title: "Season recaps and rewards", description: "Cosmetic season identity, recaps, frames, and badges.", category: "cosmetics", status: "future_premium" },
  { key: "puzzle_archive", title: "Puzzle archive", description: "Replay past Daily Sudoku boards for practice without affecting live competition.", category: "solo", status: "future_premium" },
];

export const PREMIUM_ENTITLEMENT_TYPE = "sudoduel_premium";
export const PAYMENT_SYSTEM_IMPLEMENTED = false;
export const PREMIUM_FAIRNESS_NOTE = "Premium never boosts Ranked RP, leaderboard scores, matchmaking, or duel outcomes.";
export const PREMIUM_PURCHASES_NOTE = "Premium purchases are not available right now. Paid features will be clearly explained before they are offered.";
export const PREMIUM_DEV_NOTE = "All Classic difficulties are free. Premium focuses on ad-free play, stats, history, cosmetics, and fair duel tools.";

export function planFromPremium(isPremium: boolean): PremiumPlan {
  return isPremium ? "premium" : "free";
}

export function isPremiumUser(input: PremiumPlan | { isPremium?: boolean; plan?: PremiumPlan } | null | undefined): boolean {
  if (!input) return false;
  if (typeof input === "string") return input === "premium";
  if (typeof input.isPremium === "boolean") return input.isPremium;
  return input.plan === "premium";
}

export function canCreateFriendChallenge(plan: PremiumPlan, usageState: PremiumUsageState = {}): PremiumLimitDecision {
  if (plan === "premium") {
    return { allowed: true, limit: PREMIUM_V1_LIMITS.premiumFriendChallengesPerDay, remaining: null };
  }

  const used = usageState.friendChallengesCreatedToday ?? 0;
  const limit = PREMIUM_V1_LIMITS.freeFriendChallengesPerDay;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: used < limit,
    limit,
    remaining,
    reason: used < limit ? undefined : `Free accounts can create ${limit} Friend Challenges per day.`,
  };
}

export function getResultHistoryLimit(plan: PremiumPlan): number | null {
  return plan === "premium" ? PREMIUM_V1_LIMITS.premiumResultHistoryLimit : PREMIUM_V1_LIMITS.freeResultHistoryLimit;
}

export function canViewAdvancedStats(plan: PremiumPlan): boolean {
  return plan === "premium" ? PREMIUM_V1_LIMITS.premiumAdvancedStats : PREMIUM_V1_LIMITS.freeAdvancedStats;
}

export function shouldSuppressAds(plan: PremiumPlan): boolean {
  return plan === "premium";
}

export function canUsePremiumFeature(plan: PremiumPlan, _feature: PremiumFeatureKey): boolean {
  return plan === "premium";
}
