export type PremiumFeatureStatus = "free" | "future_premium";
export type PremiumFeatureCategory = "core" | "solo" | "stats" | "cosmetics" | "experience";

export interface PremiumFeature {
  title: string;
  description: string;
  category: PremiumFeatureCategory;
  status: PremiumFeatureStatus;
}

export const FREE_FEATURES: PremiumFeature[] = [
  { title: "Daily Sudoku", description: "One shared solo puzzle each day.", category: "core", status: "free" },
  { title: "Daily Duel", description: "Fair same-puzzle asynchronous duels.", category: "core", status: "free" },
  { title: "Ranked Duel", description: "Competitive RP matchmaking stays open to everyone.", category: "core", status: "free" },
  { title: "Friend Challenge", description: "Challenge accepted friends without Premium gating.", category: "core", status: "free" },
  { title: "Classic Easy, Medium, and Hard", description: "Core solo practice difficulties remain available.", category: "solo", status: "free" },
  { title: "Basic profile stats", description: "Level, XP, streaks, best times, and rank overview.", category: "stats", status: "free" },
  { title: "Basic avatar customisation", description: "Core character avatar options remain free.", category: "cosmetics", status: "free" },
  { title: "Basic results history", description: "Recent saved results remain visible.", category: "stats", status: "free" },
];

export const FUTURE_PREMIUM_FEATURES: PremiumFeature[] = [
  { title: "Expert & Master solo practice", description: "Unlimited access to advanced Classic practice tiers.", category: "solo", status: "future_premium" },
  { title: "Puzzle archive", description: "Replay past Daily Sudoku boards for practice.", category: "solo", status: "future_premium" },
  { title: "Advanced stats", description: "Deeper solve trends, difficulty splits, and performance insights.", category: "stats", status: "future_premium" },
  { title: "More puzzle history", description: "Longer results history and richer filtering.", category: "stats", status: "future_premium" },
  { title: "Premium themes", description: "Extra visual themes without changing gameplay outcomes.", category: "experience", status: "future_premium" },
  { title: "Avatar cosmetics", description: "Premium clothing, frames, and profile cosmetics.", category: "cosmetics", status: "future_premium" },
  { title: "Season cosmetic rewards", description: "Ranked frames and badges as cosmetic-only rewards.", category: "cosmetics", status: "future_premium" },
  { title: "Streak freeze", description: "A future solo profile convenience if implemented.", category: "experience", status: "future_premium" },
  { title: "Ad-free experience", description: "A cleaner experience if ads are added later.", category: "experience", status: "future_premium" },
];

export const PREMIUM_FAIRNESS_NOTE = "Premium will never boost Ranked RP, leaderboard scores, or duel outcomes.";
export const PREMIUM_DEV_NOTE = "Premium restrictions are not active during development.";
