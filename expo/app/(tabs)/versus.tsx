import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Clock, Swords, UserPlus, Zap } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import Pill from "@/components/Pill";
import SectionHeader from "@/components/SectionHeader";
import { C } from "@/constants/colors";
import { usePlayerProfile, type DailyDuelEntry, type RankedDuelEntry } from "@/hooks/usePlayerProfile";
import { useAuth } from "@/hooks/useAuth";
import { getDailyDateKey } from "@/lib/daily";
import { logDevDiagnostic } from "@/lib/performanceDiagnostics";
import { formatTime } from "@/lib/sudoku";
import type { RecentResult } from "@/lib/playerProfile";

type DisplayOutcome = "win" | "loss" | "draw" | "abandon";

function formatScore(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString();
}

function formatRank(tier?: string | null, division?: string | null): string {
  const cleanTier = tier?.trim();
  const cleanDivision = division?.trim();
  if (!cleanTier) return "Unranked";
  return cleanDivision ? `${cleanTier} ${cleanDivision}` : cleanTier;
}

function formatSignedRp(value: number | null | undefined): string {
  if (typeof value !== "number") return "0 RP";
  return `${value >= 0 ? "+" : ""}${value} RP`;
}

function getOutcomeText(outcome: DisplayOutcome | null): string {
  if (outcome === "win") return "Win";
  if (outcome === "loss") return "Loss";
  if (outcome === "draw") return "Draw";
  return "Result";
}

function getDailyDuelOutcome(duel: DailyDuelEntry | null, currentUserId: string | null): DisplayOutcome | null {
  if (!duel || duel.status !== "completed") return null;
  if (!duel.winner_user_id) return "draw";
  return duel.winner_user_id === currentUserId ? "win" : "loss";
}

function getRankedDuelOutcome(duel: RankedDuelEntry | null, currentUserId: string | null): DisplayOutcome | null {
  if (!duel || duel.status !== "completed") return null;
  if (!duel.winner_user_id) return "draw";
  return duel.winner_user_id === currentUserId ? "win" : "loss";
}

function getDailyDuelCopy(duel: DailyDuelEntry | null, currentUserId: string | null): {
  title: string;
  badge: string;
  button: string;
  opponentSub: string;
  resultText: string | null;
} {
  if (!duel) {
    return {
      title: "Today's challenge",
      badge: "Live now",
      button: "Find opponent",
      opponentSub: "Matchmaking...",
      resultText: null,
    };
  }

  const youFinished = Boolean(duel.current_user_result_id);
  const opponentFinished = duel.opponent_score !== null;
  const opponentName = duel.opponent_display_name ?? "opponent";

  if (duel.status === "waiting_for_opponent") {
    return {
      title: "Waiting for opponent",
      badge: "Queued",
      button: "Waiting",
      opponentSub: "Not matched yet",
      resultText: "You are queued for today's Daily Duel.",
    };
  }

  if (duel.status === "completed") {
    const outcome = !duel.winner_user_id ? "Draw" : duel.winner_user_id === currentUserId ? "You won" : "You lost";
    return {
      title: outcome,
      badge: "Complete",
      button: "Complete",
      opponentSub: "Complete",
      resultText: `${formatScore(duel.your_score)} vs ${formatScore(duel.opponent_score)}`,
    };
  }

  if (youFinished) {
    return {
      title: "You finished",
      badge: "Waiting",
      button: "Waiting",
      opponentSub: opponentFinished ? "Finished" : "Playing soon",
      resultText: `Waiting for ${opponentName}.`,
    };
  }

  if (opponentFinished) {
    return {
      title: "Opponent finished",
      badge: "Your turn",
      button: "Play your duel",
      opponentSub: "Finished",
      resultText: `${opponentName} has finished. Play your turn.`,
    };
  }

  return {
    title: "Opponent found",
    badge: "Matched",
    button: "Play your duel",
    opponentSub: "Ready",
    resultText: null,
  };
}

function getRankedDuelCopy(duel: RankedDuelEntry | null, currentUserId: string | null, latestCompleted: RankedDuelEntry | null = null): {
  title: string;
  badge: string;
  button: string;
  sub: string;
  resultText: string | null;
} {
  if (!duel) {
    if (latestCompleted) {
      const delta = latestCompleted.rp_change === null ? "" : ` · ${latestCompleted.rp_change >= 0 ? "+" : ""}${latestCompleted.rp_change} RP`;
      return {
        title: "Ranked Duel",
        badge: latestCompleted.current_tier,
        button: "Find next match",
        sub: `${latestCompleted.current_rp} RP · ${latestCompleted.season_name}`,
        resultText: `${formatScore(latestCompleted.your_score)} vs ${formatScore(latestCompleted.opponent_score)}${delta}`,
      };
    }
    return { title: "Ranked Duel", badge: "Competitive", button: "Find match", sub: "Queue against a nearby RP opponent", resultText: null };
  }
  const youFinished = Boolean(duel.current_user_result_id);
  const opponentFinished = duel.opponent_score !== null;
  const opponentName = duel.opponent_display_name ?? "opponent";
  if (duel.status === "waiting_for_opponent") return { title: "Searching for opponent", badge: duel.current_tier, button: "Searching", sub: `${duel.current_rp} RP · ${duel.season_name}`, resultText: "Waiting for a nearby RP opponent." };
  if (duel.status === "completed") {
    const outcome = getRankedDuelOutcome(duel, currentUserId);
    const title = outcome === "win" ? "You won" : outcome === "loss" ? "You lost" : "Draw";
    const delta = duel.rp_change === null ? "" : ` · ${duel.rp_change >= 0 ? "+" : ""}${duel.rp_change} RP`;
    return { title, badge: "Complete", button: "Complete", sub: `${duel.current_tier} · ${duel.current_rp} RP`, resultText: `${formatScore(duel.your_score)} vs ${formatScore(duel.opponent_score)}${delta}` };
  }
  if (youFinished) return { title: "You finished", badge: "Waiting", button: "Waiting", sub: `${duel.current_tier} · ${duel.current_rp} RP`, resultText: `Waiting for ${opponentName}.` };
  if (opponentFinished) return { title: "Opponent finished", badge: "Your turn", button: "Play ranked duel", sub: `${opponentName} finished`, resultText: "Play your turn to settle RP." };
  return { title: "Ranked match found", badge: "Matched", button: "Play ranked duel", sub: `${duel.current_tier} · ${duel.current_rp} RP`, resultText: null };
}

function getRankedDuelCopyV2(duel: RankedDuelEntry | null, currentUserId: string | null, latestCompleted: RankedDuelEntry | null = null): {
  title: string;
  badge: string;
  button: string;
  sub: string;
  resultText: string | null;
} {
  if (!duel) {
    if (latestCompleted) {
      const outcome = getRankedDuelOutcome(latestCompleted, currentUserId);
      const delta = latestCompleted.rp_change === null ? "" : ` - ${formatSignedRp(latestCompleted.rp_change)}`;
      return {
        title: "Ranked Duel",
        badge: latestCompleted.current_tier,
        button: "Find next match",
        sub: `${latestCompleted.current_rp} RP - ${latestCompleted.season_name}`,
        resultText: `Latest: ${getOutcomeText(outcome)}${delta}`,
      };
    }
    return { title: "Ranked Duel", badge: "Competitive", button: "Find match", sub: "Queue against a nearby RP opponent", resultText: null };
  }

  const youFinished = Boolean(duel.current_user_result_id);
  const opponentFinished = duel.opponent_score !== null;
  const opponentName = duel.opponent_display_name ?? "opponent";
  const rankLine = `${duel.current_rp} RP - ${duel.season_name}`;

  if (duel.status === "waiting_for_opponent") {
    return { title: "Ranked Duel", badge: duel.current_tier, button: "Searching", sub: rankLine, resultText: "Waiting for a nearby RP opponent." };
  }
  if (duel.status === "completed") {
    const outcome = getRankedDuelOutcome(duel, currentUserId);
    const title = outcome === "win" ? "You won" : outcome === "loss" ? "You lost" : "Draw";
    const delta = duel.rp_change === null ? "" : ` - ${formatSignedRp(duel.rp_change)}`;
    return { title, badge: "Complete", button: "Complete", sub: rankLine, resultText: `${formatScore(duel.your_score)} vs ${formatScore(duel.opponent_score)}${delta}` };
  }
  if (youFinished) {
    return { title: "Ranked Duel", badge: "Waiting", button: "Waiting", sub: rankLine, resultText: `You finished - waiting for ${opponentName}.` };
  }
  if (opponentFinished) {
    return { title: "Ranked Duel", badge: "Your turn", button: "Play ranked duel", sub: rankLine, resultText: `${opponentName} finished. Play your turn.` };
  }
  return { title: "Ranked Duel", badge: "Matched", button: "Play ranked duel", sub: rankLine, resultText: "Opponent found." };
}

export default function VersusScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, fetchDailyDuel, enterDailyDuel, fetchRankedDuel, enterRankedDuel, cancelRankedDuel } = usePlayerProfile();
  const auth = useAuth();
  const [dailyDuel, setDailyDuel] = useState<DailyDuelEntry | null>(null);
  const [dailyDuelLoading, setDailyDuelLoading] = useState(false);
  const [rankedDuel, setRankedDuel] = useState<RankedDuelEntry | null>(null);
  const [latestRankedDuel, setLatestRankedDuel] = useState<RankedDuelEntry | null>(null);
  const [rankedDuelLoading, setRankedDuelLoading] = useState(false);
  const [rankedCancelLoading, setRankedCancelLoading] = useState(false);

  const duelResults = profile.recent_results.filter(
    (r) => r.mode === "duel" || r.mode === "daily_duel" || r.mode === "ranked" || r.mode === "ranked_duel"
  );

  const refreshDailyDuel = useCallback(async () => {
    if (!auth.isSignedIn) {
      setDailyDuel(null);
      return;
    }
    const duel = await fetchDailyDuel(getDailyDateKey());
    setDailyDuel(duel);
  }, [auth.isSignedIn, fetchDailyDuel]);

  const refreshRankedDuel = useCallback(async () => {
    if (!auth.isSignedIn) {
      setRankedDuel(null);
      setLatestRankedDuel(null);
      return;
    }
    const duel = await fetchRankedDuel(true);
    if (duel && ["waiting_for_opponent", "matched", "player_a_completed", "player_b_completed"].includes(duel.status)) {
      setRankedDuel(duel);
      setLatestRankedDuel(null);
      return;
    }
    setRankedDuel(null);
    setLatestRankedDuel(duel?.status === "completed" ? duel : null);
  }, [auth.isSignedIn, fetchRankedDuel]);

  useFocusEffect(useCallback(() => {
    void refreshDailyDuel();
    void refreshRankedDuel();
  }, [refreshDailyDuel, refreshRankedDuel]));

  const dailyDuelCopy = useMemo(() => getDailyDuelCopy(dailyDuel, auth.user?.id ?? null), [auth.user?.id, dailyDuel]);
  const dailyDuelOutcome = useMemo(() => getDailyDuelOutcome(dailyDuel, auth.user?.id ?? null), [auth.user?.id, dailyDuel]);
  const rankedDuelCopy = useMemo(() => getRankedDuelCopyV2(rankedDuel, auth.user?.id ?? null, latestRankedDuel), [auth.user?.id, latestRankedDuel, rankedDuel]);
  const rankedDuelOutcome = useMemo(() => getRankedDuelOutcome(rankedDuel, auth.user?.id ?? null), [auth.user?.id, rankedDuel]);

  const openDailyDuelGame = useCallback((duel: DailyDuelEntry) => {
    if (!duel.session_id) {
      Alert.alert("Daily Duel", "Daily Duel session is missing. Please try again.");
      return;
    }
    router.push({
      pathname: "/game",
      params: {
        mode: "daily_duel",
        difficulty: duel.difficulty,
        sessionId: duel.session_id,
        session_id: duel.session_id,
        puzzleId: duel.puzzle_id,
        puzzle_id: duel.puzzle_id,
      },
    });
  }, [router]);

  const startDailyDuel = async () => {
    if (!auth.isSignedIn) {
      Alert.alert("Daily Duel", "Create an account or log in to enter Daily Duel.");
      return;
    }
    if (!auth.user) {
      Alert.alert("Could not start puzzle", "Please try again.");
      return;
    }
    if (dailyDuel?.current_user_result_id || dailyDuel?.status === "completed") {
      Alert.alert("Daily Duel", dailyDuelCopy.resultText ?? "You've already completed today's Daily Duel.");
      return;
    }
    if (dailyDuel?.status === "waiting_for_opponent") {
      Alert.alert("Daily Duel", "Waiting for an opponent to join today's duel.");
      return;
    }
    if (dailyDuel?.session_id && dailyDuel.status !== "waiting_for_opponent") {
      openDailyDuelGame(dailyDuel);
      return;
    }

    setDailyDuelLoading(true);
    try {
      logDevDiagnostic("daily duel enter attempt", {
        authUserId: auth.user.id,
      });
      const result = await enterDailyDuel(getDailyDateKey());
      if (!result.ok || !result.duel) {
        Alert.alert("Daily Duel", result.error ?? "Could not enter Daily Duel.");
        return;
      }
      setDailyDuel(result.duel);
      logDevDiagnostic("daily duel enter result", {
        authUserId: auth.user.id,
        duelId: result.duel.duel_id,
        status: result.duel.status,
        puzzleId: result.duel.puzzle_id,
        sessionId: result.duel.session_id,
      });
      if (result.duel.status === "waiting_for_opponent") {
        Alert.alert("Daily Duel", "You're in the queue. We'll match you with the next player who joins.");
        return;
      }
      if (!result.duel.current_user_result_id) openDailyDuelGame(result.duel);
    } catch (error: unknown) {
      logDevDiagnostic("daily duel enter result", {
        authUserId: auth.user.id,
        supabaseError: error instanceof Error ? error.message : "Unknown Supabase error",
      });
      Alert.alert("Daily Duel", "Could not enter Daily Duel. Please try again.");
    } finally {
      setDailyDuelLoading(false);
    }
  };

  const openRankedDuelGame = useCallback((duel: RankedDuelEntry) => {
    if (!duel.session_id) {
      Alert.alert("Ranked Duel", "Ranked Duel session is missing. Please try again.");
      return;
    }
    router.push({
      pathname: "/game",
      params: {
        mode: "ranked_duel",
        difficulty: duel.difficulty,
        sessionId: duel.session_id,
        session_id: duel.session_id,
        puzzleId: duel.puzzle_id,
        puzzle_id: duel.puzzle_id,
      },
    });
  }, [router]);

  const startRankedDuel = async () => {
    if (!auth.isSignedIn) {
      Alert.alert("Ranked Duel", "Create an account or log in to enter Ranked Duel.");
      return;
    }
    if (!auth.user) {
      Alert.alert("Ranked Duel", "Please try again.");
      return;
    }
    if (rankedDuel?.status === "waiting_for_opponent") {
      Alert.alert("Ranked Duel", "Searching for a nearby RP opponent.");
      return;
    }
    if (rankedDuel?.current_user_result_id) {
      Alert.alert("Ranked Duel", rankedDuelCopy.resultText ?? "You finished. Waiting for your opponent.");
      return;
    }
    if (rankedDuel?.session_id && rankedDuel.status !== "waiting_for_opponent") {
      openRankedDuelGame(rankedDuel);
      return;
    }

    setRankedDuelLoading(true);
    try {
      const result = await enterRankedDuel();
      if (!result.ok || !result.duel) {
        Alert.alert("Ranked Duel", result.error ?? "Could not enter Ranked Duel.");
        return;
      }
      setRankedDuel(result.duel);
      setLatestRankedDuel(null);
      if (result.duel.status === "waiting_for_opponent") {
        Alert.alert("Ranked Duel", "You're searching for a nearby RP opponent.");
        return;
      }
      if (!result.duel.current_user_result_id) openRankedDuelGame(result.duel);
    } finally {
      setRankedDuelLoading(false);
    }
  };

  const cancelRankedSearch = async () => {
    if (!rankedDuel || rankedDuel.status !== "waiting_for_opponent") return;
    setRankedCancelLoading(true);
    try {
      const result = await cancelRankedDuel(rankedDuel.ranked_duel_id);
      if (!result.ok) {
        Alert.alert("Ranked Duel", result.error?.includes("Opponent found") ? "Opponent found. This match is now locked." : result.error ?? "Could not cancel search.");
      }
      await refreshRankedDuel();
    } finally {
      setRankedCancelLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>HEAD TO HEAD</Text>
        <Text style={styles.title}>Versus</Text>
        <Text style={styles.subtitle}>One attempt. Highest score wins.</Text>

        {/* Daily Duel hero */}
        <Pressable onPress={startDailyDuel} style={{ marginTop: 22 }}>
          {({ pressed }) => (
            <View style={[styles.duelHero, { opacity: pressed ? 0.92 : 1 }]}>
              <LinearGradient
                colors={["#1E1B4B", "#3B2A6A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={styles.heroKicker}>DAILY DUEL</Text>
                  <Text style={styles.heroTitle}>{dailyDuelCopy.title}</Text>
                </View>
                <View style={styles.endsIn}>
                  <Clock size={11} color="#FBF8F2AA" />
                  <Text style={styles.endsInText}>{dailyDuelCopy.badge}</Text>
                </View>
              </View>

              <View style={styles.vsRow}>
                <View style={styles.vsPlayer}>
                  <Avatar
                    {...profile}
                    initials={profile.initials}
                    color={profile.avatar_color}
                    symbol={profile.avatar_symbol}
                    size={56}
                  />
                  <Text style={styles.vsName}>{profile.display_name ?? profile.username}</Text>
                  <Text style={styles.vsRank}>{formatRank(profile.rank_tier, profile.rank_division)}</Text>
                </View>
                <View style={styles.vsCenter}>
                  <Text style={styles.vsLabel}>VS</Text>
                </View>
                <View style={styles.vsPlayer}>
                  <Avatar
                    initials={dailyDuel?.opponent_initials ?? "?"}
                    color={dailyDuel?.opponent_avatar_color ?? "#3F7D58"}
                    size={56}
                  />
                  <Text style={styles.vsName}>{dailyDuel?.opponent_display_name ?? "Opponent"}</Text>
                  <Text style={styles.vsRank}>{dailyDuel?.opponent_user_id ? dailyDuel.opponent_rank_tier ?? "Unranked" : dailyDuelCopy.opponentSub}</Text>
                </View>
              </View>

              {dailyDuel?.status !== "completed" ? (
                <View style={styles.heroCTA}>
                  <Swords size={15} color={C.ink} />
                  <Text style={styles.heroCTAText}>{dailyDuelLoading ? "Loading..." : dailyDuelCopy.button}</Text>
                </View>
              ) : null}
              {dailyDuelCopy.resultText ? <Text style={styles.duelStatusText}>{dailyDuelCopy.resultText}</Text> : null}
            </View>
          )}
        </Pressable>

        {/* Quick play options */}
        <View style={{ marginTop: 22 }}>
          <SectionHeader title="Find a match" />
          <Card style={{ marginBottom: 12 }}>
            <View style={styles.rankedCardTop}>
              <View style={[styles.iconTile, { backgroundColor: C.amberSoft }]}>
                <Zap color={C.amber} size={22} fill={C.amber} strokeWidth={1.5} />
              </View>
              <View style={styles.rankedCardText}>
                <View style={styles.rankedTitleRow}>
                  <Text style={styles.cardTitle}>Ranked Duel</Text>
                  <Pill label={rankedDuelCopy.badge} tone="amber" />
                </View>
                <Text style={styles.cardSub}>
                  {auth.isGuest ? "Sign up to play ranked matches" : rankedDuelCopy.sub}
                </Text>
                {rankedDuelCopy.resultText ? <Text style={styles.cardStatus}>{rankedDuelCopy.resultText}</Text> : null}
              </View>
            </View>
            <Pressable style={styles.rankedActionPill} onPress={startRankedDuel}>
              <Text style={styles.rankedActionText} numberOfLines={1}>
                {rankedDuelLoading ? "Loading..." : rankedDuelCopy.button}
              </Text>
            </Pressable>
            {rankedDuel?.status === "waiting_for_opponent" ? (
              <Pressable style={styles.rankedCancelPill} onPress={() => void cancelRankedSearch()}>
                <Text style={styles.rankedCancelText}>{rankedCancelLoading ? "Cancelling..." : "Cancel search"}</Text>
              </Pressable>
            ) : null}
          </Card>

          <Card onPress={() => router.push({ pathname: "/friends", params: { mode: "challenge", source: "versus" } })}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={[styles.iconTile, { backgroundColor: C.accentSoft }]}>
                <UserPlus color={C.accent} size={22} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Friend Challenge</Text>
                <Text style={styles.cardSub}>
                  Send a puzzle to a friend · pick difficulty
                </Text>
              </View>
              <ChevronRight color={C.mutedSoft} size={20} />
            </View>
          </Card>
        </View>

        {/* Recent matches */}
        <View style={{ marginTop: 26 }}>
          <SectionHeader title="Recent matches" action={duelResults.length > 0 ? "History" : undefined} onAction={() => router.push({ pathname: "/results", params: { source: "versus" } })} />
          {duelResults.length === 0 ? (
            <Card style={{ alignItems: "center", paddingVertical: 24 }}>
              <Swords size={32} color={C.mutedSoft} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>
                Complete a duel or ranked match to see your history here
              </Text>
            </Card>
          ) : (
            duelResults.slice(0, 5).map((r, index) => {
              const isCurrentDailyDuel =
                r.mode === "daily_duel"
                && dailyDuelOutcome
                && r.puzzle_id === dailyDuel?.puzzle_id
                && (!r.session_id || !dailyDuel?.session_id || r.session_id === dailyDuel.session_id);
              const isCurrentRankedDuel =
                r.mode === "ranked_duel"
                && rankedDuelOutcome
                && r.puzzle_id === rankedDuel?.puzzle_id
                && (!r.session_id || !rankedDuel?.session_id || r.session_id === rankedDuel.session_id);
              return (
                <DuelResultRow
                  key={r.result_id ?? r.session_id ?? `${r.puzzle_id}-${r.completed_at}-${index}`}
                  result={r}
                  outcomeOverride={isCurrentDailyDuel ? dailyDuelOutcome : isCurrentRankedDuel ? rankedDuelOutcome : undefined}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DuelResultRow({ result, outcomeOverride }: { result: RecentResult; outcomeOverride?: DisplayOutcome }) {
  const outcome = outcomeOverride ?? result.result_outcome;
  const isWin = outcome === "win";
  const isLoss = outcome === "loss";
  const isRanked = result.mode === "ranked" || result.mode === "ranked_duel";
  return (
    <Card style={{ marginBottom: 10 }} padded={false}>
      <View style={styles.matchHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={[
              styles.resultTag,
              { backgroundColor: isWin ? "#DCEBE0" : isLoss ? "#F7DEDA" : C.border },
            ]}
          >
            <Text
              style={[
                styles.resultText,
                { color: isWin ? C.success : isLoss ? C.danger : C.muted },
              ]}
            >
              {outcome === "win" ? "WIN" : outcome === "loss" ? "LOSS" : "DRAW"}
            </Text>
          </View>
          <Text style={styles.matchMode}>{isRanked ? "Ranked Duel" : "Duel"}</Text>
        </View>
        <Text style={styles.matchTime}>
          {new Date(result.completed_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.matchBody}>
        <View style={styles.matchSide}>
          <View style={{ flex: 1 }}>
            <Text style={styles.matchName}>{result.difficulty}</Text>
            <Text style={styles.matchSub}>
              {formatTime(result.elapsed_seconds)} · {result.mistakes} mistakes · {result.hints_used} hints
            </Text>
          </View>
        </View>

        <View style={styles.matchStats}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.msLabel}>Score</Text>
            <Text style={styles.msYou}>{result.final_score.toLocaleString()}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.msLabel}>{isRanked ? "RP" : "XP"}</Text>
            <Text style={styles.msYou}>{isRanked ? formatSignedRp(result.rp_change) : `+${result.xp_earned}`}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.msLabel}>Time</Text>
            <Text style={styles.msYou}>{formatTime(result.elapsed_seconds)}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    marginTop: 4,
  },
  duelHero: {
    borderRadius: 22,
    padding: 22,
    overflow: "hidden",
  },
  heroKicker: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  heroTitle: {
    color: "#FBF8F2",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 3,
    letterSpacing: -0.3,
  },
  endsIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FBF8F215",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  endsInText: {
    color: "#FBF8F2AA",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  vsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 22,
  },
  vsPlayer: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  vsName: {
    color: "#FBF8F2",
    fontSize: 14,
    fontWeight: "700",
  },
  vsRank: {
    color: "#FBF8F2AA",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: -4,
  },
  vsCenter: {
    paddingHorizontal: 8,
  },
  vsLabel: {
    color: C.gold,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: "Georgia",
  },
  heroCTA: {
    backgroundColor: C.gold,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  heroCTAText: {
    color: C.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  duelStatusText: {
    color: "#FBF8F2CC",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rankedCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rankedCardText: {
    flex: 1,
    minWidth: 0,
  },
  rankedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  rankedActionPill: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.amberSoft,
    borderRadius: 999,
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rankedActionText: {
    color: C.amber,
    fontWeight: "900",
    fontSize: 13,
    textAlign: "center",
  },
  rankedCancelPill: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bgElevated,
    borderColor: C.border,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  rankedCancelText: {
    color: C.inkSoft,
    fontWeight: "900",
    fontSize: 13,
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },
  cardStatus: {
    fontSize: 12,
    color: C.inkSoft,
    fontWeight: "800",
    marginTop: 5,
  },
  cardMeta: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "700",
    marginTop: 4,
  },
  cardAction: {
    color: C.amber,
    fontWeight: "900",
    fontSize: 12,
    maxWidth: 82,
    textAlign: "right",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  resultTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resultText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  matchMode: {
    fontSize: 13,
    color: C.ink,
    fontWeight: "600",
  },
  matchTime: {
    fontSize: 12,
    color: C.muted,
  },
  matchBody: {
    padding: 16,
    gap: 14,
  },
  matchSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  matchName: {
    fontSize: 15,
    color: C.ink,
    fontWeight: "700",
  },
  matchSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },
  matchStats: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  msLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  msYou: {
    fontSize: 14,
    color: C.ink,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.ink,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
