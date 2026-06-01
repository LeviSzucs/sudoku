import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import type { PuzzleResult, SessionSnapshot } from "@/hooks/useSudokuGame";
import { getDailyDateKey, getDailyDateWindow } from "@/lib/daily";
import { logDevDiagnostic, measureAsync } from "@/lib/performanceDiagnostics";
import { applyPuzzleResult, createInitialPlayerProfile, createSimulatedResult, getRankFromRp, initialsFromName, normalizeProfile, type AchievementBadge, type BadgeCategory, type PlayerProfile, type ProfileSettings, type ProfileUpdateSummary, type RankOutcome, type RecentResult } from "@/lib/playerProfile";
import { startPuzzleSession as insertPuzzleSession, type StartPuzzleSessionInput } from "@/lib/puzzleSessions";
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

type SaveResult = { ok: boolean; error?: string };
type SessionStatus = "in_progress" | "completed" | "failed" | "abandoned";
type DailySessionMode = "daily" | "duel";
type UsernameAvailabilityStatus = "available" | "unavailable" | "invalid" | "error";

const RESERVED_USERNAMES = new Set(["player", "admin", "support", "sudoku", "ranked", "daily", "guest"]);

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
  xp_earned: number;
  leaderboard_eligible: boolean;
  ranked_eligible?: boolean;
  completed_at?: string;
  badges_unlocked?: AchievementBadge[];
  updated_profile_stats?: Partial<PlayerStatsRow> | null;
  already_finalized?: boolean;
}

export interface DailyLeaderboardEntry {
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

export interface WeeklyLeaderboardEntry {
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

export interface FriendUser {
  user_id: string;
  display_name: string;
  username_handle: string;
  initials: string;
  avatar_color: string;
  created_at?: string;
  relationship_status?: "none" | "friends" | "request_sent" | "request_received";
}

export interface FriendRequestEntry {
  request_id: string;
  user_id: string;
  display_name: string;
  username_handle: string;
  initials: string;
  avatar_color: string;
  created_at: string;
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
  return normalizeProfile({
    ...fallback,
    user_id: profileRow.id,
    username: displayName,
    username_handle: handle,
    display_name: displayName,
    profile_setup_completed: setupCompleted,
    initials: setupCompleted ? profileRow.initials : "",
    avatar_color: profileRow.avatar_color,
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

function resultFromRow(row: GameResultRow): RecentResult {
  return { session_id: row.session_id ?? undefined, puzzle_id: row.puzzle_id ?? "unknown", mode: row.mode as RecentResult["mode"], difficulty: row.difficulty as RecentResult["difficulty"], completed: true, elapsed_seconds: row.elapsed_seconds, mistakes: row.mistakes, hints_used: row.hints_used, undo_count: row.undo_count, move_count: 0, final_score: row.final_score, eligible_for_leaderboard: row.eligible_for_leaderboard, eligible_for_ranked: row.eligible_for_ranked, completed_at: row.completed_at, xp_earned: row.xp_earned, result_outcome: row.won === true ? "win" : row.won === false ? "loss" : undefined };
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

export const [PlayerProfileProvider, usePlayerProfile] = createContextHook(() => {
  const auth = useAuth();
  const [profile, setProfile] = useState<PlayerProfile>(() => createInitialPlayerProfile(false));
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<ProfileUpdateSummary | null>(null);
  const [activeSessions, setActiveSessions] = useState<PuzzleSessionRow[]>([]);
  const [activeGuestSessions, setActiveGuestSessions] = useState<GuestSessionEntry[]>([]);
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
    const entries = JSON.parse(raw) as GuestSessionEntry[];
    setActiveGuestSessions(entries);
    return entries;
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
    const [{ data: p, error: pError }, { data: s, error: sError }, { data: settings, error: settingsError }, { data: results, error: resultsError }, { data: achievements, error: achievementsError }, { data: userAchievements, error: userAchievementsError }, { data: sessions, error: sessionsError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
      supabase.from("player_stats").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("game_results").select("*").eq("user_id", auth.user.id).eq("completed", true).order("completed_at", { ascending: false }).limit(500),
      supabase.from("achievements").select("*").order("badge_id", { ascending: true }),
      supabase.from("user_achievements").select("*").eq("user_id", auth.user.id),
      supabase.from("puzzle_sessions").select("*").eq("user_id", auth.user.id).eq("status", "in_progress").order("updated_at", { ascending: false }),
    ]);
    const error = pError ?? sError ?? settingsError ?? resultsError ?? achievementsError ?? userAchievementsError ?? sessionsError;
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
    next.recent_results = ((results ?? []) as GameResultRow[]).map(resultFromRow);
    const completedResults = next.recent_results.filter((result) => result.completed);
    next.puzzles_completed = Math.max(next.puzzles_completed, completedResults.length);
    next.easy_completed = completedResults.filter((result) => result.difficulty === "Easy").length;
    next.medium_completed = completedResults.filter((result) => result.difficulty === "Medium").length;
    next.hard_completed = completedResults.filter((result) => result.difficulty === "Hard").length;
    next.expert_completed = completedResults.filter((result) => result.difficulty === "Expert").length;
    next.master_completed = completedResults.filter((result) => result.difficulty === "Master").length;
    const computedBestTimes = completedResults.reduce<Partial<Record<RecentResult["difficulty"], number>>>((acc, result) => {
      const current = acc[result.difficulty];
      if (typeof current !== "number" || result.elapsed_seconds < current) acc[result.difficulty] = result.elapsed_seconds;
      return acc;
    }, {});
    next.best_times_by_difficulty = {
      Easy: typeof next.best_times_by_difficulty.Easy === "number" && typeof computedBestTimes.Easy === "number" ? Math.min(next.best_times_by_difficulty.Easy, computedBestTimes.Easy) : next.best_times_by_difficulty.Easy ?? computedBestTimes.Easy,
      Medium: typeof next.best_times_by_difficulty.Medium === "number" && typeof computedBestTimes.Medium === "number" ? Math.min(next.best_times_by_difficulty.Medium, computedBestTimes.Medium) : next.best_times_by_difficulty.Medium ?? computedBestTimes.Medium,
      Hard: typeof next.best_times_by_difficulty.Hard === "number" && typeof computedBestTimes.Hard === "number" ? Math.min(next.best_times_by_difficulty.Hard, computedBestTimes.Hard) : next.best_times_by_difficulty.Hard ?? computedBestTimes.Hard,
      Expert: typeof next.best_times_by_difficulty.Expert === "number" && typeof computedBestTimes.Expert === "number" ? Math.min(next.best_times_by_difficulty.Expert, computedBestTimes.Expert) : next.best_times_by_difficulty.Expert ?? computedBestTimes.Expert,
      Master: typeof next.best_times_by_difficulty.Master === "number" && typeof computedBestTimes.Master === "number" ? Math.min(next.best_times_by_difficulty.Master, computedBestTimes.Master) : next.best_times_by_difficulty.Master ?? computedBestTimes.Master,
    };
    const duelResults = completedResults.filter((result) => ["duel", "daily_duel", "friend_challenge", "ranked", "ranked_duel"].includes(result.mode));
    next.duels_played = Math.max(next.duels_played, duelResults.length);
    next.duels_won = Math.max(next.duels_won, duelResults.filter((result) => result.result_outcome === "win").length);
    next.last_completed_date = completedResults[0]?.completed_at?.slice(0, 10) ?? next.last_completed_date;
    const progressByBadgeId = new Map(((userAchievements ?? []) as UserAchievementRow[]).map((row) => [row.badge_id, row]));
    next.badges_unlocked = ((achievements ?? []) as AchievementRow[]).map((achievement) => achievementFromBackend(achievement, progressByBadgeId.get(achievement.badge_id)));
    const completedKeys = new Set(next.recent_results.map((result) => `${result.puzzle_id}:${result.mode}:${result.difficulty}`));
    const activeRows = ((sessions ?? []) as PuzzleSessionRow[]).filter((session) => {
      if (session.status !== "in_progress") return false;
      const key = `${session.puzzle_id ?? ""}:${session.mode}:${session.difficulty}`;
      return !completedKeys.has(key);
    });
    setProfile(normalizeProfile(next));
    setActiveSessions(activeRows);
    updateDiagnostics({ profileLoaded: true, statsLoaded: true, settingsLoaded: true, recentResultsCount: next.recent_results.length, activeSessionCount: activeRows.length, latestSessionStatus: activeRows[0]?.status ?? null, latestResultPuzzleId: next.recent_results[0]?.puzzle_id ?? null, lastError: null });
  }, [auth.user, repairMissingProfileRows, updateDiagnostics]);

  // ── Initial load ─────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      setIsLoaded(false);
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
      if (active) setIsLoaded(true);
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
        setActiveSessions((prev) => {
          const filtered = prev.filter((s) => s.session_id !== sessionRow.session_id && s.status === "in_progress");
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
      const filtered = prev.filter((s) => s.sessionId !== sessionId);
      return [entry, ...filtered];
    });
    try {
      const prev = await loadGuestSessions();
      const filtered = prev.filter((s) => s.sessionId !== sessionId);
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

    const session = await insertPuzzleSession({ userId: auth.user.id, ...input });
    setActiveSessions((prev) => {
      const filtered = prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress");
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
    const localClassicSession = activeSessions.find((session) => session.mode === "classic" && session.status === "in_progress") ?? null;
    if (!auth.isSignedIn || !auth.user || !isSupabaseConfigured) return localClassicSession;

    const { data, error } = await supabase
      .from("puzzle_sessions")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("mode", "classic")
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      updateDiagnostics({ lastError: error.message });
      return localClassicSession;
    }

    const session = (data as PuzzleSessionRow | null) ?? null;
    if (session) {
      setActiveSessions((prev) => [session, ...prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress")]);
    }
    return session;
  }, [activeSessions, auth.isSignedIn, auth.user, updateDiagnostics]);

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

    const session = (data as PuzzleSessionRow | null) ?? null;
    if (session) {
      setActiveSessions((prev) => [session, ...prev.filter((entry) => entry.session_id !== session.session_id && entry.status === "in_progress")]);
    }
    return session;
  }, [activeSessions, auth.isSignedIn, auth.user, updateDiagnostics]);

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
    const summary: ProfileUpdateSummary = existingResult ? { xpEarned: existingResult.xp_earned, didLevelUp: false, previousLevel: profile.account_level, newLevel: profile.account_level, unlockedBadges: [], updatedProfile: profile } : applyPuzzleResult(profile, result, outcome);
    if (!existingResult) persist(summary.updatedProfile);
    setLastUpdate(summary);
    if (existingResult) {
      void closeSessionForPuzzle(result.puzzle_id, sessionId ?? undefined);
      return summary;
    }
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      const row = { result_id: deterministicResultId(auth.user.id, result, sessionId), user_id: auth.user.id, session_id: sessionId, puzzle_id: result.puzzle_id, mode: result.mode, difficulty: result.difficulty, completed: result.completed, won: outcome === "win" ? true : outcome === "loss" ? false : null, elapsed_seconds: result.elapsed_seconds, mistakes: result.mistakes, hints_used: result.hints_used, undo_count: result.undo_count, final_score: result.final_score, xp_earned: summary.xpEarned, rp_change: summary.updatedProfile.rank_points - profile.rank_points, eligible_for_leaderboard: result.eligible_for_leaderboard, eligible_for_ranked: result.eligible_for_ranked, completed_at: result.completed_at };
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
    const officialResult: RecentResult = {
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
      eligible_for_leaderboard: payload.leaderboard_eligible,
      eligible_for_ranked: payload.ranked_eligible ?? false,
      completed_at: payload.completed_at ?? new Date().toISOString(),
      xp_earned: payload.xp_earned,
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
    await verifyOwnedInProgressSession(sessionId);

    const previousProfile = profile;
    const { data, error } = await measureAsync("official result submit duration", () => supabase.rpc("submit_puzzle_result", {
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
    const summary = summaryFromOfficialPayload(payload, previousProfile);
    setLastUpdate(summary);
    setProfile(summary.updatedProfile);
    setActiveSessions((prev) => prev.filter((session) => session.session_id !== sessionId));
    await loadBackendProfile();
    return summary;
  }, [auth.isSignedIn, auth.user, loadBackendProfile, profile, recordPuzzleResult, summaryFromOfficialPayload, updateDiagnostics, verifyOwnedInProgressSession]);

  const fetchDailyLeaderboard = useCallback(async (dateStr: string): Promise<DailyLeaderboardEntry[]> => {
    if (!isSupabaseConfigured) return [];

    const selectColumns = "result_id,user_id,puzzle_id,mode,completed,eligible_for_leaderboard,final_score,elapsed_seconds,mistakes,hints_used,undo_count,completed_at";
    const { data: rawData, error: rawError } = await supabase
      .from("game_results")
      .select(selectColumns)
      .eq("mode", "daily")
      .eq("completed", true)
      .eq("eligible_for_leaderboard", true)
      .order("completed_at", { ascending: true });

    logDevDiagnostic("daily leaderboard raw query result", {
      dateStr,
      authUserId: auth.user?.id ?? null,
      filters: {
        table: "game_results",
        mode: "daily",
        completed: true,
        eligible_for_leaderboard: true,
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
      const entries = rpcRows.map((row) => ({
        result_id: row.result_id,
        user_id: row.user_id,
        username: row.username ?? "Player",
        initials: row.initials ?? "PL",
        avatar_color: row.avatar_color ?? "#A8A294",
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

    const buildQuery = (requireEligibility: boolean) => {
      let query = supabase
        .from("game_results")
        .select(selectColumns)
        .eq("mode", "daily")
        .eq("puzzle_id", assignedPuzzleId)
        .eq("completed", true)
        .order("final_score", { ascending: false })
        .order("elapsed_seconds", { ascending: true })
        .order("completed_at", { ascending: true });
      if (requireEligibility) query = query.eq("eligible_for_leaderboard", true);
      return query;
    };

    logDevDiagnostic("daily leaderboard fetch start", {
      dateStr,
      authUserId: auth.user?.id ?? null,
      assignedDailyPuzzleId: assignedPuzzleId,
      filters: {
        table: "game_results",
        mode: "daily",
        puzzle_id: assignedPuzzleId,
        completed: true,
        eligible_for_leaderboard: true,
      },
    });
    let { data, error } = await buildQuery(true);
    if (error && (error.code === "42703" || error.message.toLowerCase().includes("eligible_for_leaderboard"))) {
      logDevDiagnostic("daily leaderboard eligibility filter unavailable", {
        dateStr,
        supabaseError: error.message,
      });
      ({ data, error } = await buildQuery(false));
    }
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
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => typeof id === "string" && id.length > 0)));
    const profilesById = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id,username,initials,avatar_color")
        .in("id", userIds);
      if (profileError) updateDiagnostics({ lastError: profileError.message });
      for (const profileRow of (profileRows ?? []) as ProfileRow[]) {
        profilesById.set(profileRow.id, profileRow);
      }
    }

    const entries = rows
      .map((row) => {
        const profileRow = profilesById.get(row.user_id);
        return {
          result_id: row.result_id,
          user_id: row.user_id,
          username: profileRow?.username ?? (row.user_id === profile.user_id ? profile.username : "Player"),
          initials: profileRow?.initials ?? (row.user_id === profile.user_id ? profile.initials : "PL"),
          avatar_color: profileRow?.avatar_color ?? (row.user_id === profile.user_id ? profile.avatar_color : "#A8A294"),
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
  }, [auth.user?.id, profile.avatar_color, profile.initials, profile.user_id, profile.username, updateDailyDiagnostics, updateDiagnostics]);

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
    return rows.map((row, index) => ({
      rank: row.rank ?? index + 1,
      user_id: row.user_id,
      username: row.username ?? "Player",
      initials: row.initials ?? "PL",
      avatar_color: row.avatar_color ?? "#A8A294",
      total_score: row.total_score,
      puzzles_completed: row.puzzles_completed,
      best_score: row.best_score,
      total_time: row.total_time,
      latest_completed_at: row.latest_completed_at,
    }));
  }, [auth.user?.id, updateDiagnostics]);

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
    const { error } = await supabase.from("profiles").update({
      username: displayName,
      username_handle: username,
      display_name: displayName,
      initials: nextInitials,
      profile_setup_completed: true,
      updated_at: new Date().toISOString(),
    }).eq("id", auth.user.id);
    if (error) {
      const message = isUniqueViolation(error) ? "Username is already taken." : error.message;
      updateDiagnostics({ lastError: message });
      return { ok: false, error: message };
    }

    setProfile((current) => normalizeProfile({ ...current, username: displayName, username_handle: username, display_name: displayName, initials: nextInitials, profile_setup_completed: true }));
    await loadBackendProfile();
    return { ok: true };
  }, [auth.user, loadBackendProfile, updateDiagnostics]);

  const fetchFriends = useCallback(async (): Promise<FriendUser[]> => {
    if (!auth.user || !isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc("get_friends");
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return [];
    }
    return ((data ?? []) as FriendUser[]).map((row) => ({
      user_id: row.user_id,
      display_name: row.display_name ?? "Player",
      username_handle: row.username_handle ?? "",
      initials: row.initials ?? "PL",
      avatar_color: row.avatar_color ?? "#A8A294",
      created_at: row.created_at,
      relationship_status: "friends",
    }));
  }, [auth.user, updateDiagnostics]);

  const fetchPendingFriendRequests = useCallback(async (): Promise<FriendRequestEntry[]> => {
    if (!auth.user || !isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc("get_pending_friend_requests");
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return [];
    }
    return ((data ?? []) as FriendRequestEntry[]).map((row) => ({
      request_id: row.request_id,
      user_id: row.user_id,
      display_name: row.display_name ?? "Player",
      username_handle: row.username_handle ?? "",
      initials: row.initials ?? "PL",
      avatar_color: row.avatar_color ?? "#A8A294",
      created_at: row.created_at,
    }));
  }, [auth.user, updateDiagnostics]);

  const searchUsersByUsername = useCallback(async (query: string): Promise<FriendUser[]> => {
    if (!auth.user || !isSupabaseConfigured) return [];
    const normalized = query.trim().replace(/^@+/, "").toLowerCase();
    if (normalized.length < 2) return [];
    const { data, error } = await supabase.rpc("search_users_by_username", { query: normalized });
    if (error) {
      updateDiagnostics({ lastError: error.message });
      return [];
    }
    return ((data ?? []) as FriendUser[]).map((row) => ({
      user_id: row.user_id,
      display_name: row.display_name ?? "Player",
      username_handle: row.username_handle ?? "",
      initials: row.initials ?? "PL",
      avatar_color: row.avatar_color ?? "#A8A294",
      relationship_status: row.relationship_status ?? "none",
    }));
  }, [auth.user, updateDiagnostics]);

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

  const updateDisplayName = useCallback((username: string): SaveResult => {
    const trimmed = username.trim();
    if (trimmed.length === 0) return { ok: false, error: "Display name cannot be empty." };
    if (trimmed.length > 20) return { ok: false, error: "Display name must be 20 characters or fewer." };
    const next = { ...profile, username: trimmed, display_name: trimmed, initials: initialsFromName(trimmed) };
    persist(next);
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) void supabase.from("profiles").upsert({ id: auth.user.id, username: trimmed, display_name: trimmed, initials: next.initials, avatar_color: next.avatar_color, updated_at: new Date().toISOString() }).then(({ error: saveError }) => { if (saveError) updateDiagnostics({ lastError: saveError.message }); }).catch((saveError: unknown) => updateDiagnostics({ lastError: saveError instanceof Error ? saveError.message : "Unable to save display name." }));
    return { ok: true };
  }, [auth.isSignedIn, auth.user, persist, profile, updateDiagnostics]);

  const updateNotificationSettings = useCallback((notifications: ProfileSettings["notifications"]) => {
    persist({ ...profile, settings: { ...profile.settings, notifications } });
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) void supabase.from("user_settings").upsert({ user_id: auth.user.id, daily_reminder: notifications.dailyPuzzleReminder, streak_reminder: notifications.streakReminder, duel_results: notifications.duelResults, ranked_updates: notifications.rankedMatchUpdates, updated_at: new Date().toISOString() }).catch(() => {});
  }, [auth.isSignedIn, auth.user, persist, profile]);

  const updatePrivacySettings = useCallback((privacy: ProfileSettings["privacy"]) => {
    persist({ ...profile, settings: { ...profile.settings, privacy } });
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) void supabase.from("user_settings").upsert({ user_id: auth.user.id, public_profile: privacy.publicProfile, show_stats_publicly: privacy.showStatsPublicly, show_recent_results_publicly: privacy.showRecentResultsPublicly, allow_friend_challenges: privacy.allowFriendChallenges, updated_at: new Date().toISOString() }).catch(() => {});
  }, [auth.isSignedIn, auth.user, persist, profile]);

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

  const hasActiveSession = auth.isSignedIn ? activeSessions.some((s) => s.status === "in_progress") : activeGuestSessions.length > 0;
  const profileSetupRequired = auth.isSignedIn && isLoaded && (!profile.profile_setup_completed || !profile.username_handle);

  return useMemo(() => ({
    profile, isLoaded, loadError, lastUpdate,
    activeSessions: auth.isSignedIn ? activeSessions : activeGuestSessions.map(guestSessionToPuzzleSessionRow),
    diagnostics, hasActiveSession, profileSetupRequired,
    recordPuzzleResult, submitOfficialPuzzleResult, fetchDailyLeaderboard, fetchWeeklyLeaderboard, simulateResult, simulateRankedWin, simulateRankedLoss,
    fetchFriends, fetchPendingFriendRequests, searchUsersByUsername, sendFriendRequest, respondFriendRequest,
    resetLocalProfile, checkUsernameAvailable, completeProfileSetup, updateDisplayName, updateNotificationSettings, updatePrivacySettings,
    repairMissingProfileRows, repairCompletedSessions, testSupabaseRead, testSupabaseWrite, testDailyResultQuery, clearLastUpdate,
    upsertSession, startPuzzleSession, deleteSessionById, closeSessionForPuzzle, findSessionSnapshot, getInProgressClassicSession, getInProgressDailySession, getCompletedDailyResult,
  }), [
    activeGuestSessions, activeSessions, auth.isSignedIn,
    checkUsernameAvailable, clearLastUpdate, completeProfileSetup, diagnostics, hasActiveSession, isLoaded, lastUpdate, loadError, profile, profileSetupRequired,
    recordPuzzleResult, submitOfficialPuzzleResult, fetchDailyLeaderboard, fetchWeeklyLeaderboard,
    fetchFriends, fetchPendingFriendRequests, searchUsersByUsername, sendFriendRequest, respondFriendRequest,
    repairCompletedSessions, repairMissingProfileRows, resetLocalProfile,
    simulateRankedLoss, simulateRankedWin, simulateResult,
    testSupabaseRead, testSupabaseWrite, testDailyResultQuery,
    updateDisplayName, updateNotificationSettings, updatePrivacySettings,
    upsertSession, startPuzzleSession, deleteSessionById, closeSessionForPuzzle, findSessionSnapshot, getInProgressClassicSession, getInProgressDailySession, getCompletedDailyResult,
  ]);
});
