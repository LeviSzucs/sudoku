import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import type { PuzzleResult, SessionSnapshot } from "@/hooks/useSudokuGame";
import { BADGE_DEFINITIONS, applyPuzzleResult, createInitialPlayerProfile, createSimulatedResult, getRankFromRp, initialsFromName, normalizeProfile, type AchievementBadge, type BadgeCategory, type PlayerProfile, type ProfileSettings, type ProfileUpdateSummary, type RankOutcome, type RecentResult } from "@/lib/playerProfile";
import { isSupabaseConfigured, supabase, type GameResultRow, type PlayerStatsRow, type ProfileRow, type PuzzleSessionRow, type UserAchievementRow, type UserSettingsRow } from "@/lib/supabase";

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

interface RecordPuzzleResultOptions {
  sessionId?: string;
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
}

function profileFromRows(profileRow: ProfileRow, statsRow: PlayerStatsRow, settingsRow: UserSettingsRow, fallback: PlayerProfile): PlayerProfile {
  const [tier = "Bronze", division = "III"] = statsRow.rank_tier.split(" ");
  return normalizeProfile({
    ...fallback,
    user_id: profileRow.id,
    username: profileRow.username,
    initials: profileRow.initials,
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
  return { puzzle_id: row.puzzle_id ?? "unknown", mode: row.mode as RecentResult["mode"], difficulty: row.difficulty as RecentResult["difficulty"], completed: row.completed, elapsed_seconds: row.elapsed_seconds, mistakes: row.mistakes, hints_used: row.hints_used, undo_count: row.undo_count, move_count: 0, final_score: row.final_score, eligible_for_leaderboard: row.eligible_for_leaderboard, eligible_for_ranked: row.eligible_for_ranked, completed_at: row.completed_at, xp_earned: row.xp_earned, result_outcome: row.won === true ? "win" : row.won === false ? "loss" : undefined };
}

function achievementFromRow(row: UserAchievementRow): AchievementBadge | null {
  const meta = row.achievements;
  if (!meta) return null;
  return { badge_id: row.badge_id, name: meta.name, description: meta.description, category: meta.category as BadgeCategory, icon: meta.icon, progress_target: meta.progress_target, unlocked: row.unlocked, progress_current: row.progress_current, unlocked_at: row.unlocked_at };
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
  const [profile, setProfile] = useState<PlayerProfile>(() => createInitialPlayerProfile());
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<ProfileUpdateSummary | null>(null);
  const [activeSessions, setActiveSessions] = useState<PuzzleSessionRow[]>([]);
  const [activeGuestSessions, setActiveGuestSessions] = useState<GuestSessionEntry[]>([]);
  const [diagnostics, setDiagnostics] = useState<BackendDiagnostics>({ sessionStatus: "loading", userId: null, profileLoaded: false, statsLoaded: false, settingsLoaded: false, recentResultsCount: 0, activeSessionCount: 0, latestSessionStatus: null, latestResultPuzzleId: null, lastError: null, lastSessionSaveAttemptedAt: null, lastSessionSaveSucceeded: null, lastSessionSaveError: null });

  const updateDiagnostics = useCallback((patch: Partial<BackendDiagnostics>) => {
    setDiagnostics((current) => ({ ...current, sessionStatus: auth.mode, userId: auth.user?.id ?? null, ...patch }));
  }, [auth.mode, auth.user?.id]);

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
    const defaults = [
      supabase.from("profiles").upsert({ id: auth.user.id, username: name, initials: initialsFromName(name), avatar_color: profile.avatar_color || empty.avatar_color }, { onConflict: "id", ignoreDuplicates: true }),
      supabase.from("player_stats").upsert({ user_id: auth.user.id, total_mastery_xp: 0, account_level: 1, rank_points: 0, rank_tier: `${rank.tier} ${rank.division}`, current_streak: 0, longest_streak: 0, puzzles_completed: 0, flawless_puzzles: 0, total_mistakes: 0, total_hints_used: 0, total_undos_used: 0, duels_played: 0, duels_won: 0, ranked_played: 0, ranked_won: 0, best_easy_time: null, best_medium_time: null, best_hard_time: null, best_expert_time: null, best_master_time: null }, { onConflict: "user_id", ignoreDuplicates: true }),
      supabase.from("user_settings").upsert({ user_id: auth.user.id, daily_reminder: true, streak_reminder: true, duel_results: true, ranked_updates: false, public_profile: true, show_stats_publicly: true, show_recent_results_publicly: false, allow_friend_challenges: true }, { onConflict: "user_id", ignoreDuplicates: true }),
      supabase.from("user_achievements").upsert(BADGE_DEFINITIONS.map((badge) => ({ user_id: auth.user!.id, badge_id: badge.badge_id, unlocked: false, progress_current: 0, unlocked_at: null })), { onConflict: "user_id,badge_id", ignoreDuplicates: true }),
    ];
    const results = await Promise.all(defaults);
    const error = results.find((result) => result.error)?.error;
    if (error) {
      setLoadError(error.message);
      updateDiagnostics({ lastError: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [auth.user, profile.avatar_color, profile.username, updateDiagnostics]);

  const loadBackendProfile = useCallback(async (): Promise<void> => {
    if (!auth.user || !isSupabaseConfigured) return;
    setLoadError(null);
    const repair = await repairMissingProfileRows();
    if (!repair.ok) return;
    const empty = createInitialPlayerProfile(false);
    const [{ data: p, error: pError }, { data: s, error: sError }, { data: settings, error: settingsError }, { data: results, error: resultsError }, { data: achievements, error: achievementsError }, { data: sessions, error: sessionsError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
      supabase.from("player_stats").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("game_results").select("*").eq("user_id", auth.user.id).order("completed_at", { ascending: false }).limit(50),
      supabase.from("user_achievements").select("*, achievements(name, description, category, icon, progress_target)").eq("user_id", auth.user.id),
      supabase.from("puzzle_sessions").select("*").eq("user_id", auth.user.id).eq("status", "in_progress").order("updated_at", { ascending: false }),
    ]);
    const error = pError ?? sError ?? settingsError ?? resultsError ?? achievementsError ?? sessionsError;
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
    next.easy_completed = next.recent_results.filter((result) => result.difficulty === "Easy").length;
    next.medium_completed = next.recent_results.filter((result) => result.difficulty === "Medium").length;
    next.hard_completed = next.recent_results.filter((result) => result.difficulty === "Hard").length;
    next.expert_completed = next.recent_results.filter((result) => result.difficulty === "Expert").length;
    next.master_completed = next.recent_results.filter((result) => result.difficulty === "Master").length;
    const backendBadges = ((achievements ?? []) as UserAchievementRow[]).map(achievementFromRow).filter((badge): badge is AchievementBadge => badge !== null);
    if (backendBadges.length > 0) next.badges_unlocked = backendBadges;
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
    updateDiagnostics({ lastSessionSaveAttemptedAt: attemptedAt });

    // Build the local session row regardless of backend success
    const buildSessionRow = (sessionId: string): PuzzleSessionRow => ({
      session_id: sessionId,
      user_id: auth.user?.id ?? "",
      puzzle_id: snapshot.puzzle_id,
      mode: snapshot.mode,
      difficulty: snapshot.difficulty,
      board_state: snapshot.board_state,
      notes_state: snapshot.notes_state,
      elapsed_seconds: snapshot.elapsed_seconds,
      mistakes: snapshot.mistakes,
      hints_used: snapshot.hints_used,
      undo_count: snapshot.undo_count,
      move_history: snapshot.move_history,
      status: "in_progress" as const,
    });

    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      const sessionId = existingSessionId ?? generateUUID();
      const sessionRow = buildSessionRow(sessionId);

      // Always update local activeSessions first so Continue Puzzle works immediately
      setActiveSessions((prev) => {
        const filtered = prev.filter((s) => s.session_id !== sessionId && s.status === "in_progress");
        return [sessionRow, ...filtered];
      });

      try {
        // Mark all other active sessions as completed (single active session enforcement)
        void supabase.from("puzzle_sessions")
          .update({ status: "completed" })
          .eq("user_id", auth.user.id)
          .eq("status", "in_progress")
          .neq("session_id", sessionId)
          .then(() => {});

        // Check for existing completed result for this puzzle
        const { data: existingResult, error: resultLookupError } = await supabase
          .from("game_results")
          .select("result_id")
          .eq("user_id", auth.user.id)
          .eq("puzzle_id", snapshot.puzzle_id)
          .eq("mode", snapshot.mode)
          .eq("difficulty", snapshot.difficulty)
          .limit(1)
          .maybeSingle();

        if (resultLookupError) updateDiagnostics({ lastError: resultLookupError.message });

        if (existingResult) {
          await supabase.from("puzzle_sessions")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("user_id", auth.user.id)
            .eq("session_id", sessionId);
          setActiveSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
          updateDiagnostics({ lastSessionSaveSucceeded: true, lastSessionSaveError: null });
          return sessionId;
        }

        const { error } = await supabase.from("puzzle_sessions").upsert({
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
        });

        if (error) {
          updateDiagnostics({ lastError: error.message, lastSessionSaveSucceeded: false, lastSessionSaveError: error.message });
          // Local state already updated above, so Continue Puzzle still works.
          // Throw so caller knows backend save failed and can warn user.
          throw new Error(error.message);
        }

        updateDiagnostics({ lastSessionSaveSucceeded: true, lastSessionSaveError: null });
        return sessionId;
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
        .in("status", ["in_progress", "active"]);
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

  // ── Puzzle result recording ──────────────────────────────────────

  const recordPuzzleResult = useCallback((result: PuzzleResult, outcome?: RankOutcome, options?: RecordPuzzleResultOptions): ProfileUpdateSummary => {
    const summary = applyPuzzleResult(profile, result, outcome);
    persist(summary.updatedProfile);
    setLastUpdate(summary);
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) {
      const sessionId = options?.sessionId ?? result.session_id ?? null;
      const row = { result_id: `${auth.user.id}_${sessionId ?? result.puzzle_id}_${Date.now()}`, user_id: auth.user.id, session_id: sessionId, puzzle_id: result.puzzle_id, mode: result.mode, difficulty: result.difficulty, completed: result.completed, won: outcome === "win" ? true : outcome === "loss" ? false : null, elapsed_seconds: result.elapsed_seconds, mistakes: result.mistakes, hints_used: result.hints_used, undo_count: result.undo_count, final_score: result.final_score, xp_earned: summary.xpEarned, rp_change: summary.updatedProfile.rank_points - profile.rank_points, eligible_for_leaderboard: result.eligible_for_leaderboard, eligible_for_ranked: result.eligible_for_ranked, completed_at: result.completed_at };
      void (async () => {
        const { error: resultError } = await supabase.from("game_results").insert(row);
        if (resultError) throw resultError;
        await closeSessionForPuzzle(result.puzzle_id, sessionId ?? undefined);
        const { error: statsError } = await supabase.from("player_stats").upsert({ user_id: auth.user!.id, ...statsPayload(summary.updatedProfile) });
        if (statsError) throw statsError;
        await syncAchievements(summary.updatedProfile);
        await loadBackendProfile();
      })().catch((error: unknown) => updateDiagnostics({ lastError: error instanceof Error ? error.message : "Unable to save result." }));
    } else if (auth.isGuest) {
      void closeSessionForPuzzle(result.puzzle_id, options?.sessionId ?? result.session_id);
    }
    return summary;
  }, [auth.isSignedIn, auth.isGuest, auth.user, closeSessionForPuzzle, loadBackendProfile, persist, profile, syncAchievements, updateDiagnostics]);

  const updateDisplayName = useCallback((username: string): SaveResult => {
    const trimmed = username.trim();
    if (trimmed.length === 0) return { ok: false, error: "Display name cannot be empty." };
    if (trimmed.length > 20) return { ok: false, error: "Display name must be 20 characters or fewer." };
    const next = { ...profile, username: trimmed, initials: initialsFromName(trimmed) };
    persist(next);
    if (auth.isSignedIn && auth.user && isSupabaseConfigured) void supabase.from("profiles").upsert({ id: auth.user.id, username: trimmed, initials: next.initials, avatar_color: next.avatar_color, updated_at: new Date().toISOString() }).then(({ error: saveError }) => { if (saveError) updateDiagnostics({ lastError: saveError.message }); }).catch((saveError: unknown) => updateDiagnostics({ lastError: saveError instanceof Error ? saveError.message : "Unable to save display name." }));
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

  const simulateResult = useCallback((): ProfileUpdateSummary => recordPuzzleResult(createSimulatedResult()), [recordPuzzleResult]);
  const simulateRankedWin = useCallback((): ProfileUpdateSummary => recordPuzzleResult(createSimulatedResult("ranked", "win"), "win"), [recordPuzzleResult]);
  const simulateRankedLoss = useCallback((): ProfileUpdateSummary => recordPuzzleResult(createSimulatedResult("ranked", "loss"), "loss"), [recordPuzzleResult]);
  const resetLocalProfile = useCallback(() => { const next = createInitialPlayerProfile(!auth.isSignedIn); persist(next); setLastUpdate(null); }, [auth.isSignedIn, persist]);
  const clearLastUpdate = useCallback(() => setLastUpdate(null), []);

  const repairCompletedSessions = useCallback(async (): Promise<SaveResult> => {
    if (!auth.user || !isSupabaseConfigured) return { ok: false, error: "Repair requires a signed-in user." };
    const { data: sessions, error: sessionsError } = await supabase.from("puzzle_sessions").select("session_id,puzzle_id,mode,difficulty,status").eq("user_id", auth.user.id).in("status", ["active", "in_progress"]);
    if (sessionsError) return { ok: false, error: sessionsError.message };
    const inProgress = (sessions ?? []) as Pick<PuzzleSessionRow, "session_id" | "puzzle_id" | "mode" | "difficulty" | "status">[];
    const activeIds = inProgress.filter((session) => session.status === "active").map((session) => session.session_id);
    if (activeIds.length > 0) {
      const { error: normalizeError } = await supabase.from("puzzle_sessions").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("user_id", auth.user.id).in("session_id", activeIds);
      if (normalizeError) return { ok: false, error: normalizeError.message };
    }
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

  return useMemo(() => ({
    profile, isLoaded, loadError, lastUpdate,
    activeSessions: auth.isSignedIn ? activeSessions : activeGuestSessions.map(guestSessionToPuzzleSessionRow),
    diagnostics, hasActiveSession,
    recordPuzzleResult, simulateResult, simulateRankedWin, simulateRankedLoss,
    resetLocalProfile, updateDisplayName, updateNotificationSettings, updatePrivacySettings,
    repairMissingProfileRows, repairCompletedSessions, testSupabaseRead, testSupabaseWrite, clearLastUpdate,
    upsertSession, deleteSessionById, closeSessionForPuzzle, findSessionSnapshot,
  }), [
    activeGuestSessions, activeSessions, auth.isSignedIn,
    clearLastUpdate, diagnostics, hasActiveSession, isLoaded, lastUpdate, loadError, profile,
    recordPuzzleResult, repairCompletedSessions, repairMissingProfileRows, resetLocalProfile,
    simulateRankedLoss, simulateRankedWin, simulateResult,
    testSupabaseRead, testSupabaseWrite,
    updateDisplayName, updateNotificationSettings, updatePrivacySettings,
    upsertSession, deleteSessionById, closeSessionForPuzzle, findSessionSnapshot,
  ]);
});
