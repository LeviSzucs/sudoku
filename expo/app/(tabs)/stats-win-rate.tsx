import { Stack, router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

const FILTERS = ["7 days", "30 days", "All time"] as const;
type Filter = typeof FILTERS[number];
function withinFilter(iso: string, filter: Filter): boolean { if (filter === "All time") return true; const days = filter === "7 days" ? 7 : 30; return Date.now() - new Date(iso).getTime() <= days * 86400000; }
function rate(wins: number, played: number): string { return played === 0 ? "0%" : `${Math.round((wins / played) * 100)}%`; }
function isDuelMode(mode: string): boolean { return ["duel", "daily_duel", "friend_challenge", "ranked", "ranked_duel"].includes(mode); }
function gameStats(matches: { result_outcome?: string }[]): { wins: number; losses: number; draws: number; played: number } {
  const wins = matches.filter((r) => r.result_outcome === "win").length;
  const losses = matches.filter((r) => r.result_outcome === "loss").length;
  const draws = matches.filter((r) => r.result_outcome === "draw").length;
  return { wins, losses, draws, played: matches.length };
}

export default function WinRateStatsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayerProfile();
  const [filter, setFilter] = useState<Filter>("All time");
  const matches = useMemo(() => profile.recent_results.filter((r) => isDuelMode(r.mode) && withinFilter(r.completed_at, filter)), [filter, profile.recent_results]);
  const wins = filter === "All time" ? profile.duels_won : matches.filter((r) => r.result_outcome === "win").length;
  const played = filter === "All time" ? profile.duels_played : matches.length;
  const losses = matches.filter((r) => r.result_outcome === "loss").length;
  const draws = matches.filter((r) => r.result_outcome === "draw").length;
  const daily = matches.filter((r) => ["duel", "daily_duel"].includes(r.mode) && !r.puzzle_id.toLowerCase().includes("friend"));
  const friend = matches.filter((r) => ["friend_challenge"].includes(r.mode) || (r.mode === "duel" && r.puzzle_id.toLowerCase().includes("friend")));
  const ranked = matches.filter((r) => ["ranked", "ranked_duel"].includes(r.mode));
  const form = matches.slice(0, 10).map((r) => r.result_outcome === "win" ? "W" : r.result_outcome === "loss" ? "L" : "D");
  const breakdown = [{ label: "Daily Duel", stats: gameStats(daily) }, { label: "Friend Challenge", stats: gameStats(friend) }, { label: "Ranked Duel", stats: gameStats(ranked) }];
  return <SafeAreaView style={styles.safe} edges={["top"]}><Stack.Screen options={{ headerShown: false }} /><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }}><View style={styles.header}><View><Text style={styles.title}>Win Rate</Text><Text style={styles.sub}>{filter} · Duels</Text></View><Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>Back</Text><ChevronRight color={C.ink} size={16} /></Pressable></View><View style={styles.tabs}>{FILTERS.map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}><Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text></Pressable>)}</View><Card style={{ marginTop: 16 }}><Text style={styles.kicker}>OVERALL DUEL WIN RATE</Text><Text style={styles.big}>{rate(wins, played)}</Text><Text style={styles.meta}>{wins} wins · {Math.max(0, played - wins - draws)} losses · {draws} draws</Text></Card><View style={styles.grid}>{breakdown.map(({ label, stats }) => <Mini key={label} title={label} value={rate(stats.wins, stats.played)} />)}<Mini title="Matches" value={`${played}`} /></View><Text style={styles.section}>Breakdown by game</Text>{breakdown.map(({ label, stats }) => <GameRow key={label} label={label} stats={stats} />)}<Text style={styles.section}>Current form</Text><View style={styles.form}>{form.length === 0 ? <Text style={styles.empty}>No recent duel matches yet.</Text> : form.map((f, index) => <View key={`${f}-${index}`} style={[styles.formDot, f === "W" ? styles.win : f === "L" ? styles.loss : styles.draw]}><Text style={styles.formText}>{f}</Text></View>)}</View></ScrollView></SafeAreaView>;
}
function Mini({ title, value }: { title: string; value: string }) { return <View style={styles.mini}><Text style={styles.miniValue}>{value}</Text><Text style={styles.miniTitle}>{title}</Text></View>; }
function GameRow({ label, stats }: { label: string; stats: { wins: number; losses: number; draws: number; played: number } }) { return <View style={styles.gameRow}><View><Text style={styles.gameTitle}>{label}</Text><Text style={styles.gameMeta}>{stats.played} played · {stats.wins}W {stats.losses}L {stats.draws}D</Text></View><Text style={styles.gameRate}>{rate(stats.wins, stats.played)}</Text></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, backButton: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, backText: { color: C.ink, fontWeight: "900", fontSize: 12 }, title: { fontSize: 30, fontWeight: "900", color: C.ink }, sub: { color: C.muted, fontWeight: "700", marginTop: 4 }, tabs: { flexDirection: "row", gap: 8, marginTop: 18 }, chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border }, chipActive: { backgroundColor: C.ink }, chipText: { color: C.muted, fontWeight: "800", fontSize: 12 }, chipTextActive: { color: "#FBF8F2" }, kicker: { color: C.muted, fontWeight: "900", fontSize: 12, letterSpacing: 1.1 }, big: { color: C.ink, fontWeight: "900", fontSize: 42, marginTop: 4 }, meta: { color: C.muted, fontWeight: "700" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }, mini: { flexBasis: "48%", flexGrow: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14 }, miniValue: { color: C.ink, fontWeight: "900", fontSize: 24 }, miniTitle: { color: C.muted, fontWeight: "700", marginTop: 4 }, section: { color: C.ink, fontWeight: "900", fontSize: 18, marginTop: 24, marginBottom: 10 }, gameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 }, gameTitle: { color: C.ink, fontWeight: "900" }, gameMeta: { color: C.muted, fontWeight: "700", marginTop: 3 }, gameRate: { color: C.accent, fontWeight: "900", fontSize: 18 }, form: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, formDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }, win: { backgroundColor: C.success }, loss: { backgroundColor: C.danger }, draw: { backgroundColor: C.mutedSoft }, formText: { color: "#FFF", fontWeight: "900" }, empty: { color: C.muted, fontWeight: "700" } });
