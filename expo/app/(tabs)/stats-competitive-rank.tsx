import { useFocusEffect } from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { getRankFromRp, RANKS, type RecentResult } from "@/lib/playerProfile";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatTime } from "@/lib/sudoku";

interface RankedDetail {
  seasonName: string;
  seasonEndsAt: string | null;
  peakRp: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

function formatRank(tier: string, division: string): string {
  return division ? `${tier} ${division}` : tier;
}

function formatSignedRp(value: number | null | undefined): string {
  if (typeof value !== "number") return "0 RP";
  return `${value >= 0 ? "+" : ""}${value} RP`;
}

function seasonCountdown(endsAt: string | null): string {
  if (!endsAt) return "Season schedule unavailable";
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return "Season schedule unavailable";
  const diffMs = end - Date.now();
  if (diffMs <= 0) return "Season ends today";
  const days = Math.ceil(diffMs / 86400000);
  return days <= 1 ? "Season ends today" : `Season ends in ${days} days`;
}

function outcomeText(result: RecentResult): string {
  if (result.result_outcome === "win") return "Win";
  if (result.result_outcome === "loss") return "Loss";
  if (result.result_outcome === "draw") return "Draw";
  return "Result";
}

export default function CompetitiveRankScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { profile } = usePlayerProfile();
  const [detail, setDetail] = useState<RankedDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(true);

  const rank = getRankFromRp(profile.rank_points);
  const nextRank = rank.nextMin !== null ? RANKS.find((entry) => entry.min === rank.nextMin) : null;
  const rankProgress = rank.nextMin === null ? 1 : (profile.rank_points - rank.currentMin) / (rank.nextMin - rank.currentMin);
  const rankedResults = useMemo(
    () => profile.recent_results.filter((result) => result.mode === "ranked" || result.mode === "ranked_duel").slice(0, 5),
    [profile.recent_results]
  );
  const matchesPlayed = isLoadingDetail ? 0 : detail?.matchesPlayed ?? profile.ranked_played;
  const wins = isLoadingDetail ? 0 : detail?.wins ?? profile.ranked_won;
  const losses = isLoadingDetail ? 0 : detail?.losses ?? Math.max(0, matchesPlayed - wins);
  const draws = isLoadingDetail ? 0 : detail?.draws ?? 0;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  useFocusEffect(useCallback(() => {
    let active = true;
    async function loadRankedDetail() {
      setIsLoadingDetail(true);
      if (!auth.user || !isSupabaseConfigured) {
        setDetail(null);
        setIsLoadingDetail(false);
        return;
      }
      const { data: season } = await supabase
        .from("ranked_seasons")
        .select("season_id,name,ends_at")
        .eq("status", "active")
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      if (!season?.season_id) {
        setDetail(null);
        setIsLoadingDetail(false);
        return;
      }
      const { data: rankedProfile } = await supabase
        .from("ranked_profiles")
        .select("peak_rp,matches_played,wins,losses,draws")
        .eq("user_id", auth.user.id)
        .eq("season_id", season.season_id)
        .maybeSingle();
      if (!active) return;
      setDetail({
        seasonName: season.name ?? "Season",
        seasonEndsAt: season.ends_at ?? null,
        peakRp: Number(rankedProfile?.peak_rp ?? profile.rank_points),
        matchesPlayed: Number(rankedProfile?.matches_played ?? profile.ranked_played),
        wins: Number(rankedProfile?.wins ?? profile.ranked_won),
        losses: Number(rankedProfile?.losses ?? Math.max(0, profile.ranked_played - profile.ranked_won)),
        draws: Number(rankedProfile?.draws ?? 0),
      });
      setIsLoadingDetail(false);
    }
    void loadRankedDetail().catch(() => {
      if (!active) return;
      setDetail(null);
      setIsLoadingDetail(false);
    });
    return () => { active = false; };
  }, [auth.user, profile.rank_points, profile.ranked_played, profile.ranked_won]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/(tabs)/profile")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>COMPETITIVE RANK</Text>
            <Text style={styles.title}>{formatRank(profile.rank_tier, profile.rank_division)}</Text>
          </View>
        </View>

        <Card style={{ marginTop: 18 }}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.label}>Current RP</Text>
              <Text style={styles.bigValue}>{profile.rank_points.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.label}>{detail?.seasonName ?? "Season"}</Text>
              <Text style={styles.seasonText}>{seasonCountdown(detail?.seasonEndsAt ?? null)}</Text>
            </View>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.rankBar, { width: `${Math.max(0, Math.min(1, rankProgress)) * 100}%` }]} />
          </View>
          <Text style={styles.subText}>{nextRank ? `${nextRank.min - profile.rank_points} RP to ${nextRank.tier}${nextRank.division ? ` ${nextRank.division}` : ""}` : "Top rank reached"}</Text>
        </Card>

        {isLoadingDetail ? (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.loadingText}>Loading season stats...</Text>
          </Card>
        ) : (
          <View style={styles.statsGrid}>
            <Stat label="Record" value={`${wins}W-${losses}L-${draws}D`} />
            <Stat label="Win rate" value={matchesPlayed > 0 ? `${winRate}%` : "No matches"} />
            <Stat label="Peak RP" value={`${(detail?.peakRp ?? profile.rank_points).toLocaleString()}`} />
            <Stat label="Matches" value={`${matchesPlayed}`} />
          </View>
        )}

        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>Recent ranked results</Text>
          <Card padded={false} style={{ marginTop: 10 }}>
            {rankedResults.length === 0 ? (
              <Text style={styles.empty}>Play Ranked Duel to start your season history.</Text>
            ) : (
              rankedResults.map((result, index) => (
                <View key={result.result_id ?? result.session_id ?? `${result.puzzle_id}-${result.completed_at}-${index}`} style={[styles.resultRow, index < rankedResults.length - 1 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle}>{outcomeText(result)} / {result.difficulty}</Text>
                    <Text style={styles.resultSub}>{formatTime(result.elapsed_seconds)} / {result.final_score.toLocaleString()} pts</Text>
                  </View>
                  <Text style={styles.rpChange}>{formatSignedRp(result.rp_change)}</Text>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  kicker: { fontSize: 11, color: C.muted, fontWeight: "800", letterSpacing: 1.5 },
  title: { fontSize: 30, fontWeight: "900", color: C.ink, letterSpacing: -0.7, marginTop: 2 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14 },
  label: { color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  bigValue: { color: C.ink, fontSize: 34, fontWeight: "900", letterSpacing: -0.8, marginTop: 3 },
  seasonText: { color: C.inkSoft, fontSize: 13, fontWeight: "800", marginTop: 5, textAlign: "right" },
  barTrack: { height: 8, backgroundColor: C.bgElevated, borderRadius: 999, overflow: "hidden", marginTop: 14 },
  rankBar: { height: 8, backgroundColor: C.gold, borderRadius: 999 },
  subText: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 8 },
  loadingText: { color: C.muted, fontSize: 13, fontWeight: "800" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  statCard: { flexBasis: "48%", flexGrow: 1, padding: 14 },
  statValue: { color: C.ink, fontSize: 22, fontWeight: "900" },
  statLabel: { color: C.muted, fontSize: 12, fontWeight: "800", marginTop: 3 },
  sectionTitle: { color: C.ink, fontSize: 18, fontWeight: "900" },
  empty: { padding: 18, color: C.muted, fontWeight: "700" },
  resultRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
  resultTitle: { color: C.ink, fontSize: 15, fontWeight: "900" },
  resultSub: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 4 },
  rpChange: { color: C.gold, fontWeight: "900" },
});
