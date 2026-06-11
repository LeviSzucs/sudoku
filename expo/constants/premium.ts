export type PremiumFeatureStatus = "free" | "future_premium";
export type PremiumFeatureCategory = "core" | "duel" | "solo" | "stats" | "cosmetics" | "experience";
export type PremiumFeatureKey =
  | "ad_free"
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

export const FREE_FEATURES: PremiumFeature[] = [
  { title: "Daily Sudoku", description: "One shared solo puzzle each day.", category: "core", status: "free" },
  { title: "Daily Duel", description: "Fair same-puzzle asynchronous duels.", category: "core", status: "free" },
  { title: "Ranked Duel", description: "Competitive RP matchmaking stays open to everyone.", category: "core", status: "free" },
  { title: "Friend Challenge basic access", description: "Challenge accepted friends without Premium gating.", category: "core", status: "free" },
  { title: "Classic Easy, Medium, Hard, Expert, and Master", description: "All Sudoku difficulties remain playable for free.", category: "solo", status: "free" },
  { title: "Basic profile stats", description: "Level, XP, streaks, best times, and rank overview.", category: "stats", status: "free" },
  { title: "Basic avatar customisation", description: "Core character avatar options remain free.", category: "cosmetics", status: "free" },
  { title: "Basic results history", description: "Recent saved results remain visible.", category: "stats", status: "free" },
];

export const FUTURE_PREMIUM_FEATURES: PremiumFeature[] = [
  { key: "ad_free", title: "Ad-free experience", description: "Remove occasional ad breaks for a cleaner Free-to-Premium upgrade path.", category: "experience", status: "future_premium" },
  { key: "more_friend_challenges", title: "More Friend Challenge creation", description: "Higher friend challenge volume while keeping each match fair.", category: "duel", status: "future_premium" },
  { key: "duel_archive", title: "More Duel/archive access", description: "Deeper access to past duel records and review tools where applicable.", category: "duel", status: "future_premium" },
  { key: "advanced_stats", title: "Advanced stats", description: "Deeper solve trends, difficulty splits, and performance insights.", category: "stats", status: "future_premium" },
  { key: "full_result_history", title: "Full result history", description: "Longer results history and richer filtering.", category: "stats", status: "future_premium" },
  { key: "head_to_head_records", title: "Head-to-head records", description: "Expanded friend and rival comparison history.", category: "stats", status: "future_premium" },
  { key: "premium_themes", title: "Premium themes", description: "Extra visual themes without changing gameplay outcomes.", category: "experience", status: "future_premium" },
  { key: "avatar_cosmetics", title: "Avatar cosmetics", description: "Premium clothing, frames, and profile cosmetics.", category: "cosmetics", status: "future_premium" },
  { key: "season_recaps", title: "Season recaps and rewards", description: "Cosmetic season identity, recaps, frames, and badges.", category: "cosmetics", status: "future_premium" },
  { key: "puzzle_archive", title: "Puzzle archive", description: "Replay past Daily Sudoku boards for practice.", category: "solo", status: "future_premium" },
  { title: "Streak freeze", description: "A future solo profile convenience if implemented.", category: "experience", status: "future_premium" },
];

export const PREMIUM_ENTITLEMENT_TYPE = "sudoduel_premium";
export const PAYMENT_SYSTEM_IMPLEMENTED = false;
export const PREMIUM_FAIRNESS_NOTE = "Premium will never boost Ranked RP, leaderboard scores, or duel outcomes.";
export const PREMIUM_DEV_NOTE = "All difficulties are free. Premium will focus on ad-free play, stats, history, cosmetics, and duel tools.";
