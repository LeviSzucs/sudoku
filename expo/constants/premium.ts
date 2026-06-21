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
  live?: boolean;
  enforcement?: string;
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
  freeFriendChallengesPerDay: 10,
  premiumFriendChallengesPerDay: null,
  freeResultHistoryLimit: 20,
  premiumResultHistoryLimit: null,
  freeAdvancedStats: false,
  premiumAdvancedStats: true,
} as const;

export const FREE_FIRST_LAUNCH_MODE = true;

export const FREE_FEATURES: PremiumFeature[] = [
  { key: "classic_all_difficulties", title: "Unlimited Classic Sudoku", description: "Easy, Medium, Hard, Expert, and Master are playable for free.", category: "solo", status: "free", live: true, enforcement: "Classic mode list remains fully open." },
  { title: "Daily Sudoku", description: "One shared solo puzzle each day.", category: "core", status: "free", live: true, enforcement: "Daily route remains free." },
  { title: "Daily Duel", description: "Fair same-puzzle asynchronous duels.", category: "core", status: "free", live: true, enforcement: "Versus Daily Duel remains free." },
  { title: "Ranked Duel", description: "Competitive RP matchmaking stays open to everyone.", category: "core", status: "free", live: true, enforcement: "Versus Ranked Duel remains free." },
  { title: "Accept Friend Challenges", description: "Receiving and playing friend challenges remains free.", category: "duel", status: "free", live: true, enforcement: "Incoming and active challenges remain playable." },
  { title: "Limited Friend Challenge creation", description: `Free accounts include ${PREMIUM_V1_LIMITS.freeFriendChallengesPerDay} friend challenge creations per day.`, category: "duel", status: "free", live: true, enforcement: "Friends challenge modal and send flow." },
  { key: "basic_stats", title: "Basic stats", description: "Level, XP, streaks, best times, and rank overview.", category: "stats", status: "free", live: true, enforcement: "Profile summary cards remain free." },
  { key: "basic_achievements", title: "Basic achievements", description: "Launch achievements remain available without Premium.", category: "stats", status: "free", live: true, enforcement: "Achievements screen remains free." },
  { key: "basic_avatar_customisation", title: "Basic profile and avatar customisation", description: FREE_FIRST_LAUNCH_MODE ? "Current avatar customisation stays open during the free-first launch." : "Core character avatar and profile options remain free.", category: "cosmetics", status: "free", live: true, enforcement: "Free avatar items remain selectable." },
  { key: "basic_result_history", title: "Basic result history", description: FREE_FIRST_LAUNCH_MODE ? "Result history is open in the current free-first launch build." : `Free accounts include access to the latest ${PREMIUM_V1_LIMITS.freeResultHistoryLimit} results.`, category: "stats", status: "free", live: true, enforcement: FREE_FIRST_LAUNCH_MODE ? "Results history remains open during launch mode." : "Results screen shows the latest 20 saved results for Free users." },
  { title: "Future ads at natural breaks", description: "Free accounts may see occasional ads at natural breaks in a future version.", category: "experience", status: "free", live: false, enforcement: "Ad policy only; no live ad SDK." },
];

export const PREMIUM_FEATURES: PremiumFeature[] = [
  { key: "ad_free", title: "Ad-free experience", description: "Remove occasional ad breaks when ads are introduced.", category: "experience", status: "future_premium", live: false, enforcement: "Planned only until ads exist." },
  { key: "more_friend_challenges", title: "Higher Friend Challenge creation", description: "Unlimited or higher Friend Challenge creation while keeping every match fair.", category: "duel", status: "future_premium", live: true, enforcement: "Friends challenge modal and send flow." },
  { key: "advanced_stats", title: "Advanced stats", description: "Detailed breakdowns and deeper stat views beyond the free profile summary.", category: "stats", status: "future_premium", live: true, enforcement: "Detailed stats screens such as Win Rate and puzzle splits." },
  { key: "full_result_history", title: "Full result history", description: "Complete saved results history instead of the Free recent-history limit.", category: "stats", status: "future_premium", live: true, enforcement: "Results History screen." },
  { key: "head_to_head_records", title: "Head-to-head history", description: "Expanded friend-vs-friend history and comparison details.", category: "stats", status: "future_premium", live: true, enforcement: "Friend head-to-head screen." },
  { key: "duel_archive", title: "More challenge and duel tools", description: "Deeper challenge review tools and archives where applicable.", category: "duel", status: "future_premium", live: false, enforcement: "Planned for a later update." },
  { key: "premium_themes", title: "Premium themes", description: "Extra visual themes without changing gameplay outcomes.", category: "cosmetics", status: "future_premium", live: false, enforcement: "Planned for a later update." },
  { key: "avatar_cosmetics", title: "Premium avatar cosmetics", description: "Premium-only frames, colours, and profile cosmetics.", category: "cosmetics", status: "future_premium", live: true, enforcement: "Avatar editor locked cosmetic options." },
  { key: "season_recaps", title: "Season recaps and rewards", description: "Cosmetic season identity, recaps, frames, and badges.", category: "cosmetics", status: "future_premium", live: false, enforcement: "Planned for a later update." },
  { key: "puzzle_archive", title: "Puzzle archive", description: "Replay past Daily Sudoku boards for practice without affecting live competition.", category: "solo", status: "future_premium", live: false, enforcement: "Planned for a later update." },
];

export const LIVE_PREMIUM_FEATURES = PREMIUM_FEATURES.filter((feature) => feature.live);
export const PLANNED_PREMIUM_FEATURES = PREMIUM_FEATURES.filter((feature) => !feature.live);
export const LIVE_PREMIUM_FEATURE_KEYS = new Set<PremiumFeatureKey>(LIVE_PREMIUM_FEATURES.map((feature) => feature.key).filter((key): key is PremiumFeatureKey => Boolean(key)));
const FREE_FEATURE_KEYS = new Set<PremiumFeatureKey>(FREE_FEATURES.map((feature) => feature.key).filter((key): key is PremiumFeatureKey => Boolean(key)));
const FREE_FIRST_LAUNCH_FEATURE_KEYS = new Set<PremiumFeatureKey>([
  "more_friend_challenges",
  "advanced_stats",
  "full_result_history",
  "head_to_head_records",
  "avatar_cosmetics",
]);

export const PREMIUM_FEATURE_MATRIX: Array<{
  plan: "free" | "premium";
  feature: PremiumFeatureKey;
  live: boolean;
  enforcement: string;
}> = [
  ...FREE_FEATURES
    .filter((feature): feature is PremiumFeature & { key: PremiumFeatureKey } => Boolean(feature.key))
    .map((feature) => ({
      plan: "free" as const,
      feature: feature.key,
      live: Boolean(feature.live),
      enforcement: feature.enforcement ?? "UI copy only",
    })),
  ...PREMIUM_FEATURES
    .filter((feature): feature is PremiumFeature & { key: PremiumFeatureKey } => Boolean(feature.key))
    .map((feature) => ({
      plan: "premium" as const,
      feature: feature.key,
      live: Boolean(feature.live),
      enforcement: feature.enforcement ?? "UI copy only",
    })),
];

export const PREMIUM_ENTITLEMENT_TYPE = "sudoduel_premium";
export const PAYMENT_SYSTEM_IMPLEMENTED = false;
export const PREMIUM_FAIRNESS_NOTE = "Premium never boosts Ranked RP, leaderboard scores, matchmaking, or duel outcomes.";
export const PREMIUM_PURCHASES_NOTE = "Paid features are clearly explained before purchase and do not affect competitive fairness.";
export const PREMIUM_DEV_NOTE = "All Classic difficulties are free. Premium focuses on fuller history, deeper stats, cosmetic extras, and fair social tools.";
export const FREE_FIRST_LAUNCH_NOTE = "SudoDuel is currently in free-first launch mode. Core play, social features, leaderboards, public profiles, and current avatar options remain open while Premium stays ready for future supporter perks and cosmetics.";

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
    reason: used < limit ? undefined : `You've used today's ${limit} free Friend Challenges. Premium gives you more challenge creation.`,
  };
}

export function getResultHistoryLimit(plan: PremiumPlan): number | null {
  if (FREE_FIRST_LAUNCH_MODE) return null;
  return plan === "premium" ? PREMIUM_V1_LIMITS.premiumResultHistoryLimit : PREMIUM_V1_LIMITS.freeResultHistoryLimit;
}

export function canViewAdvancedStats(plan: PremiumPlan): boolean {
  if (FREE_FIRST_LAUNCH_MODE) return true;
  return plan === "premium" ? PREMIUM_V1_LIMITS.premiumAdvancedStats : PREMIUM_V1_LIMITS.freeAdvancedStats;
}

export function shouldSuppressAds(plan: PremiumPlan): boolean {
  return plan === "premium";
}

export function isPremiumFeatureLive(feature: PremiumFeatureKey): boolean {
  return LIVE_PREMIUM_FEATURE_KEYS.has(feature);
}

export function canUsePremiumFeature(plan: PremiumPlan, feature: PremiumFeatureKey): boolean {
  if (FREE_FEATURE_KEYS.has(feature)) return true;
  if (FREE_FIRST_LAUNCH_MODE && FREE_FIRST_LAUNCH_FEATURE_KEYS.has(feature)) return true;
  if (!LIVE_PREMIUM_FEATURE_KEYS.has(feature)) return false;
  return plan === "premium";
}
