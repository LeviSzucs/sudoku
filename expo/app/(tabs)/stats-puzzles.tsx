import { Stack, router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import type { GameMode } from "@/hooks/useSudokuGame";

const FILTERS = ["7 days", "30 days", "All time"] as const;
type Filter = typeof FILTERS[number];
const MODES: { label: string; mode: GameMode }[] = [{ label: "Classic", mode: "classic" }, { label: "Daily", mode: "daily" }, { label: "Duel", mode: "duel" }, { label: "Ranked", mode: "ranked" }];

function withinFilter(iso: string, filter: Filter): boolean { if (filter === "All time") return true; const days = filter === "7 days" ? 7 : 30; return Date.now() - new Date(iso).getTime() <= days * 86400000; }
function pct(count: number, total: number): string { return total === 0 ? "0%" : `${Math.round((count / total) * 100)}%`; }

export default function PuzzleStatsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayerProfile();
  const [filter, setFilter] = useState<Filter>("All time");
  const results = useMemo(() => profile.recent_results.filter((r) => r.completed && withinFilter(r.completed_at, filter)), [filter, profile.recent_results]);
  const total = filter === "All time" ? profile.puzzles_completed : results.length;
  const byDifficulty = filter === "All time" ? { Easy: profile.easy_completed, Medium: profile.medium_completed, Hard: profile.hard_completed, Expert: profile.expert_completed, Master: profile.master_completed } : {
    Easy: results.filter((r) => r.difficulty === "Easy").length,
    Medium: results.filter((r) => r.difficulty === "Medium").length,
    Hard: results.filter((r) => r.difficulty === "Hard").length,
    Expert: results.filter((r) => r.difficulty === "Expert").length,
    Master: results.filter((r) => r.difficulty === "Master").length,
  };
  return <SafeAreaView style={styles.safe} edges={["top"]}><Stack.Screen options={{ headerShown: false }} /><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}><Header title="Puzzle Stats" sub={`${total} completed · ${filter}`} /><FilterTabs value={filter} onChange={setFilter} /><MetricCard title="Total completed" value={total.toLocaleString()} detail="Only valid completed puzzles count." /><Text style={styles.section}>By difficulty</Text>{Object.entries(byDifficulty).map(([label, count]) => <SplitRow key={label} label={label} count={count} total={total} />)}<Text style={styles.section}>By mode</Text>{MODES.map(({ label, mode }) => { const count = results.filter((r) => r.mode === mode).length; return <SplitRow key={mode} label={label} count={count} total={results.length} />; })}</ScrollView></SafeAreaView>;
}
function Header({ title, sub }: { title: string; sub: string }) { return <View style={styles.header}><View><Text style={styles.title}>{title}</Text><Text style={styles.sub}>{sub}</Text></View><Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>Back</Text><ChevronRight color={C.ink} size={16} /></Pressable></View>; }
function FilterTabs({ value, onChange }: { value: Filter; onChange: (filter: Filter) => void }) { return <View style={styles.tabs}>{FILTERS.map((f) => <Pressable key={f} onPress={() => onChange(f)} style={[styles.chip, value === f && styles.chipActive]}><Text style={[styles.chipText, value === f && styles.chipTextActive]}>{f}</Text></Pressable>)}</View>; }
function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) { return <Card style={{ marginTop: 16 }}><Text style={styles.metricTitle}>{title}</Text><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricDetail}>{detail}</Text></Card>; }
function SplitRow({ label, count, total }: { label: string; count: number; total: number }) { const width = total === 0 ? 0 : Math.max(4, (count / total) * 100); return <View style={styles.row}><View style={styles.rowTop}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowCount}>{count} · {pct(count, total)}</Text></View><View style={styles.track}><View style={[styles.bar, { width: `${width}%` }]} /></View></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, backButton: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, backText: { color: C.ink, fontWeight: "900", fontSize: 12 }, title: { fontSize: 30, fontWeight: "900", color: C.ink, letterSpacing: -0.7 }, sub: { color: C.muted, fontWeight: "700", marginTop: 4 }, tabs: { flexDirection: "row", gap: 8, marginTop: 18 }, chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border }, chipActive: { backgroundColor: C.ink, borderColor: C.ink }, chipText: { color: C.muted, fontWeight: "800", fontSize: 12 }, chipTextActive: { color: "#FBF8F2" }, metricTitle: { color: C.muted, fontWeight: "900", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1 }, metricValue: { color: C.ink, fontWeight: "900", fontSize: 36, marginTop: 4 }, metricDetail: { color: C.muted, fontWeight: "700", marginTop: 4 }, section: { color: C.ink, fontWeight: "900", fontSize: 18, marginTop: 24, marginBottom: 10 }, row: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 }, rowTop: { flexDirection: "row", justifyContent: "space-between" }, rowLabel: { color: C.ink, fontWeight: "900" }, rowCount: { color: C.muted, fontWeight: "800" }, track: { height: 8, backgroundColor: C.bgElevated, borderRadius: 999, overflow: "hidden", marginTop: 10 }, bar: { height: 8, backgroundColor: C.accent, borderRadius: 999 } });
