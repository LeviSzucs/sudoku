import { Crown, Trophy } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import type { LeaderboardEntry } from "@/constants/mockData";

type Tab = "daily" | "weekly" | "friends" | "ranked";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "daily", label: "Daily", sub: "Same puzzle for everyone" },
  { id: "weekly", label: "Weekly", sub: "Most points this week" },
  { id: "friends", label: "Friends", sub: "Compare with friends" },
  { id: "ranked", label: "Ranked", sub: "By competitive RP" },
];

function timeToSeconds(time: string): number {
  const [minutesRaw, secondsRaw] = time.split(":");
  return Number(minutesRaw ?? 0) * 60 + Number(secondsRaw ?? 0);
}

function secondsToTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function rankEntries(entries: LeaderboardEntry[], tab: Tab): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (tab === "daily") {
      return b.score - a.score || timeToSeconds(a.time) - timeToSeconds(b.time) || (a.mistakes ?? 0) - (b.mistakes ?? 0) || (a.hints ?? 0) - (b.hints ?? 0) || (a.undos ?? 0) - (b.undos ?? 0);
    }
    if (tab === "ranked") return (b.rp ?? b.score) - (a.rp ?? a.score);
    return (b.weeklyPoints ?? b.score) - (a.weeklyPoints ?? a.score);
  });
  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export default function LeaderboardsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("daily");
  const { profile } = usePlayerProfile();
  const data = useMemo<LeaderboardEntry[]>(() => {
    const dailyResult = profile.recent_results.find((r) => r.mode === "daily" && r.eligible_for_leaderboard && r.completed);
    const weeklyPoints = profile.recent_results.reduce((total, r) => total + r.final_score + r.xp_earned, 0);
    const rankedResult = profile.recent_results.find((r) => r.mode === "ranked" && r.completed);
    const tier = `${profile.rank_tier}${profile.rank_division ? ` ${profile.rank_division}` : ""}`;
    const currentUserEntry: LeaderboardEntry = {
      id: "self",
      user: { id: profile.user_id, username: profile.username, initials: profile.initials, avatarColor: profile.avatar_color },
      score: dailyResult?.final_score ?? 0,
      time: secondsToTime(dailyResult?.elapsed_seconds ?? 0),
      mistakes: dailyResult?.mistakes ?? 0,
      hints: dailyResult?.hints_used ?? 0,
      undos: dailyResult?.undo_count ?? 0,
      weeklyPoints,
      rp: profile.rank_points,
      tier,
      rank: 0,
      isFriend: true,
    };

    switch (tab) {
      case "weekly": {
        return weeklyPoints > 0 ? rankEntries([{ ...currentUserEntry, score: weeklyPoints }], tab) : [];
      }
      case "friends": {
        // Only show the user for friends tab — no mock friends
        return [];
      }
      case "ranked": {
        return rankedResult ? rankEntries([{ ...currentUserEntry, score: profile.rank_points, time: tier }], tab) : [];
      }
      default: {
        return currentUserEntry.score > 0 ? rankEntries([currentUserEntry], tab) : [];
      }
    }
  }, [profile, tab]);

  const valueLabel = tab === "ranked" ? "RP" : tab === "daily" ? "SCORE" : "POINTS";
  const podiumEntries = [2, 1, 3].map((rankPosition) => data.find((entry) => entry.rank === rankPosition));
  const podiumHeights: Record<number, number> = { 1: 132, 2: 104, 3: 78 };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.kicker}>RANKINGS</Text>
        <Text style={styles.title}>Leaderboards</Text>
        <Text style={styles.subtitle}>
          {TABS.find((t) => t.id === tab)?.sub ?? ""}
        </Text>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 18, marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={[
                  styles.tabPill,
                  active && { backgroundColor: C.ink, borderColor: C.ink },
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    active && { color: "#FBF8F2" },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 96,
          paddingTop: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Empty states */}
        {tab === "friends" && data.length <= 1 && !data.some((e) => e.id !== "self") ? (
          <Card style={{ alignItems: "center", paddingVertical: 32, marginBottom: 18 }}>
            <Crown size={36} color={C.mutedSoft} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptySub}>
              Add friends to compare scores on the leaderboard
            </Text>
          </Card>
        ) : data.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: 32, marginBottom: 18 }}>
            <Trophy size={36} color={C.mutedSoft} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No scores yet</Text>
            <Text style={styles.emptySub}>
              {tab === "daily" ? "Complete today's daily puzzle to appear here" : "Scores will appear once you start playing"}
            </Text>
          </Card>
        ) : (
          <>
            {/* Top 3 podium */}
            <View style={styles.podium}>
              {podiumEntries.map((entry, columnIndex) => {
                if (!entry) return <View key={`empty-${columnIndex}`} style={styles.podiumCol} />;
                const place = entry.rank;
                const blockHeight = podiumHeights[place] ?? podiumHeights[3];
                const bg = place === 1 ? C.gold : place === 2 ? C.mutedSoft : "#C8835A";
                return (
                  <View key={entry.id} style={styles.podiumCol}>
                    <View style={styles.podiumInfo}>
                      <Avatar
                        initials={entry.user.initials}
                        color={entry.user.avatarColor}
                        size={place === 1 ? 56 : 46}
                      />
                      <Text style={styles.podiumName} numberOfLines={1}>
                        {entry.user.username}
                      </Text>
                      <Text style={styles.podiumScore} numberOfLines={1}>
                        {tab === "ranked" ? `${entry.rp ?? entry.score} RP` : (tab === "daily" ? entry.score : (entry.weeklyPoints ?? entry.score)).toLocaleString()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.podiumBlock,
                        {
                          height: blockHeight,
                          backgroundColor: bg,
                        },
                      ]}
                    >
                      <Text style={styles.podiumPlace}>{place}</Text>
                      {place === 1 ? (
                        <Trophy size={18} color="#FBF8F2" style={{ marginTop: 6 }} />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* List */}
            <View style={styles.listHeader}>
              <Text style={[styles.listHeaderText, { width: 28 }]}>#</Text>
              <Text style={[styles.listHeaderText, { flex: 1, marginLeft: 12 }]}>PLAYER</Text>
              <Text style={styles.listHeaderText}>{valueLabel}</Text>
            </View>

            <Card padded={false}>
              {data.map((entry, i) => (
                <View
                  key={entry.id}
                  style={[
                    styles.row,
                    i < data.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: C.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rank,
                      entry.rank === 1 && { color: C.gold },
                    ]}
                  >
                    {entry.rank}
                  </Text>
                  <Avatar
                    initials={entry.user.initials}
                    color={entry.user.avatarColor}
                    size={36}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.name}>{entry.user.username}</Text>
                    {tab === "daily" ? (
                      <Text style={styles.metaText}>{entry.time} · {entry.mistakes ?? 0}M {entry.hints ?? 0}H {entry.undos ?? 0}U</Text>
                    ) : tab === "ranked" ? (
                      <Text style={styles.metaText}>{entry.tier ?? entry.time}</Text>
                    ) : tab === "friends" ? (
                      <Text style={styles.metaText}>{entry.user.id === profile.user_id || entry.user.username === profile.username ? "You" : "Friend"}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.score}>
                    {tab === "ranked"
                      ? `${entry.rp ?? entry.score} RP`
                      : tab === "daily"
                      ? entry.score.toLocaleString()
                      : (entry.weeklyPoints ?? entry.score).toLocaleString()}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  kicker: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    marginTop: 4,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.inkSoft,
    letterSpacing: 0.2,
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingHorizontal: 8,
    gap: 8,
  },
  podiumCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  podiumInfo: {
    height: 114,
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
  },
  podiumName: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
    marginTop: 8,
    maxWidth: "100%",
  },
  podiumScore: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
    marginBottom: 8,
    fontWeight: "600",
  },
  podiumBlock: {
    width: "92%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    alignItems: "center",
    paddingTop: 12,
  },
  podiumPlace: {
    color: "#FBF8F2",
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Georgia",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listHeaderText: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rank: {
    width: 28,
    fontSize: 14,
    fontWeight: "700",
    color: C.muted,
    fontVariant: ["tabular-nums"],
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: C.ink,
  },
  metaText: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },
  score: {
    fontSize: 15,
    fontWeight: "700",
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  demoLabel: {
    alignSelf: "center",
    backgroundColor: C.amberSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  demoLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.amber,
    letterSpacing: 0.8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.ink,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
