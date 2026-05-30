import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronRight,
  Crown,
  Play as PlayIcon,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import Pill from "@/components/Pill";
import SectionHeader from "@/components/SectionHeader";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import type { Difficulty } from "@/constants/mockData";

const DIFFICULTIES: { key: Difficulty; sub: string; tone: "muted" | "accent" | "amber" | "red" | "purple" }[] = [
  { key: "Easy", sub: "Warm up · ~4 min", tone: "muted" },
  { key: "Medium", sub: "Balanced · ~7 min", tone: "accent" },
  { key: "Hard", sub: "Challenging · ~12 min", tone: "amber" },
  { key: "Expert", sub: "Brutal · 20+ min", tone: "red" },
  { key: "Master", sub: "Diabolical · 30+ min", tone: "purple" },
];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBestTime(seconds: number | undefined): string {
  if (seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, activeSessions } = usePlayerProfile();

  const go = (mode: string, difficulty: Difficulty, sessionId?: string) =>
    router.push({ pathname: "/game", params: { mode, difficulty, ...(sessionId ? { sessionId } : {}) } });

  const inProgressSessions = activeSessions.filter((session) => session.status === "in_progress");
  const hasActiveSession = inProgressSessions.length > 0;
  const activeSession = hasActiveSession ? inProgressSessions[0] : null;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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
        <Text style={styles.kicker}>PUZZLE HUB</Text>
        <Text style={styles.title}>Play</Text>

        {/* Continue */}
        {hasActiveSession && activeSession ? (
          <Card
            onPress={() => go(activeSession.mode, activeSession.difficulty as Difficulty, activeSession.session_id)}
            style={{ marginTop: 18 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={[styles.iconTile, { backgroundColor: C.accentSoft }]}>
                <PlayIcon color={C.accent} size={20} fill={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Continue puzzle</Text>
                <Text style={styles.cardSub}>
                  {activeSession.difficulty} · {formatElapsed(activeSession.elapsed_seconds)} elapsed
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={{ marginTop: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={[styles.iconTile, { backgroundColor: C.border }]}>
                <PlayIcon color={C.mutedSoft} size={20} fill={C.mutedSoft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: C.muted }]}>No puzzle in progress</Text>
                <Text style={styles.cardSub}>Start a puzzle below to continue later</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Daily hero */}
        <Pressable onPress={() => go("daily", "Medium")}>
          {({ pressed }) => (
            <View style={[styles.heroCard, { opacity: pressed ? 0.92 : 1, marginTop: 14 }]}>
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
                <View style={styles.heroFooter}>
                  <Text style={styles.heroFooterText}>
                    Same puzzle for everyone — compare your score
                  </Text>
                  <View style={styles.heroCTA}>
                    <PlayIcon size={14} color={C.ink} fill={C.ink} />
                    <Text style={styles.heroCTAText}>Play</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </Pressable>

        {/* Classic by difficulty */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Classic puzzle" />
          <View style={{ gap: 10 }}>
            {DIFFICULTIES.map((d) => (
              <Card key={d.key} onPress={() => go("classic", d.key)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View
                    style={[
                      styles.iconTile,
                      {
                        backgroundColor:
                          d.tone === "accent"
                            ? C.accentSoft
                            : d.tone === "amber"
                            ? C.amberSoft
                            : d.tone === "red"
                            ? "#C5483E22"
                            : C.border,
                      },
                    ]}
                  >
                    <Zap
                      color={
                        d.tone === "accent"
                          ? C.accent
                          : d.tone === "amber"
                          ? C.amber
                          : d.tone === "red"
                          ? "#C5483E"
                          : d.tone === "purple"
                          ? "#6B4FA0"
                          : C.muted
                      }
                      size={20}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.cardTitle}>{d.key}</Text>
                      {(d.key === "Expert" || d.key === "Master") ? <Pill label="Premium" tone="amber" /> : null}
                    </View>
                    <Text style={styles.cardSub}>{d.sub}</Text>
                  </View>
                  <ChevronRight color={C.mutedSoft} size={20} />
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Versus shortcut */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Compete" />
          <Card onPress={() => go("duel", "Medium")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={[styles.iconTile, { backgroundColor: C.amberSoft }]}>
                <Swords color={C.amber} size={22} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Daily Duel</Text>
                <Text style={styles.cardSub}>Race a fresh opponent on today's board</Text>
              </View>
              <ChevronRight color={C.mutedSoft} size={20} />
            </View>
          </Card>
          <Card onPress={() => go("ranked", "Hard")} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={[styles.iconTile, { backgroundColor: "#1E1B4B22" }]}>
                <Crown color={C.gold} size={22} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Ranked match</Text>
                <Text style={styles.cardSub}>
                  Climb the ladder · {formatBestTime(profile.best_times_by_difficulty.Hard)} best
                </Text>
              </View>
              <ChevronRight color={C.mutedSoft} size={20} />
            </View>
          </Card>
        </View>

        {/* Quick stats */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Your form" />
          <Card>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{profile.puzzles_completed}</Text>
                <Text style={styles.statLabel}>Solved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statValue}>
                  {profile.puzzles_completed > 0 ? formatBestTime(
                    Object.values(profile.best_times_by_difficulty).reduce<number | undefined>(
                      (best, t) => t !== undefined && (best === undefined || t < best) ? t : best,
                      undefined
                    )
                  ) : "—"}
                </Text>
                <Text style={styles.statLabel}>Best time</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <CalendarDays size={14} color={profile.current_streak > 0 ? C.streak : C.mutedSoft} />
                  <Text style={styles.statValue}>{profile.current_streak}</Text>
                </View>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={{ height: 8 }} />
        <Pressable>
          {({ pressed }) => (
            <View style={[styles.premiumHint, { opacity: pressed ? 0.92 : 1 }]}>
              <Sparkles size={14} color={C.gold} />
              <Text style={styles.premiumHintText}>Unlock Expert & unlimited hints</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    color: C.ink,
    fontWeight: "700",
    letterSpacing: -0.5,
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
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 140,
  },
  heroInner: { padding: 20, flex: 1, justifyContent: "space-between", gap: 24 },
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
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroFooterText: { color: "#FBF8F2AA", fontSize: 13 },
  heroCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FBF8F2",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  heroCTAText: { color: C.ink, fontWeight: "700", fontSize: 14 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statCell: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: C.border },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: C.ink,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  premiumHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
  },
  premiumHintText: {
    fontSize: 13,
    color: C.muted,
    fontWeight: "600",
  },
});
