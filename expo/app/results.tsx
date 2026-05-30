import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import type { GameMode } from "@/hooks/useSudokuGame";
import { formatTime } from "@/lib/sudoku";

type ResultFilter = "All" | "Classic" | "Daily" | "Duel" | "Ranked";
const FILTERS: ResultFilter[] = ["All", "Classic", "Daily", "Duel", "Ranked"];

function modeMatches(filter: ResultFilter, mode: GameMode): boolean {
  if (filter === "All") return true;
  if (filter === "Classic") return mode === "classic";
  if (filter === "Daily") return mode === "daily";
  if (filter === "Duel") return mode === "duel";
  return mode === "ranked";
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayerProfile();
  const [filter, setFilter] = useState<ResultFilter>("All");
  const results = useMemo(() => profile.recent_results.filter((r) => modeMatches(filter, r.mode)), [filter, profile.recent_results]);
  return <SafeAreaView style={styles.safe} edges={["top"]}><Stack.Screen options={{ title: "Results History", headerShown: true }} /><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}><Text style={styles.title}>Results History</Text><Text style={styles.sub}>{results.length} saved results</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{FILTERS.map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}><Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text></Pressable>)}</ScrollView><Card padded={false}>{results.length === 0 ? <Text style={styles.empty}>No results for this filter yet.</Text> : results.map((r, index) => <View key={`${r.puzzle_id}-${r.completed_at}`} style={[styles.row, index !== results.length - 1 && styles.divider]}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{r.mode} · {r.difficulty}</Text><Text style={styles.rowSub}>{new Date(r.completed_at).toLocaleDateString()}</Text><Text style={styles.rowMeta}>{formatTime(r.elapsed_seconds)} · {r.mistakes} mistakes · {r.hints_used} hints · {r.undo_count} undos</Text></View><View style={{ alignItems: "flex-end" }}><Text style={styles.score}>{r.final_score.toLocaleString()}</Text><Text style={styles.xp}>+{r.xp_earned} XP</Text></View></View>)}</Card></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, title: { fontSize: 30, fontWeight: "800", color: C.ink, letterSpacing: -0.7 }, sub: { color: C.muted, fontWeight: "700", marginTop: 4 }, tabs: { gap: 8, paddingVertical: 18 }, chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border }, chipActive: { backgroundColor: C.ink, borderColor: C.ink }, chipText: { color: C.muted, fontWeight: "800", fontSize: 12 }, chipTextActive: { color: "#FBF8F2" }, row: { flexDirection: "row", padding: 16, alignItems: "center" }, divider: { borderBottomWidth: 1, borderBottomColor: C.border }, rowTitle: { fontSize: 15, color: C.ink, fontWeight: "800", textTransform: "capitalize" }, rowSub: { fontSize: 12, color: C.muted, fontWeight: "700", marginTop: 3 }, rowMeta: { fontSize: 12, color: C.muted, marginTop: 4 }, score: { fontSize: 16, color: C.ink, fontWeight: "900" }, xp: { fontSize: 12, color: C.accent, fontWeight: "800", marginTop: 3 }, empty: { padding: 18, color: C.muted, fontWeight: "700" } });
