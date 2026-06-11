import { DEFAULT_AVATAR_COLOR, DEFAULT_INITIALS, DEFAULT_USERNAME } from "@/constants/branding";
import type { Difficulty } from "@/constants/mockData";
import type { GameMode, PuzzleResult } from "@/hooks/useSudokuGame";
import type { CharacterAvatarConfig } from "@/lib/avatar";
import { calculateMasteryXpFromScore, TARGET_SECONDS } from "@/lib/scoring";

export type RankOutcome = "win" | "loss" | "draw" | "abandon";
export type BadgeCategory = "Starter" | "Streak" | "Speed" | "Difficulty" | "Competitive" | "Completion" | "Precision";

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
  unlockedBadges: AchievementBadge[];
  updatedProfile: PlayerProfile;
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

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || DEFAULT_INITIALS;
}

function createBadge(id: string, name: string, description: string, category: BadgeCategory, target: number, icon: string): AchievementBadge {
  return { badge_id: id, name, description, category, unlocked: false, unlocked_at: null, progress_current: 0, progress_target: target, icon };
}

export const BADGE_CATEGORIES: ("All" | BadgeCategory)[] = ["All", "Starter", "Streak", "Speed", "Difficulty", "Competitive", "Completion", "Precision"];

export const BADGE_DEFINITIONS: AchievementBadge[] = [
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

const defaultSettings: ProfileSettings = {
  notifications: { dailyPuzzleReminder: true, streakReminder: true, duelResults: true, rankedMatchUpdates: false },
  privacy: { publicProfile: true, showStatsPublicly: true, showRecentResultsPublicly: false, allowFriendChallenges: true },
  devMode: true,
};

export function normalizeProfile(profile: PlayerProfile): PlayerProfile {
  const level = getLevelFromXp(profile.total_mastery_xp ?? 0);
  const rank = getRankFromRp(profile.rank_points ?? 0);
  const badges = Array.isArray(profile.badges_unlocked) ? profile.badges_unlocked : BADGE_DEFINITIONS.map((definition) => ({ ...definition }));
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
  const latest = profile.recent_results[0];
  const mapProgress = (badge: AchievementBadge): number => {
    switch (badge.badge_id) {
      case "first_grid": return profile.puzzles_completed;
      case "clean_start": case "flawless": return profile.flawless_puzzles;
      case "no_help_needed": return profile.recent_results.some((r) => r.completed && r.hints_used === 0) ? 1 : 0;
      case "first_duel": return profile.duels_played;
      case "first_win": return profile.duels_won;
      case "streak_3": case "streak_7": case "streak_14": case "streak_30": return profile.current_streak;
      case "quick_thinker": return profile.best_times_by_difficulty.Easy !== undefined && profile.best_times_by_difficulty.Easy < 180 ? 1 : 0;
      case "sharp_mind": return profile.best_times_by_difficulty.Medium !== undefined && profile.best_times_by_difficulty.Medium < 300 ? 1 : 0;
      case "fast_solver": return profile.best_times_by_difficulty.Hard !== undefined && profile.best_times_by_difficulty.Hard < 480 ? 1 : 0;
      case "speedrunner": return Object.values(profile.best_times_by_difficulty).some((t) => t !== undefined && t < 120) ? 1 : 0;
      case "easy_clear": return profile.easy_completed;
      case "medium_clear": return profile.medium_completed;
      case "hard_clear": return profile.hard_completed;
      case "expert_solver": return profile.expert_completed;
      case "duelist": case "contender": return profile.duels_won;
      case "ranked_ready": return profile.ranked_played;
      case "gold_mind": return rank.currentMin >= 800 ? badge.progress_target : profile.rank_points;
      case "diamond_mind": return rank.currentMin >= 2500 ? badge.progress_target : profile.rank_points;
      case "perfect_duel": return latest?.result_outcome === "win" && (latest.mode === "duel" || latest.mode === "daily_duel" || latest.mode === "ranked" || latest.mode === "ranked_duel") && latest.mistakes === 0 && latest.hints_used === 0 ? 1 : 0;
      case "puzzle_10": case "puzzle_50": case "puzzle_100": case "puzzle_500": return profile.puzzles_completed;
      case "flawless_10": return profile.flawless_puzzles;
      case "pure_logic": return profile.recent_results.some((r) => r.difficulty === "Hard" && r.mistakes === 0 && r.hints_used === 0) ? 1 : 0;
      case "master_solver": return profile.master_completed;
      case "mastermind": return profile.recent_results.some((r) => r.difficulty === "Expert" && r.mistakes === 0 && r.hints_used === 0) ? 1 : 0;
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
  return { xpEarned, didLevelUp: updated.account_level > previousLevel, previousLevel, newLevel: updated.account_level, unlockedBadges: badgeResult.unlocked, updatedProfile: updated };
}

export function createSimulatedResult(mode: GameMode = "classic", outcome?: RankOutcome): PuzzleResult {
  const now = new Date().toISOString();
  return { puzzle_id: `sim_${mode}_${Date.now()}`, mode, difficulty: "Medium", completed: true, elapsed_seconds: 260, mistakes: outcome === "loss" ? 2 : 0, hints_used: 0, undo_count: 1, move_count: 48, final_score: outcome === "loss" ? 2565 : 3065, eligible_for_leaderboard: true, eligible_for_ranked: mode === "ranked", completed_at: now };
}
