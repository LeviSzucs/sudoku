import { Flame, Home, RotateCw, Share2, X } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";
import { formatTime } from "@/lib/sudoku";

interface Props {
  visible: boolean;
  time: number;
  mistakes: number;
  hintsUsed: number;
  undoCount: number;
  leaderboardEligible: boolean;
  score: number;
  streak: number;
  difficulty: string;
  mode: string;
  officialStatus?: "guest" | "pending" | "saved" | "failed";
  officialError?: string | null;
  xpEarned?: number;
  levelUpMessage?: string | null;
  unlockedBadges?: { name: string; icon: string }[];
  onNext: () => void;
  onShare: () => void;
  onHome: () => void;
  onClose: () => void;
}

export default function CompletionModal({
  visible,
  time,
  mistakes,
  hintsUsed,
  undoCount,
  leaderboardEligible,
  score,
  streak,
  difficulty,
  mode,
  officialStatus = "guest",
  officialError = null,
  xpEarned = 0,
  levelUpMessage = null,
  unlockedBadges = [],
  onNext,
  onShare,
  onHome,
  onClose,
}: Props) {
  if (!visible) return null;

  const completionCopy = mistakes === 0 && hintsUsed === 0
    ? `You solved the ${difficulty} puzzle cleanly.`
    : mistakes === 0 && hintsUsed > 0
    ? `You solved the ${difficulty} puzzle with hints.`
    : `You solved the ${difficulty} puzzle.`;
  const leaderboardLabel = leaderboardEligible ? "Leaderboard eligible: Yes" : "Leaderboard eligible: No";
  const personalStatsSaved = officialStatus === "guest" || officialStatus === "saved";
  const showOfficialPending = officialStatus === "pending";
  const showOfficialFailure = officialStatus === "failed";
  const showOfficialRewards = officialStatus === "guest" || officialStatus === "saved";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={{ fontSize: 30 }}>★</Text>
          </View>
          <Text style={styles.kicker}>{mode.toUpperCase()} · COMPLETE</Text>
          <Text style={styles.title}>Puzzle complete</Text>
          <Text style={styles.sub}>{completionCopy}</Text>

          <View style={styles.stats}>
            <Stat label="Time" value={formatTime(time)} />
            <Stat label="Mistakes" value={`${mistakes}`} />
            <Stat label="Hints" value={`${hintsUsed}`} />
            <Stat label="Undos" value={`${undoCount}`} />
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>FINAL SCORE</Text>
            <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
            {showOfficialPending ? <Text style={styles.eligibleText}>Saving official result...</Text> : null}
            {showOfficialFailure ? <Text style={styles.errorText}>Official result not saved</Text> : null}
            {showOfficialFailure && officialError ? <Text style={styles.errorDetail}>{officialError}</Text> : null}
            <Text style={styles.eligibleText}>Personal stats saved: {personalStatsSaved ? "Yes" : "No"}</Text>
            {showOfficialRewards ? <Text style={styles.eligibleText}>{leaderboardLabel}</Text> : null}
            {showOfficialRewards ? <Text style={styles.xpText}>+{xpEarned} Mastery XP</Text> : null}
          </View>

          {showOfficialRewards && levelUpMessage ? <Text style={styles.levelUpText}>{levelUpMessage}</Text> : null}

          {showOfficialRewards && unlockedBadges.length > 0 ? (
            <View style={styles.badgeRow}>
              {unlockedBadges.slice(0, 3).map((badge) => (
                <View key={badge.name} style={styles.badgeChip}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeText}>{badge.name}</Text>
                </View>
              ))}
              {unlockedBadges.length > 3 ? <Text style={styles.moreBadges}>+{unlockedBadges.length - 3} more unlocked</Text> : null}
            </View>
          ) : null}

          {showOfficialRewards ? (
            <View style={styles.streakRow}>
              <Flame size={14} color={C.streak} fill={C.streak} />
              <Text style={styles.streakText}>
                Streak updated · {streak} days
              </Text>
            </View>
          ) : null}

          <Pressable style={styles.primary} onPress={onNext}>
            <RotateCw size={16} color="#FBF8F2" />
            <Text style={styles.primaryText}>Next puzzle</Text>
          </Pressable>

          <View style={styles.secondaryRow}>
            <Pressable style={styles.secondary} onPress={onShare}>
              <Share2 size={15} color={C.ink} />
              <Text style={styles.secondaryText}>Share result</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={onHome}>
              <Home size={15} color={C.ink} />
              <Text style={styles.secondaryText}>Back home</Text>
            </Pressable>
          </View>

          <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
            <X size={18} color={C.muted} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#15171CB8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  kicker: { fontSize: 11, color: C.gold, fontWeight: "800", letterSpacing: 1.6 },
  title: { fontSize: 25, fontWeight: "700", color: C.ink, marginTop: 6, letterSpacing: -0.5, textAlign: "center" },
  sub: { fontSize: 13, color: C.muted, marginTop: 4, textAlign: "center" },
  stats: {
    flexDirection: "row",
    width: "100%",
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: C.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: "700", letterSpacing: 1.2 },
  statValue: { fontSize: 18, fontWeight: "700", color: C.ink, marginTop: 3 },
  scoreBox: { marginTop: 14, alignItems: "center" },
  scoreLabel: { fontSize: 10, color: C.muted, fontWeight: "800", letterSpacing: 1.6 },
  scoreValue: { fontSize: 38, fontWeight: "800", color: C.ink, letterSpacing: -1, marginTop: 4 },
  eligibleText: { fontSize: 12, color: C.muted, fontWeight: "700", marginTop: 2 },
  errorText: { fontSize: 13, color: C.danger, fontWeight: "800", marginTop: 6 },
  errorDetail: { fontSize: 11, color: C.muted, fontWeight: "700", marginTop: 2, textAlign: "center" },
  xpText: { fontSize: 13, color: C.accent, fontWeight: "800", marginTop: 6 },
  levelUpText: { fontSize: 13, color: C.gold, fontWeight: "800", marginTop: 8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 10 },
  badgeChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.goldSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  badgeIcon: { fontSize: 12, color: C.ink, fontWeight: "900" },
  badgeText: { fontSize: 11, color: C.ink, fontWeight: "800" },
  moreBadges: { fontSize: 11, color: C.muted, fontWeight: "700", alignSelf: "center" },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: C.streakSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: { fontSize: 12, color: C.streak, fontWeight: "700" },
  primary: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: C.ink,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  primaryText: { color: "#FBF8F2", fontSize: 15, fontWeight: "700" },
  secondaryRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginTop: 10,
  },
  secondary: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: C.bgElevated,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryText: { color: C.ink, fontSize: 13, fontWeight: "700" },
  close: { position: "absolute", top: 14, right: 14 },
});
