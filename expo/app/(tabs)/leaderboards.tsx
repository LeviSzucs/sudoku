import { Crown, Trophy } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { getDailyDateKey } from "@/lib/daily";

type Tab = "daily" | "weekly" | "friends" | "ranked";

interface LeaderboardEntry {
  id: string;
  rank: number;
  user: { id: string; username: string; initials: string; avatarColor: string };
  score: number;
  time: string;
  mistakes?: number;
  hints?: number;
  undos?: number;
  puzzlesCompleted?: number;
  bestScore?: number;
  tier?: string;
  wins?: number;
  losses?: number;
  draws?: number;
}

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "daily", label: "Daily", sub: "Same puzzle for everyone" },
  { id: "weekly", label: "Weekly", sub: "Most points this week" },
  { id: "friends", label: "Friends", sub: "Compare with friends" },
  { id: "ranked", label: "Ranked", sub: "By competitive RP" },
];

function secondsToTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "-";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function LeaderboardsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("daily");
  const auth = useAuth();
  const { profile, fetchDailyLeaderboard, fetchWeeklyLeaderboard, fetchFriendsWeeklyLeaderboard, fetchRankedLeaderboard, fetchFriends } = usePlayerProfile();
  const [dailyData, setDailyData] = useState<LeaderboardEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<LeaderboardEntry[]>([]);
  const [friendsData, setFriendsData] = useState<LeaderboardEntry[]>([]);
  const [rankedData, setRankedData] = useState<LeaderboardEntry[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingRanked, setIsLoadingRanked] = useState(false);
  const today = useMemo(() => getDailyDateKey(), []);
  const currentUserId = auth.user?.id ?? profile.user_id;

  useEffect(() => {
    let active = true;
    if (tab !== "daily") return () => { active = false; };

    setIsLoadingDaily(true);
    void fetchDailyLeaderboard(today)
      .then((rows) => {
        if (!active) return;
        setDailyData(rows.map((row, index) => ({
          id: row.result_id,
          rank: index + 1,
          user: { id: row.user_id, username: row.username, initials: row.initials, avatarColor: row.avatar_color },
          score: row.final_score,
          time: secondsToTime(row.elapsed_seconds),
          mistakes: row.mistakes,
          hints: row.hints_used,
          undos: row.undo_count,
        })));
      })
      .finally(() => {
        if (active) setIsLoadingDaily(false);
      });

    return () => { active = false; };
  }, [fetchDailyLeaderboard, tab, today]);

  useEffect(() => {
    let active = true;
    if (tab !== "weekly") return () => { active = false; };

    setIsLoadingWeekly(true);
    void fetchWeeklyLeaderboard(today)
      .then((rows) => {
        if (!active) return;
        setWeeklyData(rows.map((row) => ({
          id: row.user_id,
          rank: row.rank,
          user: { id: row.user_id, username: row.username, initials: row.initials, avatarColor: row.avatar_color },
          score: row.total_score,
          time: secondsToTime(row.total_time),
          puzzlesCompleted: row.puzzles_completed,
          bestScore: row.best_score,
        })));
      })
      .finally(() => {
        if (active) setIsLoadingWeekly(false);
      });

    return () => { active = false; };
  }, [fetchWeeklyLeaderboard, tab, today]);

  useEffect(() => {
    let active = true;
    if (tab !== "friends") return () => { active = false; };

    setIsLoadingFriends(true);
    void Promise.all([fetchFriends(), fetchFriendsWeeklyLeaderboard(today)])
      .then(([friends, rows]) => {
        if (!active) return;
        setFriendsCount(friends.length);
        setFriendsData(rows.map((row) => ({
          id: row.user_id,
          rank: row.rank,
          user: { id: row.user_id, username: row.username, initials: row.initials, avatarColor: row.avatar_color },
          score: row.total_score,
          time: secondsToTime(row.total_time),
          puzzlesCompleted: row.puzzles_completed,
          bestScore: row.best_score,
        })));
      })
      .finally(() => {
        if (active) setIsLoadingFriends(false);
      });

    return () => { active = false; };
  }, [fetchFriends, fetchFriendsWeeklyLeaderboard, tab, today]);

  useEffect(() => {
    let active = true;
    if (tab !== "ranked") return () => { active = false; };

    setIsLoadingRanked(true);
    void fetchRankedLeaderboard()
      .then((rows) => {
        if (!active) return;
        setRankedData(rows.map((row) => ({
          id: row.user_id,
          rank: row.rank,
          user: { id: row.user_id, username: row.username, initials: row.initials, avatarColor: row.avatar_color },
          score: row.rp,
          time: "",
          tier: row.current_tier,
          puzzlesCompleted: row.matches_played,
          wins: row.wins,
          losses: row.losses,
          draws: row.draws,
        })));
      })
      .finally(() => {
        if (active) setIsLoadingRanked(false);
      });

    return () => { active = false; };
  }, [fetchRankedLeaderboard, tab]);

  const data = useMemo<LeaderboardEntry[]>(() => {
    if (tab === "daily") return dailyData;
    if (tab === "weekly") return weeklyData;
    if (tab === "friends") return friendsData;
    return rankedData;
  }, [dailyData, friendsData, rankedData, tab, weeklyData]);

  const valueLabel = tab === "ranked" ? "RP" : tab === "daily" ? "SCORE" : "POINTS";
  const podiumEntries = [2, 1, 3].map((rankPosition) => data.find((entry) => entry.rank === rankPosition));
  const podiumHeights: Record<number, number> = { 1: 132, 2: 104, 3: 78 };
  const currentUserDailyEntry = data.find((entry) => entry.user.id === currentUserId);
  const showDailyJoinPrompt = tab === "daily" && !isLoadingDaily && data.length > 0 && !currentUserDailyEntry;
  const currentUserWeeklyEntry = data.find((entry) => entry.user.id === currentUserId);
  const showWeeklyJoinPrompt = tab === "weekly" && !isLoadingWeekly && data.length > 0 && !currentUserWeeklyEntry;

  const emptyState = (() => {
    if (tab === "daily") {
      return {
        title: isLoadingDaily ? "Loading Daily results" : "No Daily results yet",
        sub: isLoadingDaily ? "Checking today's scores" : "Complete today's Daily Sudoku to join the leaderboard",
        icon: <Trophy size={36} color={C.mutedSoft} strokeWidth={1.5} />,
      };
    }
    if (tab === "weekly") {
      return {
        title: isLoadingWeekly ? "Loading weekly scores" : "No weekly scores yet",
        sub: isLoadingWeekly ? "Checking this week's scores" : "Complete puzzles this week to join the leaderboard.",
        icon: <Trophy size={36} color={C.mutedSoft} strokeWidth={1.5} />,
      };
    }
    if (tab === "friends") {
      if (isLoadingFriends) return { title: "Loading friend scores", sub: "Checking this week's scores", icon: <Crown size={36} color={C.mutedSoft} strokeWidth={1.5} /> };
      if (friendsCount === 0) return { title: "Add friends to compare scores", sub: "Search by username to build your friends leaderboard.", icon: <Crown size={36} color={C.mutedSoft} strokeWidth={1.5} /> };
      return { title: "No friend scores this week", sub: "Complete puzzles this week to compare with friends.", icon: <Crown size={36} color={C.mutedSoft} strokeWidth={1.5} /> };
    }
    return { title: isLoadingRanked ? "Loading ranked leaderboard" : "No ranked players yet", sub: isLoadingRanked ? "Checking season standings" : "Play Ranked Duel to enter the season standings.", icon: <Trophy size={36} color={C.mutedSoft} strokeWidth={1.5} /> };
  })();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.kicker}>RANKINGS</Text>
        <Text style={styles.title}>Leaderboards</Text>
        <Text style={styles.subtitle}>
          {TABS.find((t) => t.id === tab)?.sub ?? ""}
        </Text>

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
        {showDailyJoinPrompt ? (
          <Card style={{ alignItems: "center", paddingVertical: 32, marginBottom: 18 }}>
            <Trophy size={36} color={C.mutedSoft} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Complete today's Daily Sudoku to join the leaderboard</Text>
          </Card>
        ) : null}
        {showWeeklyJoinPrompt ? (
          <Card style={{ alignItems: "center", paddingVertical: 32, marginBottom: 18 }}>
            <Trophy size={36} color={C.mutedSoft} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Complete puzzles this week to join the leaderboard.</Text>
          </Card>
        ) : null}

        {data.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: 32, marginBottom: 18 }}>
            {emptyState.icon}
            <Text style={styles.emptyTitle}>{emptyState.title}</Text>
            <Text style={styles.emptySub}>{emptyState.sub}</Text>
          </Card>
        ) : (
          <>
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
                        {entry.score.toLocaleString()}
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
                    entry.user.id === currentUserId && styles.currentUserRow,
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
                      <Text style={styles.metaText}>{entry.time} - {entry.mistakes ?? 0}M {entry.hints ?? 0}H {entry.undos ?? 0}U</Text>
                    ) : null}
                    {tab === "weekly" || tab === "friends" ? (
                      <Text style={styles.metaText}>{entry.puzzlesCompleted ?? 0} puzzles - best score {(entry.bestScore ?? 0).toLocaleString()} - total time {entry.time}</Text>
                    ) : null}
                    {tab === "ranked" ? (
                      <Text style={styles.metaText}>{entry.tier ?? "Bronze III"} - {entry.wins ?? 0}W {entry.losses ?? 0}L {entry.draws ?? 0}D</Text>
                    ) : null}
                  </View>
                  <Text style={styles.score}>{entry.score.toLocaleString()}</Text>
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
  currentUserRow: {
    backgroundColor: C.accentSoft,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.ink,
    marginTop: 12,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
