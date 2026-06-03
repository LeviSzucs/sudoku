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
import { usePlayerProfile, type DailyDuelEntry } from "@/hooks/usePlayerProfile";
import { useAuth } from "@/hooks/useAuth";
import { getDailyDateKey } from "@/lib/daily";
import { logDevDiagnostic } from "@/lib/performanceDiagnostics";
import { formatTime } from "@/lib/sudoku";
import type { RecentResult } from "@/lib/playerProfile";

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
      button: "View result",
      opponentSub: "Complete",
      resultText: `${outcome} · ${duel.your_score ?? 0} vs ${duel.opponent_score ?? 0}`,
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

export default function VersusScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, fetchDailyDuel, enterDailyDuel } = usePlayerProfile();
  const auth = useAuth();
  const [dailyDuel, setDailyDuel] = useState<DailyDuelEntry | null>(null);
  const [dailyDuelLoading, setDailyDuelLoading] = useState(false);

  const duelResults = profile.recent_results.filter(
    (r) => r.mode === "duel" || r.mode === "daily_duel" || r.mode === "ranked"
  );

  const refreshDailyDuel = useCallback(async () => {
    if (!auth.isSignedIn) {
      setDailyDuel(null);
      return;
    }
    const duel = await fetchDailyDuel(getDailyDateKey());
    setDailyDuel(duel);
  }, [auth.isSignedIn, fetchDailyDuel]);

  useFocusEffect(useCallback(() => {
    void refreshDailyDuel();
  }, [refreshDailyDuel]));

  const dailyDuelCopy = useMemo(() => getDailyDuelCopy(dailyDuel, auth.user?.id ?? null), [auth.user?.id, dailyDuel]);

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
        <Text style={styles.subtitle}>Race the same puzzle. Best time wins.</Text>

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
                    initials={profile.initials}
                    color={profile.avatar_color}
                    size={56}
                  />
                  <Text style={styles.vsName}>{profile.username}</Text>
                  <Text style={styles.vsRank}>
                    {profile.rank_tier}{profile.rank_division ? ` ${profile.rank_division}` : ""}
                  </Text>
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
                  <Text style={styles.vsRank}>{dailyDuel?.opponent_username_handle ? `@${dailyDuel.opponent_username_handle}` : dailyDuelCopy.opponentSub}</Text>
                </View>
              </View>

              <View style={styles.heroCTA}>
                <Swords size={15} color={C.ink} />
                <Text style={styles.heroCTAText}>{dailyDuelLoading ? "Loading..." : dailyDuelCopy.button}</Text>
              </View>
              {dailyDuelCopy.resultText ? <Text style={styles.duelStatusText}>{dailyDuelCopy.resultText}</Text> : null}
            </View>
          )}
        </Pressable>

        {/* Quick play options */}
        <View style={{ marginTop: 22 }}>
          <SectionHeader title="Find a match" />
          <Card onPress={() => Alert.alert("Ranked Duel", "Ranked matchmaking coming soon")} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={[styles.iconTile, { backgroundColor: C.amberSoft }]}>
                <Zap color={C.amber} size={22} fill={C.amber} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.cardTitle}>Ranked Duel</Text>
                  <Pill label="+25 RP" tone="amber" />
                </View>
                <Text style={styles.cardSub}>
                  {auth.isGuest
                    ? "Sign up to play ranked matches"
                    : "Match against a similar-rated player · ~30s queue"}
                </Text>
              </View>
              <ChevronRight color={C.mutedSoft} size={20} />
            </View>
          </Card>

          <Card onPress={() => router.push({ pathname: "/friends", params: { mode: "challenge" } })}>
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
          <SectionHeader title="Recent matches" action={duelResults.length > 0 ? "History" : undefined} onAction={() => router.push("/results")} />
          {duelResults.length === 0 ? (
            <Card style={{ alignItems: "center", paddingVertical: 24 }}>
              <Swords size={32} color={C.mutedSoft} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>
                Complete a duel or ranked match to see your history here
              </Text>
            </Card>
          ) : (
            duelResults.slice(0, 5).map((r) => (
              <DuelResultRow key={`${r.puzzle_id}-${r.completed_at}`} result={r} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DuelResultRow({ result }: { result: RecentResult }) {
  const isWin = result.result_outcome === "win";
  return (
    <Card style={{ marginBottom: 10 }} padded={false}>
      <View style={styles.matchHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={[
              styles.resultTag,
              { backgroundColor: isWin ? "#DCEBE0" : result.result_outcome === "loss" ? "#F7DEDA" : C.border },
            ]}
          >
            <Text
              style={[
                styles.resultText,
                { color: isWin ? C.success : result.result_outcome === "loss" ? C.danger : C.muted },
              ]}
            >
              {result.result_outcome === "win" ? "WIN" : result.result_outcome === "loss" ? "LOSS" : "DRAW"}
            </Text>
          </View>
          <Text style={styles.matchMode}>{result.mode === "ranked" ? "Ranked" : "Duel"}</Text>
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
            <Text style={styles.msLabel}>XP</Text>
            <Text style={styles.msYou}>+{result.xp_earned}</Text>
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
