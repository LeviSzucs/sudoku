import { Flame, Home, RotateCw, Share2, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { C } from "@/constants/colors";
import { buttonShadow } from "@/constants/depth";
import { success as hapticSuccess } from "@/lib/haptics";
import type { ScoreBreakdown } from "@/lib/scoring";
import { formatTime } from "@/lib/sudoku";

interface Props {
  visible: boolean;
  time: number;
  mistakes: number;
  hintsUsed: number;
  undoCount: number;
  leaderboardEligible: boolean;
  score: number;
  scoreBreakdown?: ScoreBreakdown | null;
  streak: number;
  difficulty: string;
  mode: string;
  officialStatus?: "guest" | "pending" | "saved" | "failed";
  officialError?: string | null;
  xpEarned?: number;
  levelUpMessage?: string | null;
  unlockedBadges?: { name: string; icon: string }[];
  outcomeTitle?: string | null;
  outcomeSubtitle?: string | null;
  primaryLabel?: string;
  showLeaderboardEligibility?: boolean;
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
  scoreBreakdown = null,
  streak,
  difficulty,
  mode,
  officialStatus = "guest",
  officialError = null,
  xpEarned = 0,
  levelUpMessage = null,
  unlockedBadges = [],
  outcomeTitle = null,
  outcomeSubtitle = null,
  primaryLabel = "Next puzzle",
  showLeaderboardEligibility = true,
  onNext,
  onShare,
  onHome,
  onClose,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [displayScore, setDisplayScore] = useState<number>(score);
  const scoreProgress = useSharedValue(1);
  const celebrationProgress = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const wasVisibleRef = useRef(false);

  useAnimatedReaction(
    () => Math.round(interpolate(scoreProgress.value, [0, 1], [0, score], Extrapolation.CLAMP)),
    (next, previous) => {
      if (next !== previous) {
        runOnJS(setDisplayScore)(next);
      }
    },
    [score]
  );

  useEffect(() => {
    const opening = visible && !wasVisibleRef.current;
    const closing = !visible && wasVisibleRef.current;
    wasVisibleRef.current = visible;

    if (opening) {
      void hapticSuccess();
      if (prefersReducedMotion) {
        cancelAnimation(scoreProgress);
        cancelAnimation(celebrationProgress);
        cancelAnimation(scoreScale);
        scoreProgress.value = 1;
        celebrationProgress.value = 0;
        scoreScale.value = 1;
        setDisplayScore(score);
        return;
      }

      setDisplayScore(0);
      scoreProgress.value = 0;
      celebrationProgress.value = 0;
      scoreScale.value = 0.96;

      scoreScale.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      scoreProgress.value = withTiming(1, {
        duration: 820,
        easing: Easing.out(Easing.cubic),
      });
      celebrationProgress.value = withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (closing) {
      cancelAnimation(scoreProgress);
      cancelAnimation(celebrationProgress);
      cancelAnimation(scoreScale);
      scoreProgress.value = 1;
      celebrationProgress.value = 0;
      scoreScale.value = 1;
      setDisplayScore(score);
      return;
    }

    if (visible) {
      setDisplayScore(score);
      scoreProgress.value = 1;
    }
  }, [celebrationProgress, prefersReducedMotion, score, scoreProgress, scoreScale, visible]);

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const particles = useMemo(
    () => [
      { x: -86, y: -12, size: 10, color: C.gold, rotate: -18, duration: 820 },
      { x: -62, y: -42, size: 8, color: C.amber, rotate: 22, duration: 980 },
      { x: -28, y: -58, size: 6, color: C.accent, rotate: -12, duration: 1080 },
      { x: 18, y: -60, size: 8, color: C.gold, rotate: 26, duration: 1040 },
      { x: 56, y: -46, size: 10, color: C.accent, rotate: -24, duration: 940 },
      { x: 82, y: -10, size: 7, color: C.amber, rotate: 16, duration: 860 },
      { x: -40, y: 18, size: 7, color: C.gold, rotate: -28, duration: 760 },
      { x: 42, y: 16, size: 9, color: C.amber, rotate: 24, duration: 790 },
    ],
    []
  );

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
  const streakUnit = streak === 1 ? "day" : "days";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={{ fontSize: 30 }}>★</Text>
          </View>
          <Text style={styles.kicker}>{mode.toUpperCase()} · COMPLETE</Text>
          <Text style={styles.title}>{outcomeTitle ?? "Puzzle complete"}</Text>
          <Text style={styles.sub}>{completionCopy}</Text>
          {outcomeSubtitle ? <Text style={styles.outcomeSub}>{outcomeSubtitle}</Text> : null}

          <View style={styles.stats}>
            <Stat label="Time" value={formatTime(time)} />
            <Stat label="Mistakes" value={`${mistakes}`} />
            <Stat label="Hints" value={`${hintsUsed}`} />
            <Stat label="Undos" value={`${undoCount}`} />
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>FINAL SCORE</Text>
            {!prefersReducedMotion ? (
              <View pointerEvents="none" style={styles.celebrationLayer}>
                {particles.map((particle, index) => (
                  <CelebrationParticle
                    key={`${particle.x}-${particle.y}-${index}`}
                    progress={celebrationProgress}
                    x={particle.x}
                    y={particle.y}
                    size={particle.size}
                    color={particle.color}
                    rotate={particle.rotate}
                    duration={particle.duration}
                  />
                ))}
              </View>
            ) : null}
            <Animated.Text style={[styles.scoreValue, scoreAnimatedStyle]}>{displayScore.toLocaleString()}</Animated.Text>
            {scoreBreakdown ? (
              <View style={styles.breakdown}>
                <BreakdownLine label="Base" value={scoreBreakdown.baseScore ?? 0} />
                <BreakdownLine label="Placements" value={scoreBreakdown.placementPoints} />
                <BreakdownLine label="Bonuses" value={scoreBreakdown.unitBonus + scoreBreakdown.completionBonus} />
                <BreakdownLine label={`Speed x${(scoreBreakdown.speedMultiplier ?? 1).toFixed(2)}`} value={scoreBreakdown.speedBonus - scoreBreakdown.slowPenalty} />
                <BreakdownLine label="Penalties" value={-(scoreBreakdown.mistakePenalty + scoreBreakdown.hintPenalty + scoreBreakdown.undoPenalty)} />
              </View>
            ) : null}
            {showOfficialPending ? <Text style={styles.eligibleText}>Saving official result...</Text> : null}
            {showOfficialFailure ? <Text style={styles.errorText}>Official result not saved</Text> : null}
            {showOfficialFailure && officialError ? <Text style={styles.errorDetail}>{officialError}</Text> : null}
            <Text style={styles.eligibleText}>Personal stats saved: {personalStatsSaved ? "Yes" : "No"}</Text>
            {showOfficialRewards && showLeaderboardEligibility ? <Text style={styles.eligibleText}>{leaderboardLabel}</Text> : null}
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
                Streak updated · {streak} {streakUnit}
              </Text>
            </View>
          ) : null}

          <Pressable style={styles.primary} onPress={onNext}>
            <RotateCw size={16} color="#FBF8F2" />
            <Text style={styles.primaryText}>{primaryLabel}</Text>
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

function CelebrationParticle({
  progress,
  x,
  y,
  size,
  color,
  rotate,
  duration,
}: {
  progress: SharedValue<number>;
  x: number;
  y: number;
  size: number;
  color: string;
  rotate: number;
  duration: number;
}) {
  const style = useAnimatedStyle(() => {
    const localProgress = Math.min(progress.value / (duration / 1200), 1);
    return {
      opacity: interpolate(localProgress, [0, 0.12, 0.7, 1], [0, 0.95, 0.35, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(localProgress, [0, 1], [0, x], Extrapolation.CLAMP) },
        { translateY: interpolate(localProgress, [0, 1], [0, y], Extrapolation.CLAMP) },
        { scale: interpolate(localProgress, [0, 0.12, 1], [0.3, 1, 0.72], Extrapolation.CLAMP) },
        { rotate: `${interpolate(localProgress, [0, 1], [0, rotate], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  return <Animated.View style={[styles.particle, style, { width: size, height: size, borderRadius: size / 2.2, backgroundColor: color }]} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function BreakdownLine({ label, value }: { label: string; value: number }) {
  const sign = value > 0 ? "+" : "";
  return (
    <View style={styles.breakdownLine}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{sign}{value.toLocaleString()}</Text>
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
  outcomeSub: { fontSize: 13, color: C.accent, marginTop: 4, textAlign: "center", fontWeight: "800" },
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
  scoreBox: { marginTop: 14, alignItems: "center", position: "relative", overflow: "visible" },
  scoreLabel: { fontSize: 10, color: C.muted, fontWeight: "800", letterSpacing: 1.6 },
  scoreValue: { fontSize: 38, fontWeight: "800", color: C.ink, letterSpacing: -1, marginTop: 4 },
  celebrationLayer: {
    position: "absolute",
    top: 10,
    left: "50%",
    width: 0,
    height: 0,
  },
  particle: {
    position: "absolute",
    shadowColor: C.ink,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  breakdown: { width: "100%", minWidth: 220, marginTop: 8, gap: 3 },
  breakdownLine: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  breakdownLabel: { color: C.muted, fontSize: 11, fontWeight: "800" },
  breakdownValue: { color: C.ink, fontSize: 11, fontWeight: "900" },
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
    ...buttonShadow,
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
