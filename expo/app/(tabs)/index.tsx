import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Crown,
  Flame,
  Play,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react-native";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import Pill from "@/components/Pill";
import SectionHeader from "@/components/SectionHeader";
import { PREMIUM_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { useAuth } from "@/hooks/useAuth";
import { getDailyDateKey } from "@/lib/daily";
import { logDevDiagnostic } from "@/lib/performanceDiagnostics";
import { fetchDailyPuzzle, makeEmptyNotes } from "@/lib/sudoku";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, activeSessions, startPuzzleSession, getInProgressDailySession, getCompletedDailyResult } = usePlayerProfile();
  const auth = useAuth();

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

  const inProgressSessions = activeSessions.filter((session) => session.status === "in_progress");
  const hasActiveSession = inProgressSessions.length > 0;
  const activeSession = hasActiveSession ? inProgressSessions[0] : null;
  const isGuest = auth.isGuest;

  const openSignedInDailyMode = async (mode: "daily" | "daily_duel") => {
    if (!auth.user) {
      Alert.alert("Could not start puzzle", "Please try again.");
      return;
    }
    try {
      const dateStr = getDailyDateKey();
      const puzzle = await fetchDailyPuzzle(dateStr, mode);
      logDevDiagnostic("daily puzzle assigned", {
        dateStr,
        authUserId: auth.user.id,
        mode,
        assignedDailyPuzzleId: puzzle.puzzle_id,
        difficulty: puzzle.difficulty,
      });
      const completedResult = await getCompletedDailyResult(mode, puzzle.puzzle_id, dateStr);
      if (completedResult) {
        Alert.alert(mode === "daily" ? "Daily Sudoku" : "Daily Duel", mode === "daily" ? "You've completed today's Daily Sudoku." : "You've completed today's Daily Duel.");
        return;
      }

      const existingSession = await getInProgressDailySession(mode, puzzle.puzzle_id, dateStr);
      if (existingSession) {
        const params = {
          mode,
          difficulty: existingSession.difficulty,
          sessionId: existingSession.session_id,
          session_id: existingSession.session_id,
          ...(existingSession.puzzle_id ? { puzzleId: existingSession.puzzle_id, puzzle_id: existingSession.puzzle_id } : {}),
        };
        logDevDiagnostic("daily session resume", {
          authUserId: auth.user.id,
          mode,
          date: dateStr,
          puzzleId: existingSession.puzzle_id,
          sessionId: existingSession.session_id,
          routeParams: params,
        });
        router.push({ pathname: "/game", params });
        return;
      }

      logDevDiagnostic("puzzle session create attempt", {
        authUserId: auth.user.id,
        selectedPuzzleId: puzzle.puzzle_id,
        mode,
        difficulty: puzzle.difficulty,
        sessionCreateAttempted: true,
      });
      const session = await startPuzzleSession({
        puzzleId: puzzle.puzzle_id,
        mode,
        difficulty: puzzle.difficulty,
        initialBoardState: puzzle.givens.map((row) => [...row]),
        initialNotesState: makeEmptyNotes(),
      });
      const params = { mode, difficulty: puzzle.difficulty, sessionId: session.session_id, session_id: session.session_id, puzzleId: puzzle.puzzle_id, puzzle_id: puzzle.puzzle_id };
      logDevDiagnostic("puzzle session create result", {
        authUserId: auth.user.id,
        selectedPuzzleId: puzzle.puzzle_id,
        mode,
        difficulty: puzzle.difficulty,
        sessionCreateSuccess: true,
        returnedSessionId: session.session_id,
        returnedStatus: session.status,
        routeParams: params,
      });
      router.push({ pathname: "/game", params });
    } catch (error: unknown) {
      logDevDiagnostic("puzzle session create result", {
        authUserId: auth.user.id,
        mode,
        sessionCreateSuccess: false,
        supabaseError: error instanceof Error ? error.message : "Unknown Supabase error",
      });
      Alert.alert("Could not start puzzle", "Please try again.");
    }
  };

  const openDaily = () => {
    if (auth.isSignedIn) {
      void openSignedInDailyMode("daily");
      return;
    }
    const session = inProgressSessions.find((entry) => entry.mode === "daily");
    router.push({
      pathname: "/game",
      params: session
        ? { mode: "daily", difficulty: session.difficulty, sessionId: session.session_id, session_id: session.session_id, ...(session.puzzle_id ? { puzzleId: session.puzzle_id, puzzle_id: session.puzzle_id } : {}) }
        : { mode: "daily", difficulty: "Medium" },
    });
  };
  const openDuel = () => {
    router.push("/versus");
  };
  const showComingSoon = (title = "Coming soon") => Alert.alert(title, "Coming soon");

  const streak = profile.current_streak;
  const streakDots = Math.min(streak, 7);

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
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{dayOfWeek} · {today.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}</Text>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.greetingName}>{profile.username}</Text>
          </View>
          <Avatar initials={profile.initials} color={profile.avatar_color} symbol={profile.avatar_symbol} size={48} />
        </View>

        {/* Streak card */}
        <Card style={styles.streakCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={styles.streakIcon}>
              <Flame color={streak > 0 ? C.streak : C.mutedSoft} size={26} fill={streak > 0 ? C.streak : "none"} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakNumber}>
                {streak > 0 ? `${streak} day streak` : "No streak yet"}
              </Text>
              <Text style={styles.streakSub}>
                {streak > 0 ? "Keep it alive — play any puzzle today" : "Start your streak — complete a puzzle today"}
              </Text>
            </View>
          </View>
          {streak > 0 ? (
            <View style={styles.streakDots}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i < streakDots ? C.streak : C.border },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </Card>

        {/* Daily Sudoku — hero */}
        <Pressable onPress={openDaily}>
          {({ pressed }) => (
            <View style={[styles.heroCard, { opacity: pressed ? 0.92 : 1 }]}>
              <LinearGradient
                colors={["#15171C", "#2A2D36"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.heroInner}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={styles.heroKicker}>DAILY SUDOKU</Text>
                    <Text style={styles.heroTitle}>{dateStr}</Text>
                  </View>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>Medium</Text>
                  </View>
                </View>

                <MiniGrid />

                <View style={styles.heroFooter}>
                  <Text style={styles.heroFooterText}>
                    Same puzzle for everyone — compare your score
                  </Text>
                  <View style={styles.heroCTA}>
                    <Play size={14} color={C.ink} fill={C.ink} />
                    <Text style={styles.heroCTAText}>Play</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </Pressable>

        {/* Daily Duel */}
        <Card onPress={openDuel} style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={[
                styles.iconTile,
                { backgroundColor: C.amberSoft },
              ]}
            >
              <Swords color={C.amber} size={22} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Daily Duel</Text>
              <Text style={styles.cardSub}>
                Race a fresh opponent on today's board
              </Text>
            </View>
            <ChevronRight color={C.mutedSoft} size={20} />
          </View>
        </Card>

        {/* Continue */}
        {hasActiveSession && activeSession ? (
          <Card
            onPress={() =>
              router.push({
                pathname: "/game",
                params: { mode: activeSession.mode, difficulty: activeSession.difficulty, sessionId: activeSession.session_id, session_id: activeSession.session_id, ...(activeSession.puzzle_id ? { puzzleId: activeSession.puzzle_id, puzzle_id: activeSession.puzzle_id } : {}) },
              })
            }
            style={{ marginTop: 12 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={[styles.iconTile, { backgroundColor: C.accentSoft }]}>
                <Play color={C.accent} size={20} fill={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Continue puzzle</Text>
                <Text style={styles.cardSub}>
                  {activeSession.difficulty} · {formatElapsed(activeSession.elapsed_seconds)} elapsed
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Guest prompt */}
        {isGuest ? (
          <Card style={{ marginTop: 14 }} onPress={() => { void auth.signOut(); router.replace("/auth"); }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={[styles.iconTile, { backgroundColor: C.accentSoft }]}>
                <Crown color={C.gold} size={20} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Create an account</Text>
                <Text style={styles.cardSub}>
                  Save your progress, compete on leaderboards, and play ranked duels
                </Text>
              </View>
              <ChevronRight color={C.mutedSoft} size={20} />
            </View>
          </Card>
        ) : null}

        {/* Premium */}
        <View style={{ marginTop: 22 }}>
          <Pressable onPress={() => showComingSoon(PREMIUM_NAME)}>
            {({ pressed }) => (
              <View style={[styles.premiumCard, { opacity: pressed ? 0.92 : 1 }]}>
                <LinearGradient
                  colors={["#1E1B4B", "#3B2A6A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.premiumGlow} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Crown size={14} color={C.gold} fill={C.gold} />
                    <Text style={styles.premiumKicker}>{PREMIUM_NAME.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.premiumTitle}>Unlimited hints & expert puzzles</Text>
                  <Text style={styles.premiumSub}>
                    Plus ad-free play and exclusive duels
                  </Text>
                </View>
                <View style={styles.premiumCTA}>
                  <Sparkles size={14} color={C.ink} />
                  <Text style={styles.premiumCTAText}>Try free</Text>
                </View>
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function MiniGrid() {
  const sample = [
    [5, 0, 0, 0, 7, 0, 0, 0, 0],
    [0, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
  ];
  return (
    <View style={styles.miniGrid}>
      {sample.map((row, r) => (
        <View key={r} style={{ flexDirection: "row" }}>
          {row.map((v, c) => (
            <View
              key={c}
              style={[
                styles.miniCell,
                c % 3 === 2 && c < 8 && { borderRightColor: "#FFFFFF55" },
              ]}
            >
              {v !== 0 ? <Text style={styles.miniNum}>{v}</Text> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  kicker: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 22,
    color: C.muted,
    fontWeight: "400",
  },
  greetingName: {
    fontSize: 30,
    color: C.ink,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: -2,
  },
  streakCard: {
    backgroundColor: C.card,
    marginBottom: 16,
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.streakSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.3,
  },
  streakSub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },
  streakDots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 240,
  },
  heroInner: {
    padding: 20,
    flex: 1,
  },
  heroKicker: {
    color: "#FBF8F2AA",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  heroTitle: {
    color: "#FBF8F2",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  heroBadge: {
    backgroundColor: "#FBF8F215",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FBF8F230",
    alignSelf: "flex-start",
  },
  heroBadgeText: {
    color: "#FBF8F2",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  miniGrid: {
    marginTop: 18,
    alignSelf: "center",
    backgroundColor: "#0000",
  },
  miniCell: {
    width: 28,
    height: 28,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#FBF8F225",
    alignItems: "center",
    justifyContent: "center",
  },
  miniNum: {
    color: "#FBF8F2",
    fontSize: 14,
    fontFamily: "Georgia",
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  heroFooterText: {
    color: "#FBF8F2AA",
    fontSize: 13,
  },
  heroCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FBF8F2",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  heroCTAText: {
    color: C.ink,
    fontWeight: "700",
    fontSize: 14,
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
  premiumCard: {
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  premiumGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#B7912F30",
    right: -60,
    top: -60,
  },
  premiumKicker: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  premiumTitle: {
    color: "#FBF8F2",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: -0.3,
  },
  premiumSub: {
    color: "#FBF8F2AA",
    fontSize: 13,
    marginTop: 3,
  },
  premiumCTA: {
    backgroundColor: C.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  premiumCTAText: {
    color: C.ink,
    fontWeight: "700",
    fontSize: 13,
  },
});
