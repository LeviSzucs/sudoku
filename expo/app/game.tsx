import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { ChevronLeft, Pause, Play as PlayIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Modal, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CompletionModal from "@/components/CompletionModal";
import GameControls from "@/components/GameControls";
import GameStatsBar from "@/components/GameStatsBar";
import NumberPad from "@/components/NumberPad";
import PauseModal from "@/components/PauseModal";
import SudokuGrid from "@/components/SudokuGrid";
import { C } from "@/constants/colors";
import type { Difficulty } from "@/constants/mockData";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import useSudokuGame, { type GameMode, type PuzzleResult, type SessionSnapshot } from "@/hooks/useSudokuGame";
import { getDailyDateKey } from "@/lib/daily";
import { logDevDiagnostic, measureAsync } from "@/lib/performanceDiagnostics";
import type { ProfileUpdateSummary } from "@/lib/playerProfile";
import type { ScoreBreakdown } from "@/lib/scoring";
import { fetchClassicPuzzle, fetchDailyPuzzle, fetchPuzzleById, formatTime, makeEmptyNotes, type RawPuzzleData } from "@/lib/sudoku";

const MODE_LABEL: Record<GameMode, string> = {
  daily: "Daily",
  classic: "Classic",
  daily_duel: "Daily Duel",
  duel: "Daily Duel",
  friend_challenge: "Friend Challenge",
  ranked: "Ranked",
  ranked_duel: "Ranked Duel",
};

/** Auto-save interval in seconds */
const AUTO_SAVE_INTERVAL_MS = 10_000;
/** Minimum interval between consecutive saves to avoid hammering Supabase */
const MIN_SAVE_INTERVAL_MS = 2_000;

interface ChallengeOutcomeCopy {
  title: string;
  subtitle: string;
}

function challengeOutcomeCopy(entry: { status: string; winner_user_id: string | null; friend_display_name: string }, currentUserId?: string | null): ChallengeOutcomeCopy {
  if (entry.status === "completed") {
    if (!entry.winner_user_id) return { title: "Draw", subtitle: "Challenge complete" };
    return entry.winner_user_id === currentUserId
      ? { title: "You won", subtitle: "Challenge complete" }
      : { title: "You lost", subtitle: "Challenge complete" };
  }

  return { title: "You finished", subtitle: `Waiting for ${entry.friend_display_name}` };
}

function rankedOutcomeCopy(entry: { status: string; winner_user_id: string | null; opponent_display_name?: string | null; rp_change?: number | null }, currentUserId?: string | null): ChallengeOutcomeCopy {
  if (entry.status === "completed") {
    const rpText = typeof entry.rp_change === "number" ? ` · ${entry.rp_change >= 0 ? "+" : ""}${entry.rp_change} RP` : "";
    if (!entry.winner_user_id) return { title: "Draw", subtitle: `Ranked Duel complete${rpText}` };
    return entry.winner_user_id === currentUserId
      ? { title: "You won", subtitle: `Ranked Duel complete${rpText}` }
      : { title: "You lost", subtitle: `Ranked Duel complete${rpText}` };
  }

  return { title: "You finished", subtitle: `Waiting for ${entry.opponent_display_name ?? "opponent"}` };
}

function completionPrimaryLabel(mode: GameMode): string {
  if (mode === "classic") return "Next puzzle";
  if (mode === "daily") return "Back to Play";
  if (mode === "daily_duel" || mode === "duel" || mode === "friend_challenge" || mode === "ranked_duel" || mode === "ranked") return "Back to Versus";
  return "Back to Play";
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const params = useLocalSearchParams<{
    mode?: string;
    difficulty?: string;
    puzzleId?: string;
    puzzle_id?: string;
    sessionId?: string;
    session_id?: string;
    excludePuzzleId?: string;
  }>();
  const paramsSignature = JSON.stringify(params);
  const routeMode = (params.mode as GameMode) ?? "daily";
  const mode = routeMode === "duel" ? "daily_duel" : routeMode;
  const difficulty = ((params.difficulty as Difficulty) ?? "Medium") as Difficulty;
  const sessionIdParam = (params.session_id ?? params.sessionId) as string | undefined;
  const routePuzzleId = (params.puzzle_id ?? params.puzzleId) as string | undefined;
  const excludePuzzleId = params.excludePuzzleId as string | undefined;

  const auth = useAuth();
  const { findSessionSnapshot, upsertSession, startPuzzleSession, deleteSessionById, closeSessionForPuzzle } = usePlayerProfile();
  const effectiveMode: GameMode = auth.isGuest && (mode === "ranked" || mode === "ranked_duel") ? "classic" : mode;

  // ── Resolve restore snapshot synchronously ────────────────────────
  const restoreSessionIdRef = useRef<string | undefined>(undefined);
  const restoreSnapshotRef = useRef<SessionSnapshot | undefined>(undefined);
  const restoreSnapshot = useMemo<SessionSnapshot | undefined>(() => {
    if (!sessionIdParam) {
      restoreSessionIdRef.current = undefined;
      restoreSnapshotRef.current = undefined;
      return undefined;
    }
    if (restoreSessionIdRef.current !== sessionIdParam || !restoreSnapshotRef.current) {
      restoreSessionIdRef.current = sessionIdParam;
      restoreSnapshotRef.current = findSessionSnapshot(sessionIdParam) ?? undefined;
    }
    return restoreSnapshotRef.current;
  }, [sessionIdParam, findSessionSnapshot]);
  const restorePuzzleId = restoreSnapshot?.puzzle_id;
  const restoreDifficulty = restoreSnapshot?.difficulty;

  // ── Fetch puzzle data from backend ────────────────────────────────
  const [puzzleData, setPuzzleData] = useState<RawPuzzleData | undefined>(undefined);
  const [puzzleLoadError, setPuzzleLoadError] = useState<string | null>(null);
  const [isLoadingPuzzle, setIsLoadingPuzzle] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setIsLoadingPuzzle(true);
      setPuzzleLoadError(null);
      try {
        if (auth.isSignedIn && !sessionIdParam) {
          throw new Error("Puzzle session missing. Return to Play and try again.");
        }
        const today = getDailyDateKey();
        if (sessionIdParam) {
          const sessionPuzzleId = restorePuzzleId ?? routePuzzleId;
          const sessionDifficulty = restoreDifficulty ?? difficulty;
          if (!sessionPuzzleId) {
            throw new Error("Saved puzzle could not be found.");
          }
          const data = await measureAsync("puzzle fetch restore", () => fetchPuzzleById(sessionPuzzleId, sessionDifficulty));
          if (!cancelled) setPuzzleData(data);
        } else if (effectiveMode === "daily") {
          const data = await measureAsync("puzzle fetch daily", () => fetchDailyPuzzle(today, "daily"));
          if (!cancelled) setPuzzleData(data);
        } else if (effectiveMode === "daily_duel" || effectiveMode === "duel") {
          const data = await measureAsync("puzzle fetch daily_duel", () => fetchDailyPuzzle(today, "daily_duel"));
          if (!cancelled) setPuzzleData(data);
        } else {
          // classic, friend challenge, or ranked without a restore session
          const data = await measureAsync("puzzle fetch classic", () => fetchClassicPuzzle(auth.user?.id ?? null, difficulty, effectiveMode === "classic" ? excludePuzzleId : undefined));
          if (!cancelled) setPuzzleData(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Puzzle could not be loaded.";
          setPuzzleLoadError(msg);
        }
      } finally {
        if (!cancelled) setIsLoadingPuzzle(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [effectiveMode, difficulty, auth.isSignedIn, auth.user?.id, sessionIdParam, restorePuzzleId, restoreDifficulty, routePuzzleId, excludePuzzleId]);

  const game = useSudokuGame({
    mode: effectiveMode,
    difficulty,
    puzzleId: routePuzzleId,
    restoreSnapshot,
    puzzleData,
  });
  const { recordPuzzleResult, submitOfficialPuzzleResult, submitFailedPuzzleResult, fetchFriendChallenges, fetchRankedDuel } = usePlayerProfile();
  const [completionSummary, setCompletionSummary] = useState<ProfileUpdateSummary | null>(null);
  const [officialScore, setOfficialScore] = useState<number | null>(null);
  const [officialScoreBreakdown, setOfficialScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [officialLeaderboardEligible, setOfficialLeaderboardEligible] = useState<boolean | null>(null);
  const [officialSubmitError, setOfficialSubmitError] = useState<string | null>(null);
  const [challengeOutcome, setChallengeOutcome] = useState<ChallengeOutcomeCopy | null>(null);
  const [processedResultId, setProcessedResultId] = useState<string | null>(null);
  const [processedFailedSessionId, setProcessedFailedSessionId] = useState<string | null>(null);
  const [isSubmittingResult, setIsSubmittingResult] = useState<boolean>(false);
  const [isSubmittingFailedResult, setIsSubmittingFailedResult] = useState<boolean>(false);
  const [leaveOpen, setLeaveOpen] = useState<boolean>(false);
  const [rankedHintMessage, setRankedHintMessage] = useState<boolean>(false);
  const navIsFocused = useIsFocused();
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const renderCountRef = useRef<number>(0);
  renderCountRef.current += 1;

  // Track the current session ID for updates
  const currentSessionIdRef = useRef<string | null>(sessionIdParam ?? null);
  const [hasSavedOnce, setHasSavedOnce] = useState<boolean>(!!sessionIdParam);
  const isSubmittingResultRef = useRef<boolean>(false);
  const isCompletedRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const pendingSaveRef = useRef<boolean>(false);
  const saveErrorRef = useRef<string | null>(null);
  const initialSessionCreatedForRef = useRef<string | null>(sessionIdParam ?? null);
  const autosaveCountRef = useRef<number>(0);

  useEffect(() => {
    logDevDiagnostic("GameScreen mount", {
      sessionId: sessionIdParam ?? null,
      routeParams: paramsSignature,
    });
    return () => {
      logDevDiagnostic("GameScreen unmount", {
        sessionId: sessionIdParam ?? null,
        routeParams: paramsSignature,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logDevDiagnostic("GameScreen render", {
      count: renderCountRef.current,
      sessionId: sessionIdParam ?? null,
      puzzleId: game.puzzleId,
      restorePuzzleId: restorePuzzleId ?? null,
      loading: isLoadingPuzzle,
    });
  });

  useEffect(() => {
    logDevDiagnostic("route params changed", {
      routeParams: paramsSignature,
    });
  }, [paramsSignature]);

  useEffect(() => {
    if (!puzzleLoadError) return;
    logDevDiagnostic("game puzzle load error", {
      sessionId: sessionIdParam ?? null,
      puzzleId: routePuzzleId ?? restorePuzzleId ?? null,
      mode: effectiveMode,
      difficulty,
      error: puzzleLoadError,
    });
    console.warn("[Game] Puzzle load error; staying on error screen", puzzleLoadError);
  }, [difficulty, effectiveMode, puzzleLoadError, restorePuzzleId, routePuzzleId, sessionIdParam]);

  // ── Stable refs for game callbacks (avoids re-render loops) ──────
  const getSnapshotRef = useRef(game.getSessionSnapshot);
  getSnapshotRef.current = game.getSessionSnapshot;
  const clearTransientUiRef = useRef(game.clearTransientUi);
  clearTransientUiRef.current = game.clearTransientUi;
  // Ref for the latest game state for useFocusEffect cleanup
  const gameStateRef = useRef({ paused: false, completed: false, gameOver: false });
  gameStateRef.current = { paused: game.paused, completed: game.completed, gameOver: game.gameOver };
  const gameIdentityRef = useRef({ puzzleId: game.puzzleId });
  gameIdentityRef.current = { puzzleId: game.puzzleId };
  const saveSessionRef = useRef<(force?: boolean) => Promise<boolean>>(async () => false);

  useEffect(() => {
    isSubmittingResultRef.current = isSubmittingResult;
  }, [isSubmittingResult]);

  useEffect(() => {
    isCompletedRef.current = game.completed || game.gameOver;
  }, [game.completed, game.gameOver]);

  const cancelPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // ── Stable saveSession — background only; never reactivates completed games ─

  const saveSession = useCallback(async (force = false): Promise<boolean> => {
    if (!force && (isSubmittingResultRef.current || isCompletedRef.current)) return false;
    const snapshot = getSnapshotRef.current();
    if (!snapshot.puzzle_id) return false;

    // Rate-limit saves: skip if saved recently and not forced
    const now = Date.now();
    if (!force && now - lastSaveTimeRef.current < MIN_SAVE_INTERVAL_MS) return true;

    pendingSaveRef.current = true;
    try {
      autosaveCountRef.current += 1;
      logDevDiagnostic("session autosave", {
        count: autosaveCountRef.current,
        force,
        sessionId: currentSessionIdRef.current,
        puzzleId: snapshot.puzzle_id,
      });
      const sid = await measureAsync("session save duration", () => upsertSession(snapshot, currentSessionIdRef.current ?? undefined));
      if (!force && (isSubmittingResultRef.current || isCompletedRef.current)) {
        pendingSaveRef.current = false;
        return false;
      }
      currentSessionIdRef.current = sid;
      lastSaveTimeRef.current = Date.now();
      saveErrorRef.current = null;
      setHasSavedOnce(true);
      pendingSaveRef.current = false;
      return true;
    } catch (err: unknown) {
      saveErrorRef.current = err instanceof Error ? err.message : "Save failed";
      pendingSaveRef.current = false;
      return false;
    }
  }, [upsertSession]);

  useEffect(() => {
    saveSessionRef.current = saveSession;
  }, [saveSession]);

  const scheduleSaveSession = useCallback((delayMs = 500) => {
    if (isSubmittingResultRef.current || isCompletedRef.current) return;
    cancelPendingSave();
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      void saveSession();
    }, delayMs);
  }, [cancelPendingSave, saveSession]);

  // ── IMMEDIATE session creation when puzzle starts ────────────────

  useEffect(() => {
    if (sessionIdParam || isLoadingPuzzle || game.puzzleId === "unknown" || game.paused || game.completed || game.gameOver) return;
    if (initialSessionCreatedForRef.current === game.puzzleId) return;
    initialSessionCreatedForRef.current = game.puzzleId;
    void saveSession(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdParam, isLoadingPuzzle, game.puzzleId, game.paused, game.completed, game.gameOver]);

  // ── Auto-save effect (every AUTO_SAVE_INTERVAL_MS while playing) ─

  useEffect(() => {
    if (game.paused || game.completed || game.gameOver) return;
    const id = setInterval(() => {
      void saveSession();
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(id);
    // saveSession is stable (only depends on upsertSession)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.paused, game.completed, game.gameOver]);

  // ── Save on state changes (debounced) ────────────────────────────

  const lastBoardSnapshot = useRef<string>("");
  useEffect(() => {
    if (game.paused || game.completed || game.gameOver) return;
    const currentSnapshot = JSON.stringify(game.board);
    if (currentSnapshot !== lastBoardSnapshot.current) {
      lastBoardSnapshot.current = currentSnapshot;
      // Schedule save with short debounce on first change, longer on subsequent
      const delay = !hasSavedOnce ? 100 : 500;
      scheduleSaveSession(delay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.board, game.paused, game.completed, game.gameOver, hasSavedOnce, scheduleSaveSession]);

  // Save detailed progress changes in the background without blocking gameplay
  useEffect(() => {
    if (game.paused || game.completed || game.gameOver || isSubmittingResult) return;
    if (!hasSavedOnce) return;
    scheduleSaveSession(500);
  }, [game.notes, game.mistakes, game.hintsUsed, game.undoCount, game.paused, game.completed, game.gameOver, hasSavedOnce, isSubmittingResult, scheduleSaveSession]);

  // ── AppState listener: save when app goes to background ──────────

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        if (!game.paused && !game.completed && !game.gameOver) {
          void saveSession(true);
        }
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.paused, game.completed, game.gameOver]);

  // ── Save on pause ────────────────────────────────────────────────

  useEffect(() => {
    if (game.paused && !game.completed && !game.gameOver) {
      void saveSession(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.paused, game.completed, game.gameOver]);

  // ── Save on screen blur (useFocusEffect) ─────────────────────────

  useFocusEffect(
    useCallback(() => {
      logDevDiagnostic("GameScreen focus setup", {
        sessionId: currentSessionIdRef.current,
        puzzleId: gameIdentityRef.current.puzzleId,
      });
      setIsFocused(true);
      return () => {
        logDevDiagnostic("GameScreen focus cleanup", {
          sessionId: currentSessionIdRef.current,
          puzzleId: gameIdentityRef.current.puzzleId,
        });
        setIsFocused(false);
        setLeaveOpen(false);
        const state = gameStateRef.current;
        if (!state.paused && !state.completed && !state.gameOver) {
          void saveSessionRef.current(true);
        }
        clearTransientUiRef.current();
      };
    }, [])
  );

  const closeAllAndBack = useCallback(() => {
    logDevDiagnostic("game navigation", {
      reason: "leave_confirmed",
      sessionId: currentSessionIdRef.current,
      puzzleId: gameIdentityRef.current.puzzleId,
      target: "/(tabs)",
    });
    setLeaveOpen(false);
    setIsFocused(false);
    clearTransientUiRef.current();
    router.replace("/(tabs)");
  }, [router]);

  const onBackPress = useCallback(() => {
    if (game.completed || game.gameOver) {
      router.back();
      return;
    }
    setLeaveOpen(true);
  }, [game.completed, game.gameOver, router]);

  // ── Leave handler: navigate immediately and force-save in background ─────

  const isLeaving = false;
  const handleLeave = useCallback(() => {
    if (!game.completed && !game.gameOver) {
      cancelPendingSave();
      void saveSession(true).then((saved) => {
        if (!saved && !isSubmittingResultRef.current && !isCompletedRef.current) {
          console.warn("[Game] Force-save failed on leave, progress may be lost");
        }
      });
    }
    closeAllAndBack();
  }, [cancelPendingSave, game.completed, game.gameOver, saveSession, closeAllAndBack]);

  const reserved = 50 + 58 + 60 + 168 + 40 + insets.top + Math.max(insets.bottom, 12);
  const boardSize = Math.max(
    224,
    Math.min(width - 16, Math.floor(height - reserved))
  );

  const dateLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, []);

  const selectedValue = game.selected ? game.board[game.selected.r][game.selected.c] : 0;
  const completionOfficialStatus: "guest" | "pending" | "saved" | "failed" = auth.isSignedIn
    ? isSubmittingResult
      ? "pending"
      : completionSummary
      ? "saved"
      : officialSubmitError
      ? "failed"
      : "pending"
    : "guest";
  const failedAttemptIsFinal = auth.isSignedIn && (effectiveMode === "daily" || effectiveMode === "daily_duel" || effectiveMode === "friend_challenge" || effectiveMode === "ranked_duel");
  const failedAttemptStatusText = failedAttemptIsFinal
    ? isSubmittingFailedResult
      ? "Saving this final attempt..."
      : officialSubmitError
      ? officialSubmitError
      : challengeOutcome
      ? `${challengeOutcome.title}. ${challengeOutcome.subtitle}.`
      : "This attempt has been recorded."
    : undefined;

  useEffect(() => {
    if (!game.result || processedResultId?.startsWith(`${game.result.puzzle_id}:`) || isSubmittingResult) return;
    setIsSubmittingResult(true);
    setOfficialScore(null);
    setOfficialScoreBreakdown(null);
    setOfficialLeaderboardEligible(null);
    setOfficialSubmitError(null);
    setChallengeOutcome(null);
    const outcome = effectiveMode === "duel" || effectiveMode === "ranked" || effectiveMode === "ranked_duel" ? "win" : undefined;
    cancelPendingSave();
    isSubmittingResultRef.current = true;
    isCompletedRef.current = true;
    logDevDiagnostic("completion session state", {
      authUserId: auth.user?.id ?? null,
      localSessionId: currentSessionIdRef.current,
      routeSessionId: sessionIdParam ?? null,
      puzzleId: game.result.puzzle_id,
      mode: game.result.mode,
      difficulty: game.result.difficulty,
    });
    setProcessedResultId(`${game.result.puzzle_id}:${currentSessionIdRef.current ?? "pending-session"}`);
    if (auth.isSignedIn) {
      let completedSessionId: string | undefined;
      void saveSession(true)
        .then((saved) => {
          completedSessionId = currentSessionIdRef.current ?? undefined;
          if (!saved || !completedSessionId) {
            throw new Error("Could not save official result. Missing puzzle session.");
          }
          const resultWithSession = { ...game.result, session_id: completedSessionId };
          setProcessedResultId(`${game.result.puzzle_id}:${completedSessionId}`);
          logDevDiagnostic("official completion handoff", {
            authUserId: auth.user?.id ?? null,
            activeSessionId: completedSessionId,
            puzzleId: game.result?.puzzle_id,
            mode: game.result?.mode,
            difficulty: game.result?.difficulty,
          });
          return submitOfficialPuzzleResult(resultWithSession, game.board, { sessionId: completedSessionId });
        })
        .then(async (summary) => {
          setCompletionSummary(summary);
          const officialResult = summary.updatedProfile.recent_results[0];
          setOfficialScore(officialResult?.final_score ?? null);
          setOfficialScoreBreakdown(officialResult?.score_breakdown ?? game.result?.score_breakdown ?? null);
          setOfficialLeaderboardEligible(officialResult?.eligible_for_leaderboard ?? false);
          if (effectiveMode === "friend_challenge" && completedSessionId) {
            const challenges = await fetchFriendChallenges();
            const challenge = challenges.find((entry) =>
              entry.current_user_session_id === completedSessionId ||
              entry.challenger_session_id === completedSessionId ||
              entry.challenged_session_id === completedSessionId
            );
            if (challenge) setChallengeOutcome(challengeOutcomeCopy(challenge, auth.user?.id ?? null));
          }
          if (effectiveMode === "ranked_duel") {
            const rankedDuel = await fetchRankedDuel(true);
            if (rankedDuel) setChallengeOutcome(rankedOutcomeCopy(rankedDuel, auth.user?.id ?? null));
          }
          currentSessionIdRef.current = null;
          setHasSavedOnce(false);
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Could not save official result. Try again.";
          setOfficialSubmitError(message);
          setOfficialLeaderboardEligible(false);
        })
        .finally(() => {
          setIsSubmittingResult(false);
        });
      return;
    }

    const completedSessionId = currentSessionIdRef.current ?? undefined;
    const resultWithSession = { ...game.result, session_id: completedSessionId };
    const summary = recordPuzzleResult(resultWithSession, outcome, { sessionId: completedSessionId });
    setCompletionSummary(summary);
    setOfficialScore(summary.updatedProfile.recent_results[0]?.final_score ?? null);
    setOfficialScoreBreakdown(summary.updatedProfile.recent_results[0]?.score_breakdown ?? game.result.score_breakdown ?? null);
    setOfficialLeaderboardEligible(summary.updatedProfile.recent_results[0]?.eligible_for_leaderboard ?? false);
    void closeSessionForPuzzle(game.result.puzzle_id, completedSessionId).finally(() => {
      currentSessionIdRef.current = null;
      setHasSavedOnce(false);
      setIsSubmittingResult(false);
    });
  }, [auth.isSignedIn, auth.user?.id, cancelPendingSave, closeSessionForPuzzle, effectiveMode, fetchFriendChallenges, fetchRankedDuel, game.board, game.result, isSubmittingResult, processedResultId, recordPuzzleResult, saveSession, submitOfficialPuzzleResult]);

  useEffect(() => {
    const finalizesFailedAttempt = auth.isSignedIn && (effectiveMode === "daily" || effectiveMode === "daily_duel" || effectiveMode === "friend_challenge" || effectiveMode === "ranked_duel");
    const failedSessionId = currentSessionIdRef.current;
    if (!game.gameOver || game.completed || !finalizesFailedAttempt || isSubmittingFailedResult || !failedSessionId || processedFailedSessionId === failedSessionId) return;

    setProcessedFailedSessionId(failedSessionId);
    setIsSubmittingFailedResult(true);
    setOfficialScore(0);
    setOfficialScoreBreakdown(null);
    setOfficialLeaderboardEligible(false);
    setOfficialSubmitError(null);
    setChallengeOutcome(null);
    cancelPendingSave();
    isSubmittingResultRef.current = true;
    isCompletedRef.current = true;

    const snapshot = getSnapshotRef.current();
    const failedResult: PuzzleResult = {
      session_id: failedSessionId,
      puzzle_id: snapshot.puzzle_id || game.puzzleId,
      mode: effectiveMode,
      difficulty: game.difficulty,
      completed: true,
      elapsed_seconds: Math.max(1, game.seconds),
      mistakes: game.mistakes,
      hints_used: game.hintsUsed,
      undo_count: game.undoCount,
      move_count: snapshot.move_history.length,
      final_score: 0,
      eligible_for_leaderboard: false,
      eligible_for_ranked: effectiveMode === "ranked_duel",
      completed_at: new Date().toISOString(),
    };

    logDevDiagnostic("failed attempt handoff", {
      authUserId: auth.user?.id ?? null,
      activeSessionId: failedSessionId,
      puzzleId: failedResult.puzzle_id,
      mode: failedResult.mode,
      difficulty: failedResult.difficulty,
      mistakes: failedResult.mistakes,
    });

    void saveSession(true)
      .then((saved) => {
        if (!saved) throw new Error("Could not save failed attempt. Missing puzzle session.");
        return submitFailedPuzzleResult(failedResult, { sessionId: failedSessionId });
      })
      .then(async (summary) => {
        setCompletionSummary(summary);
        const officialResult = summary.updatedProfile.recent_results[0];
        setOfficialScore(officialResult?.final_score ?? 0);
        setOfficialScoreBreakdown(null);
        setOfficialLeaderboardEligible(officialResult?.eligible_for_leaderboard ?? false);
        if (effectiveMode === "friend_challenge") {
          const challenges = await fetchFriendChallenges();
          const challenge = challenges.find((entry) =>
            entry.current_user_session_id === failedSessionId ||
            entry.challenger_session_id === failedSessionId ||
            entry.challenged_session_id === failedSessionId
          );
          if (challenge) setChallengeOutcome(challengeOutcomeCopy(challenge, auth.user?.id ?? null));
        }
        if (effectiveMode === "ranked_duel") {
          const rankedDuel = await fetchRankedDuel(true);
          if (rankedDuel) setChallengeOutcome(rankedOutcomeCopy(rankedDuel, auth.user?.id ?? null));
        }
        currentSessionIdRef.current = null;
        setHasSavedOnce(false);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not save failed attempt. Try again.";
        setOfficialSubmitError(message);
        setOfficialLeaderboardEligible(false);
      })
      .finally(() => {
        setIsSubmittingFailedResult(false);
      });
  }, [auth.isSignedIn, auth.user?.id, cancelPendingSave, effectiveMode, fetchFriendChallenges, fetchRankedDuel, game.completed, game.difficulty, game.gameOver, game.hintsUsed, game.mistakes, game.puzzleId, game.seconds, game.undoCount, isSubmittingFailedResult, processedFailedSessionId, saveSession, submitFailedPuzzleResult]);

  const cleanupCompletedSession = useCallback(() => {
    cancelPendingSave();
    isSubmittingResultRef.current = true;
    isCompletedRef.current = true;
    if (game.result && !auth.isSignedIn) {
      void closeSessionForPuzzle(game.result.puzzle_id, currentSessionIdRef.current ?? undefined);
    }
    currentSessionIdRef.current = null;
    setHasSavedOnce(false);
    clearTransientUiRef.current();
  }, [auth.isSignedIn, cancelPendingSave, closeSessionForPuzzle, game.result]);

  const handleCompletionNext = useCallback(() => {
    const completedPuzzleId = game.result?.puzzle_id ?? game.puzzleId;
    cleanupCompletedSession();
    setCompletionSummary(null);
    setOfficialScore(null);
    setOfficialScoreBreakdown(null);
    setOfficialLeaderboardEligible(null);
    setOfficialSubmitError(null);
    setChallengeOutcome(null);
    setProcessedResultId(null);
    setProcessedFailedSessionId(null);
    if (effectiveMode === "classic") {
      if (auth.isSignedIn) {
        void (async () => {
          try {
            const puzzle = await fetchClassicPuzzle(auth.user?.id ?? null, game.difficulty, completedPuzzleId);
            const session = await startPuzzleSession({
              puzzleId: puzzle.puzzle_id,
              mode: "classic",
              difficulty: puzzle.difficulty,
              initialBoardState: puzzle.givens.map((row) => [...row]),
              initialNotesState: makeEmptyNotes(),
            });
            router.replace({
              pathname: "/game",
              params: {
                mode: "classic",
                difficulty: puzzle.difficulty,
                sessionId: session.session_id,
                session_id: session.session_id,
                puzzleId: puzzle.puzzle_id,
                puzzle_id: puzzle.puzzle_id,
                ...(completedPuzzleId ? { excludePuzzleId: completedPuzzleId } : {}),
              },
            });
          } catch (error: unknown) {
            logDevDiagnostic("puzzle session create result", {
              authUserId: auth.user?.id ?? null,
              mode: "classic",
              difficulty: game.difficulty,
              sessionCreateSuccess: false,
              supabaseError: error instanceof Error ? error.message : "Unknown Supabase error",
            });
            Alert.alert("Could not start puzzle", "Please try again.");
            router.replace("/(tabs)/play");
          }
        })();
        return;
      }
      router.replace({
        pathname: "/game",
        params: {
          mode: "classic",
          difficulty: game.difficulty,
          ...(completedPuzzleId ? { excludePuzzleId: completedPuzzleId } : {}),
        },
      });
      return;
    }
    if (effectiveMode === "ranked_duel" || effectiveMode === "ranked" || effectiveMode === "daily_duel" || effectiveMode === "duel" || effectiveMode === "friend_challenge") {
      router.replace("/(tabs)/versus");
      return;
    }
    router.replace("/(tabs)/play");
  }, [auth.isSignedIn, auth.user?.id, cleanupCompletedSession, effectiveMode, game.difficulty, game.puzzleId, game.result?.puzzle_id, router, startPuzzleSession]);

  const handleShareResult = useCallback(() => {
    const text = `${MODE_LABEL[effectiveMode]} ${game.difficulty}: ${formatTime(game.seconds)}, ${game.mistakes} mistakes, ${game.score.toLocaleString()} score.`;
    void Share.share({ message: text }).catch(() => {
      Alert.alert("Share result", "Sharing is unavailable on this device.");
    });
  }, [effectiveMode, game.difficulty, game.mistakes, game.score, game.seconds]);

  useEffect(() => {
    return () => cancelPendingSave();
  }, [cancelPendingSave]);

  const handleHint = useCallback(() => {
    if (!game.hintAllowed && (effectiveMode === "ranked" || effectiveMode === "ranked_duel")) {
      setRankedHintMessage(true);
      setTimeout(() => setRankedHintMessage(false), 1800);
      return;
    }
    game.hint();
  }, [effectiveMode, game.hintAllowed, game.hint]);

  if (!isFocused && !navIsFocused) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  // ── Puzzle loading state ──────────────────────────────────────────
  if (isLoadingPuzzle) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink, marginBottom: 8 }}>Loading puzzle…</Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>Fetching the best puzzle for you</Text>
      </View>
    );
  }

  // ── Puzzle load error ─────────────────────────────────────────────
  if (puzzleLoadError) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.danger, marginBottom: 8 }}>Puzzle could not be loaded</Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 20 }}>{puzzleLoadError}</Text>
        <Pressable
          style={{ backgroundColor: C.ink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: "#FBF8F2", fontWeight: "700", fontSize: 14 }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <Pressable hitSlop={10} onPress={onBackPress} style={styles.topBtn}>
          <ChevronLeft color={C.ink} size={26} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.title}>
            {MODE_LABEL[effectiveMode]} · {game.difficulty}
          </Text>
          <Text style={styles.dateLabel}>{dateLabel.toUpperCase()}</Text>
        </View>
        <Pressable hitSlop={10} onPress={game.togglePause} style={styles.topBtn}>
          {game.paused ? (
            <PlayIcon color={C.ink} size={22} fill={C.ink} />
          ) : (
            <Pause color={C.ink} size={22} />
          )}
        </Pressable>
      </View>

      <GameStatsBar
        mistakes={game.mistakes}
        score={officialScore ?? game.score}
        seconds={game.seconds}
      />

      <View style={styles.boardWrap}>
        <View style={{ position: "relative" }}>
          <SudokuGrid
            initial={game.initial}
            board={game.board}
            notes={game.notes}
            selected={game.selected}
            errors={game.errors}
            boardSize={boardSize}
            onSelect={game.select}
          />
          {game.paused && !game.gameOver ? (
            <View style={[styles.pauseOverlay, { width: boardSize, height: boardSize }]}>
              <Pressable onPress={game.resume} style={styles.pauseCenter}>
                <PlayIcon color={C.ink} size={28} fill={C.ink} />
                <Text style={styles.pauseText}>Resume</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <GameControls
          notesMode={game.notesMode}
          hintAllowed={game.hintAllowed}
          hintsUsed={game.hintsUsed}
          onUndo={game.undo}
          onErase={game.erase}
          onToggleNotes={game.toggleNotes}
          onHint={handleHint}
        />
      </View>

      {rankedHintMessage ? (
        <View style={styles.hintToast}>
          <Text style={styles.hintToastText}>Hints are disabled in Ranked.</Text>
        </View>
      ) : null}

      <View
        style={{
          paddingHorizontal: 8,
          marginTop: 10,
          marginBottom: Math.max(12, insets.bottom + 4),
        }}
      >
        <NumberPad
          onPressNumber={game.enterNumber}
          counts={game.counts}
          disabled={game.paused || game.completed || game.gameOver}
          highlighted={selectedValue !== 0 ? selectedValue : undefined}
        />
      </View>

      <PauseModal
        visible={game.paused && !game.gameOver && !game.completed}
        variant="pause"
        time={game.seconds}
        mistakes={game.mistakes}
        onResume={game.resume}
        onRestart={() => {
          if (currentSessionIdRef.current) {
            void deleteSessionById(currentSessionIdRef.current);
          }
          game.resume();
          game.restart();
          currentSessionIdRef.current = null;
          setHasSavedOnce(false);
        }}
        onExit={handleLeave}
      />
      <PauseModal
        visible={isFocused && game.gameOver}
        variant="gameover"
        time={game.seconds}
        mistakes={game.mistakes}
        allowRetry={!failedAttemptIsFinal}
        statusText={failedAttemptStatusText}
        primaryGameOverLabel={isSubmittingFailedResult ? "Saving..." : "Back Home"}
        onRestart={() => {
          if (currentSessionIdRef.current) {
            void deleteSessionById(currentSessionIdRef.current);
          }
          game.restart();
          currentSessionIdRef.current = null;
          setHasSavedOnce(false);
        }}
        onExit={() => {
          logDevDiagnostic("game navigation", {
            reason: "game_over_exit",
            sessionId: currentSessionIdRef.current,
            puzzleId: game.puzzleId,
            target: "/(tabs)",
          });
          setIsFocused(false);
          clearTransientUiRef.current();
          router.replace("/(tabs)");
        }}
      />

      <LeaveConfirmModal
        visible={isFocused && leaveOpen && !game.completed && !game.gameOver}
        isSaving={isLeaving}
        onKeepPlaying={() => setLeaveOpen(false)}
        onLeave={() => void handleLeave()}
      />

      <CompletionModal
        visible={isFocused && game.completed}
        time={game.seconds}
        mistakes={game.mistakes}
        hintsUsed={game.hintsUsed}
        undoCount={game.undoCount}
        leaderboardEligible={completionOfficialStatus === "saved" ? officialLeaderboardEligible ?? false : !auth.isSignedIn ? game.result?.eligible_for_leaderboard ?? false : false}
        score={officialScore ?? game.score}
        scoreBreakdown={officialScoreBreakdown ?? game.result?.score_breakdown ?? null}
        streak={completionSummary?.updatedProfile.current_streak ?? 0}
        difficulty={game.difficulty}
        mode={MODE_LABEL[effectiveMode]}
        officialStatus={completionOfficialStatus}
        officialError={officialSubmitError}
        xpEarned={completionSummary?.xpEarned ?? 0}
        levelUpMessage={completionSummary?.didLevelUp ? `Level up! ${completionSummary.previousLevel} → ${completionSummary.newLevel}` : null}
        unlockedBadges={completionSummary?.unlockedBadges.map((badge) => ({ name: badge.name, icon: badge.icon })) ?? []}
        primaryLabel={completionPrimaryLabel(effectiveMode)}
        showLeaderboardEligibility={effectiveMode !== "ranked_duel"}
        onNext={handleCompletionNext}
        onShare={handleShareResult}
        onHome={() => {
          cleanupCompletedSession();
          setOfficialScore(null);
          setOfficialScoreBreakdown(null);
          setOfficialLeaderboardEligible(null);
          setOfficialSubmitError(null);
          setChallengeOutcome(null);
          setIsFocused(false);
          router.replace("/(tabs)");
        }}
        onClose={() => {
          cleanupCompletedSession();
          setOfficialScore(null);
          setOfficialScoreBreakdown(null);
          setOfficialLeaderboardEligible(null);
          setOfficialSubmitError(null);
          setChallengeOutcome(null);
          setIsFocused(false);
          router.replace("/(tabs)");
        }}
        outcomeTitle={challengeOutcome?.title ?? null}
        outcomeSubtitle={challengeOutcome?.subtitle ?? null}
      />
    </View>
  );
}

function LeaveConfirmModal({
  visible,
  isSaving,
  onKeepPlaying,
  onLeave,
}: {
  visible: boolean;
  isSaving?: boolean;
  onKeepPlaying: () => void;
  onLeave: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepPlaying}>
      <View style={leaveStyles.backdrop}>
        <View style={leaveStyles.card}>
          <Text style={leaveStyles.kicker}>LEAVE PUZZLE?</Text>
          <Text style={leaveStyles.title}>
            {isSaving ? "Saving progress…" : "Your progress will be saved"}
          </Text>
          <Text style={leaveStyles.sub}>
            {isSaving
              ? "Please wait a moment."
              : "You can resume this puzzle later from Continue."}
          </Text>
          <Pressable
            style={[leaveStyles.primary, isSaving && { opacity: 0.5 }]}
            onPress={onKeepPlaying}
            disabled={isSaving}
          >
            <Text style={leaveStyles.primaryText}>Keep playing</Text>
          </Pressable>
          <Pressable
            style={[leaveStyles.secondary, isSaving && { opacity: 0.5 }]}
            onPress={onLeave}
            disabled={isSaving}
          >
            <Text style={leaveStyles.secondaryText}>
              {isSaving ? "Saving…" : "Leave"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const leaveStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#15171CB8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  kicker: { fontSize: 11, color: C.muted, fontWeight: "800", letterSpacing: 1.6 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: C.ink,
    marginTop: 8,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  sub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  primary: {
    width: "100%",
    backgroundColor: C.ink,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryText: { color: "#FBF8F2", fontSize: 15, fontWeight: "700" },
  secondary: {
    width: "100%",
    backgroundColor: C.bgElevated,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryText: { color: C.ink, fontSize: 14, fontWeight: "700" },
});

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBtn: { padding: 4 },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.2,
  },
  dateLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: 2,
  },
  boardWrap: {
    alignItems: "center",
    marginTop: 10,
  },
  pauseOverlay: {
    position: "absolute",
    backgroundColor: C.bg + "F0",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  pauseCenter: { alignItems: "center", gap: 8 },
  pauseText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: 0.3,
  },
  hintToast: {
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: C.ink,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  hintToastText: {
    color: "#FBF8F2",
    fontSize: 12,
    fontWeight: "700",
  },
});
