import { router, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { ArrowLeft, Flag, Shield, Trophy } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import SectionHeader from "@/components/SectionHeader";
import { C } from "@/constants/colors";
import { SUPPORT_EMAIL_LABEL } from "@/constants/legal";
import { useAuth } from "@/hooks/useAuth";
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
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { fetchPublicPlayerProfile, getUserBlockState, blockUser, unblockUser, reportUser } = usePlayerProfile();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicPlayerProfilePage>({ profile: null, recent_results: [] });
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockState, setBlockState] = useState({ blockedByCurrentUser: false, blockedByOtherUser: false });
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState("Offensive username/display name");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSaving, setReportSaving] = useState(false);

  const isOwnProfile = Boolean(auth.user?.id && id && auth.user.id === id);

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

  useEffect(() => {
    let active = true;

    async function loadBlockState() {
      if (!isUuid(id) || isOwnProfile || !auth.user) {
        if (active) setBlockState({ blockedByCurrentUser: false, blockedByOtherUser: false });
        return;
      }
      const next = await getUserBlockState(id);
      if (active) setBlockState(next);
    }

    void loadBlockState();
    return () => {
      active = false;
    };
  }, [auth.user, getUserBlockState, id, isOwnProfile]);

  const profile = data.profile;
  const isPrivate = profile ? !profile.public_profile : false;
  const socialDisabled = blockState.blockedByCurrentUser || blockState.blockedByOtherUser;
  const showStats = Boolean(profile?.public_profile && profile.show_stats_publicly && !socialDisabled);
  const showRecentResults = Boolean(profile?.public_profile && profile.show_recent_results_publicly && !socialDisabled);
  const profileName = profile?.display_name ?? profile?.username ?? "Player";
  const bestTime = useMemo(() => fastestClassicTime(profile), [profile]);
  const duelWinRate = useMemo(() => winRate(profile), [profile]);

  const handleBlockToggle = async () => {
    if (!isUuid(id) || isOwnProfile || blockLoading) return;
    if (blockState.blockedByCurrentUser) {
      setBlockLoading(true);
      const result = await unblockUser(id);
      setBlockLoading(false);
      if (!result.ok) {
        Alert.alert("Unblock user", result.error ?? "Could not unblock this user.");
        return;
      }
      setBlockState((current) => ({ ...current, blockedByCurrentUser: false }));
      Alert.alert("User unblocked", "Friend requests and challenges can be used again.");
      return;
    }

    Alert.alert(
      "Block user?",
      "Blocked users cannot send you friend requests or challenges.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block user",
          style: "destructive",
          onPress: () => {
            setBlockLoading(true);
            void blockUser(id).then((result) => {
              setBlockLoading(false);
              if (!result.ok) {
                Alert.alert("Block user", result.error ?? "Could not block this user.");
                return;
              }
              setBlockState((current) => ({ ...current, blockedByCurrentUser: true }));
              Alert.alert("User blocked", "This player can no longer send you friend requests or challenges.");
            });
          },
        },
      ],
    );
  };

  const submitReport = async () => {
    if (!isUuid(id) || isOwnProfile || reportSaving) return;
    setReportSaving(true);
    const result = await reportUser(id, reportReason, reportDetails, typeof source === "string" ? source : "profile");
    setReportSaving(false);
    if (!result.ok) {
      Alert.alert("Report user", result.error ?? "Could not submit this report.");
      return;
    }
    setReportVisible(false);
    setReportReason("Offensive username/display name");
    setReportDetails("");
    Alert.alert("Report sent", "Thanks - we'll review this report.");
  };

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
                  expression="neutral"
                  motion="idle"
                  active={isFocused}
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
                {!isOwnProfile ? (
                  <View style={styles.safetyCard}>
                    {blockState.blockedByCurrentUser ? (
                      <Text style={styles.safetyTitle}>User blocked</Text>
                    ) : blockState.blockedByOtherUser ? (
                      <Text style={styles.safetyTitle}>Profile unavailable for social actions</Text>
                    ) : (
                      <Text style={styles.safetyTitle}>Safety tools</Text>
                    )}
                    <Text style={styles.safetyText}>
                      {blockState.blockedByCurrentUser
                        ? "Blocked users cannot send you friend requests or challenges."
                        : blockState.blockedByOtherUser
                          ? "This player is not currently available for friend requests or challenges."
                          : "You can report or block this player if something feels off."}
                    </Text>
                    <View style={styles.actionRow}>
                      <Pressable style={[styles.actionButton, styles.secondaryAction, blockLoading && styles.disabledAction]} onPress={() => setReportVisible(true)} disabled={blockLoading}>
                        <Flag size={14} color={C.ink} />
                        <Text style={styles.secondaryActionText}>Report</Text>
                      </Pressable>
                      <Pressable style={[styles.actionButton, blockState.blockedByCurrentUser ? styles.secondaryAction : styles.primaryAction, blockLoading && styles.disabledAction]} onPress={() => { void handleBlockToggle(); }} disabled={blockLoading}>
                        <Shield size={14} color={blockState.blockedByCurrentUser ? C.ink : C.card} />
                        <Text style={blockState.blockedByCurrentUser ? styles.secondaryActionText : styles.primaryActionText}>
                          {blockLoading ? "Working..." : blockState.blockedByCurrentUser ? "Unblock user" : "Block user"}
                        </Text>
                      </Pressable>
                    </View>
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

      <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => setReportVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report user</Text>
            <Text style={styles.modalBody}>Choose the closest reason. You can add more detail if it helps.</Text>
            <View style={styles.reasonList}>
              {[
                "Offensive username/display name",
                "Harassment or bullying",
                "Cheating or suspicious behaviour",
                "Spam",
                "Other",
              ].map((reason) => {
                const selected = reportReason === reason;
                return (
                  <Pressable key={reason} style={[styles.reasonButton, selected && styles.reasonButtonSelected]} onPress={() => setReportReason(reason)}>
                    <Text style={[styles.reasonButtonText, selected && styles.reasonButtonTextSelected]}>{reason}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              maxLength={240}
              placeholder="Optional details"
              placeholderTextColor={C.mutedSoft}
              style={styles.detailsInput}
            />
            <Text style={styles.modalHelper}>Support contact: {SUPPORT_EMAIL_LABEL}</Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.actionButton, styles.secondaryAction]} onPress={() => setReportVisible(false)} disabled={reportSaving}>
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.actionButton, styles.primaryAction, reportSaving && styles.disabledAction]} onPress={() => { void submitReport(); }} disabled={reportSaving}>
                <Text style={styles.primaryActionText}>{reportSaving ? "Sending..." : "Send report"}</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
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
  safetyCard: { width: "100%", borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, padding: 14, marginTop: 12, gap: 10 },
  safetyTitle: { color: C.ink, fontSize: 15, fontWeight: "900", textAlign: "center" },
  safetyText: { color: C.muted, fontWeight: "700", textAlign: "center", lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 14 },
  primaryAction: { backgroundColor: C.ink },
  secondaryAction: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  primaryActionText: { color: C.card, fontWeight: "900", fontSize: 14 },
  secondaryActionText: { color: C.ink, fontWeight: "900", fontSize: 14 },
  disabledAction: { opacity: 0.6 },
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
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,15,12,0.42)", justifyContent: "center", padding: 20 },
  modalCard: { gap: 12 },
  modalTitle: { color: C.ink, fontSize: 20, fontWeight: "900" },
  modalBody: { color: C.muted, fontWeight: "700", lineHeight: 20 },
  reasonList: { gap: 8 },
  reasonButton: { borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 12 },
  reasonButtonSelected: { borderColor: C.accent, backgroundColor: C.accentSoft },
  reasonButtonText: { color: C.ink, fontWeight: "800" },
  reasonButtonTextSelected: { color: C.accent, fontWeight: "900" },
  detailsInput: { minHeight: 96, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, color: C.ink, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: "top" },
  modalHelper: { color: C.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
});
