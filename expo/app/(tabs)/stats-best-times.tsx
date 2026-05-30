import { Stack, router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import type { Difficulty } from "@/constants/mockData";
import type { GameMode } from "@/hooks/useSudokuGame";
import { formatTime } from "@/lib/sudoku";

const FILTERS = ["7 days", "30 days", "All time"] as const;
type Filter = typeof FILTERS[number];
const MODES: { label: string; mode: GameMode }[] = [{ label: "Classic", mode: "classic" }, { label: "Daily", mode: "daily" }, { label: "Duel", mode: "duel" }, { label: "Ranked", mode: "ranked" }];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert", "Master"];
function withinFilter(iso: string, filter: Filter): boolean { if (filter === "All time") return true; const days = filter === "7 days" ? 7 : 30; return Date.now() - new Date(iso).getTime() <= days * 86400000; }
function best(values: number[]): string { return values.length === 0 ? "—" : formatTime(Math.min(...values)); }
function avg(values: number[]): string { return values.length === 0 ? "—" : formatTime(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)); }

export default function BestTimesScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayerProfile();
  const [filter, setFilter] = useState<Filter>("All time");
  const results = useMemo(() => profile.recent_results.filter((r) => r.completed && withinFilter(r.completed_at, filter)), [filter, profile.recent_results]);
  const latest = results[0];
  return <SafeAreaView style={styles.safe} edges={["top"]}><Stack.Screen options={{ headerShown: false }} /><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }}><View style={styles.header}><View><Text style={styles.title}>Best Times</Text><Text style={styles.sub}>Valid completed puzzles only</Text></View><Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>Back</Text><ChevronRight color={C.ink} size={16} /></Pressable></View><View style={styles.tabs}>{FILTERS.map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}><Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text></Pressable>)}</View><View style={styles.grid}><Mini title="Average" value={avg(results.map((r) => r.elapsed_seconds))} /><Mini title="Latest" value={latest ? formatTime(latest.elapsed_seconds) : "—"} /></View><Text style={styles.section}>By difficulty</Text>{DIFFICULTIES.map((difficulty) => <TimeRow key={difficulty} label={difficulty} value={filter === "All time" && profile.best_times_by_difficulty[difficulty] ? formatTime(profile.best_times_by_difficulty[difficulty] ?? 0) : best(results.filter((r) => r.difficulty === difficulty).map((r) => r.elapsed_seconds))} />)}<Text style={styles.section}>By mode</Text>{MODES.map(({ label, mode }) => <TimeRow key={mode} label={label} value={best(results.filter((r) => r.mode === mode).map((r) => r.elapsed_seconds))} />)}</ScrollView></SafeAreaView>;
}
function Mini({ title, value }: { title: string; value: string }) { return <Card style={styles.mini}><Text style={styles.miniTitle}>{title}</Text><Text style={styles.miniValue}>{value}</Text></Card>; }
function TimeRow({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, backButton: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, backText: { color: C.ink, fontWeight: "900", fontSize: 12 }, title: { fontSize: 30, fontWeight: "900", color: C.ink }, sub: { color: C.muted, fontWeight: "700", marginTop: 4 }, tabs: { flexDirection: "row", gap: 8, marginTop: 18 }, chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border }, chipActive: { backgroundColor: C.ink }, chipText: { color: C.muted, fontWeight: "800", fontSize: 12 }, chipTextActive: { color: "#FBF8F2" }, grid: { flexDirection: "row", gap: 10, marginTop: 16 }, mini: { flex: 1 }, miniTitle: { color: C.muted, fontWeight: "900", fontSize: 12, textTransform: "uppercase" }, miniValue: { color: C.ink, fontWeight: "900", fontSize: 26, marginTop: 6 }, section: { color: C.ink, fontWeight: "900", fontSize: 18, marginTop: 24, marginBottom: 10 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 10 }, rowLabel: { color: C.ink, fontWeight: "900" }, rowValue: { color: C.accent, fontWeight: "900", fontSize: 16 } });
