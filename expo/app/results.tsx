import { Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import PremiumGateCard from "@/components/PremiumGateCard";
import { C } from "@/constants/colors";
import { getResultHistoryLimit } from "@/constants/premium";
import { typography } from "@/constants/typography";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import type { RecentResult } from "@/lib/playerProfile";
import { formatTime } from "@/lib/sudoku";

type ResultFilter = "All" | "Classic" | "Daily" | "Duel" | "Ranked";

const FILTERS: ResultFilter[] = ["All", "Classic", "Daily", "Duel", "Ranked"];

function modeMatches(filter: ResultFilter, mode: string): boolean {
  if (filter === "All") return true;
  if (filter === "Classic") return mode === "classic";
  if (filter === "Daily") return mode === "daily";
  if (filter === "Duel") return ["duel", "daily_duel", "friend_challenge"].includes(mode);
  return ["ranked", "ranked_duel"].includes(mode);
}

function modeLabel(mode: string): string {
  if (mode === "classic") return "Classic";
  if (mode === "daily") return "Daily";
  if (mode === "daily_duel") return "Daily Duel";
  if (mode === "friend_challenge") return "Friend Challenge";
  if (mode === "ranked" || mode === "ranked_duel") return "Ranked";
  if (mode === "duel") return "Duel";
  return "Puzzle";
}

function isRankedResult(result: RecentResult): boolean {
  return result.mode === "ranked" || result.mode === "ranked_duel";
}

function formatSignedRp(value: number | null | undefined): string {
  if (typeof value !== "number") return "0 RP";
  return `${value >= 0 ? "+" : ""}${value} RP`;
}

function outcomeLabel(result: RecentResult): string | null {
  if (!isRankedResult(result)) return null;
  if (result.result_outcome === "win") return "WIN";
  if (result.result_outcome === "loss") return "LOSS";
  if (result.result_outcome === "draw") return "DRAW";
  return null;
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string }>();
  const premium = usePremiumStatus();
  const { profile } = usePlayerProfile();
  const [filter, setFilter] = useState<ResultFilter>("All");
  const results = useMemo(() => profile.recent_results.filter((result) => modeMatches(filter, result.mode)), [filter, profile.recent_results]);
  const historyLimit = getResultHistoryLimit(premium.plan);
  const visibleResults = useMemo(
    () => historyLimit == null ? results : results.slice(0, historyLimit),
    [historyLimit, results]
  );
  const hiddenCount = Math.max(0, results.length - visibleResults.length);
  const emptyText = profile.recent_results.length === 0 ? "Complete a puzzle to start your result history." : "No results for this filter yet.";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace(params.source === "versus" ? "/(tabs)/versus" : "/(tabs)/profile")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Results History</Text>
            <Text style={styles.sub}>
              {visibleResults.length} {premium.isPremium || historyLimit == null ? "saved results" : `of ${results.length} visible`}
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {FILTERS.map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.chipActive]}>
              <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Card padded={false}>
          {visibleResults.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>{profile.recent_results.length === 0 ? "No results yet" : "Nothing in this filter yet"}</Text>
              <Text style={styles.empty}>{emptyText}</Text>
              <Pressable style={styles.emptyButton} onPress={() => router.push("/(tabs)/play")}>
                <Text style={styles.emptyButtonText}>Play a puzzle</Text>
              </Pressable>
            </View>
          ) : (
            visibleResults.map((result, index) => {
              const ranked = isRankedResult(result);
              const outcome = outcomeLabel(result);
              return (
                <View key={result.result_id ?? result.session_id ?? `${result.puzzle_id}-${result.completed_at}-${index}`} style={[styles.row, index !== visibleResults.length - 1 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{outcome ? `${outcome} / ` : ""}{modeLabel(result.mode)} / {result.difficulty}</Text>
                    <Text style={styles.rowSub}>{new Date(result.completed_at).toLocaleDateString()}</Text>
                    <Text style={styles.rowMeta}>{formatTime(result.elapsed_seconds)} / {result.mistakes} mistakes / {result.hints_used} hints / {result.undo_count} undos</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.score}>{result.final_score.toLocaleString()}</Text>
                    <Text style={styles.xp}>{ranked ? formatSignedRp(result.rp_change) : `+${result.xp_earned} XP`}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>
        {hiddenCount > 0 ? (
          <View style={{ marginTop: 14 }}>
            <PremiumGateCard
              title="Unlock your full results history"
              body={`Free accounts can view the latest ${historyLimit} saved results. Premium unlocks the rest of your history without changing scores, RP, or matchmaking.`}
              onPress={() => router.push({ pathname: "/settings-info", params: { page: "premium" } })}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  title: { ...typography.screenTitle, fontSize: 30, color: C.ink, letterSpacing: -0.7 },
  sub: { color: C.muted, fontWeight: "700", marginTop: 4 },
  tabs: { gap: 8, paddingVertical: 18 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.muted, fontWeight: "800", fontSize: 12 },
  chipTextActive: { color: "#FBF8F2" },
  row: { flexDirection: "row", padding: 16, alignItems: "center" },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowTitle: { fontSize: 15, color: C.ink, fontWeight: "800" },
  rowSub: { fontSize: 12, color: C.muted, fontWeight: "700", marginTop: 3 },
  rowMeta: { fontSize: 12, color: C.muted, marginTop: 4 },
  score: { fontSize: 16, color: C.ink, fontWeight: "900" },
  xp: { fontSize: 12, color: C.accent, fontWeight: "800", marginTop: 3 },
  emptyWrap: { padding: 18 },
  emptyTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  empty: { color: C.muted, fontWeight: "700", marginTop: 6, lineHeight: 19 },
  emptyButton: { alignSelf: "flex-start", minHeight: 38, borderRadius: 999, backgroundColor: C.ink, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", marginTop: 14 },
  emptyButtonText: { color: "#FBF8F2", fontSize: 12, fontWeight: "900" },
});
