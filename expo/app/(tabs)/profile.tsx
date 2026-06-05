import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { ChevronRight, Flame, Lock, Settings as SettingsIcon, Shield, Target, Timer, Trophy, Users } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import SectionHeader from "@/components/SectionHeader";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { getLevelFromXp, getRankFromRp, RANKS, type AchievementBadge } from "@/lib/playerProfile";
import { formatTime } from "@/lib/sudoku";

function pct(current: number, target: number): number {
  return target <= 0 ? 0 : Math.max(0, Math.min(1, current / target));
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

function isRankedResult(mode: string): boolean {
  return mode === "ranked" || mode === "ranked_duel";
}

function formatSignedRp(value: number | null | undefined): string {
  if (typeof value !== "number") return "0 RP";
  return `${value >= 0 ? "+" : ""}${value} RP`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, fetchFriends, refreshProfile } = usePlayerProfile();
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const level = getLevelFromXp(profile.total_mastery_xp);
  const rank = getRankFromRp(profile.rank_points);
  const nextRank = rank.nextMin !== null ? RANKS.find((r) => r.min === rank.nextMin) : null;
  const rankProgress = rank.nextMin === null ? 1 : (profile.rank_points - rank.currentMin) / (rank.nextMin - rank.currentMin);
  const duelWinRate = profile.duels_played > 0 ? Math.round((profile.duels_won / profile.duels_played) * 100) : 0;
  const duelWinRateValue = profile.duels_played > 0 ? `${duelWinRate}%` : "No duels yet";
  const duelWinRateSub = profile.duels_played > 0 ? `${profile.duels_won}/${profile.duels_played} duels won` : "Play a duel to track wins";
  const best = useMemo(() => {
    const entries = Object.entries(profile.best_times_by_difficulty).filter((entry): entry is [string, number] => typeof entry[1] === "number");
    const fastest = entries.sort((a, b) => a[1] - b[1])[0];
    return fastest ? { time: formatTime(fastest[1]), detail: `${fastest[0]} / Classic` } : { time: "-", detail: "No solved puzzles yet" };
  }, [profile.best_times_by_difficulty]);
  const unlocked = profile.badges_unlocked.filter((b) => b.unlocked);
  const featuredBadges = useMemo(() => {
    const recent = [...unlocked].sort((a, b) => new Date(b.unlocked_at ?? 0).getTime() - new Date(a.unlocked_at ?? 0).getTime());
    const close = profile.badges_unlocked.filter((b) => !b.unlocked && b.progress_current > 0).sort((a, b) => pct(b.progress_current, b.progress_target) - pct(a.progress_current, a.progress_target));
    const milestones = profile.badges_unlocked.filter((b) => ["puzzle_10", "streak_7", "gold_mind"].includes(b.badge_id));
    return Array.from(new Map([...recent, ...close, ...milestones].map((b) => [b.badge_id, b])).values()).slice(0, 8);
  }, [profile.badges_unlocked, unlocked]);

  useEffect(() => {
    let mounted = true;
    void fetchFriends().then((friends) => { if (mounted) setFriendsCount(friends.length); });
    return () => { mounted = false; };
  }, [fetchFriends]);

  useFocusEffect(useCallback(() => {
    void refreshProfile();
  }, [refreshProfile]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 118, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.kicker}>PROFILE</Text>
          <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
            <SettingsIcon color={C.inkSoft} size={22} />
          </Pressable>
        </View>

        <View style={styles.avatarBlock}>
          <Avatar initials={profile.initials} color={profile.avatar_color} symbol={profile.avatar_symbol} size={84} />
          <Text style={styles.username}>{profile.display_name ?? profile.username}</Text>
          {profile.username_handle ? <Text style={styles.handle}>@{profile.username_handle}</Text> : null}
          <View style={styles.rankBadge}>
            <Shield size={12} color={C.gold} fill={C.goldSoft} />
            <Text style={styles.rankBadgeText}>{profile.rank_tier}{profile.rank_division ? ` ${profile.rank_division}` : ""}</Text>
            <View style={styles.dotSep} />
            <Text style={styles.ratingText}>{profile.rank_points} RP</Text>
          </View>
        </View>

        <Card>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressKicker}>MASTERY XP</Text>
              <Text style={styles.levelText}>Level {level.level}</Text>
            </View>
            <Text style={styles.progressValue}>{profile.total_mastery_xp.toLocaleString()} XP</Text>
          </View>
          <View style={styles.barTrack}><View style={[styles.xpBar, { width: `${level.progress * 100}%` }]} /></View>
          <Text style={styles.progressSub}>{level.xpInLevel.toLocaleString()}/{level.xpNeededForLevel.toLocaleString()} XP / {level.xpToNext.toLocaleString()} to next level</Text>
        </Card>

        <View style={{ marginTop: 12 }}>
          <Card onPress={() => router.push("/stats-competitive-rank")}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressKicker}>COMPETITIVE RANK</Text>
                <Text style={styles.levelText}>{profile.rank_tier}{profile.rank_division ? ` ${profile.rank_division}` : ""}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.progressValue}>{profile.rank_points} RP</Text>
                <ChevronRight color={C.mutedSoft} size={18} style={{ marginTop: 4 }} />
              </View>
            </View>
            <View style={styles.barTrack}><View style={[styles.rankBar, { width: `${Math.max(0, Math.min(1, rankProgress)) * 100}%` }]} /></View>
            <Text style={styles.progressSub}>{nextRank ? `${nextRank.min - profile.rank_points} RP to ${nextRank.tier}${nextRank.division ? ` ${nextRank.division}` : ""}` : "Top rank reached"}</Text>
          </Card>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon={<Target size={18} color={C.accent} />} tone={C.accentSoft} label="Puzzles" value={`${profile.puzzles_completed}`} sub={`Easy ${profile.easy_completed} / Medium ${profile.medium_completed} / Hard ${profile.hard_completed}`} onPress={() => router.push("/stats-puzzles")} />
          <StatCard icon={<Trophy size={18} color={C.gold} />} tone={C.goldSoft} label="Win rate" value={duelWinRateValue} sub={duelWinRateSub} onPress={() => router.push("/stats-win-rate")} />
          <StatCard icon={<Timer size={18} color={C.success} />} tone="#DCEBE0" label="Best time" value={best.time} sub={best.detail} onPress={() => router.push("/stats-best-times")} />
          <StatCard icon={<Flame size={18} color={C.streak} />} tone={C.streakSoft} label="Streak" value={`${profile.current_streak}`} sub={`Best: ${profile.longest_streak} days`} onPress={() => router.push("/stats-streak")} />
        </View>

        <Pressable style={styles.friendsCard} onPress={() => router.push({ pathname: "/friends", params: { source: "profile" } })}>
          <View style={[styles.statIcon, { backgroundColor: C.accentSoft, marginBottom: 0 }]}><Users size={18} color={C.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsLabel}>Friends</Text>
            <Text style={styles.settingsDetail}>{friendsCount ?? 0} friends / find players by @username</Text>
          </View>
          <ChevronRight color={C.mutedSoft} size={20} />
        </Pressable>

        <View style={{ marginTop: 22 }}>
          <SectionHeader title="Badges" action={`${unlocked.length}/${profile.badges_unlocked.length}`} />
          <View style={styles.badgesGrid}>{featuredBadges.map((b) => <BadgeCard key={b.badge_id} badge={b} onPress={() => setSelectedBadge(b)} />)}</View>
          <Pressable style={styles.linkButton} onPress={() => router.push("/achievements")}>
            <Text style={styles.linkButtonText}>View all badges</Text>
            <ChevronRight color={C.accent} size={18} />
          </Pressable>
        </View>

        <View style={{ marginTop: 22 }}>
          <SectionHeader title="Recent results" />
          <Card padded={false}>
            {profile.recent_results.length === 0 ? (
              <Text style={styles.emptyResults}>Complete a puzzle to start your result history.</Text>
            ) : profile.recent_results.slice(0, 3).map((r, index) => (
              <ResultRow key={r.result_id ?? r.session_id ?? `${r.puzzle_id}-${r.completed_at}-${index}`} result={r} last={index === Math.min(profile.recent_results.length, 3) - 1} />
            ))}
          </Card>
          <Pressable style={styles.linkButton} onPress={() => router.push({ pathname: "/results", params: { source: "profile" } })}>
            <Text style={styles.linkButtonText}>View all results</Text>
            <ChevronRight color={C.accent} size={18} />
          </Pressable>
        </View>

        <Text style={styles.footer}>v1.0.0 / Made with care</Text>
      </ScrollView>
      <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </SafeAreaView>
  );
}

function BadgeCard({ badge, onPress }: { badge: AchievementBadge; onPress: () => void }) {
  const progress = pct(badge.progress_current, badge.progress_target);
  return (
    <Pressable style={[styles.badgeCard, badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked]} onPress={onPress}>
      <View style={[styles.badgeIcon, badge.unlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked]}>
        {badge.unlocked ? <Text style={styles.badgeEmoji}>{badge.icon}</Text> : <Lock size={16} color={C.muted} />}
      </View>
      <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]} numberOfLines={2}>{badge.name}</Text>
      <Text style={[styles.badgeStatus, badge.unlocked && styles.badgeStatusUnlocked]}>{badge.unlocked ? "Unlocked" : `${badge.progress_current}/${badge.progress_target}`}</Text>
      {!badge.unlocked ? <View style={styles.miniTrack}><View style={[styles.miniBar, { width: `${progress * 100}%` }]} /></View> : null}
    </Pressable>
  );
}

function ResultRow({ result, last }: { result: any; last: boolean }) {
  const ranked = isRankedResult(result.mode);
  return (
    <View style={[styles.resultRow, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.resultTitle}>{modeLabel(result.mode)} / {result.difficulty}</Text>
        <Text style={styles.resultSub}>{formatTime(result.elapsed_seconds)} / {result.mistakes} mistakes / {result.hints_used} hints / {result.undo_count} undos</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.resultScore}>{result.final_score.toLocaleString()}</Text>
        <Text style={styles.resultXp}>{ranked ? formatSignedRp(result.rp_change) : `+${result.xp_earned} XP`}</Text>
      </View>
    </View>
  );
}

function BadgeModal({ badge, onClose }: { badge: AchievementBadge | null; onClose: () => void }) {
  if (!badge) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={[styles.badgeIcon, badge.unlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked]}>
            {badge.unlocked ? <Text style={styles.badgeEmoji}>{badge.icon}</Text> : <Lock size={16} color={C.muted} />}
          </View>
          <Text style={styles.modalTitle}>{badge.name}</Text>
          <Text style={styles.modalDesc}>{badge.description}</Text>
          <Text style={styles.modalState}>{badge.category} / {badge.unlocked ? "Unlocked" : "Locked"}</Text>
          <View style={styles.barTrack}><View style={[styles.xpBar, { width: `${pct(badge.progress_current, badge.progress_target) * 100}%` }]} /></View>
          <Text style={styles.progressSub}>{badge.progress_current}/{badge.progress_target} progress</Text>
          <Text style={styles.modalDesc}>{badge.unlocked && badge.unlocked_at ? `Unlocked ${new Date(badge.unlocked_at).toLocaleDateString()}` : `How to unlock: ${badge.description}`}</Text>
          <Pressable style={styles.primaryButton} onPress={onClose}><Text style={styles.primaryButtonText}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function StatCard({ icon, tone, label, value, sub, onPress }: { icon: React.ReactNode; tone: string; label: string; value: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.statCard, { opacity: pressed ? 0.86 : 1 }]}>
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: tone }]}>{icon}</View>
        <ChevronRight color={C.mutedSoft} size={18} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub} numberOfLines={1}>{sub}</Text>
      <Text style={styles.viewText}>View</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingTop: 12 },
  kicker: { fontSize: 11, color: C.muted, fontWeight: "700", letterSpacing: 1.6 },
  avatarBlock: { alignItems: "center", marginBottom: 18 },
  username: { fontSize: 24, fontWeight: "700", color: C.ink, marginTop: 14, letterSpacing: -0.4 },
  handle: { color: C.muted, fontWeight: "800", marginTop: 3 },
  rankBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 8, gap: 6 },
  rankBadgeText: { fontSize: 13, fontWeight: "700", color: C.ink },
  dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.mutedSoft },
  ratingText: { fontSize: 13, color: C.muted, fontWeight: "600" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressKicker: { fontSize: 10, color: C.muted, fontWeight: "800", letterSpacing: 1.4 },
  levelText: { fontSize: 20, fontWeight: "800", color: C.ink, marginTop: 3 },
  progressValue: { fontSize: 14, color: C.ink, fontWeight: "800" },
  barTrack: { height: 8, backgroundColor: C.bgElevated, borderRadius: 999, overflow: "hidden", marginTop: 12 },
  xpBar: { height: 8, backgroundColor: C.accent, borderRadius: 999 },
  rankBar: { height: 8, backgroundColor: C.gold, borderRadius: 999 },
  progressSub: { fontSize: 12, color: C.muted, marginTop: 7, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  statCard: { flexBasis: "48%", flexGrow: 1, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14 },
  statTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: "700", color: C.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 13, color: C.inkSoft, fontWeight: "600", marginTop: 1 },
  statSub: { fontSize: 11, color: C.muted, marginTop: 4, fontWeight: "700" },
  viewText: { color: C.accent, fontSize: 11, fontWeight: "900", marginTop: 8 },
  friendsCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 12 },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeCard: { width: "22.5%", alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 10, minHeight: 116 },
  badgeUnlocked: { backgroundColor: "#FFF8E6", borderColor: "#E7BE57", shadowColor: C.gold, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  badgeLocked: { backgroundColor: C.card, borderColor: C.border, opacity: 0.78 },
  badgeIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  badgeIconUnlocked: { backgroundColor: C.goldSoft, borderWidth: 1, borderColor: "#E7BE57" },
  badgeIconLocked: { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
  badgeEmoji: { color: C.ink, fontWeight: "900", fontSize: 18 },
  badgeName: { color: C.ink, fontWeight: "900", fontSize: 11, marginTop: 8, textAlign: "center", minHeight: 28 },
  badgeNameLocked: { color: C.inkSoft },
  badgeStatus: { color: C.muted, fontSize: 10, fontWeight: "900", marginTop: 4 },
  badgeStatusUnlocked: { color: C.gold },
  miniTrack: { height: 4, backgroundColor: C.bgElevated, borderRadius: 999, width: "100%", marginTop: 7, overflow: "hidden" },
  miniBar: { height: 4, backgroundColor: C.accent },
  linkButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, paddingVertical: 11, gap: 3 },
  linkButtonText: { color: C.accent, fontWeight: "900" },
  emptyResults: { padding: 18, color: C.muted, fontWeight: "700" },
  resultRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  resultTitle: { color: C.ink, fontWeight: "800", textTransform: "capitalize" },
  resultSub: { color: C.muted, fontSize: 12, marginTop: 4 },
  resultScore: { color: C.ink, fontWeight: "900" },
  resultXp: { color: C.accent, fontWeight: "800", fontSize: 12, marginTop: 3 },
  settingsLabel: { color: C.ink, fontWeight: "800", fontSize: 15 },
  settingsDetail: { color: C.muted, fontSize: 12, marginTop: 2 },
  footer: { textAlign: "center", color: C.mutedSoft, fontWeight: "700", marginTop: 22 },
  modalBackdrop: { flex: 1, backgroundColor: "#15171CB8", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 360, backgroundColor: C.card, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  modalTitle: { color: C.ink, fontWeight: "900", fontSize: 22, marginTop: 12 },
  modalDesc: { color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 19 },
  modalState: { color: C.inkSoft, fontWeight: "800", marginTop: 10 },
  primaryButton: { marginTop: 18, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 },
  primaryButtonText: { color: "#FBF8F2", fontWeight: "900" },
});
