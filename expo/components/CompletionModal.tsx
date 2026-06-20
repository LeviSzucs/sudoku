import { Flame, Home, RotateCw, Share2, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";

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
  const titleScale = useSharedValue(1);
  const titleOpacity = useSharedValue(1);
  const titleGlow = useSharedValue(0);
  const wasVisibleRef = useRef(false);
  const hapticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedOutcome = (outcomeTitle ?? "").trim().toLowerCase();
  const isCompetitiveMode = /duel|challenge|ranked/i.test(mode);
  const isVictoryOutcome = isCompetitiveMode && (normalizedOutcome.includes("won") || normalizedOutcome.includes("victory"));
  const isDrawOutcome = normalizedOutcome.includes("draw");
  const isLossOutcome = normalizedOutcome.includes("lost");
  const celebrationTier: "victory" | "draw" | "loss" | "standard" = isVictoryOutcome
    ? "victory"
    : isDrawOutcome
    ? "draw"
    : isLossOutcome
    ? "loss"
    : "standard";
  const celebrationTimelineMs = celebrationTier === "victory" ? 2350 : celebrationTier === "draw" ? 1650 : 1250;

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
    return () => {
      if (hapticTimeoutRef.current) {
        clearTimeout(hapticTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const opening = visible && !wasVisibleRef.current;
    const closing = !visible && wasVisibleRef.current;
    wasVisibleRef.current = visible;

    if (hapticTimeoutRef.current) {
      clearTimeout(hapticTimeoutRef.current);
      hapticTimeoutRef.current = null;
    }

    if (opening) {
      if (prefersReducedMotion) {
        cancelAnimation(scoreProgress);
        cancelAnimation(celebrationProgress);
        cancelAnimation(scoreScale);
        cancelAnimation(titleScale);
        cancelAnimation(titleOpacity);
        cancelAnimation(titleGlow);
        scoreProgress.value = 1;
        celebrationProgress.value = 0;
        scoreScale.value = 1;
        titleScale.value = 1;
        titleOpacity.value = 1;
        titleGlow.value = celebrationTier === "victory" ? 0.16 : 0;
        setDisplayScore(score);
        if (celebrationTier === "victory") {
          void hapticSuccess();
        }
        return;
      }

      setDisplayScore(0);
      scoreProgress.value = 0;
      celebrationProgress.value = 0;
      scoreScale.value = celebrationTier === "victory" ? 0.9 : 0.96;
      titleOpacity.value = 0;
      titleScale.value = celebrationTier === "victory" ? 0.8 : celebrationTier === "draw" ? 0.92 : 0.96;
      titleGlow.value = celebrationTier === "victory" ? 0.38 : celebrationTier === "draw" ? 0.18 : 0.08;

      scoreScale.value = withTiming(1, {
        duration: celebrationTier === "victory" ? 420 : 320,
        easing: Easing.out(Easing.cubic),
      });
      scoreProgress.value = withTiming(1, {
        duration: 820,
        easing: Easing.out(Easing.cubic),
      });
      titleOpacity.value = withTiming(1, {
        duration: celebrationTier === "victory" ? 220 : 180,
        easing: Easing.out(Easing.cubic),
      });
      titleScale.value = withSpring(1, celebrationTier === "victory"
        ? {
            damping: 8,
            stiffness: 180,
            mass: 0.72,
          }
        : {
            damping: 13,
            stiffness: 190,
            mass: 0.85,
          });
      titleGlow.value = withTiming(0, {
        duration: celebrationTier === "victory" ? 1600 : 900,
        easing: Easing.out(Easing.cubic),
      });
      celebrationProgress.value = withTiming(1, {
        duration: celebrationTimelineMs,
        easing: Easing.out(Easing.cubic),
      });
      if (celebrationTier === "victory") {
        hapticTimeoutRef.current = setTimeout(() => {
          void hapticSuccess();
          hapticTimeoutRef.current = null;
        }, celebrationTier === "victory" ? 150 : 60);
      }
      return;
    }

    if (closing) {
      cancelAnimation(scoreProgress);
      cancelAnimation(celebrationProgress);
      cancelAnimation(scoreScale);
      cancelAnimation(titleScale);
      cancelAnimation(titleOpacity);
      cancelAnimation(titleGlow);
      scoreProgress.value = 1;
      celebrationProgress.value = 0;
      scoreScale.value = 1;
      titleScale.value = 1;
      titleOpacity.value = 1;
      titleGlow.value = 0;
      setDisplayScore(score);
      return;
    }

    if (visible) {
      setDisplayScore(score);
      scoreProgress.value = 1;
    }
  }, [celebrationProgress, celebrationTier, celebrationTimelineMs, prefersReducedMotion, score, scoreProgress, scoreScale, titleGlow, titleOpacity, titleScale, visible]);

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));

  const titleGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleGlow.value,
    transform: [{ scale: interpolate(titleGlow.value, [0, 0.4], [1.02, 1.14], Extrapolation.CLAMP) }],
  }));

  const particles = useMemo(
    () => {
      if (celebrationTier === "loss") return [];
      if (celebrationTier === "victory") {
        return [
          { x: -136, y: -42, size: 12, color: C.gold, rotate: -34, duration: 1580 },
          { x: -112, y: -96, size: 9, color: C.amber, rotate: 28, duration: 1740 },
          { x: -78, y: -126, size: 8, color: C.accent, rotate: -20, duration: 1860 },
          { x: -26, y: -144, size: 10, color: C.gold, rotate: 42, duration: 1980 },
          { x: 22, y: -150, size: 11, color: C.amber, rotate: -38, duration: 2010 },
          { x: 74, y: -128, size: 9, color: C.accent, rotate: 32, duration: 1840 },
          { x: 116, y: -90, size: 11, color: C.gold, rotate: -30, duration: 1700 },
          { x: 142, y: -38, size: 8, color: C.amber, rotate: 26, duration: 1560 },
          { x: -102, y: 18, size: 8, color: C.gold, rotate: -42, duration: 1420 },
          { x: -56, y: 42, size: 10, color: C.amber, rotate: 34, duration: 1480 },
          { x: -8, y: 54, size: 7, color: C.accent, rotate: -26, duration: 1600 },
          { x: 42, y: 46, size: 10, color: C.gold, rotate: 30, duration: 1500 },
          { x: 96, y: 22, size: 8, color: C.amber, rotate: -28, duration: 1430 },
          { x: 0, y: -92, size: 6, color: C.card, rotate: 20, duration: 1880 },
        ];
      }
      if (celebrationTier === "draw") {
        return [
          { x: -94, y: -26, size: 9, color: C.gold, rotate: -20, duration: 1080 },
          { x: -60, y: -62, size: 7, color: C.amber, rotate: 18, duration: 1180 },
          { x: -14, y: -86, size: 6, color: C.accent, rotate: -12, duration: 1260 },
          { x: 28, y: -88, size: 8, color: C.gold, rotate: 20, duration: 1230 },
          { x: 66, y: -60, size: 7, color: C.amber, rotate: -16, duration: 1160 },
          { x: 92, y: -24, size: 8, color: C.gold, rotate: 14, duration: 1060 },
          { x: -38, y: 22, size: 7, color: C.amber, rotate: -20, duration: 980 },
          { x: 36, y: 20, size: 7, color: C.gold, rotate: 18, duration: 990 },
        ];
      }
      return [
        { x: -86, y: -12, size: 10, color: C.gold, rotate: -18, duration: 820 },
        { x: -62, y: -42, size: 8, color: C.amber, rotate: 22, duration: 980 },
        { x: -28, y: -58, size: 6, color: C.accent, rotate: -12, duration: 1080 },
        { x: 18, y: -60, size: 8, color: C.gold, rotate: 26, duration: 1040 },
        { x: 56, y: -46, size: 10, color: C.accent, rotate: -24, duration: 940 },
        { x: 82, y: -10, size: 7, color: C.amber, rotate: 16, duration: 860 },
        { x: -40, y: 18, size: 7, color: C.gold, rotate: -28, duration: 760 },
        { x: 42, y: 16, size: 9, color: C.amber, rotate: 24, duration: 790 },
      ];
    },
    [celebrationTier]
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
          <View style={styles.titleWrap}>
            {celebrationTier === "victory" ? <Animated.View pointerEvents="none" style={[styles.titleGlow, titleGlowAnimatedStyle]} /> : null}
            <Animated.Text style={[styles.title, celebrationTier === "victory" ? styles.titleVictory : null, titleAnimatedStyle]}>
              {outcomeTitle ?? "Puzzle complete"}
            </Animated.Text>
          </View>
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
            {!prefersReducedMotion && particles.length > 0 ? (
              <View pointerEvents="none" style={styles.celebrationLayer}>
                {particles.map((particle, index) => (
                  <CelebrationParticle
                    key={`${particle.x}-${particle.y}-${index}`}
                    progress={celebrationProgress}
                    timelineDuration={celebrationTimelineMs}
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
  timelineDuration,
  x,
  y,
  size,
  color,
  rotate,
  duration,
}: {
  progress: SharedValue<number>;
  timelineDuration: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotate: number;
  duration: number;
}) {
  const style = useAnimatedStyle(() => {
    const localProgress = Math.min(progress.value / (duration / timelineDuration), 1);
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
  titleWrap: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    width: "100%",
  },
  titleGlow: {
    position: "absolute",
    width: "74%",
    maxWidth: 240,
    height: 44,
    borderRadius: 999,
    backgroundColor: C.goldSoft,
  },
  title: { fontSize: 25, fontWeight: "700", color: C.ink, marginTop: 6, letterSpacing: -0.5, textAlign: "center" },
  titleVictory: { color: C.accent },
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
