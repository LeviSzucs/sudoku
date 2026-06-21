import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Shield, Trophy } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import SectionHeader from "@/components/SectionHeader";
import { C } from "@/constants/colors";
import { usePlayerProfile, type PublicPlayerProfilePage, type PublicPlayerRecentResult } from "@/hooks/usePlayerProfile";
import { formatTime } from "@/lib/sudoku";

function isUuid(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function modeLabel(mode: string): string {
  if (mode === "classic") return "Classic";
  if (mode === "daily") return "Daily Sudoku";
  if (mode === "daily_duel") return "Daily Duel";
  if (mode === "friend_challenge") return "Friend Challenge";
  if (mode === "ranked" || mode === "ranked_duel") return "Ranked Duel";
  if (mode === "duel") return "Duel";
  return "Puzzle";
}

function formatSignedRp(value: number | null | undefined): string {
  if (typeof value !== "number") return "0 RP";
  return `${value >= 0 ? "+" : ""}${value} RP`;
}

function fastestClassicTime(profile: PublicPlayerProfilePage["profile"]): string {
  if (!profile) return "-";
  const values = [
    profile.best_easy_time,
    profile.best_medium_time,
    profile.best_hard_time,
    profile.best_expert_time,
    profile.best_master_time,
  ].filter((value): value is number => typeof value === "number" && value > 0);
  if (values.length === 0) return "-";
  return formatTime(Math.min(...values));
}

function winRate(profile: PublicPlayerProfilePage["profile"]): string {
  if (!profile || !profile.duels_played) return "No duels yet";
  return `${Math.round((profile.duels_won ?? 0) / profile.duels_played * 100)}%`;
}

function goBackSafely() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/leaderboards");
}

export default function PublicPlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { fetchPublicPlayerProfile } = usePlayerProfile();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicPlayerProfilePage>({ profile: null, recent_results: [] });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isUuid(id)) {
        if (active) {
          setData({ profile: null, recent_results: [] });
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const next = await fetchPublicPlayerProfile(id);
      if (!active) return;
      setData(next);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [fetchPublicPlayerProfile, id]);

  const profile = data.profile;
  const isPrivate = profile ? !profile.public_profile : false;
  const showStats = Boolean(profile?.public_profile && profile.show_stats_publicly);
  const showRecentResults = Boolean(profile?.public_profile && profile.show_recent_results_publicly);
  const profileName = profile?.display_name ?? profile?.username ?? "Player";
  const bestTime = useMemo(() => fastestClassicTime(profile), [profile]);
  const duelWinRate = useMemo(() => winRate(profile), [profile]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 36, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={goBackSafely} hitSlop={10} style={styles.iconButton}>
            <ArrowLeft size={20} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>PLAYER</Text>
            <Text style={styles.title}>Public profile</Text>
          </View>
        </View>

        {loading ? (
          <Card style={styles.centerCard}>
            <ActivityIndicator color={C.accent} />
            <Text style={styles.emptyText}>Loading player profile...</Text>
          </Card>
        ) : !profile ? (
          <Card style={styles.centerCard}>
            <Text style={styles.emptyTitle}>Profile unavailable</Text>
            <Text style={styles.emptyText}>We could not load this player profile.</Text>
          </Card>
        ) : (
          <>
            <Card>
              <View style={styles.hero}>
                <Avatar
                  {...profile}
                  initials={profile.initials}
                  color={profile.avatar_color}
                  symbol={profile.avatar_symbol}
                  variant="xl"
                  size={104}
                />
                <Text style={styles.name}>{profileName}</Text>
                {profile.username_handle ? <Text style={styles.handle}>@{profile.username_handle}</Text> : null}
                {showStats && profile.rank_tier ? (
                  <View style={styles.rankBadge}>
                    <Shield size={12} color={C.gold} />
                    <Text style={styles.rankBadgeText}>{profile.rank_tier}</Text>
                  </View>
                ) : null}
                {isPrivate ? (
                  <View style={styles.privateBanner}>
                    <Text style={styles.privateTitle}>This profile is private</Text>
                    <Text style={styles.privateText}>Only limited public identity details are available for this player.</Text>
                  </View>
                ) : null}
              </View>
            </Card>

            {showStats ? (
              <View style={styles.section}>
                <SectionHeader title="Public stats" />
                <View style={styles.statsGrid}>
                  <MetricCard label="Solved" value={`${profile.puzzles_completed ?? 0}`} />
                  <MetricCard label="Win rate" value={duelWinRate} />
                  <MetricCard label="Streak" value={`${profile.current_streak ?? 0}`} />
                  <MetricCard label="Best time" value={bestTime} />
                </View>
              </View>
            ) : null}

            {showRecentResults ? (
              <View style={styles.section}>
                <SectionHeader title="Recent results" />
                <Card padded={false}>
                  {data.recent_results.length === 0 ? (
                    <View style={styles.emptyRow}>
                      <Trophy size={26} color={C.mutedSoft} />
                      <Text style={styles.emptyText}>No public results yet.</Text>
                    </View>
                  ) : (
                    data.recent_results.map((result, index) => (
                      <PublicResultRow
                        key={result.result_id ?? `${result.puzzle_id}-${result.completed_at}-${index}`}
                        result={result}
                        last={index === data.recent_results.length - 1}
                      />
                    ))
                  )}
                </Card>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

function PublicResultRow({ result, last }: { result: PublicPlayerRecentResult; last: boolean }) {
  const ranked = result.mode === "ranked" || result.mode === "ranked_duel";
  return (
    <View style={[styles.resultRow, !last && styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.resultTitle}>{modeLabel(result.mode)} / {result.difficulty}</Text>
        <Text style={styles.resultSub}>
          {formatTime(result.elapsed_seconds)} / {result.mistakes} mistakes / {result.hints_used} hints
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.resultScore}>{result.final_score.toLocaleString()}</Text>
        <Text style={styles.resultMeta}>{ranked ? formatSignedRp(result.rp_change) : `+${result.xp_earned} XP`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18, paddingTop: 12 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  kicker: { fontSize: 11, color: C.muted, fontWeight: "700", letterSpacing: 1.6 },
  title: { color: C.ink, fontSize: 28, fontWeight: "900", marginTop: 2 },
  hero: { alignItems: "center", gap: 8, paddingVertical: 10 },
  name: { color: C.ink, fontSize: 28, fontWeight: "900", textAlign: "center" },
  handle: { color: C.muted, fontWeight: "800", fontSize: 14 },
  rankBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: C.goldSoft, paddingHorizontal: 12, paddingVertical: 7, marginTop: 2 },
  rankBadgeText: { color: C.gold, fontWeight: "900", fontSize: 12 },
  privateBanner: { width: "100%", borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, padding: 14, marginTop: 8 },
  privateTitle: { color: C.ink, fontSize: 15, fontWeight: "900", textAlign: "center" },
  privateText: { color: C.muted, fontWeight: "700", textAlign: "center", marginTop: 4, lineHeight: 18 },
  section: { marginTop: 22 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { width: "47.5%", minHeight: 98, justifyContent: "center" },
  metricValue: { color: C.ink, fontSize: 23, fontWeight: "900" },
  metricLabel: { color: C.muted, fontWeight: "800", marginTop: 6 },
  centerCard: { alignItems: "center", gap: 10, paddingVertical: 28 },
  emptyRow: { alignItems: "center", justifyContent: "center", padding: 22, gap: 8 },
  emptyTitle: { color: C.ink, fontSize: 18, fontWeight: "900", textAlign: "center" },
  emptyText: { color: C.muted, fontWeight: "700", textAlign: "center" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  resultTitle: { color: C.ink, fontWeight: "900", fontSize: 15 },
  resultSub: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 4 },
  resultScore: { color: C.ink, fontWeight: "900", fontSize: 16 },
  resultMeta: { color: C.muted, fontWeight: "800", fontSize: 12, marginTop: 4 },
});
