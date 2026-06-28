import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import type { PuzzleResult, SessionSnapshot } from "@/hooks/useSudokuGame";
import { getDailyDateKey, getDailyDateWindow } from "@/lib/daily";
import { logDevDiagnostic, measureAsync } from "@/lib/performanceDiagnostics";
import { normalizeAvatarConfig, type CharacterAvatarConfig } from "@/lib/avatar";
import { applyPuzzleResult, createInitialPlayerProfile, createSimulatedResult, getRankFromRp, getRankPromotionSummary, initialsFromName, normalizeProfile, type AchievementBadge, type BadgeCategory, type DuelMatchSummary, type PlayerProfile, type ProfileSettings, type ProfileUpdateSummary, type RankOutcome, type RecentResult } from "@/lib/playerProfile";
import { startPuzzleSession as insertPuzzleSession, type StartPuzzleSessionInput } from "@/lib/puzzleSessions";
import type { ScoreBreakdown } from "@/lib/scoring";
import { fetchDailyPuzzle } from "@/lib/sudoku";
import { isSupabaseConfigured, supabase, type AchievementRow, type GameResultRow, type PlayerStatsRow, type ProfileRow, type PuzzleSessionRow, type UserAchievementRow, type UserSettingsRow } from "@/lib/supabase";

/** Generate a valid UUID v4 for session IDs matching the DB uuid column. */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const PLAYER_PROFILE_KEY = "sudoku.player_profile.v2";
const GUEST_SESSIONS_KEY = "sudoku.guest_sessions.v1";
const GUEST_COMPLETED_RESULTS_KEY = "sudoku.completed_results";

type SaveResult = { ok: boolean; error?: string };
type SessionStatus = "in_progress" | "completed" | "failed" | "abandoned";
type DailySessionMode = "daily" | "daily_duel";
type UsernameAvailabilityStatus = "available" | "unavailable" | "invalid" | "error";

const RESERVED_USERNAMES = new Set(["player", "admin", "support", "sudoku", "ranked", "daily", "guest"]);
export interface PublicAvatarConfig extends CharacterAvatarConfig {
  avatar_symbol?: string | null;
}

type PublicAvatarRow = PublicAvatarConfig & {
  initials?: string | null;
  avatar_color?: string | null;
  username?: string | null;
  display_name?: string | null;
  username_handle?: string | null;
};

function publicAvatarFields(value: unknown): PublicAvatarConfig {
  const row = value as PublicAvatarRow | null | undefined;
  return {
    avatar_symbol: row?.avatar_symbol ?? null,
    avatar_style_version: row?.avatar_style_version ?? null,
    avatar_bg_color: row?.avatar_bg_color ?? null,
    avatar_initials: row?.avatar_initials ?? null,
    avatar_skin_tone: row?.avatar_skin_tone ?? null,
    avatar_hair_style: row?.avatar_hair_style ?? null,
    avatar_hair_color: row?.avatar_hair_color ?? null,
    avatar_top_style: row?.avatar_top_style ?? null,
    avatar_top_color: row?.avatar_top_color ?? null,
    avatar_accessory: row?.avatar_accessory ?? null,
    avatar_frame: row?.avatar_frame ?? null,
  };
}

function prefixedFriendAvatarFields(row: unknown) {
  const fields = publicAvatarFields(row);
  return {
    friend_avatar_symbol: fields.avatar_symbol,
    friend_avatar_style_version: fields.avatar_style_version,
    friend_avatar_bg_color: fields.avatar_bg_color,
    friend_avatar_initials: fields.avatar_initials,
    friend_avatar_skin_tone: fields.avatar_skin_tone,
    friend_avatar_hair_style: fields.avatar_hair_style,
    friend_avatar_hair_color: fields.avatar_hair_color,
    friend_avatar_top_style: fields.avatar_top_style,
    friend_avatar_top_color: fields.avatar_top_color,
    friend_avatar_accessory: fields.avatar_accessory,
    friend_avatar_frame: fields.avatar_frame,
  };
}

function prefixedOpponentAvatarFields(row: unknown) {
  const fields = publicAvatarFields(row);
  return {
    opponent_avatar_symbol: fields.avatar_symbol,
    opponent_avatar_style_version: fields.avatar_style_version,
    opponent_avatar_bg_color: fields.avatar_bg_color,
    opponent_avatar_initials: fields.avatar_initials,
    opponent_avatar_skin_tone: fields.avatar_skin_tone,
    opponent_avatar_hair_style: fields.avatar_hair_style,
    opponent_avatar_hair_color: fields.avatar_hair_color,
    opponent_avatar_top_style: fields.avatar_top_style,
    opponent_avatar_top_color: fields.avatar_top_color,
    opponent_avatar_accessory: fields.avatar_accessory,
    opponent_avatar_frame: fields.avatar_frame,
  };
}

export interface UsernameAvailability {
  username: string;
  status: UsernameAvailabilityStatus;
  message: string;
}

interface RecordPuzzleResultOptions {
  sessionId?: string;
}

export interface OfficialResultPayload {
  result_id: string;
  session_id: string;
  puzzle_id: string;
  mode: PuzzleResult["mode"];
  difficulty: PuzzleResult["difficulty"];
  elapsed_seconds: number;
  mistakes: number;
  hints_used: number;
  undo_count: number;
  final_score: number;
  score_breakdown?: ScoreBreakdown | null;
  xp_earned: number;
  leaderboard_eligible: boolean;
  ranked_eligible?: boolean;
  completed_at?: string;
  badges_unlocked?: AchievementBadge[];
  updated_profile_stats?: Partial<PlayerStatsRow> | null;
  already_finalized?: boolean;
  won?: boolean | null;
}

export interface DailyLeaderboardEntry extends PublicAvatarConfig {
  result_id: string;
  user_id: string;
  username: string;
  initials: string;
  avatar_color: string;
  final_score: number;
  elapsed_seconds: number;
  mistakes: number;
  hints_used: number;
  undo_count: number;
  completed_at: string;
}

export interface WeeklyLeaderboardEntry extends PublicAvatarConfig {
  rank: number;
  user_id: string;
  username: string;
  initials: string;
  avatar_color: string;
  total_score: number;
  puzzles_completed: number;
  best_score: number;
  total_time: number;
  latest_completed_at: string;
}

export interface FriendsWeeklyLeaderboardEntry extends WeeklyLeaderboardEntry {
  username_handle?: string | null;
  is_current_user: boolean;
}

export interface PublicPlayerProfileSummary extends PublicAvatarConfig {
  user_id: string;
  username: string;
  display_name: string | null;
  username_handle: string | null;
  initials: string;
  avatar_color: string;
  public_profile: boolean;
  show_stats_publicly: boolean;
  show_recent_results_publicly: boolean;
  rank_tier: string | null;
  current_streak: number | null;
  longest_streak: number | null;
  puzzles_completed: number | null;
  duels_played: number | null;
  duels_won: number | null;
  ranked_played: number | null;
  ranked_won: number | null;
  best_easy_time: number | null;
  best_medium_time: number | null;
  best_hard_time: number | null;
  best_expert_time: number | null;
  best_master_time: number | null;
}

export interface PublicPlayerRecentResult {
  result_id: string;
  session_id: string | null;
  puzzle_id: string | null;
  mode: string;
  difficulty: string;
  won: boolean | null;
  elapsed_seconds: number;
  mistakes: number;
  hints_used: number;
  undo_count: number;
  final_score: number;
  xp_earned: number;
  rp_change: number;
  completed_at: string;
}

export interface PublicPlayerProfilePage {
  profile: PublicPlayerProfileSummary | null;
  recent_results: PublicPlayerRecentResult[];
}

export interface FriendUser extends PublicAvatarConfig {
  user_id: string;
  display_name: string;
  username_handle: string;
  initials: string;
  avatar_color: string;
  created_at?: string;
  relationship_status?: "none" | "friends" | "request_sent" | "request_received";
}

export interface FriendRequestEntry extends PublicAvatarConfig {
  request_id: string;
  user_id: string;
  display_name: string;
  username_handle: string;
  initials: string;
  avatar_color: string;
  created_at: string;
}

export interface FriendChallengeEntry {
  challenge_id: string;
  direction: "incoming" | "outgoing";
  status: "pending" | "accepted" | "challenger_completed" | "challenged_completed" | "completed" | "declined" | "cancelled" | "expired";
  puzzle_id: string;
  difficulty: PuzzleResult["difficulty"];
  challenger_id: string;
  challenged_id: string;
  friend_user_id: string;
  friend_display_name: string;
  friend_username_handle: string;
  friend_initials: string;
  friend_avatar_color: string;
  friend_avatar_symbol?: string | null;
  friend_avatar_style_version?: string | null;
  friend_avatar_bg_color?: string | null;
  friend_avatar_initials?: string | null;
  friend_avatar_skin_tone?: string | null;
  friend_avatar_hair_style?: string | null;
  friend_avatar_hair_color?: string | null;
  friend_avatar_top_style?: string | null;
  friend_avatar_top_color?: string | null;
  friend_avatar_accessory?: string | null;
  friend_avatar_frame?: string | null;
  challenger_session_id: string | null;
  challenged_session_id: string | null;
  current_user_session_id: string | null;
  challenger_result_id: string | null;
  challenged_result_id: string | null;
  challenger_score: number | null;
  challenged_score: number | null;
  challenger_elapsed_seconds: number | null;
  challenged_elapsed_seconds: number | null;
  challenger_mistakes: number | null;
  challenged_mistakes: number | null;
  challenger_hints_used: number | null;
  challenged_hints_used: number | null;
  challenger_undo_count: number | null;
  challenged_undo_count: number | null;
  challenger_completed_at: string | null;
  challenged_completed_at: string | null;
  winner_user_id: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

export interface FriendChallengeStart {
  challenge_id: string;
  status: FriendChallengeEntry["status"];
  puzzle_id: string;
  difficulty: PuzzleResult["difficulty"];
  session_id: string;
}

export interface DailyDuelEntry {
  duel_id: string;
  duel_date: string;
  status: "waiting_for_opponent" | "matched" | "player_a_completed" | "player_b_completed" | "completed" | "cancelled" | "expired";
  puzzle_id: string;
  difficulty: PuzzleResult["difficulty"];
  session_id: string | null;
  current_user_result_id: string | null;
  opponent_user_id: string | null;
  opponent_display_name: string | null;
  opponent_username_handle: string | null;
  opponent_initials: string | null;
  opponent_avatar_color: string | null;
  opponent_avatar_symbol?: string | null;
  opponent_avatar_style_version?: string | null;
  opponent_avatar_bg_color?: string | null;
  opponent_avatar_initials?: string | null;
  opponent_avatar_skin_tone?: string | null;
  opponent_avatar_hair_style?: string | null;
  opponent_avatar_hair_color?: string | null;
  opponent_avatar_top_style?: string | null;
  opponent_avatar_top_color?: string | null;
  opponent_avatar_accessory?: string | null;
  opponent_avatar_frame?: string | null;
  opponent_rank_tier: string | null;
  your_score: number | null;
  your_elapsed_seconds: number | null;
  your_mistakes: number | null;
  your_hints_used: number | null;
  opponent_score: number | null;
  opponent_elapsed_seconds: number | null;
  opponent_mistakes: number | null;
  opponent_hints_used: number | null;
  winner_user_id: string | null;
  completed_at: string | null;
}

export interface RankedDuelEntry {
  ranked_duel_id: string;
  season_id: string;
  season_name: string;
  season_ends_at: string | null;
  status: "waiting_for_opponent" | "matched" | "player_a_completed" | "player_b_completed" | "completed" | "cancelled" | "expired";
  puzzle_id: string;
  difficulty: PuzzleResult["difficulty"];
  session_id: string | null;
  current_user_result_id: string | null;
  opponent_user_id: string | null;
  opponent_display_name: string | null;
  opponent_username_handle: string | null;
  opponent_initials: string | null;
  opponent_avatar_color: string | null;
  opponent_avatar_symbol?: string | null;
  opponent_avatar_style_version?: string | null;
  opponent_avatar_bg_color?: string | null;
  opponent_avatar_initials?: string | null;
  opponent_avatar_skin_tone?: string | null;
  opponent_avatar_hair_style?: string | null;
  opponent_avatar_hair_color?: string | null;
  opponent_avatar_top_style?: string | null;
  opponent_avatar_top_color?: string | null;
  opponent_avatar_accessory?: string | null;
  opponent_avatar_frame?: string | null;
  opponent_rank_tier: string | null;
  your_score: number | null;
  your_elapsed_seconds: number | null;
  opponent_score: number | null;
  opponent_elapsed_seconds: number | null;
  winner_user_id: string | null;
  rp_before: number | null;
  rp_after: number | null;
  rp_change: number | null;
  current_rp: number;
  current_tier: string;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  completed_at: string | null;
}

export interface FriendHeadToHeadMatch {
  challenge_id: string;
  difficulty: PuzzleResult["difficulty"];
  outcome: "won" | "lost" | "draw";
  winner_user_id: string | null;
  current_user_score: number;
  friend_score: number;
  current_user_elapsed_seconds: number | null;
  friend_elapsed_seconds: number | null;
  current_user_mistakes: number | null;
  friend_mistakes: number | null;
  current_user_hints_used: number | null;
  friend_hints_used: number | null;
  current_user_undo_count: number | null;
  friend_undo_count: number | null;
  current_user_completed_at: string | null;
  friend_completed_at: string | null;
  completed_at: string;
}

export interface FriendHeadToHeadSummary {
  friend_user_id: string;
  friend_display_name: string;
  friend_username_handle: string;
  friend_initials: string;
  friend_avatar_color: string;
  friend_avatar_symbol?: string | null;
  friend_avatar_style_version?: string | null;
  friend_avatar_bg_color?: string | null;
  friend_avatar_initials?: string | null;
  friend_avatar_skin_tone?: string | null;
  friend_avatar_hair_style?: string | null;
  friend_avatar_hair_color?: string | null;
  friend_avatar_top_style?: string | null;
  friend_avatar_top_color?: string | null;
  friend_avatar_accessory?: string | null;
  friend_avatar_frame?: string | null;
  total_completed: number;
  current_user_wins: number;
  friend_wins: number;
  draws: number;
  current_user_average_score: number;
  friend_average_score: number;
  current_user_best_score: number;
  friend_best_score: number;
  current_user_fastest_win: number | null;
  friend_fastest_win: number | null;
  recent_completed_challenges: FriendHeadToHeadMatch[];
}

interface DailyLeaderboardRpcRow {
  rank?: number;
  result_id: string;
  user_id: string;
  username: string | null;
  initials: string | null;
  avatar_color: string | null;
  puzzle_id: string | null;
  final_score: number;
  elapsed_seconds: number;
  mistakes: number;
  hints_used: number;
  undo_count: number;
  completed_at: string;
}

interface WeeklyLeaderboardRpcRow {
  rank?: number;
  user_id: string;
  username: string | null;
  initials: string | null;
  avatar_color: string | null;
  total_score: number;
  puzzles_completed: number;
  best_score: number;
  total_time: number;
  latest_completed_at: string;
}

interface FriendsWeeklyLeaderboardRpcRow {
  rank?: number;
  user_id: string;
  display_name: string | null;
  username_handle: string | null;
  initials: string | null;
  avatar_color: string | null;
  total_score: number;
  puzzles_completed: number;
  best_score: number;
  total_time: number;
  latest_completed_at: string;
  is_current_user: boolean | null;
}

export interface RankedLeaderboardEntry extends PublicAvatarConfig {
  rank: number;
  user_id: string;
  username: string;
  initials: string;
  avatar_color: string;
  current_tier: string;
  rp: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  updated_at: string;
}

function parseHeadToHeadMatches(value: unknown): FriendHeadToHeadMatch[] {
  if (Array.isArray(value)) return value as FriendHeadToHeadMatch[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as FriendHeadToHeadMatch[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

export interface DailyDiagnostics {
  currentUserId: string | null;
  todayDateStr: string | null;
  assignedDailyPuzzle: { puzzle_id: string; difficulty: string } | null;
  assignedDailyPuzzleId: string | null;
  replayQueryResultCount: number | null;
  replayQueryRows: unknown[];
  replayRpcResult: boolean | null;
  leaderboardQueryResultCount: number | null;
  leaderboardRawRows: unknown[];
  leaderboardRpcResultCount: number | null;
  leaderboardFinalDisplayedRowCount: number | null;
  errors: string[];
}

interface GuestSessionEntry {
  sessionId: string;
  snapshot: SessionSnapshot;
}

export interface BackendDiagnostics {
  sessionStatus: "guest" | "signed_in" | "signed_out" | "loading";
  userId: string | null;
  profileLoaded: boolean;
  statsLoaded: boolean;
  settingsLoaded: boolean;
  recentResultsCount: number;
  activeSessionCount: number;
  latestSessionStatus: string | null;
  latestResultPuzzleId: string | null;
  lastError: string | null;
  lastSessionSaveAttemptedAt: string | null;
  lastSessionSaveSucceeded: boolean | null;
  lastSessionSaveError: string | null;
  daily: DailyDiagnostics | null;
}

function profileFromRows(profileRow: ProfileRow, statsRow: PlayerStatsRow, settingsRow: UserSettingsRow, fallback: PlayerProfile): PlayerProfile {
  const [tier = "Bronze", division = "III"] = statsRow.rank_tier.split(" ");
  const handle = profileRow.username_handle?.trim().toLowerCase() || null;
  const displayName = profileRow.display_name?.trim() || handle || profileRow.username;
  const setupCompleted = profileRow.profile_setup_completed === true && handle !== null;
  const avatarConfig = normalizeAvatarConfig({
    avatar_style_version: profileRow.avatar_style_version,
    avatar_bg_color: profileRow.avatar_bg_color,
    avatar_initials: profileRow.avatar_initials,
    avatar_skin_tone: profileRow.avatar_skin_tone,
    avatar_hair_style: profileRow.avatar_hair_style,
    avatar_hair_color: profileRow.avatar_hair_color,
    avatar_top_style: profileRow.avatar_top_style,
    avatar_top_color: profileRow.avatar_top_color,
    avatar_accessory: profileRow.avatar_accessory,
    avatar_frame: profileRow.avatar_frame,
  }, { initials: profileRow.initials, color: profileRow.avatar_color, symbol: profileRow.avatar_symbol });
  return normalizeProfile({
    ...fallback,
    user_id: profileRow.id,
    username: displayName,
    username_handle: handle,
    display_name: displayName,
    profile_setup_completed: setupCompleted,
    initials: setupCompleted ? profileRow.initials : "",
    avatar_color: profileRow.avatar_color,
    avatar_symbol: profileRow.avatar_symbol ?? null,
    ...avatarConfig,
    total_mastery_xp: statsRow.total_mastery_xp,
    account_level: statsRow.account_level,
    rank_points: statsRow.rank_points,
    rank_tier: tier,
    rank_division: division,
    current_streak: statsRow.current_streak,
    longest_streak: statsRow.longest_streak,
    puzzles_completed: statsRow.puzzles_completed,
    flawless_puzzles: statsRow.flawless_puzzles,
    total_mistakes: statsRow.total_mistakes,
    total_hints_used: statsRow.total_hints_used,
    best_times_by_difficulty: { Easy: statsRow.best_easy_time ?? undefined, Medium: statsRow.best_medium_time ?? undefined, Hard: statsRow.best_hard_time ?? undefined, Expert: statsRow.best_expert_time ?? undefined, Master: statsRow.best_master_time ?? undefined },
    duels_played: statsRow.duels_played,
    duels_won: statsRow.duels_won,
    ranked_played: statsRow.ranked_played,
    ranked_won: statsRow.ranked_won,
    settings: {
      ...fallback.settings,
      notifications: { dailyPuzzleReminder: settingsRow.daily_reminder, streakReminder: settingsRow.streak_reminder, duelResults: settingsRow.duel_results, rankedMatchUpdates: settingsRow.ranked_updates },
      privacy: { publicProfile: settingsRow.public_profile, showStatsPublicly: settingsRow.show_stats_publicly, showRecentResultsPublicly: settingsRow.show_recent_results_publicly, allowFriendChallenges: settingsRow.allow_friend_challenges },
    },
  });
}

function applyRankedProfileSource(profile: PlayerProfile, row: { rp?: number | null; current_tier?: string | null; matches_played?: number | null; wins?: number | null }): PlayerProfile {
  const [tier = "Bronze", division = "III"] = (row.current_tier ?? "Bronze III").split(" ");
  return normalizeProfile({
    ...profile,
    rank_points: Number(row.rp ?? profile.rank_points),
    rank_tier: tier,
    rank_division: division,
    ranked_played: Number(row.matches_played ?? profile.ranked_played),
    ranked_won: Number(row.wins ?? profile.ranked_won),
  });
}

function statsPayload(profile: PlayerProfile): Partial<PlayerStatsRow> {
  return {
    total_mastery_xp: profile.total_mastery_xp,
    account_level: profile.account_level,
    rank_points: profile.rank_points,
    rank_tier: `${profile.rank_tier}${profile.rank_division ? ` ${profile.rank_division}` : ""}`,
    current_streak: profile.current_streak,
    longest_streak: profile.longest_streak,
    puzzles_completed: profile.puzzles_completed,
    flawless_puzzles: profile.flawless_puzzles,
    total_mistakes: profile.total_mistakes,
    total_hints_used: profile.total_hints_used,
    total_undos_used: profile.recent_results.reduce((sum, result) => sum + result.undo_count, 0),
    duels_played: profile.duels_played,
    duels_won: profile.duels_won,
    ranked_played: profile.ranked_played,
    ranked_won: profile.ranked_won,
    best_easy_time: profile.best_times_by_difficulty.Easy ?? null,
    best_medium_time: profile.best_times_by_difficulty.Medium ?? null,
    best_hard_time: profile.best_times_by_difficulty.Hard ?? null,
    best_expert_time: profile.best_times_by_difficulty.Expert ?? null,
    best_master_time: profile.best_times_by_difficulty.Master ?? null,
    updated_at: new Date().toISOString(),
  };
}

function normalizedWon(row: Pick<GameResultRow, "mode" | "completed" | "won" | "final_score" | "elapsed_seconds" | "result_id">): boolean | null {
  if (row.won !== null) return row.won;
  if (
    row.completed === true
    && (row.mode === "classic" || row.mode === "daily")
    && !row.result_id.endsWith("_failed")
    && row.final_score > 0
    && row.elapsed_seconds > 0
  ) {
    return true;
  }
  return null;
}

function resultFromRow(row: GameResultRow): RecentResult {
  const won = normalizedWon(row);
  return { result_id: row.result_id, session_id: row.session_id ?? undefined, puzzle_id: row.puzzle_id ?? "unknown", mode: row.mode as RecentResult["mode"], difficulty: row.difficulty as RecentResult["difficulty"], completed: true, elapsed_seconds: row.elapsed_seconds, mistakes: row.mistakes, hints_used: row.hints_used, undo_count: row.undo_count, move_count: 0, final_score: row.final_score, eligible_for_leaderboard: row.eligible_for_leaderboard, eligible_for_ranked: row.eligible_for_ranked, completed_at: row.completed_at, xp_earned: row.xp_earned, rp_change: row.rp_change ?? null, won, result_outcome: won === true ? "win" : won === false ? "loss" : undefined };
}

function logicalResultKey(result: RecentResult): string {
  return [
    result.mode,
    result.puzzle_id ?? "",
    result.difficulty,
    result.completed_at,
    result.elapsed_seconds,
    result.final_score,
  ].join("|");
}

function dedupeRecentResults(results: RecentResult[]): RecentResult[] {
  const byKey = new Map<string, RecentResult>();
  for (const result of results) {
    const key = logicalResultKey(result);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, result);
      continue;
    }
    const currentHasSession = Boolean(current.session_id);
    const nextHasSession = Boolean(result.session_id);
    if ((nextHasSession && !currentHasSession) || (nextHasSession === currentHasSession && (result.result_id ?? "") < (current.result_id ?? ""))) {
      byKey.set(key, result);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
}

function duelOutcomeForUser(winnerUserId: string | null | undefined, userId: string): RankOutcome {
  if (!winnerUserId) return "draw";
  return winnerUserId === userId ? "win" : "loss";
}

function dedupeDuelMatches(matches: DuelMatchSummary[]): DuelMatchSummary[] {
  const byKey = new Map<string, DuelMatchSummary>();
  for (const match of matches) {
    byKey.set(`${match.mode}:${match.match_id}`, match);
  }
  return Array.from(byKey.values()).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
}

function deterministicResultId(userId: string, result: PuzzleResult, sessionId: string | null): string {
  if (sessionId) return `${userId}_${sessionId}`;
  return `${userId}_${result.puzzle_id}_${result.mode}_${result.difficulty}_${result.completed_at}`;
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "23505" || error?.message?.toLowerCase().includes("duplicate") === true;
}

function normalizeUsernameHandle(value: string): string {
  return value.trim().toLowerCase();
}

function validateUsernameHandle(value: string): UsernameAvailability | null {
  const username = normalizeUsernameHandle(value);
  if (username.length === 0) return { username, status: "invalid", message: "Username is required." };
  if (username.length < 3 || username.length > 20) return { username, status: "invalid", message: "Username must be 3-20 characters." };
  if (!/^[a-z0-9_]+$/.test(username)) return { username, status: "invalid", message: "Use lowercase letters, numbers, and underscores only." };
  if (RESERVED_USERNAMES.has(username)) return { username, status: "invalid", message: "That username is reserved." };
  return null;
}

function achievementFromBackend(row: AchievementRow, progress?: UserAchievementRow): AchievementBadge {
  return {
    badge_id: row.badge_id,
    name: row.name,
    description: row.description,
    category: row.category as BadgeCategory,
    icon: row.icon,
    rarity: (row.rarity ?? "common") as AchievementBadge["rarity"],
    progress_target: row.progress_target,
    unlocked: progress?.unlocked ?? false,
    progress_current: progress?.progress_current ?? 0,
    unlocked_at: progress?.unlocked_at ?? null,
  };
}

function guestSessionToPuzzleSessionRow(entry: GuestSessionEntry): PuzzleSessionRow {
  return {
    session_id: entry.sessionId,
    user_id: "",
    puzzle_id: entry.snapshot.puzzle_id,
    mode: entry.snapshot.mode,
    difficulty: entry.snapshot.difficulty,
    board_state: entry.snapshot.board_state,
    notes_state: entry.snapshot.notes_state,
    elapsed_seconds: entry.snapshot.elapsed_seconds,
    mistakes: entry.snapshot.mistakes,
    hints_used: entry.snapshot.hints_used,
    undo_count: entry.snapshot.undo_count,
    move_history: entry.snapshot.move_history,
    status: "in_progress" as const,
  };
}

function isResumableGuestSession(entry: GuestSessionEntry, completedPuzzleIds: Set<string>): boolean {
  const snapshot = entry.snapshot;
  if (!entry.sessionId || !snapshot?.puzzle_id) return false;
  if (completedPuzzleIds.has(snapshot.puzzle_id)) return false;
  if (snapshot.mode !== "classic" && snapshot.mode !== "daily") return false;
  if (!Array.isArray(snapshot.board_state) || snapshot.board_state.length !== 9) return false;
  if (!Array.isArray(snapshot.notes_state) || snapshot.notes_state.length !== 9) return false;
  return true;
}

function sessionSortTime(session: Pick<PuzzleSessionRow, "updated_at" | "created_at">): number {
  const raw = session.updated_at ?? session.created_at ?? "";
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function sortSessionsNewestFirst<T extends Pick<PuzzleSessionRow, "updated_at" | "created_at">>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) => sessionSortTime(b) - sessionSortTime(a));
}

function isClassicSession(session: Pick<PuzzleSessionRow, "mode">): boolean {
  return session.mode === "classic";
}

export const [PlayerProfileProvider, usePlayerProfile] = createContextHook(() => {
  const auth = useAuth();
  const [profile, setProfile] = useState<PlayerProfile>(() => createInitialPlayerProfile(false));
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<ProfileUpdateSummary | null>(null);
  const [lastStreakIncreaseKey, setLastStreakIncreaseKey] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<PuzzleSessionRow[]>([]);
  const [activeGuestSessions, setActiveGuestSessions] = useState<GuestSessionEntry[]>([]);
  const loadedProfileKeyRef = useRef<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<BackendDiagnostics>({ sessionStatus: "loading", userId: null, profileLoaded: false, statsLoaded: false, settingsLoaded: false, recentResultsCount: 0, activeSessionCount: 0, latestSessionStatus: null, latestResultPuzzleId: null, lastError: null, lastSessionSaveAttemptedAt: null, lastSessionSaveSucceeded: null, lastSessionSaveError: null, daily: null });

  const updateDiagnostics = useCallback((patch: Partial<BackendDiagnostics>) => {
    setDiagnostics((current) => ({ ...current, sessionStatus: auth.mode, userId: auth.user?.id ?? null, ...patch }));
  }, [auth.mode, auth.user?.id]);

  const updateDailyDiagnostics = useCallback((patch: Partial<DailyDiagnostics>) => {
    setDiagnostics((current) => ({
      ...current,
      sessionStatus: auth.mode,
      userId: auth.user?.id ?? null,
      daily: {
        currentUserId: auth.user?.id ?? null,
        todayDateStr: null,
        assignedDailyPuzzle: null,
        assignedDailyPuzzleId: null,
        replayQueryResultCount: null,
        replayQueryRows: [],
        replayRpcResult: null,
        leaderboardQueryResultCount: null,
        leaderboardRawRows: [],
        leaderboardRpcResultCount: null,
        leaderboardFinalDisplayedRowCount: null,
        errors: [],
        ...current.daily,
        ...patch,
      },
    }));
  }, [auth.mode, auth.user?.id]);

  useEffect(() => {
    logDevDiagnostic("activePuzzleSession changes", {
      count: activeSessions.length,
      sessions: activeSessions.map((session) => ({
        sessionId: session.session_id,
        puzzleId: session.puzzle_id,
        status: session.status,
        elapsedSeconds: session.elapsed_seconds,
      })),
    });
  }, [activeSessions]);

  const persistLocal = useCallback((next: PlayerProfile) => {
    const normalized = normalizeProfile(next);
    setProfile(normalized);
    void AsyncStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(normalized)).catch(() => {});
  }, []);

  // ── Guest session storage ────────────────────────────────────────

  const persistGuestSessions = useCallback(async (entries: GuestSessionEntry[]) => {
    setActiveGuestSessions(entries);
    await AsyncStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(entries)).catch(() => {});
  }, []);

  const loadGuestSessions = useCallback(async (): Promise<GuestSessionEntry[]> => {
    const raw = await AsyncStorage.getItem(GUEST_SESSIONS_KEY);
    if (!raw) return [];
    try {
      const entries = JSON.parse(raw) as GuestSessionEntry[];
      const completedRaw = await AsyncStorage.getItem(GUEST_COMPLETED_RESULTS_KEY);
      const completed = completedRaw ? JSON.parse(completedRaw) as Record<string, unknown> : {};
      const completedPuzzleIds = new Set(Object.keys(completed));
      const resumableEntries = entries.filter((entry) => isResumableGuestSession(entry, completedPuzzleIds));
      const classicEntries = resumableEntries.filter((entry) => entry.snapshot.mode === "classic");
      const newestClassic = classicEntries[0] ?? null;
      const prunedClassicEntries = newestClassic ? [newestClassic] : [];
      const resumableNonClassicEntries = resumableEntries.filter((entry) => entry.snapshot.mode !== "classic");
      const prunedEntries = [...prunedClassicEntries, ...resumableNonClassicEntries];
      if (prunedEntries.length !== entries.length) {
        await AsyncStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(prunedEntries)).catch(() => {});
      }
      setActiveGuestSessions(prunedEntries);
      return prunedEntries;
    } catch {
      await AsyncStorage.removeItem(GUEST_SESSIONS_KEY).catch(() => {});
      setActiveGuestSessions([]);
      return [];
    }
  }, []);

  // ── Backend profile repair / load ────────────────────────────────

  const repairMissingProfileRows = useCallback(async (): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before repairing backend rows." };
    const empty = createInitialPlayerProfile(false);
    const name = (auth.user.user_metadata?.display_name as string | undefined)?.trim() || profile.username || "Player";
    const rank = getRankFromRp(0);
    const { data: achievementRows, error: achievementRowsError } = await supabase.from("achievements").select("badge_id");
    if (achievementRowsError) {
      setLoadError(achievementRowsError.message);
      updateDiagnostics({ lastError: achievementRowsError.message });
      return { ok: false, error: achievementRowsError.message };
    }
    const defaults = [
      supabase.from("profiles").upsert({ id: auth.user.id, username: name, display_name: null, username_handle: null, initials: initialsFromName(name), avatar_color: profile.avatar_color || empty.avatar_color, profile_setup_completed: false }, { onConflict: "id", ignoreDuplicates: true }),
      supabase.from("player_stats").upsert({ user_id: auth.user.id, total_mastery_xp: 0, account_level: 1, rank_points: 0, rank_tier: `${rank.tier} ${rank.division}`, current_streak: 0, longest_streak: 0, puzzles_completed: 0, flawless_puzzles: 0, total_mistakes: 0, total_hints_used: 0, total_undos_used: 0, duels_played: 0, duels_won: 0, ranked_played: 0, ranked_won: 0, best_easy_time: null, best_medium_time: null, best_hard_time: null, best_expert_time: null, best_master_time: null }, { onConflict: "user_id", ignoreDuplicates: true }),
      supabase.from("user_settings").upsert({ user_id: auth.user.id, daily_reminder: true, streak_reminder: true, duel_results: true, ranked_updates: false, public_profile: true, show_stats_publicly: true, show_recent_results_publicly: false, allow_friend_challenges: true }, { onConflict: "user_id", ignoreDuplicates: true }),
    ];
    const results = await Promise.all(defaults);
    const error = results.find((result) => result.error)?.error;
    if (error) {
      setLoadError(error.message);
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    const achievementDefaults = ((achievementRows ?? []) as Pick<AchievementRow, "badge_id">[]).map((badge) => ({ user_id: auth.user!.id, badge_id: badge.badge_id, unlocked: false, progress_current: 0, unlocked_at: null }));
    if (achievementDefaults.length > 0) {
      const { error: userAchievementError } = await supabase.from("user_achievements").upsert(achievementDefaults, { onConflict: "user_id,badge_id", ignoreDuplicates: true });
      if (userAchievementError) {
        setLoadError(userAchievementError.message);
        updateDiagnostics({ lastError: userAchievementError.message });
        return { ok: false, error: userAchievementError.message };
      }
    }
    return { ok: true };
  }, [auth.user, profile.avatar_color, profile.username, updateDiagnostics]);

  const loadBackendProfile = useCallback(async (): Promise<void> => {
    if (!auth.user || !isSupabaseConfigured) return;
    setLoadError(null);
    const repair = await repairMissingProfileRows();
    if (!repair.ok) return;
    const empty = createInitialPlayerProfile(false);
    const [{ data: p, error: pError }, { data: s, error: sError }, { data: settings, error: settingsError }, { data: results, error: resultsError }, { data: achievements, error: achievementsError }, { data: userAchievements, error: userAchievementsError }, { data: sessions, error: sessionsError }, { data: latestClassicSessions, error: latestClassicSessionsError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
      supabase.from("player_stats").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("game_results").select("*").eq("user_id", auth.user.id).eq("completed", true).order("completed_at", { ascending: false }).limit(500),
      supabase.from("achievements").select("*").order("badge_id", { ascending: true }),
      supabase.from("user_achievements").select("*").eq("user_id", auth.user.id),
      supabase.from("puzzle_sessions").select("*").eq("user_id", auth.user.id).eq("status", "in_progress").order("updated_at", { ascending: false }),
      supabase.from("puzzle_sessions").select("*").eq("user_id", auth.user.id).eq("mode", "classic").order("updated_at", { ascending: false }).limit(25),
    ]);
    const error = pError ?? sError ?? settingsError ?? resultsError ?? achievementsError ?? userAchievementsError ?? sessionsError ?? latestClassicSessionsError;
    if (error) {
      setLoadError(error.message);
      updateDiagnostics({ profileLoaded: !!p, statsLoaded: !!s, settingsLoaded: !!settings, lastError: error.message });
      return;
    }
    if (!p || !s || !settings) {
      const message = "Backend profile rows could not be loaded.";
      setLoadError(message);
      updateDiagnostics({ profileLoaded: !!p, statsLoaded: !!s, settingsLoaded: !!settings, lastError: message });
      return;
    }
    const next = profileFromRows(p as ProfileRow, s as PlayerStatsRow, settings as UserSettingsRow, empty);
    const resultRows = ((results ?? []) as GameResultRow[]);
    next.recent_results = resultRows.map(resultFromRow);
    const authoritativeDuelMatches: DuelMatchSummary[] = [];
    let friendChallengeRowsForStats: Array<Record<string, string | null>> | null = null;

    // Duel win rate is match-record based. game_results.won only describes whether
    // the puzzle was solved, and duplicate result rows must not affect duel stats.
    const [{ data: dailyDuelStatRows, error: dailyDuelStatError }, { data: rankedDuelStatRows, error: rankedDuelStatError }, { data: friendChallengeStatRows, error: friendChallengeStatError }] = await Promise.all([
      supabase
        .from("daily_duels")
        .select("duel_id,status,winner_user_id,player_a_id,player_b_id,completed_at")
        .eq("status", "completed")
        .or(`player_a_id.eq.${auth.user.id},player_b_id.eq.${auth.user.id}`),
      supabase
        .from("ranked_duels")
        .select("ranked_duel_id,status,winner_user_id,player_a_id,player_b_id,completed_at")
        .eq("status", "completed")
        .or(`player_a_id.eq.${auth.user.id},player_b_id.eq.${auth.user.id}`),
      supabase.rpc("get_friend_challenges"),
    ]);
    if (dailyDuelStatError) updateDiagnostics({ lastError: dailyDuelStatError.message });
    if (rankedDuelStatError) updateDiagnostics({ lastError: rankedDuelStatError.message });
    if (friendChallengeStatError) updateDiagnostics({ lastError: friendChallengeStatError.message });

    for (const row of (dailyDuelStatRows ?? []) as Array<Record<string, string | null>>) {
      if (!row.duel_id || !row.completed_at) continue;
      authoritativeDuelMatches.push({ match_id: row.duel_id, mode: "daily_duel", completed_at: row.completed_at, result_outcome: duelOutcomeForUser(row.winner_user_id, auth.user.id) });
    }
    for (const row of (rankedDuelStatRows ?? []) as Array<Record<string, string | null>>) {
      if (!row.ranked_duel_id || !row.completed_at) continue;
      authoritativeDuelMatches.push({ match_id: row.ranked_duel_id, mode: "ranked_duel", completed_at: row.completed_at, result_outcome: duelOutcomeForUser(row.winner_user_id, auth.user.id) });
    }
    if (Array.isArray(friendChallengeStatRows)) {
      friendChallengeRowsForStats = friendChallengeStatRows as Array<Record<string, string | null>>;
      for (const row of friendChallengeRowsForStats) {
        if (row.status !== "completed" || !row.challenge_id || !row.completed_at) continue;
        authoritativeDuelMatches.push({ match_id: row.challenge_id, mode: "friend_challenge", completed_at: row.completed_at, result_outcome: duelOutcomeForUser(row.winner_user_id, auth.user.id) });
      }
    }
    next.duel_match_history = dedupeDuelMatches(authoritativeDuelMatches);

    if (next.recent_results.some((result) => result.mode === "daily_duel")) {
      const { data: dailyDuelRows, error: dailyDuelError } = await supabase
        .from("daily_duels")
        .select("status,winner_user_id,player_a_id,player_b_id,player_a_session_id,player_b_session_id,player_a_result_id,player_b_result_id")
        .eq("status", "completed")
        .or(`player_a_id.eq.${auth.user.id},player_b_id.eq.${auth.user.id}`);

      if (dailyDuelError) {
        updateDiagnostics({ lastError: dailyDuelError.message });
      } else if (dailyDuelRows?.length) {
        const outcomeByResultId = new Map<string, RankOutcome>();
        const outcomeBySessionId = new Map<string, RankOutcome>();
        for (const row of dailyDuelRows as Array<Record<string, string | null>>) {
          const outcome: RankOutcome = !row.winner_user_id ? "draw" : row.winner_user_id === auth.user.id ? "win" : "loss";
          const isPlayerA = row.player_a_id === auth.user.id;
          const resultId = isPlayerA ? row.player_a_result_id : row.player_b_result_id;
          const sessionId = isPlayerA ? row.player_a_session_id : row.player_b_session_id;
          if (resultId) outcomeByResultId.set(resultId, outcome);
          if (sessionId) outcomeBySessionId.set(sessionId, outcome);
        }

        next.recent_results = next.recent_results.map((result) => {
          if (result.mode !== "daily_duel") return result;
          const outcome = (result.result_id ? outcomeByResultId.get(result.result_id) : undefined)
            ?? (result.session_id ? outcomeBySessionId.get(result.session_id) : undefined);
          return outcome ? { ...result, result_outcome: outcome } : result;
        });
      }
    }

    if (next.recent_results.some((result) => result.mode === "ranked_duel")) {
      const { data: rankedRows, error: rankedError } = await supabase
        .from("ranked_duels")
        .select("status,winner_user_id,player_a_id,player_b_id,player_a_session_id,player_b_session_id,player_a_result_id,player_b_result_id,player_a_rp_change,player_b_rp_change")
        .or(`player_a_id.eq.${auth.user.id},player_b_id.eq.${auth.user.id}`);

      if (rankedError) {
        updateDiagnostics({ lastError: rankedError.message });
      } else if (rankedRows) {
        const attachedResultIds = new Set<string>();
        const attachedSessionIds = new Set<string>();
        const outcomeByResultId = new Map<string, RankOutcome>();
        const outcomeBySessionId = new Map<string, RankOutcome>();
        const rpChangeByResultId = new Map<string, number | null>();
        const rpChangeBySessionId = new Map<string, number | null>();
        for (const row of rankedRows as Array<Record<string, string | number | null>>) {
          const isPlayerA = row.player_a_id === auth.user.id;
          const resultId = (isPlayerA ? row.player_a_result_id : row.player_b_result_id) as string | null;
          const sessionId = (isPlayerA ? row.player_a_session_id : row.player_b_session_id) as string | null;
          const rpChange = (isPlayerA ? row.player_a_rp_change : row.player_b_rp_change) as number | null;
          if (resultId) attachedResultIds.add(resultId);
          if (sessionId) attachedSessionIds.add(sessionId);
          if (resultId) rpChangeByResultId.set(resultId, rpChange);
          if (sessionId) rpChangeBySessionId.set(sessionId, rpChange);
          if (row.status !== "completed") continue;
          const outcome: RankOutcome = !row.winner_user_id ? "draw" : row.winner_user_id === auth.user.id ? "win" : "loss";
          if (resultId) outcomeByResultId.set(resultId, outcome);
          if (sessionId) outcomeBySessionId.set(sessionId, outcome);
        }

        next.recent_results = next.recent_results
          .filter((result) => {
            if (result.mode !== "ranked_duel") return true;
            return Boolean(
              (result.result_id && attachedResultIds.has(result.result_id)) ||
              (result.session_id && attachedSessionIds.has(result.session_id))
            );
          })
          .map((result) => {
            if (result.mode !== "ranked_duel") return result;
            const outcome = (result.result_id ? outcomeByResultId.get(result.result_id) : undefined)
              ?? (result.session_id ? outcomeBySessionId.get(result.session_id) : undefined);
            const rpChange = (result.result_id ? rpChangeByResultId.get(result.result_id) : undefined)
              ?? (result.session_id ? rpChangeBySessionId.get(result.session_id) : undefined)
              ?? result.rp_change
              ?? null;
            return { ...result, result_outcome: outcome, rp_change: rpChange };
          });
      }
    }

    if (next.recent_results.some((result) => result.mode === "friend_challenge")) {
      const { data: friendChallengeRows, error: friendChallengeError } = friendChallengeRowsForStats
        ? { data: friendChallengeRowsForStats, error: null }
        : await supabase.rpc("get_friend_challenges");
      if (friendChallengeError) {
        updateDiagnostics({ lastError: friendChallengeError.message });
      } else if (Array.isArray(friendChallengeRows)) {
        const outcomeByResultId = new Map<string, RankOutcome>();
        const outcomeBySessionId = new Map<string, RankOutcome>();
        for (const row of friendChallengeRows as Array<Record<string, string | null>>) {
          if (row.status !== "completed") continue;
          const outcome: RankOutcome = !row.winner_user_id ? "draw" : row.winner_user_id === auth.user.id ? "win" : "loss";
          if (row.current_user_result_id) outcomeByResultId.set(row.current_user_result_id, outcome);
          if (row.session_id) outcomeBySessionId.set(row.session_id, outcome);
        }
        next.recent_results = next.recent_results.map((result) => {
          if (result.mode !== "friend_challenge") return result;
          const outcome = (result.result_id ? outcomeByResultId.get(result.result_id) : undefined)
            ?? (result.session_id ? outcomeBySessionId.get(result.session_id) : undefined);
          return outcome ? { ...result, result_outcome: outcome } : result;
        });
      }
    }

    next.recent_results = dedupeRecentResults(next.recent_results);

    const completedResults = next.recent_results.filter((result) => result.completed);
    const solvedResults = completedResults.filter((result) => result.won === true);
    next.puzzles_completed = solvedResults.length;
    next.easy_completed = solvedResults.filter((result) => result.difficulty === "Easy").length;
    next.medium_completed = solvedResults.filter((result) => result.difficulty === "Medium").length;
    next.hard_completed = solvedResults.filter((result) => result.difficulty === "Hard").length;
    next.expert_completed = solvedResults.filter((result) => result.difficulty === "Expert").length;
    next.master_completed = solvedResults.filter((result) => result.difficulty === "Master").length;
    const computedBestTimes = solvedResults.reduce<Partial<Record<RecentResult["difficulty"], number>>>((acc, result) => {
      const current = acc[result.difficulty];
      if (typeof current !== "number" || result.elapsed_seconds < current) acc[result.difficulty] = result.elapsed_seconds;
      return acc;
    }, {});
    next.best_times_by_difficulty = computedBestTimes;
    next.duels_played = next.duel_match_history.length;
    next.duels_won = next.duel_match_history.filter((match) => match.result_outcome === "win").length;
    next.last_completed_date = solvedResults.find((result) => result.mode === "daily")?.completed_at?.slice(0, 10) ?? next.last_completed_date;
    const { data: activeSeason, error: activeSeasonError } = await supabase
      .from("ranked_seasons")
      .select("season_id")
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeSeasonError) {
      updateDiagnostics({ lastError: activeSeasonError.message });
    } else if (activeSeason?.season_id) {
      const { data: rankedProfileRow, error: rankedProfileError } = await supabase
        .from("ranked_profiles")
        .select("rp,current_tier,matches_played,wins")
        .eq("user_id", auth.user.id)
        .eq("season_id", activeSeason.season_id)
        .maybeSingle();
      if (rankedProfileError) {
        updateDiagnostics({ lastError: rankedProfileError.message });
      } else if (rankedProfileRow) {
        Object.assign(next, applyRankedProfileSource(next, rankedProfileRow));
      }
    }
    const progressByBadgeId = new Map(((userAchievements ?? []) as UserAchievementRow[]).map((row) => [row.badge_id, row]));
    next.badges_unlocked = ((achievements ?? []) as AchievementRow[]).map((achievement) => achievementFromBackend(achievement, progressByBadgeId.get(achievement.badge_id)));
    const finalSessionIds = new Set(resultRows.map((result) => result.session_id).filter((sessionId): sessionId is string => Boolean(sessionId)));
    const sessionRows = (sessions ?? []) as PuzzleSessionRow[];
    const latestClassicRows = sortSessionsNewestFirst((latestClassicSessions ?? []) as PuzzleSessionRow[]);
    const loadedSessionIds = [...sessionRows, ...latestClassicRows].map((session) => session.session_id).filter(Boolean);
    if (loadedSessionIds.length > 0) {
      const { data: sessionResults, error: sessionResultsError } = await supabase
        .from("game_results")
        .select("session_id")
        .eq("user_id", auth.user.id)
        .eq("completed", true)
        .in("session_id", loadedSessionIds);
      if (sessionResultsError) {
        updateDiagnostics({ lastError: sessionResultsError.message });
      } else {
        for (const row of (sessionResults ?? []) as Pick<GameResultRow, "session_id">[]) {
          if (row.session_id) finalSessionIds.add(row.session_id);
        }
      }
    }
    const existingPuzzleIds = new Set<string>();
    const sessionPuzzleIds = [...sessionRows, ...latestClassicRows]
      .map((session) => session.puzzle_id)
      .filter((puzzleId): puzzleId is string => Boolean(puzzleId));
    if (sessionPuzzleIds.length > 0) {
      const { data: existingPuzzles, error: existingPuzzlesError } = await supabase
        .from("puzzles")
        .select("puzzle_id")
        .in("puzzle_id", sessionPuzzleIds);
      if (existingPuzzlesError) {
        updateDiagnostics({ lastError: existingPuzzlesError.message });
      } else {
        for (const row of (existingPuzzles ?? []) as { puzzle_id: string }[]) {
          existingPuzzleIds.add(row.puzzle_id);
        }
      }
    }
    const completedKeys = new Set(next.recent_results.map((result) => `${result.puzzle_id}:${result.mode}:${result.difficulty}`));
    let activeRows = sessionRows.filter((session) => {
      if (session.status !== "in_progress") return false;
      if (finalSessionIds.has(session.session_id)) return false;
      if (!session.puzzle_id || !existingPuzzleIds.has(session.puzzle_id)) return false;
      const key = `${session.puzzle_id ?? ""}:${session.mode}:${session.difficulty}`;
      return !completedKeys.has(key);
    });
    const newestClassicSession = latestClassicRows[0] ?? null;
    const newestClassicIsResumable = newestClassicSession
      ? activeRows.some((session) => session.session_id === newestClassicSession.session_id)
      : false;
    const activeRowIds = new Set(activeRows.map((session) => session.session_id));
    const activeClassicRows = activeRows.filter(isClassicSession);
    const classicSessionIdsToAbandon = new Set(
      [
        ...activeClassicRows
          .filter((session) => !newestClassicIsResumable || session.session_id !== newestClassicSession?.session_id)
          .map((session) => session.session_id),
        ...sessionRows
          .filter((session) => isClassicSession(session) && session.status === "in_progress" && !activeRowIds.has(session.session_id) && !finalSessionIds.has(session.session_id))
          .map((session) => session.session_id),
      ]
    );
    activeRows = activeRows.filter((session) => !isClassicSession(session) || (newestClassicIsResumable && session.session_id === newestClassicSession?.session_id));

    const staleSessionIds = sessionRows
      .filter((session) => session.status === "in_progress" && finalSessionIds.has(session.session_id))
      .map((session) => session.session_id);
    if (staleSessionIds.length > 0) {
      void supabase
        .from("puzzle_sessions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("user_id", auth.user.id)
        .in("session_id", staleSessionIds)
        .then(({ error: staleUpdateError }) => {
          if (staleUpdateError) updateDiagnostics({ lastError: staleUpdateError.message });
        });
    }
    if (classicSessionIdsToAbandon.size > 0) {
      void supabase
        .from("puzzle_sessions")
        .update({ status: "abandoned", updated_at: new Date().toISOString() })
        .eq("user_id", auth.user.id)
        .eq("mode", "classic")
        .eq("status", "in_progress")
        .in("session_id", [...classicSessionIdsToAbandon])
        .then(({ error: classicCleanupError }) => {
          if (classicCleanupError) updateDiagnostics({ lastError: classicCleanupError.message });
        });
    }
    setProfile(normalizeProfile(next));
    setActiveSessions(activeRows);
    updateDiagnostics({ profileLoaded: true, statsLoaded: true, settingsLoaded: true, recentResultsCount: next.recent_results.length, activeSessionCount: activeRows.length, latestSessionStatus: activeRows[0]?.status ?? null, latestResultPuzzleId: next.recent_results[0]?.puzzle_id ?? null, lastError: null });
  }, [auth.user, repairMissingProfileRows, updateDiagnostics]);

  // ── Initial load ─────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      const profileKey = auth.isSignedIn ? `user:${auth.user?.id ?? "unknown"}` : auth.mode;
      const isInitialProfileLoad = loadedProfileKeyRef.current !== profileKey;
      if (isInitialProfileLoad) setIsLoaded(false);
      if (auth.mode === "loading") return;
      if (auth.isSignedIn) await loadBackendProfile();
      else {
        const raw = await AsyncStorage.getItem(PLAYER_PROFILE_KEY);
        if (!active) return;
        setProfile(raw ? normalizeProfile(JSON.parse(raw) as PlayerProfile) : createInitialPlayerProfile(auth.isGuest));
        setActiveSessions([]);
        await loadGuestSessions();
        updateDiagnostics({ profileLoaded: false, statsLoaded: false, settingsLoaded: false, recentResultsCount: 0, activeSessionCount: 0, latestSessionStatus: null, latestResultPuzzleId: null, lastError: null });
      }
      if (active) {
        loadedProfileKeyRef.current = profileKey;
        setIsLoaded(true);
      }
    }
    void load().catch((error: unknown) => { const message = error instanceof Error ? error.message : "Unable to load profile."; setLoadError(message); updateDiagnostics({ lastError: message }); if (active) setIsLoaded(true); });
    return () => { active = false; };
  }, [auth.isGuest, auth.isSignedIn, auth.mode, loadBackendProfile, loadGuestSessions, updateDiagnostics]);

  const persist = useCallback((next: PlayerProfile) => {
    const normalized = normalizeProfile(next);
    setProfile(normalized);
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) void supabase.from("player_stats").upsert({ user_id: auth.user.id, ...statsPayload(normalized) }).then(({ error }) => { if (error) updateDiagnostics({ lastError: error.message }); }).catch((error: unknown) => updateDiagnostics({ lastError: error instanceof Error ? error.message : "Unable to save stats." }));
    else if (auth.isGuest || auth.mode === "signed_out") persistLocal(normalized);
  }, [auth.isGuest, auth.isSignedIn, auth.mode, auth.user, persistLocal, updateDiagnostics]);

  const syncAchievements = useCallback(async (next: PlayerProfile): Promise<void> => {
    if (!auth.user || !isSupabaseConfigured) return;
    await supabase.from("user_achievements").upsert(next.badges_unlocked.map((badge) => ({ user_id: auth.user!.id, badge_id: badge.badge_id, unlocked: badge.unlocked, progress_current: badge.progress_current, unlocked_at: badge.unlocked_at })), { onConflict: "user_id,badge_id" });
  }, [auth.user]);

  // ── Session persistence: Supabase + guest AsyncStorage ────────────

  const upsertSession = useCallback(async (snapshot: SessionSnapshot, existingSessionId?: string): Promise<string> => {
    const attemptedAt = new Date().toISOString();
    logDevDiagnostic("upsertSession called", {
      existingSessionId: existingSessionId ?? null,
      puzzleId: snapshot.puzzle_id,
      elapsedSeconds: snapshot.elapsed_seconds,
      boardFilled: snapshot.board_state.flat().filter((value) => value !== 0).length,
    });
    updateDiagnostics({ lastSessionSaveAttemptedAt: attemptedAt });

    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      const sessionId = existingSessionId ?? generateUUID();

      try {
        const { data, error } = await supabase.from("puzzle_sessions").upsert({
          session_id: sessionId,
          user_id: auth.user.id,
          puzzle_id: snapshot.puzzle_id,
          mode: snapshot.mode,
          difficulty: snapshot.difficulty,
          board_state: snapshot.board_state as unknown as Record<string, unknown>,
          notes_state: snapshot.notes_state as unknown as Record<string, unknown>,
          elapsed_seconds: snapshot.elapsed_seconds,
          mistakes: snapshot.mistakes,
          hints_used: snapshot.hints_used,
          undo_count: snapshot.undo_count,
          move_history: snapshot.move_history as unknown as Record<string, unknown>[],
          status: "in_progress",
        }).select("*").single();

        if (error) {
          updateDiagnostics({ lastError: error.message, lastSessionSaveSucceeded: false, lastSessionSaveError: error.message });
          throw new Error(error.message);
        }

        if (!data?.session_id) {
          const message = "Session save failed: Supabase did not return a session_id.";
          updateDiagnostics({ lastError: message, lastSessionSaveSucceeded: false, lastSessionSaveError: message });
          throw new Error(message);
        }

        const sessionRow = data as PuzzleSessionRow;
        if (snapshot.mode === "classic") {
          const { error: cleanupError } = await supabase
            .from("puzzle_sessions")
            .update({ status: "abandoned", updated_at: new Date().toISOString() })
            .eq("user_id", auth.user.id)
            .eq("mode", "classic")
            .eq("status", "in_progress")
            .neq("session_id", sessionRow.session_id);
          if (cleanupError) updateDiagnostics({ lastError: cleanupError.message });
        }
        setActiveSessions((prev) => {
          const filtered = prev.filter((s) => s.session_id !== sessionRow.session_id && s.status === "in_progress" && (snapshot.mode !== "classic" || s.mode !== "classic"));
          return [sessionRow, ...filtered];
        });
        updateDiagnostics({ lastSessionSaveSucceeded: true, lastSessionSaveError: null });
        return sessionRow.session_id;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Session save failed";
        updateDiagnostics({ lastError: msg, lastSessionSaveSucceeded: false, lastSessionSaveError: msg });
        throw err;
      }
    }

    // Guest mode: persist locally, single session enforcement
    const sessionId = existingSessionId ?? `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const entry: GuestSessionEntry = { sessionId, snapshot };
    // Update local guest sessions
    setActiveGuestSessions((prev) => {
      const filtered = prev.filter((s) => s.sessionId !== sessionId && (snapshot.mode !== "classic" || s.snapshot.mode !== "classic"));
      return [entry, ...filtered];
    });
    try {
      const prev = await loadGuestSessions();
      const filtered = prev.filter((s) => s.sessionId !== sessionId && (snapshot.mode !== "classic" || s.snapshot.mode !== "classic"));
      await persistGuestSessions([entry, ...filtered]);
      updateDiagnostics({ lastSessionSaveSucceeded: true, lastSessionSaveError: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Guest session save failed";
      updateDiagnostics({ lastError: msg, lastSessionSaveSucceeded: false, lastSessionSaveError: msg });
      // Don't throw for guest; local state is already updated
    }
    return sessionId;
  }, [auth.isSignedIn, auth.user, loadGuestSessions, persistGuestSessions, updateDiagnostics]);

  const startPuzzleSession = useCallback(async (input: Omit<StartPuzzleSessionInput, "userId">): Promise<PuzzleSessionRow> => {
    if (!auth.isSignedIn || !auth.user || !isSupabaseConfigured) {
      const message = "Could not start puzzle. Please try again.";
      updateDiagnostics({ lastError: message, lastSessionSaveSucceeded: false, lastSessionSaveError: message });
      throw new Error(message);
    }

    if (input.mode === "classic") {
      const { error: cleanupError } = await supabase
        .from("puzzle_sessions")
        .update({ status: "abandoned", updated_at: new Date().toISOString() })
        .eq("user_id", auth.user.id)
        .eq("mode", "classic")
        .eq("status", "in_progress");
      if (cleanupError) {
        updateDiagnostics({ lastError: cleanupError.message, lastSessionSaveSucceeded: false, lastSessionSaveError: cleanupError.message });
        throw new Error(cleanupError.message);
      }
    }

    const session = await insertPuzzleSession({ userId: auth.user.id, ...input });
    setActiveSessions((prev) => {
      const filtered = prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress" && (input.mode !== "classic" || entry.mode !== "classic"));
      return [session, ...filtered];
    });
    updateDiagnostics({
      latestSessionStatus: session.status,
      lastError: null,
      lastSessionSaveAttemptedAt: new Date().toISOString(),
      lastSessionSaveSucceeded: true,
      lastSessionSaveError: null,
    });
    return session;
  }, [auth.isSignedIn, auth.user, updateDiagnostics]);

  const verifyOwnedInProgressSession = useCallback(async (sessionId: string): Promise<PuzzleSessionRow> => {
    if (!auth.user || !isSupabaseConfigured) throw new Error("Could not save official result. Missing auth user.");

    const { data, error } = await supabase
      .from("puzzle_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      updateDiagnostics({ lastError: error.message });
      throw new Error(error.message);
    }

    const session = data as PuzzleSessionRow | null;
    logDevDiagnostic("official session verify", {
      authUserId: auth.user.id,
      activeSessionId: sessionId,
      found: Boolean(session),
      rowUserId: session?.user_id ?? null,
      status: session?.status ?? null,
      puzzleId: session?.puzzle_id ?? null,
      mode: session?.mode ?? null,
      difficulty: session?.difficulty ?? null,
    });

    if (!session) throw new Error("Official result not saved: missing session.");
    if (session.user_id !== auth.user.id) throw new Error("Official result not saved: session belongs to a different user.");
    if (session.status !== "in_progress") throw new Error(`Official result not saved: session status is ${session.status}.`);
    return session;
  }, [auth.user, updateDiagnostics]);

  const getResumableBackendSession = useCallback(async (session: PuzzleSessionRow | null): Promise<PuzzleSessionRow | null> => {
    if (!session || !auth.user || !isSupabaseConfigured) return session;
    if (session.status !== "in_progress") return null;
    if (!session.puzzle_id) return null;

    const [{ data: finalResult, error: resultError }, { data: puzzle, error: puzzleError }] = await Promise.all([
      supabase
        .from("game_results")
        .select("result_id")
        .eq("user_id", auth.user.id)
        .eq("session_id", session.session_id)
        .eq("completed", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("puzzles")
        .select("puzzle_id")
        .eq("puzzle_id", session.puzzle_id)
        .maybeSingle(),
    ]);

    if (resultError) updateDiagnostics({ lastError: resultError.message });
    if (puzzleError) updateDiagnostics({ lastError: puzzleError.message });
    if (finalResult || !puzzle) {
      const nextStatus: SessionStatus = finalResult ? "completed" : "abandoned";
      setActiveSessions((prev) => prev.filter((entry) => entry.session_id !== session.session_id));
      void supabase
        .from("puzzle_sessions")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("user_id", auth.user.id)
        .eq("session_id", session.session_id)
        .eq("status", "in_progress")
        .then(({ error }) => {
          if (error) updateDiagnostics({ lastError: error.message });
        });
      return null;
    }

    return session;
  }, [auth.user, updateDiagnostics]);

  const deleteSessionById = useCallback(async (sessionId: string): Promise<void> => {
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      await supabase.from("puzzle_sessions").delete().eq("session_id", sessionId).eq("user_id", auth.user.id);
      setActiveSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      return;
    }
    const prev = await loadGuestSessions();
    const next = prev.filter((s) => s.sessionId !== sessionId);
    await persistGuestSessions(next);
  }, [auth.isSignedIn, auth.user, loadGuestSessions, persistGuestSessions]);

  const findSessionSnapshot = useCallback((sessionId: string): SessionSnapshot | null => {
    if (auth.isSignedIn) {
      const session = activeSessions.find((s) => s.session_id === sessionId && s.status === "in_progress");
      if (!session) return null;
      return {
        puzzle_id: session.puzzle_id ?? "",
        mode: session.mode as SessionSnapshot["mode"],
        difficulty: session.difficulty as SessionSnapshot["difficulty"],
        board_state: (session.board_state as number[][]) ?? [],
        notes_state: (session.notes_state as number[][][]) ?? [],
        elapsed_seconds: session.elapsed_seconds,
        mistakes: session.mistakes,
        hints_used: session.hints_used,
        undo_count: session.undo_count,
        move_history: (session.move_history as SessionSnapshot["move_history"]) ?? [],
      };
    }
    const entry = activeGuestSessions.find((s) => s.sessionId === sessionId);
    return entry?.snapshot ?? null;
  }, [auth.isSignedIn, activeSessions, activeGuestSessions]);

  const closeSessionForPuzzle = useCallback(async (puzzleId: string, sessionId?: string, status: SessionStatus = "completed"): Promise<void> => {
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      let query = supabase.from("puzzle_sessions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("user_id", auth.user.id)
        .eq("status", "in_progress");
      query = sessionId ? query.eq("session_id", sessionId) : query.eq("puzzle_id", puzzleId);
      const { error } = await query;
      if (error) updateDiagnostics({ lastError: error.message });
      setActiveSessions((prev) => prev.filter((s) => sessionId ? s.session_id !== sessionId : s.puzzle_id !== puzzleId));
      updateDiagnostics({ activeSessionCount: 0, latestSessionStatus: status });
      return;
    }
    const prev = await loadGuestSessions();
    const next = prev.filter((s) => (sessionId ? s.sessionId !== sessionId : s.snapshot.puzzle_id !== puzzleId));
    await persistGuestSessions(next);
    updateDiagnostics({ activeSessionCount: next.length, latestSessionStatus: status });
  }, [auth.isSignedIn, auth.user, loadGuestSessions, persistGuestSessions, updateDiagnostics]);

  const getInProgressClassicSession = useCallback(async (): Promise<PuzzleSessionRow | null> => {
    const localClassicSession = sortSessionsNewestFirst(activeSessions.filter((session) => isClassicSession(session) && session.status === "in_progress"))[0] ?? null;
    if (!auth.isSignedIn || !auth.user || !isSupabaseConfigured) return localClassicSession;

    const { data, error } = await supabase
      .from("puzzle_sessions")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("mode", "classic")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      updateDiagnostics({ lastError: error.message });
      return localClassicSession;
    }

    const rows = sortSessionsNewestFirst((data ?? []) as PuzzleSessionRow[]);
    const latestSession = rows[0] ?? null;
    if (!latestSession || latestSession.status !== "in_progress") {
      const activeClassicIds = rows.filter((session) => session.status === "in_progress").map((session) => session.session_id);
      if (activeClassicIds.length > 0) {
        void supabase
          .from("puzzle_sessions")
          .update({ status: "abandoned", updated_at: new Date().toISOString() })
          .eq("user_id", auth.user.id)
          .eq("mode", "classic")
          .eq("status", "in_progress")
          .in("session_id", activeClassicIds)
          .then(({ error: cleanupError }) => {
            if (cleanupError) updateDiagnostics({ lastError: cleanupError.message });
          });
      }
      setActiveSessions((prev) => prev.filter((entry) => !isClassicSession(entry)));
      return null;
    }

    const session = await getResumableBackendSession(latestSession);
    if (session) {
      const olderClassicIds = rows
        .filter((entry) => entry.status === "in_progress" && entry.session_id !== session.session_id)
        .map((entry) => entry.session_id);
      if (olderClassicIds.length > 0) {
        void supabase
          .from("puzzle_sessions")
          .update({ status: "abandoned", updated_at: new Date().toISOString() })
          .eq("user_id", auth.user.id)
          .eq("mode", "classic")
          .eq("status", "in_progress")
          .in("session_id", olderClassicIds)
          .then(({ error: cleanupError }) => {
            if (cleanupError) updateDiagnostics({ lastError: cleanupError.message });
          });
      }
      setActiveSessions((prev) => [session, ...prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress" && !isClassicSession(entry))]);
    } else {
      setActiveSessions((prev) => prev.filter((entry) => !isClassicSession(entry)));
    }
    return session;
  }, [activeSessions, auth.isSignedIn, auth.user, getResumableBackendSession, updateDiagnostics]);

  const getInProgressDailySession = useCallback(async (mode: DailySessionMode, puzzleId: string, dateStr: string): Promise<PuzzleSessionRow | null> => {
    const { startIso, endIso } = getDailyDateWindow(dateStr);
    const localSession = activeSessions.find((session) =>
      session.mode === mode &&
      session.puzzle_id === puzzleId &&
      session.status === "in_progress" &&
      (!session.created_at || (session.created_at >= startIso && session.created_at < endIso))
    ) ?? null;
    if (!auth.isSignedIn || !auth.user || !isSupabaseConfigured) return localSession;

    const { data, error } = await supabase
      .from("puzzle_sessions")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("mode", mode)
      .eq("puzzle_id", puzzleId)
      .eq("status", "in_progress")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      updateDiagnostics({ lastError: error.message });
      return localSession;
    }

    const session = await getResumableBackendSession((data as PuzzleSessionRow | null) ?? null);
    if (session) {
      setActiveSessions((prev) => [session, ...prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress")]);
    }
    return session;
  }, [activeSessions, auth.isSignedIn, auth.user, getResumableBackendSession, updateDiagnostics]);

  const getCompletedDailyResult = useCallback(async (mode: DailySessionMode, puzzleId: string, dateStr: string): Promise<RecentResult | null> => {
    const localResult = profile.recent_results.find((result) =>
      result.mode === mode &&
      result.puzzle_id === puzzleId &&
      result.completed
    ) ?? null;
    logDevDiagnostic("daily completion check start", {
      dateStr,
      authUserId: auth.user?.id ?? null,
      assignedDailyPuzzleId: puzzleId,
      filters: {
        table: "game_results",
        user_id: auth.user?.id ?? null,
        mode,
        puzzle_id: puzzleId,
        completed: true,
      },
      localRowsReturned: localResult ? 1 : 0,
    });
    updateDailyDiagnostics({
      currentUserId: auth.user?.id ?? null,
      todayDateStr: dateStr,
      assignedDailyPuzzleId: puzzleId,
      replayQueryResultCount: localResult ? 1 : null,
      replayQueryRows: localResult ? [localResult] : [],
    });
    if (localResult || !auth.isSignedIn || !auth.user || !isSupabaseConfigured) {
      logDevDiagnostic("daily completion check result", {
        dateStr,
        authUserId: auth.user?.id ?? null,
        assignedDailyPuzzleId: puzzleId,
        rowsReturned: localResult ? 1 : 0,
        rows: localResult ? [localResult] : [],
        source: localResult ? "local" : "none",
      });
      return localResult;
    }

    const { data, error } = await supabase
      .from("game_results")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("mode", mode)
      .eq("puzzle_id", puzzleId)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(1);

    if (error) {
      updateDailyDiagnostics({
        currentUserId: auth.user.id,
        todayDateStr: dateStr,
        assignedDailyPuzzleId: puzzleId,
        replayQueryResultCount: 0,
        replayQueryRows: [],
        errors: [error.message],
      });
      logDevDiagnostic("daily replay raw query result", {
        dateStr,
        authUserId: auth.user.id,
        assignedDailyPuzzleId: puzzleId,
        filters: {
          table: "game_results",
          user_id: auth.user.id,
          mode,
          puzzle_id: puzzleId,
          completed: true,
        },
        rowsReturned: 0,
        rows: [],
        supabaseError: error.message,
      });
      logDevDiagnostic("daily completion check result", {
        dateStr,
        authUserId: auth.user.id,
        assignedDailyPuzzleId: puzzleId,
        rowsReturned: 0,
        rows: [],
        supabaseError: error.message,
      });
      updateDiagnostics({ lastError: error.message });
      return null;
    }

    const rows = (data ?? []) as GameResultRow[];
    updateDailyDiagnostics({
      currentUserId: auth.user.id,
      todayDateStr: dateStr,
      assignedDailyPuzzleId: puzzleId,
      replayQueryResultCount: rows.length,
      replayQueryRows: rows,
      errors: [],
    });
    logDevDiagnostic("daily replay raw query result", {
      dateStr,
      authUserId: auth.user.id,
      assignedDailyPuzzleId: puzzleId,
      filters: {
        table: "game_results",
        user_id: auth.user.id,
        mode,
        puzzle_id: puzzleId,
        completed: true,
      },
      rowsReturned: rows.length,
      rows,
      supabaseError: null,
    });
    logDevDiagnostic("daily completion check result", {
      dateStr,
      authUserId: auth.user.id,
      assignedDailyPuzzleId: puzzleId,
      rowsReturned: rows.length,
      rows,
      supabaseError: null,
    });
    if (rows[0]) return resultFromRow(rows[0]);

    if (mode === "daily") {
      const { data: hasCompleted, error: rpcError } = await supabase.rpc("has_completed_daily", {
        p_date: dateStr,
      });
      updateDailyDiagnostics({
        currentUserId: auth.user.id,
        todayDateStr: dateStr,
        assignedDailyPuzzleId: puzzleId,
        replayRpcResult: Boolean(hasCompleted),
        errors: rpcError ? [rpcError.message] : [],
      });
      logDevDiagnostic("daily replay rpc result", {
        dateStr,
        authUserId: auth.user.id,
        assignedDailyPuzzleId: puzzleId,
        hasCompleted: Boolean(hasCompleted),
        supabaseError: rpcError?.message ?? null,
      });
      if (rpcError) {
        updateDiagnostics({ lastError: rpcError.message });
      }
      if (hasCompleted === true) {
        return {
          puzzle_id: puzzleId,
          mode: "daily",
          difficulty: "Medium",
          completed: true,
          elapsed_seconds: 0,
          mistakes: 0,
          hints_used: 0,
          undo_count: 0,
          move_count: 0,
          final_score: 0,
          eligible_for_leaderboard: true,
          eligible_for_ranked: false,
          completed_at: new Date().toISOString(),
          xp_earned: 0,
        };
      }
    }

    return null;
  }, [auth.isSignedIn, auth.user, profile.recent_results, updateDailyDiagnostics, updateDiagnostics]);

  // ── Puzzle result recording ──────────────────────────────────────

  const recordPuzzleResult = useCallback((result: PuzzleResult, outcome?: RankOutcome, options?: RecordPuzzleResultOptions): ProfileUpdateSummary => {
    const sessionId = options?.sessionId ?? result.session_id ?? null;
    const existingResult = sessionId ? profile.recent_results.find((recent) => recent.session_id === sessionId) : undefined;
    const summary: ProfileUpdateSummary = existingResult ? { xpEarned: existingResult.xp_earned, didLevelUp: false, previousLevel: profile.account_level, newLevel: profile.account_level, rankPromotion: null, unlockedBadges: [], updatedProfile: profile } : applyPuzzleResult(profile, result, outcome);
    if (!existingResult) persist(summary.updatedProfile);
    setLastUpdate(summary);
    if (!existingResult && summary.updatedProfile.current_streak > profile.current_streak) {
      const recent = summary.updatedProfile.recent_results[0];
      setLastStreakIncreaseKey([
        recent?.result_id ?? "local",
        recent?.session_id ?? sessionId ?? "session",
        recent?.completed_at ?? result.completed_at ?? "completed",
        String(summary.updatedProfile.current_streak),
      ].join("|"));
    }
    if (existingResult) {
      void closeSessionForPuzzle(result.puzzle_id, sessionId ?? undefined);
      return summary;
    }
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      const resultId = deterministicResultId(auth.user.id, result, sessionId);
      const won = outcome === "win" ? true : outcome === "loss" ? false : normalizedWon({ ...result, result_id: resultId, won: null });
      const row = { result_id: resultId, user_id: auth.user.id, session_id: sessionId, puzzle_id: result.puzzle_id, mode: result.mode, difficulty: result.difficulty, completed: result.completed, won, elapsed_seconds: result.elapsed_seconds, mistakes: result.mistakes, hints_used: result.hints_used, undo_count: result.undo_count, final_score: result.final_score, xp_earned: summary.xpEarned, rp_change: summary.updatedProfile.rank_points - profile.rank_points, eligible_for_leaderboard: result.eligible_for_leaderboard, eligible_for_ranked: result.eligible_for_ranked, completed_at: result.completed_at };
      void measureAsync("result save duration", async () => {
        const { error: resultError } = await supabase.from("game_results").upsert(row, { onConflict: "result_id" });
        if (resultError) {
          if (!sessionId || !isUniqueViolation(resultError)) throw resultError;

          const { data: existingResult, error: lookupError } = await supabase
            .from("game_results")
            .select("result_id")
            .eq("user_id", auth.user!.id)
            .eq("session_id", sessionId)
            .maybeSingle();
          if (lookupError) throw lookupError;
          if (!existingResult?.result_id) throw new Error("Duplicate result exists for this session but could not be reused.");

          const { result_id: _resultId, ...resultUpdate } = row;
          const { error: updateError } = await supabase
            .from("game_results")
            .update(resultUpdate)
            .eq("user_id", auth.user!.id)
            .eq("result_id", existingResult.result_id);
          if (updateError) throw updateError;
        }
        await closeSessionForPuzzle(result.puzzle_id, sessionId ?? undefined);
        const { error: statsError } = await supabase.from("player_stats").upsert({ user_id: auth.user!.id, ...statsPayload(summary.updatedProfile) });
        if (statsError) throw statsError;
        await syncAchievements(summary.updatedProfile);
        await loadBackendProfile();
      }).catch((error: unknown) => updateDiagnostics({ lastError: error instanceof Error ? error.message : "Unable to save result." }));
    } else if (auth.isGuest) {
      void closeSessionForPuzzle(result.puzzle_id, options?.sessionId ?? result.session_id);
    }
    return summary;
  }, [auth.isSignedIn, auth.isGuest, auth.user, closeSessionForPuzzle, loadBackendProfile, persist, profile, syncAchievements, updateDiagnostics]);

  const summaryFromOfficialPayload = useCallback((payload: OfficialResultPayload, previousProfile: PlayerProfile): ProfileUpdateSummary => {
    const stats = payload.updated_profile_stats;
    const xpEarned = payload.already_finalized ? 0 : payload.xp_earned;
    const won = normalizedWon({ result_id: payload.result_id, mode: payload.mode, completed: true, won: payload.won ?? null, final_score: payload.final_score, elapsed_seconds: payload.elapsed_seconds });
    const officialResult: RecentResult = {
      result_id: payload.result_id,
      session_id: payload.session_id,
      puzzle_id: payload.puzzle_id,
      mode: payload.mode,
      difficulty: payload.difficulty,
      completed: true,
      elapsed_seconds: payload.elapsed_seconds,
      mistakes: payload.mistakes,
      hints_used: payload.hints_used,
      undo_count: payload.undo_count,
      move_count: 0,
      final_score: payload.final_score,
      score_breakdown: payload.score_breakdown ?? undefined,
      eligible_for_leaderboard: payload.leaderboard_eligible,
      eligible_for_ranked: payload.ranked_eligible ?? false,
      completed_at: payload.completed_at ?? new Date().toISOString(),
      xp_earned: payload.xp_earned,
      won,
      result_outcome: won === true ? "win" : won === false ? "loss" : undefined,
    };
    const previousLevel = previousProfile.account_level;
    const unlockedBadges = payload.badges_unlocked ?? [];
    const badgeMap = new Map(previousProfile.badges_unlocked.map((badge) => [badge.badge_id, badge]));
    for (const badge of unlockedBadges) badgeMap.set(badge.badge_id, { ...badgeMap.get(badge.badge_id), ...badge, unlocked: true } as AchievementBadge);
    const nextProfile = normalizeProfile({
      ...previousProfile,
      total_mastery_xp: stats?.total_mastery_xp ?? previousProfile.total_mastery_xp + payload.xp_earned,
      account_level: stats?.account_level ?? previousProfile.account_level,
      rank_points: stats?.rank_points ?? previousProfile.rank_points,
      current_streak: stats?.current_streak ?? previousProfile.current_streak,
      longest_streak: stats?.longest_streak ?? previousProfile.longest_streak,
      puzzles_completed: stats?.puzzles_completed ?? previousProfile.puzzles_completed + 1,
      flawless_puzzles: stats?.flawless_puzzles ?? previousProfile.flawless_puzzles + (payload.mistakes === 0 ? 1 : 0),
      total_mistakes: stats?.total_mistakes ?? previousProfile.total_mistakes + payload.mistakes,
      total_hints_used: stats?.total_hints_used ?? previousProfile.total_hints_used + payload.hints_used,
      best_times_by_difficulty: {
        ...previousProfile.best_times_by_difficulty,
        Easy: stats?.best_easy_time ?? previousProfile.best_times_by_difficulty.Easy,
        Medium: stats?.best_medium_time ?? previousProfile.best_times_by_difficulty.Medium,
        Hard: stats?.best_hard_time ?? previousProfile.best_times_by_difficulty.Hard,
        Expert: stats?.best_expert_time ?? previousProfile.best_times_by_difficulty.Expert,
        Master: stats?.best_master_time ?? previousProfile.best_times_by_difficulty.Master,
      },
      recent_results: [officialResult, ...previousProfile.recent_results.filter((result) => result.session_id !== payload.session_id)].slice(0, 50),
      badges_unlocked: Array.from(badgeMap.values()),
    });
    return {
      xpEarned,
      didLevelUp: nextProfile.account_level > previousLevel,
      previousLevel,
      newLevel: nextProfile.account_level,
      rankPromotion: (payload.mode === "ranked" || payload.mode === "ranked_duel")
        ? getRankPromotionSummary(previousProfile.rank_tier, previousProfile.rank_division, nextProfile.rank_tier, nextProfile.rank_division)
        : null,
      unlockedBadges,
      updatedProfile: nextProfile,
    };
  }, []);

  const submitOfficialPuzzleResult = useCallback(async (
    result: PuzzleResult,
    finalBoard: number[][],
    options?: RecordPuzzleResultOptions
  ): Promise<ProfileUpdateSummary> => {
    const sessionId = options?.sessionId ?? result.session_id;
    if (!auth.isSignedIn) {
      return recordPuzzleResult(result, undefined, options);
    }

    if (!auth.user || !isSupabaseConfigured || !sessionId) {
      const message = !sessionId ? "Could not save official result. Missing puzzle session." : "Could not save official result. Try again.";
      updateDiagnostics({ lastError: message });
      throw new Error(message);
    }

    logDevDiagnostic("official result submit start", {
      authUserId: auth.user.id,
      activeSessionId: sessionId,
      puzzleId: result.puzzle_id,
      mode: result.mode,
      difficulty: result.difficulty,
    });
    const verifiedSession = await verifyOwnedInProgressSession(sessionId);
    if (result.mode === "ranked_duel" && verifiedSession.mode === "ranked") {
      const { error: repairError } = await supabase
        .from("puzzle_sessions")
        .update({ mode: "ranked_duel", updated_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", auth.user.id)
        .eq("mode", "ranked");
      if (repairError) {
        updateDiagnostics({ lastError: repairError.message });
        logDevDiagnostic("ranked duel session mode repair failed", {
          authUserId: auth.user.id,
          sessionId,
          supabaseError: repairError.message,
        });
      } else {
        logDevDiagnostic("ranked duel session mode repaired", {
          authUserId: auth.user.id,
          sessionId,
          fromMode: verifiedSession.mode,
          toMode: "ranked_duel",
        });
      }
    }

    const previousProfile = profile;
    const resultRpc = result.mode === "ranked" || result.mode === "ranked_duel"
      ? "submit_ranked_puzzle_result"
      : "submit_puzzle_result";
    const { data, error } = await measureAsync("official result submit duration", () => supabase.rpc(resultRpc, {
      p_session_id: sessionId,
      p_final_board: finalBoard,
      p_elapsed_seconds: result.elapsed_seconds,
      p_mistakes: result.mistakes,
      p_hints_used: result.hints_used,
      p_undo_count: result.undo_count,
      p_completed_at: result.completed_at,
    }));

    if (error) {
      updateDiagnostics({ lastError: error.message });
      throw new Error(error.message);
    }

    const payload = data as OfficialResultPayload;
    if (payload.mode === "friend_challenge") {
      const { error: challengeError } = await supabase.rpc("complete_friend_challenge_result", {
        p_session_id: sessionId,
        p_result_id: payload.result_id,
      });
      if (challengeError) {
        logDevDiagnostic("friend challenge completion update failed", {
          authUserId: auth.user.id,
          sessionId,
          resultId: payload.result_id,
          supabaseError: challengeError.message,
        });
        updateDiagnostics({ lastError: challengeError.message });
      }
    }
    const summary = summaryFromOfficialPayload(payload, previousProfile);
    setLastUpdate(summary);
    if (summary.updatedProfile.current_streak > previousProfile.current_streak) {
      setLastStreakIncreaseKey([
        payload.result_id ?? "official",
        payload.session_id ?? sessionId,
        payload.completed_at ?? result.completed_at ?? "completed",
        String(summary.updatedProfile.current_streak),
      ].join("|"));
    }
    setProfile(summary.updatedProfile);
    setActiveSessions((prev) => prev.filter((session) => session.session_id !== sessionId));
    await loadBackendProfile();
    return summary;
  }, [auth.isSignedIn, auth.user, loadBackendProfile, profile, recordPuzzleResult, summaryFromOfficialPayload, updateDiagnostics, verifyOwnedInProgressSession]);

  const submitFailedPuzzleResult = useCallback(async (
    result: PuzzleResult,
    options?: RecordPuzzleResultOptions
  ): Promise<ProfileUpdateSummary> => {
    const sessionId = options?.sessionId ?? result.session_id;
    if (!auth.isSignedIn) {
      return recordPuzzleResult(result, "loss", options);
    }

    if (!auth.user || !isSupabaseConfigured || !sessionId) {
      const message = !sessionId ? "Could not save official result. Missing puzzle session." : "Could not save failed result. Try again.";
      updateDiagnostics({ lastError: message });
      throw new Error(message);
    }

    logDevDiagnostic("failed result submit start", {
      authUserId: auth.user.id,
      activeSessionId: sessionId,
      puzzleId: result.puzzle_id,
      mode: result.mode,
      difficulty: result.difficulty,
    });
    const verifiedSession = await verifyOwnedInProgressSession(sessionId);
    if (result.mode === "ranked_duel" && verifiedSession.mode === "ranked") {
      const { error: repairError } = await supabase
        .from("puzzle_sessions")
        .update({ mode: "ranked_duel", updated_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", auth.user.id)
        .eq("mode", "ranked");
      if (repairError) {
        updateDiagnostics({ lastError: repairError.message });
        logDevDiagnostic("ranked duel session mode repair failed", {
          authUserId: auth.user.id,
          sessionId,
          supabaseError: repairError.message,
        });
      } else {
        logDevDiagnostic("ranked duel session mode repaired", {
          authUserId: auth.user.id,
          sessionId,
          fromMode: verifiedSession.mode,
          toMode: "ranked_duel",
        });
      }
    }

    const previousProfile = profile;
    const resultRpc = result.mode === "ranked" || result.mode === "ranked_duel"
      ? "submit_ranked_failed_puzzle_result"
      : "submit_failed_puzzle_result";
    const { data, error } = await measureAsync("failed result submit duration", () => supabase.rpc(resultRpc, {
      p_session_id: sessionId,
      p_elapsed_seconds: result.elapsed_seconds,
      p_mistakes: result.mistakes,
      p_hints_used: result.hints_used,
      p_undo_count: result.undo_count,
      p_completed_at: result.completed_at,
    }));

    if (error) {
      updateDiagnostics({ lastError: error.message });
      throw new Error(error.message);
    }

    const payload = data as OfficialResultPayload;
    const summary = summaryFromOfficialPayload(payload, previousProfile);
    setLastUpdate(summary);
    setProfile(summary.updatedProfile);
    setActiveSessions((prev) => prev.filter((session) => session.session_id !== sessionId));
    await loadBackendProfile();
    return summary;
  }, [auth.isSignedIn, auth.user, loadBackendProfile, profile, recordPuzzleResult, summaryFromOfficialPayload, updateDiagnostics, verifyOwnedInProgressSession]);

  const fetchPublicProfileMap = useCallback(async (userIds: Array<string | null | undefined>): Promise<Map<string, ProfileRow>> => {
    const ids = Array.from(new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0)));
    const profilesById = new Map<string, ProfileRow>();
    if (!isSupabaseConfigured || ids.length === 0) return profilesById;

    const { data, error } = await supabase.rpc("get_public_profiles", {
      p_user_ids: ids,
    });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return profilesById;
    }
    for (const row of (data ?? []) as ProfileRow[]) {
      profilesById.set(row.id, row);
    }
    return profilesById;
  }, [updateDiagnostics]);

  const fetchPublicPlayerProfile = useCallback(async (userId: string): Promise<PublicPlayerProfilePage> => {
    if (!isSupabaseConfigured || !userId) {
      return { profile: null, recent_results: [] };
    }

    const [profileResponse, resultsResponse] = await Promise.all([
      supabase.rpc("get_public_player_profile", { p_user_id: userId }),
      supabase.rpc("get_public_player_recent_results", { p_user_id: userId, p_limit: 8 }),
    ]);

    if (profileResponse.error) {
      updateDiagnostics({ lastError: profileResponse.error.message });
      return { profile: null, recent_results: [] };
    }

    if (resultsResponse.error) {
      updateDiagnostics({ lastError: resultsResponse.error.message });
    }

    const profileRow = ((profileResponse.data ?? []) as PublicPlayerProfileSummary[])[0] ?? null;
    const recentResults = (resultsResponse.data ?? []) as PublicPlayerRecentResult[];

    return {
      profile: profileRow,
      recent_results: recentResults,
    };
  }, [updateDiagnostics]);

  const fetchDailyLeaderboard = useCallback(async (dateStr: string): Promise<DailyLeaderboardEntry[]> => {
    if (!isSupabaseConfigured) return [];

    const selectColumns = "result_id,user_id,puzzle_id,mode,completed,eligible_for_leaderboard,final_score,elapsed_seconds,mistakes,hints_used,undo_count,completed_at";
    const { data: rawData, error: rawError } = await supabase
      .from("game_results")
      .select(selectColumns)
      .eq("mode", "daily")
      .eq("completed", true)
      .order("completed_at", { ascending: true });

    logDevDiagnostic("daily leaderboard raw query result", {
      dateStr,
      authUserId: auth.user?.id ?? null,
      filters: {
        table: "game_results",
        mode: "daily",
        completed: true,
      },
      rowsReturned: rawData?.length ?? 0,
      rows: rawData ?? [],
      supabaseError: rawError?.message ?? null,
    });

    const dailyPuzzle = await fetchDailyPuzzle(dateStr, "daily");
    const assignedPuzzleId = dailyPuzzle.puzzle_id;
    updateDailyDiagnostics({
      currentUserId: auth.user?.id ?? null,
      todayDateStr: dateStr,
      assignedDailyPuzzle: { puzzle_id: dailyPuzzle.puzzle_id, difficulty: dailyPuzzle.difficulty },
      assignedDailyPuzzleId: assignedPuzzleId,
      leaderboardQueryResultCount: rawData?.length ?? 0,
      leaderboardRawRows: rawData ?? [],
      errors: rawError ? [rawError.message] : [],
    });

    const { data: rpcData, error: rpcError } = await supabase.rpc("get_daily_leaderboard", {
      p_date: dateStr,
    });
    const rpcRows = (rpcData ?? []) as DailyLeaderboardRpcRow[];
    logDevDiagnostic("daily leaderboard rpc result", {
      dateStr,
      authUserId: auth.user?.id ?? null,
      assignedDailyPuzzleId: assignedPuzzleId,
      rowsReturned: rpcRows.length,
      rows: rpcRows,
      supabaseError: rpcError?.message ?? null,
    });
    if (!rpcError) {
      const profilesById = await fetchPublicProfileMap(rpcRows.map((row) => row.user_id));
      const entries = rpcRows.map((row) => ({
        result_id: row.result_id,
        user_id: row.user_id,
        username: profilesById.get(row.user_id)?.display_name ?? profilesById.get(row.user_id)?.username ?? row.username ?? "Player",
        initials: profilesById.get(row.user_id)?.initials ?? row.initials ?? "PL",
        avatar_color: profilesById.get(row.user_id)?.avatar_color ?? row.avatar_color ?? "#A8A294",
        ...publicAvatarFields(profilesById.get(row.user_id) ?? row),
        final_score: row.final_score,
        elapsed_seconds: row.elapsed_seconds,
        mistakes: row.mistakes,
        hints_used: row.hints_used,
        undo_count: row.undo_count,
        completed_at: row.completed_at,
      }));
      updateDailyDiagnostics({
        currentUserId: auth.user?.id ?? null,
        todayDateStr: dateStr,
        assignedDailyPuzzle: { puzzle_id: dailyPuzzle.puzzle_id, difficulty: dailyPuzzle.difficulty },
        assignedDailyPuzzleId: assignedPuzzleId,
        leaderboardRpcResultCount: rpcRows.length,
        leaderboardFinalDisplayedRowCount: entries.length,
        errors: [],
      });
      return entries;
    }

    updateDailyDiagnostics({
      currentUserId: auth.user?.id ?? null,
      todayDateStr: dateStr,
      assignedDailyPuzzle: { puzzle_id: dailyPuzzle.puzzle_id, difficulty: dailyPuzzle.difficulty },
      assignedDailyPuzzleId: assignedPuzzleId,
      leaderboardRpcResultCount: 0,
      errors: [rpcError.message],
    });
    updateDiagnostics({ lastError: rpcError.message });

    const buildQuery = () => (
      supabase
        .from("game_results")
        .select(selectColumns)
        .eq("mode", "daily")
        .eq("puzzle_id", assignedPuzzleId)
        .eq("completed", true)
        .order("final_score", { ascending: false })
        .order("elapsed_seconds", { ascending: true })
        .order("completed_at", { ascending: true })
    );

    logDevDiagnostic("daily leaderboard fetch start", {
      dateStr,
      authUserId: auth.user?.id ?? null,
      assignedDailyPuzzleId: assignedPuzzleId,
      filters: {
        table: "game_results",
        mode: "daily",
        puzzle_id: assignedPuzzleId,
        completed: true,
      },
    });
    const { data, error } = await buildQuery();
    if (error) {
      logDevDiagnostic("daily leaderboard fetch result", {
        dateStr,
        authUserId: auth.user?.id ?? null,
        rowsReturned: 0,
        supabaseError: error.message,
      });
      updateDiagnostics({ lastError: error.message });
      updateDailyDiagnostics({
        currentUserId: auth.user?.id ?? null,
        todayDateStr: dateStr,
        assignedDailyPuzzle: { puzzle_id: dailyPuzzle.puzzle_id, difficulty: dailyPuzzle.difficulty },
        assignedDailyPuzzleId: assignedPuzzleId,
        leaderboardFinalDisplayedRowCount: 0,
        errors: [error.message],
      });
      return [];
    }

    const rows = (data ?? []) as Pick<GameResultRow, "result_id" | "user_id" | "final_score" | "elapsed_seconds" | "mistakes" | "hints_used" | "undo_count" | "completed_at">[];
    logDevDiagnostic("daily leaderboard fetch result", {
      dateStr,
      authUserId: auth.user?.id ?? null,
      rowsReturned: rows.length,
      supabaseError: null,
    });
    const profilesById = await fetchPublicProfileMap(rows.map((row) => row.user_id));

    const entries = rows
      .map((row) => {
        const profileRow = profilesById.get(row.user_id);
        return {
          result_id: row.result_id,
          user_id: row.user_id,
          username: profileRow?.username ?? (row.user_id === profile.user_id ? profile.username : "Player"),
          initials: profileRow?.initials ?? (row.user_id === profile.user_id ? profile.initials : "PL"),
          avatar_color: profileRow?.avatar_color ?? (row.user_id === profile.user_id ? profile.avatar_color : "#A8A294"),
          ...publicAvatarFields(profileRow ?? (row.user_id === profile.user_id ? profile : null)),
          final_score: row.final_score,
          elapsed_seconds: row.elapsed_seconds,
          mistakes: row.mistakes,
          hints_used: row.hints_used,
          undo_count: row.undo_count,
          completed_at: row.completed_at,
        };
      })
      .sort((a, b) => b.final_score - a.final_score || a.elapsed_seconds - b.elapsed_seconds || new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
    updateDailyDiagnostics({
      currentUserId: auth.user?.id ?? null,
      todayDateStr: dateStr,
      assignedDailyPuzzle: { puzzle_id: dailyPuzzle.puzzle_id, difficulty: dailyPuzzle.difficulty },
      assignedDailyPuzzleId: assignedPuzzleId,
      leaderboardFinalDisplayedRowCount: entries.length,
      errors: [],
    });
    return entries;
  }, [auth.user?.id, fetchPublicProfileMap, profile, profile.avatar_color, profile.initials, profile.user_id, profile.username, updateDailyDiagnostics, updateDiagnostics]);

  const fetchWeeklyLeaderboard = useCallback(async (dateStr: string): Promise<WeeklyLeaderboardEntry[]> => {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase.rpc("get_weekly_leaderboard", {
      p_date: dateStr,
    });
    if (error) {
      logDevDiagnostic("weekly leaderboard rpc result", {
        dateStr,
        authUserId: auth.user?.id ?? null,
        rowsReturned: 0,
        supabaseError: error.message,
      });
      updateDiagnostics({ lastError: error.message });
      return [];
    }

    const rows = (data ?? []) as WeeklyLeaderboardRpcRow[];
    logDevDiagnostic("weekly leaderboard rpc result", {
      dateStr,
      authUserId: auth.user?.id ?? null,
      rowsReturned: rows.length,
      rows,
      supabaseError: null,
    });
    const profilesById = await fetchPublicProfileMap(rows.map((row) => row.user_id));
    return rows.map((row, index) => ({
      rank: row.rank ?? index + 1,
      user_id: row.user_id,
      username: profilesById.get(row.user_id)?.display_name ?? profilesById.get(row.user_id)?.username ?? row.username ?? "Player",
      initials: profilesById.get(row.user_id)?.initials ?? row.initials ?? "PL",
      avatar_color: profilesById.get(row.user_id)?.avatar_color ?? row.avatar_color ?? "#A8A294",
      ...publicAvatarFields(profilesById.get(row.user_id) ?? row),
      total_score: row.total_score,
      puzzles_completed: row.puzzles_completed,
      best_score: row.best_score,
      total_time: row.total_time,
      latest_completed_at: row.latest_completed_at,
    }));
  }, [auth.user?.id, fetchPublicProfileMap, updateDiagnostics]);

  const fetchFriendsWeeklyLeaderboard = useCallback(async (dateStr: string): Promise<FriendsWeeklyLeaderboardEntry[]> => {
    if (!auth.user || !isSupabaseConfigured) return [];

    const { data: friendsRows, error: friendsError } = await supabase.rpc("get_friends");
    if (friendsError) updateDiagnostics({ lastError: friendsError.message });
    const friendsCount = Array.isArray(friendsRows) ? friendsRows.length : 0;
    const { data, error } = await supabase.rpc("get_friends_weekly_leaderboard", {
      p_date: dateStr,
    });
    if (error) {
      logDevDiagnostic("friends weekly leaderboard rpc result", {
        dateStr,
        authUserId: auth.user.id,
        friendsCount,
        rowsReturned: 0,
        supabaseError: error.message,
      });
      updateDiagnostics({ lastError: error.message });
      return [];
    }

    const rows = (data ?? []) as FriendsWeeklyLeaderboardRpcRow[];
    logDevDiagnostic("friends weekly leaderboard rpc result", {
      dateStr,
      authUserId: auth.user.id,
      friendsCount,
      rowsReturned: rows.length,
      rows,
      supabaseError: null,
    });
    const profilesById = await fetchPublicProfileMap(rows.map((row) => row.user_id));
    return rows.map((row, index) => ({
      rank: row.rank ?? index + 1,
      user_id: row.user_id,
      username: profilesById.get(row.user_id)?.display_name ?? row.display_name ?? row.username_handle ?? "Player",
      username_handle: profilesById.get(row.user_id)?.username_handle ?? row.username_handle,
      initials: profilesById.get(row.user_id)?.initials ?? row.initials ?? "PL",
      avatar_color: profilesById.get(row.user_id)?.avatar_color ?? row.avatar_color ?? "#A8A294",
      ...publicAvatarFields(profilesById.get(row.user_id) ?? row),
      total_score: row.total_score,
      puzzles_completed: row.puzzles_completed,
      best_score: row.best_score,
      total_time: row.total_time,
      latest_completed_at: row.latest_completed_at,
      is_current_user: row.is_current_user === true,
    }));
  }, [auth.user, fetchPublicProfileMap, updateDiagnostics]);

  const fetchRankedLeaderboard = useCallback(async (): Promise<RankedLeaderboardEntry[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc("get_ranked_leaderboard");
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return [];
    }
    const rows = (data ?? []) as Array<Partial<RankedLeaderboardEntry> & { display_name?: string | null }>;
    const profilesById = await fetchPublicProfileMap(rows.map((row) => row.user_id));
    return rows.map((row, index) => ({
      rank: Number(row.rank ?? index + 1),
      user_id: row.user_id ?? "",
      username: profilesById.get(row.user_id ?? "")?.display_name ?? row.display_name ?? row.username ?? "Player",
      initials: profilesById.get(row.user_id ?? "")?.initials ?? row.initials ?? "PL",
      avatar_color: profilesById.get(row.user_id ?? "")?.avatar_color ?? row.avatar_color ?? "#A8A294",
      ...publicAvatarFields(profilesById.get(row.user_id ?? "") ?? row),
      current_tier: row.current_tier ?? "Bronze III",
      rp: Number(row.rp ?? 0),
      matches_played: Number(row.matches_played ?? 0),
      wins: Number(row.wins ?? 0),
      losses: Number(row.losses ?? 0),
      draws: Number(row.draws ?? 0),
      updated_at: row.updated_at ?? new Date().toISOString(),
    }));
  }, [fetchPublicProfileMap, updateDiagnostics]);

  const checkUsernameAvailable = useCallback(async (usernameInput: string): Promise<UsernameAvailability> => {
    const invalid = validateUsernameHandle(usernameInput);
    if (invalid) return invalid;
    const username = normalizeUsernameHandle(usernameInput);
    if (!auth.user || !isSupabaseConfigured) return { username, status: "error", message: "Sign in before choosing a username." };

    const { data, error } = await supabase.rpc("check_username_available", { p_username: username });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { username, status: "error", message: error.message };
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return { username, status: "error", message: "Could not check username." };
    return {
      username: row.normalized_username ?? username,
      status: row.available ? "available" : "unavailable",
      message: row.reason ?? (row.available ? "Username is available." : "Username is unavailable."),
    };
  }, [auth.user, updateDiagnostics]);

  const completeProfileSetup = useCallback(async (displayNameInput: string, usernameInput: string): Promise<SaveResult> => {
    const displayName = displayNameInput.trim();
    if (displayName.length < 2 || displayName.length > 30) return { ok: false, error: "Display name must be 2-30 characters." };
    const invalid = validateUsernameHandle(usernameInput);
    if (invalid) return { ok: false, error: invalid.message };
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before setting up your profile." };

    const username = normalizeUsernameHandle(usernameInput);
    const nextInitials = initialsFromName(displayName);
    const avatarConfig = normalizeAvatarConfig({}, { initials: nextInitials, color: profile.avatar_color, symbol: profile.avatar_symbol });
    const { error } = await supabase.from("profiles").update({
      username: displayName,
      username_handle: username,
      display_name: displayName,
      initials: nextInitials,
      avatar_style_version: avatarConfig.avatar_style_version,
      avatar_bg_color: avatarConfig.avatar_bg_color,
      avatar_initials: nextInitials,
      avatar_skin_tone: avatarConfig.avatar_skin_tone,
      avatar_hair_style: avatarConfig.avatar_hair_style,
      avatar_hair_color: avatarConfig.avatar_hair_color,
      avatar_top_style: avatarConfig.avatar_top_style,
      avatar_top_color: avatarConfig.avatar_top_color,
      avatar_accessory: avatarConfig.avatar_accessory,
      avatar_frame: avatarConfig.avatar_frame,
      profile_setup_completed: true,
      updated_at: new Date().toISOString(),
    }).eq("id", auth.user.id);
    if (error) {
      const message = isUniqueViolation(error) ? "Username is already taken." : error.message;
      updateDiagnostics({ lastError: message });
      return { ok: false, error: message };
    }

    setProfile((current) => normalizeProfile({ ...current, ...avatarConfig, username: displayName, username_handle: username, display_name: displayName, initials: nextInitials, avatar_initials: nextInitials, profile_setup_completed: true }));
    await loadBackendProfile();
    return { ok: true };
  }, [auth.user, loadBackendProfile, profile.avatar_color, profile.avatar_symbol, updateDiagnostics]);

  const fetchFriends = useCallback(async (): Promise<FriendUser[]> => {
    if (!auth.user || !isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc("get_friends");
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return [];
    }
    const rows = (data ?? []) as FriendUser[];
    const profilesById = await fetchPublicProfileMap(rows.map((row) => row.user_id));
    return rows.map((row) => ({
      user_id: row.user_id,
      display_name: profilesById.get(row.user_id)?.display_name ?? row.display_name ?? "Player",
      username_handle: profilesById.get(row.user_id)?.username_handle ?? row.username_handle ?? "",
      initials: profilesById.get(row.user_id)?.initials ?? row.initials ?? "PL",
      avatar_color: profilesById.get(row.user_id)?.avatar_color ?? row.avatar_color ?? "#A8A294",
      ...publicAvatarFields(profilesById.get(row.user_id) ?? row),
      created_at: row.created_at,
      relationship_status: "friends",
    }));
  }, [auth.user, fetchPublicProfileMap, updateDiagnostics]);

  const fetchPendingFriendRequests = useCallback(async (): Promise<FriendRequestEntry[]> => {
    if (!auth.user || !isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc("get_pending_friend_requests");
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return [];
    }
    const rows = (data ?? []) as FriendRequestEntry[];
    const profilesById = await fetchPublicProfileMap(rows.map((row) => row.user_id));
    return rows.map((row) => ({
      request_id: row.request_id,
      user_id: row.user_id,
      display_name: profilesById.get(row.user_id)?.display_name ?? row.display_name ?? "Player",
      username_handle: profilesById.get(row.user_id)?.username_handle ?? row.username_handle ?? "",
      initials: profilesById.get(row.user_id)?.initials ?? row.initials ?? "PL",
      avatar_color: profilesById.get(row.user_id)?.avatar_color ?? row.avatar_color ?? "#A8A294",
      ...publicAvatarFields(profilesById.get(row.user_id) ?? row),
      created_at: row.created_at,
    }));
  }, [auth.user, fetchPublicProfileMap, updateDiagnostics]);

  const searchUsersByUsername = useCallback(async (query: string): Promise<FriendUser[]> => {
    if (!auth.user || !isSupabaseConfigured) return [];
    const normalized = query.trim().replace(/^@+/, "").toLowerCase();
    if (normalized.length < 2) return [];
    const { data, error } = await supabase.rpc("search_users_by_username", { query: normalized });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return [];
    }
    const rows = (data ?? []) as FriendUser[];
    const profilesById = await fetchPublicProfileMap(rows.map((row) => row.user_id));
    return rows.map((row) => ({
      user_id: row.user_id,
      display_name: profilesById.get(row.user_id)?.display_name ?? row.display_name ?? "Player",
      username_handle: profilesById.get(row.user_id)?.username_handle ?? row.username_handle ?? "",
      initials: profilesById.get(row.user_id)?.initials ?? row.initials ?? "PL",
      avatar_color: profilesById.get(row.user_id)?.avatar_color ?? row.avatar_color ?? "#A8A294",
      ...publicAvatarFields(profilesById.get(row.user_id) ?? row),
      relationship_status: row.relationship_status ?? "none",
    }));
  }, [auth.user, fetchPublicProfileMap, updateDiagnostics]);

  const sendFriendRequest = useCallback(async (receiverUsername: string): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before adding friends." };
    const username = receiverUsername.trim().replace(/^@+/, "").toLowerCase();
    const { error } = await supabase.rpc("send_friend_request", { receiver_username: username });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [auth.user, updateDiagnostics]);

  const respondFriendRequest = useCallback(async (requestId: string, response: "accepted" | "declined"): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before responding to friend requests." };
    const { error } = await supabase.rpc("respond_friend_request", { p_request_id: requestId, p_response: response });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [auth.user, updateDiagnostics]);

  const fetchFriendChallenges = useCallback(async (): Promise<FriendChallengeEntry[]> => {
    if (!auth.user || !isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc("get_friend_challenges");
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return [];
    }
    const rows = (data ?? []) as FriendChallengeEntry[];
    const profilesById = await fetchPublicProfileMap(rows.map((row) => row.friend_user_id));
    return rows.map((row) => ({
      ...row,
      friend_display_name: profilesById.get(row.friend_user_id)?.display_name ?? row.friend_display_name ?? "Player",
      friend_username_handle: profilesById.get(row.friend_user_id)?.username_handle ?? row.friend_username_handle ?? "",
      friend_initials: profilesById.get(row.friend_user_id)?.initials ?? row.friend_initials ?? "PL",
      friend_avatar_color: profilesById.get(row.friend_user_id)?.avatar_color ?? row.friend_avatar_color ?? "#A8A294",
      ...prefixedFriendAvatarFields(profilesById.get(row.friend_user_id) ?? row),
    }));
  }, [auth.user, fetchPublicProfileMap, updateDiagnostics]);

  const createFriendChallenge = useCallback(async (friendUsername: string, difficulty: PuzzleResult["difficulty"]): Promise<{ ok: boolean; error?: string; challenge?: FriendChallengeStart }> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before challenging friends." };
    const username = friendUsername.trim().replace(/^@+/, "").toLowerCase();
    const { data, error } = await supabase.rpc("create_friend_challenge", {
      p_friend_username: username,
      p_difficulty: difficulty,
    });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.session_id) return { ok: false, error: "Challenge created without a puzzle session." };
    const challenge: FriendChallengeStart = {
      challenge_id: row.challenge_id,
      status: row.status,
      puzzle_id: row.puzzle_id,
      difficulty: row.difficulty,
      session_id: row.session_id,
    };
    const { data: sessionData, error: sessionError } = await supabase
      .from("puzzle_sessions")
      .select("*")
      .eq("session_id", challenge.session_id)
      .maybeSingle();
    if (sessionError) updateDiagnostics({ lastError: sessionError.message });
    if (sessionData) {
      const session = sessionData as PuzzleSessionRow;
      setActiveSessions((prev) => [session, ...prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress")]);
    }
    return { ok: true, challenge };
  }, [auth.user, updateDiagnostics]);

  const acceptFriendChallenge = useCallback(async (challengeId: string): Promise<{ ok: boolean; error?: string; challenge?: FriendChallengeStart }> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before accepting challenges." };
    const { data, error } = await supabase.rpc("accept_friend_challenge", { p_challenge_id: challengeId });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.session_id) return { ok: false, error: "Challenge accepted without a puzzle session." };
    const challenge: FriendChallengeStart = {
      challenge_id: row.challenge_id,
      status: row.status,
      puzzle_id: row.puzzle_id,
      difficulty: row.difficulty,
      session_id: row.session_id,
    };
    const { data: sessionData, error: sessionError } = await supabase
      .from("puzzle_sessions")
      .select("*")
      .eq("session_id", challenge.session_id)
      .maybeSingle();
    if (sessionError) updateDiagnostics({ lastError: sessionError.message });
    if (sessionData) {
      const session = sessionData as PuzzleSessionRow;
      setActiveSessions((prev) => [session, ...prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress")]);
    }
    return { ok: true, challenge };
  }, [auth.user, updateDiagnostics]);

  const declineFriendChallenge = useCallback(async (challengeId: string): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before declining challenges." };
    const { error } = await supabase.rpc("decline_friend_challenge", { p_challenge_id: challengeId });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [auth.user, updateDiagnostics]);

  const cancelFriendChallenge = useCallback(async (challengeId: string): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before cancelling challenges." };
    const { error } = await supabase.rpc("cancel_friend_challenge", { p_challenge_id: challengeId });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [auth.user, updateDiagnostics]);

  const mapDailyDuel = useCallback((row: Partial<DailyDuelEntry> | null | undefined): DailyDuelEntry | null => {
    if (!row?.duel_id) return null;
    return {
      duel_id: row.duel_id,
      duel_date: row.duel_date ?? getDailyDateKey(),
      status: row.status ?? "waiting_for_opponent",
      puzzle_id: row.puzzle_id ?? "",
      difficulty: row.difficulty ?? "Medium",
      session_id: row.session_id ?? null,
      current_user_result_id: row.current_user_result_id ?? null,
      opponent_user_id: row.opponent_user_id ?? null,
      opponent_display_name: row.opponent_display_name ?? null,
      opponent_username_handle: row.opponent_username_handle ?? null,
      opponent_initials: row.opponent_initials ?? null,
      opponent_avatar_color: row.opponent_avatar_color ?? null,
      ...prefixedOpponentAvatarFields(row),
      opponent_rank_tier: row.opponent_rank_tier ?? null,
      your_score: row.your_score ?? null,
      your_elapsed_seconds: row.your_elapsed_seconds ?? null,
      your_mistakes: row.your_mistakes ?? null,
      your_hints_used: row.your_hints_used ?? null,
      opponent_score: row.opponent_score ?? null,
      opponent_elapsed_seconds: row.opponent_elapsed_seconds ?? null,
      opponent_mistakes: row.opponent_mistakes ?? null,
      opponent_hints_used: row.opponent_hints_used ?? null,
      winner_user_id: row.winner_user_id ?? null,
      completed_at: row.completed_at ?? null,
    };
  }, []);

  const fetchDailyDuel = useCallback(async (dateStr: string = getDailyDateKey()): Promise<DailyDuelEntry | null> => {
    if (!auth.user || !isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc("daily_duel_view", { p_date: dateStr });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    let duel = mapDailyDuel(row as Partial<DailyDuelEntry> | null);
    if (!duel?.opponent_user_id) return duel;

    const [profilesById, { data: statsRow, error: statsError }] = await Promise.all([
      fetchPublicProfileMap([duel.opponent_user_id]),
      supabase
        .from("player_stats")
        .select("rank_tier")
        .eq("user_id", duel.opponent_user_id)
        .maybeSingle(),
    ]);
    if (statsError) return duel;
    const opponentProfile = profilesById.get(duel.opponent_user_id);
    if (opponentProfile) {
      duel = {
        ...duel,
        opponent_display_name: opponentProfile.display_name ?? opponentProfile.username ?? duel.opponent_display_name,
        opponent_username_handle: opponentProfile.username_handle ?? duel.opponent_username_handle,
        opponent_initials: opponentProfile.initials ?? duel.opponent_initials,
        opponent_avatar_color: opponentProfile.avatar_color ?? duel.opponent_avatar_color,
        ...prefixedOpponentAvatarFields(opponentProfile),
      };
    }

    return { ...duel, opponent_rank_tier: statsRow?.rank_tier ?? null };
  }, [auth.user, fetchPublicProfileMap, mapDailyDuel, updateDiagnostics]);

  const enterDailyDuel = useCallback(async (dateStr: string = getDailyDateKey()): Promise<{ ok: boolean; error?: string; duel?: DailyDuelEntry }> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before entering Daily Duel." };
    const { data, error } = await supabase.rpc("enter_daily_duel", { p_date: dateStr });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    const row = Array.isArray(data) ? data[0] : null;
    let duel = mapDailyDuel(row as Partial<DailyDuelEntry> | null);
    if (!duel) return { ok: false, error: "Daily Duel did not return a match." };

    if (duel.opponent_user_id) {
      const [profilesById, { data: statsRow }] = await Promise.all([
        fetchPublicProfileMap([duel.opponent_user_id]),
        supabase
          .from("player_stats")
          .select("rank_tier")
          .eq("user_id", duel.opponent_user_id)
          .maybeSingle(),
      ]);
      const opponentProfile = profilesById.get(duel.opponent_user_id);
      duel = { ...duel, opponent_rank_tier: statsRow?.rank_tier ?? null };
      if (opponentProfile) {
        duel = {
          ...duel,
          opponent_display_name: opponentProfile.display_name ?? opponentProfile.username ?? duel.opponent_display_name,
          opponent_username_handle: opponentProfile.username_handle ?? duel.opponent_username_handle,
          opponent_initials: opponentProfile.initials ?? duel.opponent_initials,
          opponent_avatar_color: opponentProfile.avatar_color ?? duel.opponent_avatar_color,
          ...prefixedOpponentAvatarFields(opponentProfile),
        };
      }
    }

    if (duel.session_id && !duel.current_user_result_id) {
      const { data: sessionData, error: sessionError } = await supabase
        .from("puzzle_sessions")
        .select("*")
        .eq("session_id", duel.session_id)
        .maybeSingle();
      if (sessionError) updateDiagnostics({ lastError: sessionError.message });
      if (sessionData) {
        const session = sessionData as PuzzleSessionRow;
        setActiveSessions((prev) => [session, ...prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress")]);
      }
    }

    return { ok: true, duel };
  }, [auth.user, fetchPublicProfileMap, mapDailyDuel, updateDiagnostics]);

  const fetchRankTierForUser = useCallback(async (userId: string | null | undefined): Promise<string | null> => {
    if (!userId || !isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from("player_stats")
      .select("rank_tier")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return null;
    }
    return data?.rank_tier ?? null;
  }, [updateDiagnostics]);

  const repairRankedDuelSessionMode = useCallback(async (sessionId: string | null | undefined, expectedMode: "ranked" | "ranked_duel" = "ranked_duel"): Promise<{ status: SessionStatus | null; mode: string | null } | null> => {
    if (!sessionId || !auth.user || !isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from("puzzle_sessions")
      .select("session_id, status, mode")
      .eq("session_id", sessionId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return null;
    }

    const session = data as ({ session_id: string; status: SessionStatus; mode: string } | null);
    if (!session) return { status: null, mode: null };

    if (expectedMode === "ranked_duel" && session.mode === "ranked") {
      const { data: repairedData, error: repairError } = await supabase
        .from("puzzle_sessions")
        .update({ mode: "ranked_duel", updated_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", auth.user.id)
        .eq("mode", "ranked")
        .select("session_id, status, mode")
        .maybeSingle();
      if (repairError) {
        updateDiagnostics({ lastError: repairError.message });
        logDevDiagnostic("ranked duel session mode repair failed", {
          authUserId: auth.user.id,
          sessionId,
          expectedMode,
          supabaseError: repairError.message,
        });
        return session;
      }

      const repaired = (repairedData as ({ session_id: string; status: SessionStatus; mode: string } | null)) ?? { ...session, mode: "ranked_duel" };
      logDevDiagnostic("ranked duel session mode repaired", {
        authUserId: auth.user.id,
        sessionId,
        fromMode: session.mode,
        toMode: repaired.mode,
      });
      return repaired;
    }

    return session;
  }, [auth.user, updateDiagnostics]);

  const mapRankedDuel = useCallback((row: Partial<RankedDuelEntry> | null | undefined): RankedDuelEntry | null => {
    if (!row?.ranked_duel_id) return null;
    return {
      ranked_duel_id: row.ranked_duel_id,
      season_id: row.season_id ?? "",
      season_name: row.season_name ?? "Season 1",
      season_ends_at: row.season_ends_at ?? null,
      status: row.status ?? "waiting_for_opponent",
      puzzle_id: row.puzzle_id ?? "",
      difficulty: row.difficulty ?? "Medium",
      session_id: row.session_id ?? null,
      current_user_result_id: row.current_user_result_id ?? null,
      opponent_user_id: row.opponent_user_id ?? null,
      opponent_display_name: row.opponent_display_name ?? null,
      opponent_username_handle: row.opponent_username_handle ?? null,
      opponent_initials: row.opponent_initials ?? null,
      opponent_avatar_color: row.opponent_avatar_color ?? null,
      ...prefixedOpponentAvatarFields(row),
      opponent_rank_tier: row.opponent_rank_tier ?? ((row as { opponent_tier?: string | null }).opponent_tier ?? null),
      your_score: row.your_score ?? null,
      your_elapsed_seconds: row.your_elapsed_seconds ?? null,
      opponent_score: row.opponent_score ?? null,
      opponent_elapsed_seconds: row.opponent_elapsed_seconds ?? null,
      winner_user_id: row.winner_user_id ?? null,
      rp_before: row.rp_before ?? null,
      rp_after: row.rp_after ?? null,
      rp_change: row.rp_change ?? null,
      current_rp: Number(row.current_rp ?? 0),
      current_tier: row.current_tier ?? "Bronze III",
      matches_played: Number(row.matches_played ?? 0),
      wins: Number(row.wins ?? 0),
      losses: Number(row.losses ?? 0),
      draws: Number(row.draws ?? 0),
      completed_at: row.completed_at ?? null,
    };
  }, []);

  const fetchRankedDuel = useCallback(async (includeCompleted = false): Promise<RankedDuelEntry | null> => {
    if (!auth.user || !isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc("ranked_duel_view", { p_ranked_duel_id: null });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    let duel = mapRankedDuel(row as Partial<RankedDuelEntry> | null);
    if (!duel) return null;
    const sessionState = duel.session_id && !duel.current_user_result_id
      ? await repairRankedDuelSessionMode(duel.session_id, "ranked_duel")
      : null;
    if (duel.opponent_user_id) {
      const [profilesById, opponentRankTier] = await Promise.all([
        fetchPublicProfileMap([duel.opponent_user_id]),
        fetchRankTierForUser(duel.opponent_user_id),
      ]);
      const opponentProfile = profilesById.get(duel.opponent_user_id);
      duel = { ...duel, opponent_rank_tier: opponentRankTier ?? duel.opponent_rank_tier ?? null };
      if (opponentProfile) {
        duel = {
          ...duel,
          opponent_display_name: opponentProfile.display_name ?? opponentProfile.username ?? duel.opponent_display_name,
          opponent_username_handle: opponentProfile.username_handle ?? duel.opponent_username_handle,
          opponent_initials: opponentProfile.initials ?? duel.opponent_initials,
          opponent_avatar_color: opponentProfile.avatar_color ?? duel.opponent_avatar_color,
          ...prefixedOpponentAvatarFields(opponentProfile),
        };
      }
    }
    if (sessionState && sessionState.status !== "in_progress" && !duel.current_user_result_id && ["waiting_for_opponent", "matched", "player_a_completed", "player_b_completed"].includes(duel.status)) {
      logDevDiagnostic("suppressing stale ranked duel state", {
        authUserId: auth.user.id,
        rankedDuelId: duel.ranked_duel_id,
        sessionId: duel.session_id,
        sessionStatus: sessionState.status,
        sessionMode: sessionState.mode,
      });
      setActiveSessions((prev) => prev.filter((entry) => entry.session_id !== duel?.session_id));
      return null;
    }
    if (includeCompleted) return duel;
    return ["waiting_for_opponent", "matched", "player_a_completed", "player_b_completed"].includes(duel.status) ? duel : null;
  }, [auth.user, fetchPublicProfileMap, fetchRankTierForUser, mapRankedDuel, repairRankedDuelSessionMode, updateDiagnostics]);

  const enterRankedDuel = useCallback(async (): Promise<{ ok: boolean; error?: string; duel?: RankedDuelEntry }> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before entering Ranked Duel." };
    const { data, error } = await supabase.rpc("enter_ranked_duel");
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    const row = Array.isArray(data) ? data[0] : null;
    let duel = mapRankedDuel(row as Partial<RankedDuelEntry> | null);
    if (!duel) return { ok: false, error: "Ranked Duel did not return a match." };
    if (duel.opponent_user_id) {
      const [profilesById, opponentRankTier] = await Promise.all([
        fetchPublicProfileMap([duel.opponent_user_id]),
        fetchRankTierForUser(duel.opponent_user_id),
      ]);
      const opponentProfile = profilesById.get(duel.opponent_user_id);
      duel = { ...duel, opponent_rank_tier: opponentRankTier ?? duel.opponent_rank_tier ?? null };
      if (opponentProfile) {
        duel = {
          ...duel,
          opponent_display_name: opponentProfile.display_name ?? opponentProfile.username ?? duel.opponent_display_name,
          opponent_username_handle: opponentProfile.username_handle ?? duel.opponent_username_handle,
          opponent_initials: opponentProfile.initials ?? duel.opponent_initials,
          opponent_avatar_color: opponentProfile.avatar_color ?? duel.opponent_avatar_color,
          ...prefixedOpponentAvatarFields(opponentProfile),
        };
      }
    }

    if (duel.session_id && !duel.current_user_result_id) {
      await repairRankedDuelSessionMode(duel.session_id, "ranked_duel");
      const { data: sessionData, error: sessionError } = await supabase
        .from("puzzle_sessions")
        .select("*")
        .eq("session_id", duel.session_id)
        .maybeSingle();
      if (sessionError) updateDiagnostics({ lastError: sessionError.message });
      if (sessionData) {
        const session = sessionData as PuzzleSessionRow;
        setActiveSessions((prev) => [session, ...prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress")]);
      }
    }

    return { ok: true, duel };
  }, [auth.user, fetchPublicProfileMap, fetchRankTierForUser, mapRankedDuel, repairRankedDuelSessionMode, updateDiagnostics]);

  const cancelRankedDuel = useCallback(async (rankedDuelId: string): Promise<{ ok: boolean; error?: string; duel?: RankedDuelEntry | null }> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Sign in before cancelling Ranked Duel search." };
    const { data, error } = await supabase.rpc("cancel_ranked_duel", { p_ranked_duel_id: rankedDuelId });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    const row = Array.isArray(data) ? data[0] : null;
    const duel = mapRankedDuel(row as Partial<RankedDuelEntry> | null);
    if (duel?.session_id) {
      setActiveSessions((prev) => prev.filter((entry) => entry.session_id !== duel.session_id));
    }
    return { ok: true, duel };
  }, [auth.user, mapRankedDuel, updateDiagnostics]);

  const fetchFriendHeadToHead = useCallback(async (friendId: string): Promise<FriendHeadToHeadSummary | null> => {
    if (!auth.user || !isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc("get_friend_head_to_head", { p_friend_id: friendId });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    const profilesById = await fetchPublicProfileMap([row.friend_user_id]);
    const friendProfile = profilesById.get(row.friend_user_id);
    return {
      friend_user_id: row.friend_user_id,
      friend_display_name: friendProfile?.display_name ?? row.friend_display_name ?? "Player",
      friend_username_handle: friendProfile?.username_handle ?? row.friend_username_handle ?? "",
      friend_initials: friendProfile?.initials ?? row.friend_initials ?? "PL",
      friend_avatar_color: friendProfile?.avatar_color ?? row.friend_avatar_color ?? "#A8A294",
      ...prefixedFriendAvatarFields(friendProfile ?? row),
      total_completed: Number(row.total_completed ?? 0),
      current_user_wins: Number(row.current_user_wins ?? 0),
      friend_wins: Number(row.friend_wins ?? 0),
      draws: Number(row.draws ?? 0),
      current_user_average_score: Number(row.current_user_average_score ?? 0),
      friend_average_score: Number(row.friend_average_score ?? 0),
      current_user_best_score: Number(row.current_user_best_score ?? 0),
      friend_best_score: Number(row.friend_best_score ?? 0),
      current_user_fastest_win: row.current_user_fastest_win ?? null,
      friend_fastest_win: row.friend_fastest_win ?? null,
      recent_completed_challenges: parseHeadToHeadMatches(row.recent_completed_challenges),
    };
  }, [auth.user, fetchPublicProfileMap, updateDiagnostics]);

  const updateDisplayName = useCallback((username: string): SaveResult => {
    const trimmed = username.trim();
    if (trimmed.length === 0) return { ok: false, error: "Display name cannot be empty." };
    if (trimmed.length > 20) return { ok: false, error: "Display name must be 20 characters or fewer." };
    const nextInitials = initialsFromName(trimmed);
    const next = { ...profile, username: trimmed, display_name: trimmed, initials: nextInitials, avatar_initials: nextInitials };
    persist(next);
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) void supabase.from("profiles").upsert({ id: auth.user.id, username: trimmed, display_name: trimmed, initials: next.initials, avatar_initials: next.avatar_initials, avatar_color: next.avatar_color, updated_at: new Date().toISOString() }).then(({ error: saveError }) => { if (saveError) updateDiagnostics({ lastError: saveError.message }); }).catch((saveError: unknown) => updateDiagnostics({ lastError: saveError instanceof Error ? saveError.message : "Unable to save display name." }));
    return { ok: true };
  }, [auth.isSignedIn, auth.user, persist, profile, updateDiagnostics]);

  const updateAvatar = useCallback(async (avatar: CharacterAvatarConfig & { initials: string; avatar_color: string; avatar_symbol?: string | null }): Promise<SaveResult> => {
    const avatarConfig = normalizeAvatarConfig(avatar, { initials: avatar.initials, color: avatar.avatar_color, symbol: avatar.avatar_symbol });
    const initials = (avatar.avatar_initials ?? avatar.initials).trim().toUpperCase();
    if (initials.length < 1 || initials.length > 3) return { ok: false, error: "Initials must be 1-3 characters." };
    const next = normalizeProfile({
      ...profile,
      initials,
      avatar_color: avatar.avatar_bg_color ?? avatar.avatar_color,
      avatar_symbol: avatar.avatar_symbol?.trim() || null,
      ...avatarConfig,
      avatar_initials: initials,
    });
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      const { data, error: saveError } = await supabase
        .from("profiles")
        .update({
          initials: next.initials,
          avatar_color: next.avatar_color,
          avatar_symbol: next.avatar_symbol ?? null,
          avatar_style_version: next.avatar_style_version,
          avatar_bg_color: next.avatar_bg_color,
          avatar_initials: next.avatar_initials,
          avatar_skin_tone: next.avatar_skin_tone,
          avatar_hair_style: next.avatar_hair_style,
          avatar_hair_color: next.avatar_hair_color,
          avatar_top_style: next.avatar_top_style,
          avatar_top_color: next.avatar_top_color,
          avatar_accessory: next.avatar_accessory,
          avatar_frame: next.avatar_frame,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auth.user.id)
        .select("id,initials,avatar_color,avatar_symbol")
        .maybeSingle();
      if (saveError) {
        updateDiagnostics({ lastError: saveError.message });
        return { ok: false, error: saveError.message };
      }
      if (!data) {
        const message = "Profile row was not found. Please reopen the app and try again.";
        updateDiagnostics({ lastError: message });
        return { ok: false, error: message };
      }
      setProfile(next);
    } else if (auth.isGuest || auth.mode === "signed_out") {
      persistLocal(next);
    } else {
      setProfile(next);
    }
    return { ok: true };
  }, [auth.isGuest, auth.isSignedIn, auth.mode, auth.user, persistLocal, profile, updateDiagnostics]);

  const updateNotificationSettings = useCallback(async (notifications: ProfileSettings["notifications"]): Promise<SaveResult> => {
    const next = normalizeProfile({ ...profile, settings: { ...profile.settings, notifications } });
    setProfile(next);
    if (auth.isGuest || auth.mode === "signed_out") {
      persistLocal(next);
      return { ok: true };
    }
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("user_settings").upsert({
          user_id: auth.user.id,
          daily_reminder: notifications.dailyPuzzleReminder,
          streak_reminder: notifications.streakReminder,
          duel_results: notifications.duelResults,
          ranked_updates: notifications.rankedMatchUpdates,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        updateDiagnostics({ lastError: error?.message ?? null });
        return error ? { ok: false, error: error.message } : { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save notification settings.";
        updateDiagnostics({ lastError: message });
        return { ok: false, error: message };
      }
    }
    return { ok: true };
  }, [auth.isGuest, auth.isSignedIn, auth.mode, auth.user, persistLocal, profile, updateDiagnostics]);

  const updatePrivacySettings = useCallback(async (privacy: ProfileSettings["privacy"]): Promise<SaveResult> => {
    const next = normalizeProfile({ ...profile, settings: { ...profile.settings, privacy } });
    setProfile(next);
    if (auth.isGuest || auth.mode === "signed_out") {
      persistLocal(next);
      return { ok: true };
    }
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("user_settings").upsert({
          user_id: auth.user.id,
          public_profile: privacy.publicProfile,
          show_stats_publicly: privacy.showStatsPublicly,
          show_recent_results_publicly: privacy.showRecentResultsPublicly,
          allow_friend_challenges: privacy.allowFriendChallenges,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        updateDiagnostics({ lastError: error?.message ?? null });
        return error ? { ok: false, error: error.message } : { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save privacy settings.";
        updateDiagnostics({ lastError: message });
        return { ok: false, error: message };
      }
    }
    return { ok: true };
  }, [auth.isGuest, auth.isSignedIn, auth.mode, auth.user, persistLocal, profile, updateDiagnostics]);

  const testSupabaseRead = useCallback(async (): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Supabase read test requires a signed-in user." };
    const { error } = await supabase.from("profiles").select("id").eq("id", auth.user.id).maybeSingle();
    updateDiagnostics({ lastError: error?.message ?? null });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, [auth.user, updateDiagnostics]);

  const testSupabaseWrite = useCallback(async (): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Supabase write test requires a signed-in user." };
    const { error } = await supabase.from("user_settings").upsert({ user_id: auth.user.id, updated_at: new Date().toISOString() });
    updateDiagnostics({ lastError: error?.message ?? null });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, [auth.user, updateDiagnostics]);

  const testDailyResultQuery = useCallback(async (): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Daily result query test requires a signed-in user." };
    const todayDateStr = getDailyDateKey();
    const errors: string[] = [];
    const puzzle = await fetchDailyPuzzle(todayDateStr, "daily");
    const { data: leaderboardRows, error: leaderboardError } = await supabase
      .from("game_results")
      .select("result_id,user_id,puzzle_id,mode,completed,eligible_for_leaderboard,final_score,elapsed_seconds,completed_at")
      .eq("mode", "daily")
      .eq("puzzle_id", puzzle.puzzle_id)
      .eq("completed", true);
    if (leaderboardError) errors.push(leaderboardError.message);

    const { data: replayRows, error: replayError } = await supabase
      .from("game_results")
      .select("result_id,user_id,puzzle_id,mode,completed,eligible_for_leaderboard,final_score,elapsed_seconds,completed_at")
      .eq("user_id", auth.user.id)
      .eq("mode", "daily")
      .eq("puzzle_id", puzzle.puzzle_id)
      .eq("completed", true);
    if (replayError) errors.push(replayError.message);

    const { data: hasCompleted, error: completedRpcError } = await supabase.rpc("has_completed_daily", { p_date: todayDateStr });
    if (completedRpcError) errors.push(completedRpcError.message);

    const { data: leaderboardRpcRows, error: leaderboardRpcError } = await supabase.rpc("get_daily_leaderboard", { p_date: todayDateStr });
    if (leaderboardRpcError) errors.push(leaderboardRpcError.message);

    updateDailyDiagnostics({
      currentUserId: auth.user.id,
      todayDateStr,
      assignedDailyPuzzle: { puzzle_id: puzzle.puzzle_id, difficulty: puzzle.difficulty },
      assignedDailyPuzzleId: puzzle.puzzle_id,
      replayQueryResultCount: replayRows?.length ?? 0,
      replayQueryRows: replayRows ?? [],
      replayRpcResult: Boolean(hasCompleted),
      leaderboardQueryResultCount: leaderboardRows?.length ?? 0,
      leaderboardRawRows: leaderboardRows ?? [],
      leaderboardRpcResultCount: leaderboardRpcRows?.length ?? 0,
      leaderboardFinalDisplayedRowCount: leaderboardRpcRows?.length ?? 0,
      errors,
    });
    updateDiagnostics({ lastError: errors[0] ?? null });

    return errors.length > 0
      ? { ok: false, error: errors.join("\n") }
      : { ok: true };
  }, [auth.user, updateDailyDiagnostics, updateDiagnostics]);

  const simulateResult = useCallback((): ProfileUpdateSummary => recordPuzzleResult(createSimulatedResult()), [recordPuzzleResult]);
  const simulateRankedWin = useCallback((): ProfileUpdateSummary => recordPuzzleResult(createSimulatedResult("ranked", "win"), "win"), [recordPuzzleResult]);
  const simulateRankedLoss = useCallback((): ProfileUpdateSummary => recordPuzzleResult(createSimulatedResult("ranked", "loss"), "loss"), [recordPuzzleResult]);
  const resetLocalProfile = useCallback(() => { const next = createInitialPlayerProfile(!auth.isSignedIn); persist(next); setLastUpdate(null); }, [auth.isSignedIn, persist]);
  const clearLastUpdate = useCallback(() => setLastUpdate(null), []);
  const clearLastStreakIncrease = useCallback(() => setLastStreakIncreaseKey(null), []);

  const repairCompletedSessions = useCallback(async (): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Repair requires a signed-in user." };
    const { data: sessions, error: sessionsError } = await supabase.from("puzzle_sessions").select("session_id,puzzle_id,mode,difficulty,status").eq("user_id", auth.user.id).eq("status", "in_progress");
    if (sessionsError) return { ok: false, error: sessionsError.message };
    const inProgress = (sessions ?? []) as Pick<PuzzleSessionRow, "session_id" | "puzzle_id" | "mode" | "difficulty" | "status">[];
    const puzzleIds = inProgress.map((session) => session.puzzle_id).filter((id): id is string => typeof id === "string" && id.length > 0);
    if (puzzleIds.length === 0) return { ok: true };
    const { data: results, error: resultsError } = await supabase.from("game_results").select("session_id,puzzle_id,mode,difficulty").eq("user_id", auth.user.id).in("puzzle_id", puzzleIds);
    if (resultsError) return { ok: false, error: resultsError.message };
    const completedKeys = new Set(((results ?? []) as Pick<GameResultRow, "session_id" | "puzzle_id" | "mode" | "difficulty">[]).map((result) => result.session_id ? `session:${result.session_id}` : `puzzle:${result.puzzle_id}:${result.mode}:${result.difficulty}`));
    const sessionIds = inProgress.filter((session) => completedKeys.has(`session:${session.session_id}`) || (session.puzzle_id && completedKeys.has(`puzzle:${session.puzzle_id}:${session.mode}:${session.difficulty}`))).map((session) => session.session_id);
    if (sessionIds.length > 0) {
      const { error } = await supabase.from("puzzle_sessions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("user_id", auth.user.id).in("session_id", sessionIds);
      if (error) return { ok: false, error: error.message };
    }
    await loadBackendProfile();
    return { ok: true };
  }, [auth.user, loadBackendProfile]);

  const visibleActiveSessions = auth.isSignedIn ? activeSessions : activeGuestSessions.map(guestSessionToPuzzleSessionRow);
  const classicContinueSession = sortSessionsNewestFirst(
    visibleActiveSessions.filter((session) => isClassicSession(session) && session.status === "in_progress")
  )[0] ?? null;
  const hasActiveSession = visibleActiveSessions.some((s) => s.status === "in_progress");
  const profileSetupRequired = auth.isSignedIn && isLoaded && (!profile.profile_setup_completed || !profile.username_handle);

  return useMemo(() => ({
    profile, isLoaded, loadError, lastUpdate, lastStreakIncreaseKey,
    activeSessions: visibleActiveSessions,
    classicContinueSession,
    diagnostics, hasActiveSession, profileSetupRequired,
    recordPuzzleResult, submitOfficialPuzzleResult, submitFailedPuzzleResult, fetchDailyLeaderboard, fetchWeeklyLeaderboard, fetchFriendsWeeklyLeaderboard, fetchRankedLeaderboard, simulateResult, simulateRankedWin, simulateRankedLoss,
    fetchFriends, fetchPendingFriendRequests, searchUsersByUsername, sendFriendRequest, respondFriendRequest,
    fetchFriendChallenges, createFriendChallenge, acceptFriendChallenge, declineFriendChallenge, cancelFriendChallenge, fetchFriendHeadToHead,
    fetchDailyDuel, enterDailyDuel, fetchRankedDuel, enterRankedDuel, cancelRankedDuel,
    fetchPublicPlayerProfile,
    refreshProfile: loadBackendProfile,
    resetLocalProfile, checkUsernameAvailable, completeProfileSetup, updateDisplayName, updateAvatar, updateNotificationSettings, updatePrivacySettings,
    repairMissingProfileRows, repairCompletedSessions, testSupabaseRead, testSupabaseWrite, testDailyResultQuery, clearLastUpdate, clearLastStreakIncrease,
    upsertSession, startPuzzleSession, deleteSessionById, closeSessionForPuzzle, findSessionSnapshot, getInProgressClassicSession, getInProgressDailySession, getCompletedDailyResult,
  }), [
    activeGuestSessions, activeSessions, auth.isSignedIn,
    checkUsernameAvailable, classicContinueSession, clearLastStreakIncrease, clearLastUpdate, completeProfileSetup, diagnostics, hasActiveSession, isLoaded, lastStreakIncreaseKey, lastUpdate, loadBackendProfile, loadError, profile, profileSetupRequired, visibleActiveSessions,
    recordPuzzleResult, submitOfficialPuzzleResult, submitFailedPuzzleResult, fetchDailyLeaderboard, fetchWeeklyLeaderboard, fetchFriendsWeeklyLeaderboard, fetchRankedLeaderboard,
    fetchFriends, fetchPendingFriendRequests, searchUsersByUsername, sendFriendRequest, respondFriendRequest,
    fetchFriendChallenges, createFriendChallenge, acceptFriendChallenge, declineFriendChallenge, cancelFriendChallenge, fetchFriendHeadToHead,
    fetchDailyDuel, enterDailyDuel, fetchRankedDuel, enterRankedDuel, cancelRankedDuel,
    fetchPublicPlayerProfile,
    repairCompletedSessions, repairMissingProfileRows, resetLocalProfile,
    simulateRankedLoss, simulateRankedWin, simulateResult,
    testSupabaseRead, testSupabaseWrite, testDailyResultQuery,
    updateAvatar, updateDisplayName, updateNotificationSettings, updatePrivacySettings,
    upsertSession, startPuzzleSession, deleteSessionById, closeSessionForPuzzle, findSessionSnapshot, getInProgressClassicSession, getInProgressDailySession, getCompletedDailyResult,
  ]);
});
