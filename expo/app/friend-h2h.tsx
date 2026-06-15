import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Swords, Trophy } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import SectionHeader from "@/components/SectionHeader";
import { C } from "@/constants/colors";
import { usePlayerProfile, type FriendHeadToHeadSummary, type FriendHeadToHeadMatch } from "@/hooks/usePlayerProfile";
import { formatTime } from "@/lib/sudoku";

function formatScore(value: number | null | undefined): string {
  return value == null ? "-" : value.toLocaleString();
}

function formatOptionalTime(value: number | null | undefined): string {
  return value == null ? "-" : formatTime(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function outcomeLabel(outcome: FriendHeadToHeadMatch["outcome"]): string {
  if (outcome === "won") return "Won";
  if (outcome === "lost") return "Lost";
  return "Draw";
}

function goBackSafely() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace({ pathname: "/friends", params: { mode: "challenge" } });
}

export default function FriendHeadToHeadScreen() {
  const { friendId } = useLocalSearchParams<{ friendId?: string }>();
  const insets = useSafeAreaInsets();
  const { fetchFriendHeadToHead } = usePlayerProfile();
  const [summary, setSummary] = useState<FriendHeadToHeadSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const row = friendId ? await fetchFriendHeadToHead(friendId) : null;
      if (!active) return;
      setSummary(row);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [fetchFriendHeadToHead, friendId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBackSafely} hitSlop={10} style={styles.iconButton}>
            <ArrowLeft size={20} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>HEAD TO HEAD</Text>
            <Text style={styles.title}>Challenge history</Text>
          </View>
        </View>

        {loading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={C.accent} />
            <Text style={styles.emptyText}>Loading head-to-head record...</Text>
          </Card>
        ) : !summary ? (
          <Card style={styles.emptyCard}>
            <Swords size={32} color={C.mutedSoft} />
            <Text style={styles.emptyTitle}>History unavailable</Text>
            <Text style={styles.emptyText}>Head-to-head history is only available for accepted friends.</Text>
          </Card>
        ) : (
          <>
            <Card>
              <View style={styles.friendHeader}>
                <Avatar
                  initials={summary.friend_initials}
                  color={summary.friend_avatar_color}
                  symbol={summary.friend_avatar_symbol}
                  avatar_style_version={summary.friend_avatar_style_version}
                  avatar_bg_color={summary.friend_avatar_bg_color}
                  avatar_initials={summary.friend_avatar_initials}
                  avatar_skin_tone={summary.friend_avatar_skin_tone}
                  avatar_hair_style={summary.friend_avatar_hair_style}
                  avatar_hair_color={summary.friend_avatar_hair_color}
                  avatar_top_style={summary.friend_avatar_top_style}
                  avatar_top_color={summary.friend_avatar_top_color}
                  avatar_accessory={summary.friend_avatar_accessory}
                  avatar_frame={summary.friend_avatar_frame}
                  size={58}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{summary.friend_display_name}</Text>
                  <Text style={styles.friendHandle}>@{summary.friend_username_handle}</Text>
                </View>
              </View>
              <View style={styles.recordRow}>
                <RecordBox label="You" value={summary.current_user_wins} />
                <Text style={styles.recordDash}>-</Text>
                <RecordBox label={summary.friend_display_name} value={summary.friend_wins} />
              </View>
              <Text style={styles.recordSub}>
                {summary.total_completed} completed challenge{summary.total_completed === 1 ? "" : "s"}
                {summary.draws > 0 ? ` / ${summary.draws} draw${summary.draws === 1 ? "" : "s"}` : ""}
              </Text>
            </Card>

            <View style={styles.section}>
              <SectionHeader title="Comparison" />
              <View style={styles.grid}>
                <MetricCard label="Avg score" you={formatScore(Math.round(summary.current_user_average_score))} friend={formatScore(Math.round(summary.friend_average_score))} friendName={summary.friend_display_name} />
                <MetricCard label="Best score" you={formatScore(summary.current_user_best_score)} friend={formatScore(summary.friend_best_score)} friendName={summary.friend_display_name} />
                <MetricCard label="Fastest win" you={formatOptionalTime(summary.current_user_fastest_win)} friend={formatOptionalTime(summary.friend_fastest_win)} friendName={summary.friend_display_name} />
              </View>
            </View>

            <View style={styles.section}>
              <SectionHeader title="Recent matches" />
              <Card padded={false}>
                {summary.recent_completed_challenges.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Trophy size={28} color={C.mutedSoft} />
                    <Text style={styles.emptyText}>Challenge {summary.friend_display_name} to start your head-to-head record.</Text>
                  </View>
                ) : summary.recent_completed_challenges.map((match, index) => (
                  <MatchRow
                    key={match.challenge_id}
                    match={match}
                    friendName={summary.friend_display_name}
                    last={index === summary.recent_completed_challenges.length - 1}
                  />
                ))}
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecordBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.recordBox}>
      <Text style={styles.recordValue}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </View>
  );
}

function MetricCard({ label, you, friend, friendName }: { label: string; you: string; friend: string; friendName: string }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricLine}><Text style={styles.metricName}>You</Text><Text style={styles.metricValue}>{you}</Text></View>
      <View style={styles.metricLine}><Text style={styles.metricName}>{friendName}</Text><Text style={styles.metricValue}>{friend}</Text></View>
    </Card>
  );
}

function MatchRow({ match, friendName, last }: { match: FriendHeadToHeadMatch; friendName: string; last: boolean }) {
  return (
    <View style={[styles.matchRow, !last && styles.rowBorder]}>
      <View style={styles.matchTop}>
        <View>
          <Text style={styles.matchTitle}>{outcomeLabel(match.outcome)} / {match.difficulty}</Text>
          <Text style={styles.matchDate}>{formatDate(match.completed_at)}</Text>
        </View>
        <Text style={[styles.outcomePill, match.outcome === "won" ? styles.winPill : match.outcome === "lost" ? styles.lossPill : styles.drawPill]}>{outcomeLabel(match.outcome)}</Text>
      </View>
      <View style={styles.resultCompare}>
        <ResultMini label="You" score={match.current_user_score} seconds={match.current_user_elapsed_seconds} mistakes={match.current_user_mistakes} hints={match.current_user_hints_used} undos={match.current_user_undo_count} />
        <ResultMini label={friendName} score={match.friend_score} seconds={match.friend_elapsed_seconds} mistakes={match.friend_mistakes} hints={match.friend_hints_used} undos={match.friend_undo_count} />
      </View>
    </View>
  );
}

function ResultMini({ label, score, seconds, mistakes, hints, undos }: { label: string; score: number | null; seconds: number | null; mistakes: number | null; hints: number | null; undos: number | null }) {
  return (
    <View style={styles.resultMini}>
      <Text style={styles.resultMiniLabel}>{label}</Text>
      <Text style={styles.resultMiniScore}>{formatScore(score)}</Text>
      <Text style={styles.resultMiniSub}>{formatOptionalTime(seconds)}</Text>
      <Text style={styles.resultMiniSub}>{mistakes ?? 0}M / {hints ?? 0}H / {undos ?? 0}U</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18, paddingTop: 12 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  kicker: { fontSize: 11, color: C.muted, fontWeight: "700", letterSpacing: 1.6 },
  title: { color: C.ink, fontSize: 28, fontWeight: "900", marginTop: 2 },
  section: { marginTop: 24 },
  friendHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  friendName: { color: C.ink, fontSize: 20, fontWeight: "900" },
  friendHandle: { color: C.muted, fontWeight: "800", marginTop: 3 },
  recordRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 20 },
  recordBox: { minWidth: 92, alignItems: "center" },
  recordValue: { color: C.ink, fontSize: 42, fontWeight: "900" },
  recordLabel: { color: C.muted, fontWeight: "800", marginTop: 2 },
  recordDash: { color: C.mutedSoft, fontSize: 30, fontWeight: "900" },
  recordSub: { color: C.muted, fontWeight: "800", textAlign: "center", marginTop: 10 },
  grid: { gap: 12 },
  metricCard: { padding: 14 },
  metricLabel: { color: C.ink, fontWeight: "900", fontSize: 15, marginBottom: 8 },
  metricLine: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 4 },
  metricName: { color: C.muted, fontWeight: "800", flex: 1 },
  metricValue: { color: C.ink, fontWeight: "900" },
  loadingCard: { alignItems: "center", gap: 10 },
  emptyCard: { alignItems: "center", gap: 8 },
  emptyRow: { alignItems: "center", justifyContent: "center", padding: 22, gap: 8 },
  emptyTitle: { color: C.ink, fontSize: 18, fontWeight: "900" },
  emptyText: { color: C.muted, fontWeight: "700", textAlign: "center" },
  matchRow: { padding: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  matchTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  matchTitle: { color: C.ink, fontWeight: "900", fontSize: 15 },
  matchDate: { color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 3 },
  outcomePill: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: "900" },
  winPill: { color: C.success, backgroundColor: "#E5F1E9" },
  lossPill: { color: C.danger, backgroundColor: "#F7DEDC" },
  drawPill: { color: C.muted, backgroundColor: C.bgElevated },
  resultCompare: { flexDirection: "row", gap: 12 },
  resultMini: { flex: 1, borderRadius: 12, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, padding: 10 },
  resultMiniLabel: { color: C.muted, fontSize: 11, fontWeight: "800" },
  resultMiniScore: { color: C.ink, fontSize: 16, fontWeight: "900", marginTop: 2 },
  resultMiniSub: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
});
