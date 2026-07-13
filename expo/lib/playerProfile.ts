import { DEFAULT_AVATAR_COLOR, DEFAULT_INITIALS, DEFAULT_USERNAME } from "@/constants/branding";
import type { Difficulty } from "@/constants/mockData";
import type { GameMode, PuzzleResult } from "@/hooks/useSudokuGame";
import type { CharacterAvatarConfig } from "@/lib/avatar";
import { calculateMasteryXpFromScore, TARGET_SECONDS } from "@/lib/scoring";

export type RankOutcome = "win" | "loss" | "draw" | "abandon";
export type BadgeCategory = "Starter" | "Streak" | "Speed" | "Difficulty" | "Competitive" | "Completion" | "Precision" | "Daily" | "Daily Duel" | "Ranked" | "Friend Challenge" | "Consistency" | "Social" | "Mastery";
export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface RecentResult extends PuzzleResult {
  result_id?: string;
  xp_earned: number;
  result_outcome?: RankOutcome;
  rp_change?: number | null;
  won?: boolean | null;
}

export type DuelMatchMode = "daily_duel" | "friend_challenge" | "ranked_duel";

export interface DuelMatchSummary {
  match_id: string;
  mode: DuelMatchMode;
  completed_at: string;
  result_outcome: RankOutcome;
}

export interface AchievementBadge {
  badge_id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  unlocked: boolean;
  unlocked_at: string | null;
  progress_current: number;
  progress_target: number;
  icon: string;
  rarity: BadgeRarity;
}

export interface ProfileSettings {
  notifications: {
    dailyPuzzleReminder: boolean;
    streakReminder: boolean;
    duelResults: boolean;
    rankedMatchUpdates: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showStatsPublicly: boolean;
    showRecentResultsPublicly: boolean;
    allowFriendChallenges: boolean;
    showOnGlobalLeaderboards: boolean;
  };
  devMode: boolean;
}

export interface PlayerProfile extends CharacterAvatarConfig {
  user_id: string;
  username: string;
  username_handle: string | null;
  display_name: string | null;
  profile_setup_completed: boolean;
  initials: string;
  avatar_color: string;
  avatar_symbol?: string | null;
  account_level: number;
  mastery_xp: number;
  mastery_xp_to_next_level: number;
  total_mastery_xp: number;
  rank_tier: string;
  rank_division: string;
  rank_points: number;
  current_streak: number;
  longest_streak: number;
  puzzles_completed: number;
  flawless_puzzles: number;
  total_mistakes: number;
  total_hints_used: number;
  best_times_by_difficulty: Partial<Record<Difficulty, number>>;
  duels_played: number;
  duels_won: number;
  ranked_played: number;
  ranked_won: number;
  badges_unlocked: AchievementBadge[];
  recent_results: RecentResult[];
  duel_match_history: DuelMatchSummary[];
  last_completed_date: string | null;
  easy_completed: number;
  medium_completed: number;
  hard_completed: number;
  expert_completed: number;
  master_completed: number;
  settings: ProfileSettings;
}

export interface ProfileUpdateSummary {
  xpEarned: number;
  didLevelUp: boolean;
  previousLevel: number;
  newLevel: number;
  rankPromotion: RankPromotionSummary | null;
  unlockedBadges: AchievementBadge[];
  updatedProfile: PlayerProfile;
}

export interface RankPromotionSummary {
  previousTier: string;
  previousDivision: string;
  newTier: string;
  newDivision: string;
  previousRankLabel: string;
  newRankLabel: string;
}

export const RANKS: { tier: string; division: string; min: number }[] = [
  { tier: "Bronze", division: "III", min: 0 }, { tier: "Bronze", division: "II", min: 100 }, { tier: "Bronze", division: "I", min: 200 },
  { tier: "Silver", division: "III", min: 300 }, { tier: "Silver", division: "II", min: 450 }, { tier: "Silver", division: "I", min: 600 },
  { tier: "Gold", division: "III", min: 800 }, { tier: "Gold", division: "II", min: 1000 }, { tier: "Gold", division: "I", min: 1250 },
  { tier: "Platinum", division: "III", min: 1500 }, { tier: "Platinum", division: "II", min: 1800 }, { tier: "Platinum", division: "I", min: 2100 },
  { tier: "Diamond", division: "III", min: 2500 }, { tier: "Diamond", division: "II", min: 3000 }, { tier: "Diamond", division: "I", min: 3500 },
  { tier: "Master", division: "", min: 4000 }, { tier: "Grandmaster", division: "", min: 5000 },
];

export function xpForNextLevel(level: number): number {
  return Math.round((100 + level * 55 + Math.pow(level, 2) * 12) / 25) * 25;
}

function thresholdForLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) total += xpForNextLevel(current);
  return total;
}

export function getLevelFromXp(totalXp: number): { level: number; xpInLevel: number; xpToNext: number; xpNeededForLevel: number; progress: number } {
  let level = 1;
  while (totalXp >= thresholdForLevel(level + 1)) level += 1;
  const current = thresholdForLevel(level);
  const needed = xpForNextLevel(level);
  const xpInLevel = totalXp - current;
  return { level, xpInLevel, xpToNext: Math.max(0, needed - xpInLevel), xpNeededForLevel: needed, progress: needed > 0 ? xpInLevel / needed : 0 };
}

export function getRankFromRp(rp: number): { tier: string; division: string; nextMin: number | null; currentMin: number } {
  const safeRp = Math.max(0, rp);
  let current = RANKS[0];
  for (const rank of RANKS) if (safeRp >= rank.min) current = rank;
  const next = RANKS[RANKS.indexOf(current) + 1];
  return { tier: current.tier, division: current.division, nextMin: next?.min ?? null, currentMin: current.min };
}

export function formatRankLabel(tier: string, division: string): string {
  return division ? `${tier} ${division}` : tier;
}

export function getRankPosition(tier: string, division: string): number {
  return RANKS.findIndex((rank) => rank.tier === tier && rank.division === division);
}

export function getRankPromotionSummary(
  previousTier: string,
  previousDivision: string,
  newTier: string,
  newDivision: string
): RankPromotionSummary | null {
  const previousPosition = getRankPosition(previousTier, previousDivision);
  const newPosition = getRankPosition(newTier, newDivision);
  if (previousPosition < 0 || newPosition < 0 || newPosition <= previousPosition) return null;
  return {
    previousTier,
    previousDivision,
    newTier,
    newDivision,
    previousRankLabel: formatRankLabel(previousTier, previousDivision),
    newRankLabel: formatRankLabel(newTier, newDivision),
  };
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || DEFAULT_INITIALS;
}

function createBadge(id: string, name: string, description: string, category: BadgeCategory, target: number, icon: string, rarity: BadgeRarity = "common"): AchievementBadge {
  return { badge_id: id, name, description, category, unlocked: false, unlocked_at: null, progress_current: 0, progress_target: target, icon, rarity };
}

export const BADGE_CATEGORIES: ("All" | BadgeCategory)[] = ["All", "Starter", "Daily", "Daily Duel", "Ranked", "Friend Challenge", "Streak", "Speed", "Difficulty", "Competitive", "Completion", "Precision", "Consistency", "Social", "Mastery"];

const LEGACY_BADGE_DEFINITIONS_UNUSED: AchievementBadge[] = [
  createBadge("first_grid", "First Grid", "Complete your first puzzle", "Starter", 1, "▦"),
  createBadge("clean_start", "Clean Start", "Complete a puzzle with no mistakes", "Starter", 1, "✓"),
  createBadge("no_help_needed", "No Help Needed", "Complete a puzzle with no hints", "Starter", 1, "◇"),
  createBadge("first_duel", "First Duel", "Play your first duel", "Starter", 1, "⚔"),
  createBadge("first_win", "First Win", "Win your first duel", "Starter", 1, "★"),
  createBadge("streak_3", "Streak 3", "Complete a puzzle 3 days in a row", "Streak", 3, "3"),
  createBadge("streak_7", "Streak 7", "Complete a puzzle 7 days in a row", "Streak", 7, "7"),
  createBadge("streak_14", "Streak 14", "Complete a puzzle 14 days in a row", "Streak", 14, "14"),
  createBadge("streak_30", "Streak 30", "Complete a puzzle 30 days in a row", "Streak", 30, "30"),
  createBadge("quick_thinker", "Quick Thinker", "Complete Easy under 3 minutes", "Speed", 1, "⚡"),
  createBadge("sharp_mind", "Sharp Mind", "Complete Medium under 5 minutes", "Speed", 1, "◆"),
  createBadge("fast_solver", "Fast Solver", "Complete Hard under 8 minutes", "Speed", 1, "▶"),
  createBadge("speedrunner", "Speedrunner", "Complete any puzzle under 2 minutes", "Speed", 1, "⏱"),
  createBadge("easy_clear", "Easy Clear", "Complete 10 Easy puzzles", "Difficulty", 10, "E"),
  createBadge("medium_clear", "Medium Clear", "Complete 10 Medium puzzles", "Difficulty", 10, "M"),
  createBadge("hard_clear", "Hard Clear", "Complete 10 Hard puzzles", "Difficulty", 10, "H"),
  createBadge("expert_solver", "Expert Solver", "Complete your first Expert puzzle", "Difficulty", 1, "X"),
  createBadge("master_solver", "Master Solver", "Complete your first Master puzzle", "Difficulty", 1, "V"),
  createBadge("duelist", "Duelist", "Win 5 duels", "Competitive", 5, "♞"),
  createBadge("contender", "Contender", "Win 25 duels", "Competitive", 25, "♜"),
  createBadge("ranked_ready", "Ranked Ready", "Complete 5 ranked duels", "Competitive", 5, "R"),
  createBadge("gold_mind", "Gold Mind", "Reach Gold rank", "Competitive", 800, "G"),
  createBadge("diamond_mind", "Diamond Mind", "Reach Diamond rank", "Competitive", 2500, "D"),
  createBadge("perfect_duel", "Perfect Duel", "Win a duel with no mistakes and no hints", "Competitive", 1, "♛"),
  createBadge("puzzle_10", "Puzzle 10", "Complete 10 puzzles", "Completion", 10, "10"),
  createBadge("puzzle_50", "Puzzle 50", "Complete 50 puzzles", "Completion", 50, "50"),
  createBadge("puzzle_100", "Puzzle 100", "Complete 100 puzzles", "Completion", 100, "100"),
  createBadge("puzzle_500", "Puzzle 500", "Complete 500 puzzles", "Completion", 500, "500"),
  createBadge("flawless", "Flawless", "Complete 1 puzzle with no mistakes", "Precision", 1, "○"),
  createBadge("flawless_10", "Flawless 10", "Complete 10 flawless puzzles", "Precision", 10, "◎"),
  createBadge("pure_logic", "Pure Logic", "Complete a Hard puzzle with no mistakes and no hints", "Precision", 1, "△"),
  createBadge("mastermind", "Mastermind", "Complete an Expert puzzle with no mistakes and no hints", "Precision", 1, "▲"),
];

export const BADGE_DEFINITIONS: AchievementBadge[] = [
  createBadge("first_grid", "First Grid", "Solve your first puzzle", "Starter", 1, "1", "common"),
  createBadge("clean_start", "Clean Start", "Solve a puzzle with no mistakes", "Starter", 1, "C", "common"),
  createBadge("no_help_needed", "No Help Needed", "Solve a puzzle with no hints", "Starter", 1, "N", "common"),
  createBadge("first_duel", "First Duel", "Complete your first duel", "Starter", 1, "D", "common"),
  createBadge("first_win", "First Win", "Win your first duel", "Starter", 1, "W", "common"),
  createBadge("first_daily", "Daily Debut", "Solve your first Daily Sudoku", "Daily", 1, "D", "common"),
  createBadge("first_daily_duel", "Duel Debut", "Complete your first Daily Duel", "Daily Duel", 1, "DD", "common"),
  createBadge("first_ranked_duel", "Ranked Debut", "Complete your first Ranked Duel", "Ranked", 1, "R", "common"),
  createBadge("first_friend_challenge", "Friendly Rival", "Complete your first Friend Challenge", "Friend Challenge", 1, "F", "common"),
  createBadge("first_ranked_win", "Ranked Winner", "Win your first Ranked Duel", "Ranked", 1, "RW", "common"),
  createBadge("streak_3", "Streak 3", "Build a 3-day Daily Sudoku streak", "Streak", 3, "3", "common"),
  createBadge("streak_7", "Streak 7", "Build a 7-day Daily Sudoku streak", "Streak", 7, "7", "uncommon"),
  createBadge("streak_14", "Streak 14", "Build a 14-day Daily Sudoku streak", "Streak", 14, "14", "rare"),
  createBadge("streak_30", "Streak 30", "Build a 30-day Daily Sudoku streak", "Streak", 30, "30", "epic"),
  createBadge("daily_streak_60", "Streak 60", "Build a 60-day Daily Sudoku streak", "Streak", 60, "60", "legendary"),
  createBadge("quick_thinker", "Quick Thinker", "Solve Easy under 3 minutes", "Speed", 1, "E", "common"),
  createBadge("sharp_mind", "Sharp Mind", "Solve Medium under 5 minutes", "Speed", 1, "M", "uncommon"),
  createBadge("fast_solver", "Fast Solver", "Solve Hard under 8 minutes", "Speed", 1, "H", "rare"),
  createBadge("speedrunner", "Speedrunner", "Solve any puzzle under 2 minutes", "Speed", 1, "S", "rare"),
  createBadge("speed_expert", "Expert Sprint", "Solve Expert under 20 minutes", "Speed", 1, "EX", "epic"),
  createBadge("speed_master", "Master Sprint", "Solve Master under 30 minutes", "Speed", 1, "MA", "legendary"),
  createBadge("fast_solve_5", "Fast Five", "Solve 5 puzzles faster than their target time", "Speed", 5, "5", "rare"),
  createBadge("easy_clear", "Easy Clear", "Solve 10 Easy puzzles", "Difficulty", 10, "E", "common"),
  createBadge("easy_25", "Easy 25", "Solve 25 Easy puzzles", "Difficulty", 25, "25", "uncommon"),
  createBadge("easy_100", "Easy 100", "Solve 100 Easy puzzles", "Difficulty", 100, "100", "epic"),
  createBadge("medium_clear", "Medium Clear", "Solve 10 Medium puzzles", "Difficulty", 10, "M", "common"),
  createBadge("medium_25", "Medium 25", "Solve 25 Medium puzzles", "Difficulty", 25, "25", "uncommon"),
  createBadge("medium_100", "Medium 100", "Solve 100 Medium puzzles", "Difficulty", 100, "100", "epic"),
  createBadge("hard_clear", "Hard Clear", "Solve 10 Hard puzzles", "Difficulty", 10, "H", "uncommon"),
  createBadge("hard_25", "Hard 25", "Solve 25 Hard puzzles", "Difficulty", 25, "25", "rare"),
  createBadge("hard_100", "Hard 100", "Solve 100 Hard puzzles", "Difficulty", 100, "100", "legendary"),
  createBadge("expert_solver", "Expert Solver", "Solve your first Expert puzzle", "Difficulty", 1, "X", "uncommon"),
  createBadge("expert_10", "Expert 10", "Solve 10 Expert puzzles", "Difficulty", 10, "10", "rare"),
  createBadge("expert_25", "Expert 25", "Solve 25 Expert puzzles", "Difficulty", 25, "25", "epic"),
  createBadge("master_solver", "Master Solver", "Solve your first Master puzzle", "Difficulty", 1, "M", "rare"),
  createBadge("master_10", "Master 10", "Solve 10 Master puzzles", "Difficulty", 10, "10", "epic"),
  createBadge("master_25", "Master 25", "Solve 25 Master puzzles", "Difficulty", 25, "25", "legendary"),
  createBadge("duelist", "Duelist", "Win 5 duels", "Competitive", 5, "D", "uncommon"),
  createBadge("contender", "Contender", "Win 25 duels", "Competitive", 25, "C", "rare"),
  createBadge("ranked_ready", "Ranked Ready", "Complete 5 Ranked Duels", "Competitive", 5, "R", "uncommon"),
  createBadge("gold_mind", "Gold Mind", "Reach Gold rank", "Competitive", 850, "G", "epic"),
  createBadge("diamond_mind", "Diamond Mind", "Reach Diamond rank", "Competitive", 2350, "D", "legendary"),
  createBadge("perfect_duel", "Perfect Duel", "Win a duel with no mistakes and no hints", "Competitive", 1, "P", "rare"),
  createBadge("bronze_rank", "Bronze Badge", "Reach Bronze rank", "Ranked", 1, "B", "common"),
  createBadge("silver_rank", "Silver Badge", "Reach Silver rank", "Ranked", 350, "S", "uncommon"),
  createBadge("platinum_rank", "Platinum Badge", "Reach Platinum rank", "Ranked", 1500, "P", "epic"),
  createBadge("master_rank", "Master Badge", "Reach Master rank", "Ranked", 3500, "M", "legendary"),
  createBadge("ranked_win_5", "Ranked 5 Wins", "Win 5 Ranked Duels", "Ranked", 5, "5", "uncommon"),
  createBadge("ranked_win_10", "Ranked 10 Wins", "Win 10 Ranked Duels", "Ranked", 10, "10", "rare"),
  createBadge("ranked_win_25", "Ranked 25 Wins", "Win 25 Ranked Duels", "Ranked", 25, "25", "epic"),
  createBadge("ranked_win_50", "Ranked 50 Wins", "Win 50 Ranked Duels", "Ranked", 50, "50", "legendary"),
  createBadge("ranked_match_10", "Ranked 10", "Complete 10 Ranked Duels", "Ranked", 10, "10", "uncommon"),
  createBadge("ranked_match_25", "Ranked 25", "Complete 25 Ranked Duels", "Ranked", 25, "25", "rare"),
  createBadge("ranked_match_50", "Ranked 50", "Complete 50 Ranked Duels", "Ranked", 50, "50", "epic"),
  createBadge("ranked_clean_win", "Clean Ranked Win", "Win a Ranked Duel with no mistakes and no hints", "Ranked", 1, "CR", "rare"),
  createBadge("puzzle_10", "Puzzle 10", "Solve 10 puzzles", "Completion", 10, "10", "common"),
  createBadge("puzzle_50", "Puzzle 50", "Solve 50 puzzles", "Completion", 50, "50", "uncommon"),
  createBadge("puzzle_100", "Puzzle 100", "Solve 100 puzzles", "Completion", 100, "100", "rare"),
  createBadge("puzzle_500", "Puzzle 500", "Solve 500 puzzles", "Completion", 500, "500", "legendary"),
  createBadge("classic_5", "Classic 5", "Solve 5 Classic puzzles", "Completion", 5, "5", "common"),
  createBadge("classic_25", "Classic 25", "Solve 25 Classic puzzles", "Completion", 25, "25", "uncommon"),
  createBadge("classic_50", "Classic 50", "Solve 50 Classic puzzles", "Completion", 50, "50", "rare"),
  createBadge("classic_100", "Classic 100", "Solve 100 Classic puzzles", "Completion", 100, "100", "epic"),
  createBadge("classic_250", "Classic 250", "Solve 250 Classic puzzles", "Completion", 250, "250", "legendary"),
  createBadge("daily_3", "Daily 3", "Solve 3 Daily Sudokus", "Daily", 3, "3", "common"),
  createBadge("daily_7", "Daily 7", "Solve 7 Daily Sudokus", "Daily", 7, "7", "uncommon"),
  createBadge("daily_14", "Daily 14", "Solve 14 Daily Sudokus", "Daily", 14, "14", "rare"),
  createBadge("daily_30", "Daily 30", "Solve 30 Daily Sudokus", "Daily", 30, "30", "epic"),
  createBadge("daily_50", "Daily 50", "Solve 50 Daily Sudokus", "Daily", 50, "50", "legendary"),
  createBadge("daily_duel_5", "Daily Duel 5", "Complete 5 Daily Duels", "Daily Duel", 5, "5", "common"),
  createBadge("daily_duel_10", "Daily Duel 10", "Complete 10 Daily Duels", "Daily Duel", 10, "10", "uncommon"),
  createBadge("daily_duel_25", "Daily Duel 25", "Complete 25 Daily Duels", "Daily Duel", 25, "25", "rare"),
  createBadge("daily_duel_50", "Daily Duel 50", "Complete 50 Daily Duels", "Daily Duel", 50, "50", "epic"),
  createBadge("daily_duel_win_5", "Daily Duel 5 Wins", "Win 5 Daily Duels", "Daily Duel", 5, "5W", "uncommon"),
  createBadge("daily_duel_win_10", "Daily Duel 10 Wins", "Win 10 Daily Duels", "Daily Duel", 10, "10", "rare"),
  createBadge("daily_duel_win_25", "Daily Duel 25 Wins", "Win 25 Daily Duels", "Daily Duel", 25, "25", "epic"),
  createBadge("daily_duel_clean_win", "Clean Daily Duel", "Win a Daily Duel with no mistakes and no hints", "Daily Duel", 1, "CD", "rare"),
  createBadge("friend_challenge_5", "Challenge 5", "Complete 5 Friend Challenges", "Friend Challenge", 5, "5", "common"),
  createBadge("friend_challenge_10", "Challenge 10", "Complete 10 Friend Challenges", "Friend Challenge", 10, "10", "uncommon"),
  createBadge("friend_challenge_25", "Challenge 25", "Complete 25 Friend Challenges", "Friend Challenge", 25, "25", "rare"),
  createBadge("friend_challenge_win_5", "Friend Wins 5", "Win 5 Friend Challenges", "Friend Challenge", 5, "5W", "uncommon"),
  createBadge("friend_challenge_win_10", "Friend Wins 10", "Win 10 Friend Challenges", "Friend Challenge", 10, "10", "rare"),
  createBadge("friend_challenge_win_25", "Friend Wins 25", "Win 25 Friend Challenges", "Friend Challenge", 25, "25", "epic"),
  createBadge("first_h2h_win", "Head-to-Head Win", "Win your first Friend Challenge", "Friend Challenge", 1, "H2", "common"),
  createBadge("flawless", "Flawless", "Solve 1 puzzle with no mistakes", "Precision", 1, "F", "common"),
  createBadge("flawless_10", "Flawless 10", "Solve 10 flawless puzzles", "Precision", 10, "10", "uncommon"),
  createBadge("flawless_25", "Flawless 25", "Solve 25 flawless puzzles", "Precision", 25, "25", "rare"),
  createBadge("flawless_50", "Flawless 50", "Solve 50 flawless puzzles", "Precision", 50, "50", "epic"),
  createBadge("no_hint_5", "No-Hint 5", "Solve 5 puzzles with no hints", "Precision", 5, "5", "common"),
  createBadge("no_hint_10", "No-Hint 10", "Solve 10 puzzles with no hints", "Precision", 10, "10", "uncommon"),
  createBadge("no_hint_25", "No-Hint 25", "Solve 25 puzzles with no hints", "Precision", 25, "25", "rare"),
  createBadge("no_hint_50", "No-Hint 50", "Solve 50 puzzles with no hints", "Precision", 50, "50", "epic"),
  createBadge("pure_logic", "Pure Logic", "Solve a Hard puzzle with no mistakes and no hints", "Precision", 1, "H", "rare"),
  createBadge("mastermind", "Mastermind", "Solve an Expert puzzle with no mistakes and no hints", "Precision", 1, "X", "epic"),
  createBadge("flawless_expert", "Flawless Expert", "Solve an Expert puzzle with no mistakes", "Precision", 1, "FX", "rare"),
  createBadge("flawless_master", "Flawless Master", "Solve a Master puzzle with no mistakes", "Precision", 1, "FM", "epic"),
  createBadge("no_hint_expert", "No-Hint Expert", "Solve an Expert puzzle with no hints", "Precision", 1, "NX", "rare"),
  createBadge("no_hint_master", "No-Hint Master", "Solve a Master puzzle with no hints", "Precision", 1, "NM", "epic"),
  createBadge("hard_clean_10", "Hard Clean 10", "Solve 10 Hard puzzles with no mistakes and no hints", "Precision", 10, "10", "epic"),
  createBadge("expert_clean_5", "Expert Clean 5", "Solve 5 Expert puzzles with no mistakes and no hints", "Precision", 5, "5", "epic"),
  createBadge("master_clean", "Clean Master", "Solve a Master puzzle with no mistakes and no hints", "Precision", 1, "CM", "legendary"),
  createBadge("consistency_day_3", "Triple Day", "Solve 3 puzzles in one day", "Consistency", 3, "3", "common"),
  createBadge("consistency_day_5", "Five in a Day", "Solve 5 puzzles in one day", "Consistency", 5, "5", "uncommon"),
  createBadge("active_days_3", "Three Active Days", "Solve puzzles on 3 different days", "Consistency", 3, "3D", "common"),
  createBadge("active_days_7", "Seven Active Days", "Solve puzzles on 7 different days", "Consistency", 7, "7D", "uncommon"),
  createBadge("active_days_30", "Thirty Active Days", "Solve puzzles on 30 different days", "Consistency", 30, "30", "epic"),
  createBadge("profile_complete", "Profile Ready", "Complete your profile setup", "Social", 1, "P", "common"),
  createBadge("avatar_customized", "Fresh Look", "Customize your avatar", "Social", 1, "A", "common"),
  createBadge("first_friend", "First Friend", "Add your first friend", "Social", 1, "F", "common"),
  createBadge("friends_5", "Circle of Five", "Add 5 friends", "Social", 5, "5", "uncommon"),
  createBadge("level_5", "Level 5", "Reach Mastery Level 5", "Mastery", 5, "L5", "common"),
  createBadge("level_10", "Level 10", "Reach Mastery Level 10", "Mastery", 10, "L10", "uncommon"),
  createBadge("level_25", "Level 25", "Reach Mastery Level 25", "Mastery", 25, "L25", "epic"),
  createBadge("xp_10000", "10K XP", "Earn 10,000 total Mastery XP", "Mastery", 10000, "10K", "rare"),
  createBadge("xp_50000", "50K XP", "Earn 50,000 total Mastery XP", "Mastery", 50000, "50K", "legendary"),
];

const defaultSettings: ProfileSettings = {
  notifications: { dailyPuzzleReminder: true, streakReminder: true, duelResults: true, rankedMatchUpdates: false },
  privacy: { publicProfile: true, showStatsPublicly: true, showRecentResultsPublicly: false, allowFriendChallenges: true, showOnGlobalLeaderboards: false },
  devMode: true,
};

function normalizeBadges(badges: AchievementBadge[] | undefined): AchievementBadge[] {
  if (!Array.isArray(badges)) return BADGE_DEFINITIONS.map((definition) => ({ ...definition }));
  const storedById = new Map(badges.map((badge) => [badge.badge_id, badge]));
  return BADGE_DEFINITIONS.map((definition) => {
    const stored = storedById.get(definition.badge_id);
    return stored ? { ...definition, ...stored, rarity: stored.rarity ?? definition.rarity } : { ...definition };
  });
}

export function normalizeProfile(profile: PlayerProfile): PlayerProfile {
  const level = getLevelFromXp(profile.total_mastery_xp ?? 0);
  const rank = getRankFromRp(profile.rank_points ?? 0);
  const badges = normalizeBadges(profile.badges_unlocked);
  return { ...createInitialPlayerProfile(false), ...profile, account_level: level.level, mastery_xp: level.xpInLevel, mastery_xp_to_next_level: level.xpToNext, rank_tier: rank.tier, rank_division: rank.division, badges_unlocked: badges, settings: { ...defaultSettings, ...(profile.settings ?? {}), notifications: { ...defaultSettings.notifications, ...(profile.settings?.notifications ?? {}) }, privacy: { ...defaultSettings.privacy, ...(profile.settings?.privacy ?? {}) } } };
}

export function createInitialPlayerProfile(withMockProgress = true): PlayerProfile {
  const totalXp = withMockProgress ? 2850 : 0;
  const level = getLevelFromXp(totalXp);
  const base: PlayerProfile = {
    user_id: "u_self", username: DEFAULT_USERNAME, username_handle: null, display_name: null, profile_setup_completed: false, initials: DEFAULT_INITIALS, avatar_color: DEFAULT_AVATAR_COLOR,
    avatar_style_version: "character_v1", avatar_bg_color: DEFAULT_AVATAR_COLOR, avatar_initials: DEFAULT_INITIALS, avatar_skin_tone: "#D19A6E", avatar_hair_style: "short", avatar_hair_color: "#6E432D", avatar_top_style: "tee", avatar_top_color: "#1E1B4B", avatar_accessory: null, avatar_frame: null,
    account_level: level.level, mastery_xp: level.xpInLevel, mastery_xp_to_next_level: level.xpToNext, total_mastery_xp: totalXp,
    rank_tier: "Bronze", rank_division: "II", rank_points: withMockProgress ? 120 : 0, current_streak: withMockProgress ? 4 : 0, longest_streak: withMockProgress ? 7 : 0,
    puzzles_completed: withMockProgress ? 18 : 0, flawless_puzzles: withMockProgress ? 6 : 0, total_mistakes: withMockProgress ? 14 : 0, total_hints_used: withMockProgress ? 5 : 0,
    best_times_by_difficulty: withMockProgress ? { Easy: 171, Medium: 292, Hard: 612 } : {},
    duels_played: withMockProgress ? 7 : 0, duels_won: withMockProgress ? 4 : 0, ranked_played: withMockProgress ? 3 : 0, ranked_won: withMockProgress ? 2 : 0,
    badges_unlocked: BADGE_DEFINITIONS.map((b) => ({ ...b, unlocked: false, unlocked_at: null, progress_current: 0 })), recent_results: [], duel_match_history: [], last_completed_date: withMockProgress ? new Date().toISOString().slice(0, 10) : null,
    easy_completed: withMockProgress ? 9 : 0, medium_completed: withMockProgress ? 6 : 0, hard_completed: withMockProgress ? 3 : 0, expert_completed: 0, master_completed: 0,
    settings: defaultSettings,
  };
  if (withMockProgress) {
    const now = Date.now();
    base.recent_results = [
      mockRecent("mock_medium", "classic", "Medium", 292, 0, 0, 1, 3060, 145, now - 86400000),
      mockRecent("mock_daily", "daily", "Easy", 171, 1, 0, 0, 1079, 140, now - 2 * 86400000),
      mockRecent("mock_duel", "duel", "Hard", 612, 2, 1, 2, 3628, 110, now - 3 * 86400000, "win"),
    ];
    base.duel_match_history = [{ match_id: "mock_duel", mode: "daily_duel", completed_at: new Date(now - 3 * 86400000).toISOString(), result_outcome: "win" }];
    const badgeResult = progressBadges(base, new Date().toISOString());
    base.badges_unlocked = badgeResult.badges;
  }
  return base;
}

function mockRecent(id: string, mode: GameMode, difficulty: Difficulty, elapsed: number, mistakes: number, hints: number, undos: number, score: number, xp: number, time: number, outcome?: RankOutcome): RecentResult {
  return { puzzle_id: id, mode, difficulty, completed: true, elapsed_seconds: elapsed, mistakes, hints_used: hints, undo_count: undos, move_count: 50, final_score: score, eligible_for_leaderboard: hints === 0, eligible_for_ranked: mode === "ranked" && hints === 0, completed_at: new Date(time).toISOString(), xp_earned: xp, result_outcome: outcome };
}

function dateKey(iso: string): string { return iso.slice(0, 10); }
function dayDiff(a: string, b: string): number { return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000); }
function solvedResult(result: RecentResult): boolean { return result.completed && result.won !== false; }
function cleanResult(result: RecentResult): boolean { return solvedResult(result) && result.mistakes === 0 && result.hints_used === 0; }
function targetSecondsForDifficulty(difficulty: Difficulty): number { return TARGET_SECONDS[difficulty] ?? 999999; }
function longestDateStreak(dates: string[]): number {
  const unique = Array.from(new Set(dates)).sort();
  let best = 0;
  let current = 0;
  let previous: string | null = null;
  for (const day of unique) {
    current = previous && dayDiff(previous, day) === 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}

export function calculateMasteryXp(result: PuzzleResult, didWin = false): number {
  return calculateMasteryXpFromScore(
    result.difficulty,
    result.final_score,
    result.mode,
    result.mistakes === 0 && result.hints_used === 0,
    result.elapsed_seconds < TARGET_SECONDS[result.difficulty],
    didWin
  );
}

function progressBadges(profile: PlayerProfile, nowIso: string): { badges: AchievementBadge[]; unlocked: AchievementBadge[] } {
  const unlocked: AchievementBadge[] = [];
  const rank = getRankFromRp(profile.rank_points);
  const results = profile.recent_results.filter(solvedResult);
  const cleanResults = results.filter(cleanResult);
  const noHintResults = results.filter((r) => r.hints_used === 0);
  const duelMatches = profile.duel_match_history;
  const duelWins = duelMatches.filter((match) => match.result_outcome === "win");
  const rankedMatches = duelMatches.filter((match) => match.mode === "ranked_duel");
  const rankedWins = rankedMatches.filter((match) => match.result_outcome === "win");
  const dailyDuelMatches = duelMatches.filter((match) => match.mode === "daily_duel");
  const dailyDuelWins = dailyDuelMatches.filter((match) => match.result_outcome === "win");
  const friendMatches = duelMatches.filter((match) => match.mode === "friend_challenge");
  const friendWins = friendMatches.filter((match) => match.result_outcome === "win");
  const dailyResults = results.filter((r) => r.mode === "daily");
  const classicResults = results.filter((r) => r.mode === "classic");
  const dailyStreak = longestDateStreak(dailyResults.map((r) => dateKey(r.completed_at)));
  const activeDays = new Set(results.map((r) => dateKey(r.completed_at))).size;
  const maxSolvesInDay = Math.max(0, ...Object.values(results.reduce<Record<string, number>>((acc, result) => {
    const day = dateKey(result.completed_at);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {})));
  const avatarCustomized = Boolean(
    profile.avatar_bg_color ||
    profile.avatar_symbol ||
    profile.avatar_hair_style ||
    profile.avatar_accessory ||
    profile.avatar_frame ||
    (profile.avatar_initials && profile.avatar_initials !== DEFAULT_INITIALS)
  );
  const countDifficulty = (difficulty: Difficulty): number => results.filter((r) => r.difficulty === difficulty).length;
  const countCleanDifficulty = (difficulty: Difficulty): number => cleanResults.filter((r) => r.difficulty === difficulty).length;
  const hasFastDifficulty = (difficulty: Difficulty, seconds: number): boolean => results.some((r) => r.difficulty === difficulty && r.elapsed_seconds < seconds);
  const fastSolves = results.filter((r) => r.elapsed_seconds < targetSecondsForDifficulty(r.difficulty)).length;
  const hasCleanDuelWin = (mode: "daily_duel" | "friend_challenge" | "ranked_duel"): boolean => results.some((r) => r.mode === mode && r.result_outcome === "win" && r.mistakes === 0 && r.hints_used === 0);
  const mapProgress = (badge: AchievementBadge): number => {
    switch (badge.badge_id) {
      case "first_grid": case "puzzle_10": case "puzzle_50": case "puzzle_100": case "puzzle_500": return results.length;
      case "clean_start": case "flawless": case "flawless_10": case "flawless_25": case "flawless_50": return cleanResults.length;
      case "no_help_needed": case "no_hint_5": case "no_hint_10": case "no_hint_25": case "no_hint_50": return noHintResults.length;
      case "first_duel": return duelMatches.length;
      case "first_win": case "duelist": case "contender": return duelWins.length;
      case "first_daily": return dailyResults.length;
      case "first_daily_duel": case "daily_duel_5": case "daily_duel_10": case "daily_duel_25": case "daily_duel_50": return dailyDuelMatches.length;
      case "first_ranked_duel": case "ranked_ready": case "ranked_match_10": case "ranked_match_25": case "ranked_match_50": return rankedMatches.length;
      case "first_friend_challenge": case "friend_challenge_5": case "friend_challenge_10": case "friend_challenge_25": return friendMatches.length;
      case "first_ranked_win": case "ranked_win_5": case "ranked_win_10": case "ranked_win_25": case "ranked_win_50": return rankedWins.length;
      case "daily_duel_win_5": case "daily_duel_win_10": case "daily_duel_win_25": return dailyDuelWins.length;
      case "friend_challenge_win_5": case "friend_challenge_win_10": case "friend_challenge_win_25": case "first_h2h_win": return friendWins.length;
      case "streak_3": case "streak_7": case "streak_14": case "streak_30": case "daily_streak_60": return dailyStreak;
      case "quick_thinker": return hasFastDifficulty("Easy", 180) ? 1 : 0;
      case "sharp_mind": return hasFastDifficulty("Medium", 300) ? 1 : 0;
      case "fast_solver": return hasFastDifficulty("Hard", 480) ? 1 : 0;
      case "speedrunner": return results.some((r) => r.elapsed_seconds < 120) ? 1 : 0;
      case "speed_expert": return hasFastDifficulty("Expert", 1200) ? 1 : 0;
      case "speed_master": return hasFastDifficulty("Master", 1800) ? 1 : 0;
      case "fast_solve_5": return fastSolves;
      case "easy_clear": case "easy_25": case "easy_100": return countDifficulty("Easy");
      case "medium_clear": case "medium_25": case "medium_100": return countDifficulty("Medium");
      case "hard_clear": case "hard_25": case "hard_100": return countDifficulty("Hard");
      case "expert_solver": case "expert_10": case "expert_25": return countDifficulty("Expert");
      case "master_solver": case "master_10": case "master_25": return countDifficulty("Master");
      case "ranked_clean_win": return hasCleanDuelWin("ranked_duel") ? 1 : 0;
      case "daily_duel_clean_win": return hasCleanDuelWin("daily_duel") ? 1 : 0;
      case "gold_mind": return rank.currentMin >= 850 ? badge.progress_target : profile.rank_points;
      case "diamond_mind": return rank.currentMin >= 2350 ? badge.progress_target : profile.rank_points;
      case "bronze_rank": return 1;
      case "silver_rank": return rank.currentMin >= 350 ? badge.progress_target : profile.rank_points;
      case "platinum_rank": return rank.currentMin >= 1500 ? badge.progress_target : profile.rank_points;
      case "master_rank": return rank.currentMin >= 3500 ? badge.progress_target : profile.rank_points;
      case "perfect_duel": return results.some((r) => ["daily_duel", "ranked_duel", "friend_challenge"].includes(r.mode) && r.result_outcome === "win" && r.mistakes === 0 && r.hints_used === 0) ? 1 : 0;
      case "classic_5": case "classic_25": case "classic_50": case "classic_100": case "classic_250": return classicResults.length;
      case "daily_3": case "daily_7": case "daily_14": case "daily_30": case "daily_50": return dailyResults.length;
      case "pure_logic": return countCleanDifficulty("Hard") > 0 ? 1 : 0;
      case "mastermind": return countCleanDifficulty("Expert") > 0 ? 1 : 0;
      case "flawless_expert": return results.some((r) => r.difficulty === "Expert" && r.mistakes === 0) ? 1 : 0;
      case "flawless_master": return results.some((r) => r.difficulty === "Master" && r.mistakes === 0) ? 1 : 0;
      case "no_hint_expert": return results.some((r) => r.difficulty === "Expert" && r.hints_used === 0) ? 1 : 0;
      case "no_hint_master": return results.some((r) => r.difficulty === "Master" && r.hints_used === 0) ? 1 : 0;
      case "hard_clean_10": return countCleanDifficulty("Hard");
      case "expert_clean_5": return countCleanDifficulty("Expert");
      case "master_clean": return countCleanDifficulty("Master") > 0 ? 1 : 0;
      case "consistency_day_3": case "consistency_day_5": return maxSolvesInDay;
      case "active_days_3": case "active_days_7": case "active_days_30": return activeDays;
      case "profile_complete": return profile.profile_setup_completed && Boolean(profile.username_handle) ? 1 : 0;
      case "avatar_customized": return avatarCustomized ? 1 : 0;
      case "level_5": case "level_10": case "level_25": return profile.account_level;
      case "xp_10000": case "xp_50000": return profile.total_mastery_xp;
      default: return 0;
    }
  };
  const badges = profile.badges_unlocked.map((badge) => {
    const progress = Math.min(badge.progress_target, mapProgress(badge));
    const justUnlocked = !badge.unlocked && progress >= badge.progress_target;
    const next = { ...badge, progress_current: progress, unlocked: badge.unlocked || justUnlocked, unlocked_at: justUnlocked ? nowIso : badge.unlocked_at };
    if (justUnlocked) unlocked.push(next);
    return next;
  });
  return { badges, unlocked };
}

export function applyPuzzleResult(profile: PlayerProfile, result: PuzzleResult, outcome?: RankOutcome): ProfileUpdateSummary {
  const normalized = normalizeProfile(profile);
  const previousLevel = normalized.account_level;
  const previousRankTier = normalized.rank_tier;
  const previousRankDivision = normalized.rank_division;
  const didWin = outcome === "win" || !["ranked", "ranked_duel", "duel", "daily_duel", "friend_challenge"].includes(result.mode);
  const xpEarnedBase = calculateMasteryXp(result, didWin);
  const completedDay = dateKey(result.completed_at);
  const prevDay = normalized.last_completed_date;
  const streak = prevDay === completedDay ? normalized.current_streak : prevDay && dayDiff(prevDay, completedDay) === 1 ? normalized.current_streak + 1 : 1;
  const streakBonus = streak > normalized.current_streak ? 20 : 0;
  const xpEarned = xpEarnedBase + streakBonus;
  const diffKey = `${result.difficulty.toLowerCase()}_completed` as keyof PlayerProfile;
  const oldBest = normalized.best_times_by_difficulty[result.difficulty];
  const isDuel = result.mode === "duel" || result.mode === "daily_duel" || result.mode === "friend_challenge" || result.mode === "ranked" || result.mode === "ranked_duel";
  const isRanked = result.mode === "ranked" || result.mode === "ranked_duel";
  const rpDelta = isRanked ? (outcome === "win" ? 25 : outcome === "loss" ? -15 : outcome === "abandon" ? -25 : 0) : 0;
  const nextRp = Math.max(0, normalized.rank_points + rpDelta);
  const rank = getRankFromRp(nextRp);
  const level = getLevelFromXp(normalized.total_mastery_xp + xpEarned);
  const recent: RecentResult = { ...result, xp_earned: xpEarned, result_outcome: outcome };
  const updated: PlayerProfile = {
    ...normalized,
    account_level: level.level,
    mastery_xp: level.xpInLevel,
    mastery_xp_to_next_level: level.xpToNext,
    total_mastery_xp: normalized.total_mastery_xp + xpEarned,
    rank_tier: rank.tier,
    rank_division: rank.division,
    rank_points: nextRp,
    current_streak: streak,
    longest_streak: Math.max(normalized.longest_streak, streak),
    puzzles_completed: normalized.puzzles_completed + 1,
    flawless_puzzles: normalized.flawless_puzzles + (result.mistakes === 0 ? 1 : 0),
    total_mistakes: normalized.total_mistakes + result.mistakes,
    total_hints_used: normalized.total_hints_used + result.hints_used,
    best_times_by_difficulty: { ...normalized.best_times_by_difficulty, [result.difficulty]: oldBest === undefined ? result.elapsed_seconds : Math.min(oldBest, result.elapsed_seconds) },
    duels_played: normalized.duels_played + (isDuel ? 1 : 0),
    duels_won: normalized.duels_won + (isDuel && outcome === "win" ? 1 : 0),
    ranked_played: normalized.ranked_played + (isRanked ? 1 : 0),
    ranked_won: normalized.ranked_won + (isRanked && outcome === "win" ? 1 : 0),
    recent_results: [recent, ...normalized.recent_results].slice(0, 50),
    last_completed_date: completedDay,
    [diffKey]: typeof normalized[diffKey] === "number" ? (normalized[diffKey] as number) + 1 : normalized[diffKey],
  };
  const badgeResult = progressBadges(updated, result.completed_at);
  updated.badges_unlocked = badgeResult.badges;
  return {
    xpEarned,
    didLevelUp: updated.account_level > previousLevel,
    previousLevel,
    newLevel: updated.account_level,
    rankPromotion: isRanked
      ? getRankPromotionSummary(previousRankTier, previousRankDivision, updated.rank_tier, updated.rank_division)
      : null,
    unlockedBadges: badgeResult.unlocked,
    updatedProfile: updated,
  };
}

export function createSimulatedResult(mode: GameMode = "classic", outcome?: RankOutcome): PuzzleResult {
  const now = new Date().toISOString();
  return { puzzle_id: `sim_${mode}_${Date.now()}`, mode, difficulty: "Medium", completed: true, elapsed_seconds: 260, mistakes: outcome === "loss" ? 2 : 0, hints_used: 0, undo_count: 1, move_count: 48, final_score: outcome === "loss" ? 2565 : 3065, eligible_for_leaderboard: true, eligible_for_ranked: mode === "ranked", completed_at: now };
}
