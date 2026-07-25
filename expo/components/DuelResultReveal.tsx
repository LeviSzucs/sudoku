import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { C } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { error as hapticError, success as hapticSuccess, tapMedium } from "@/lib/haptics";

type DuelVerdict = "win" | "loss" | "draw";

interface Props {
  revealKey: string;
  ready: boolean;
  verdict: DuelVerdict;
  yourLabel: string;
  yourScore: number;
  opponentLabel: string;
  opponentScore: number;
  playHaptics?: boolean;
  compact?: boolean;
}

export default function DuelResultReveal({
  revealKey,
  ready,
  verdict,
  yourLabel,
  yourScore,
  opponentLabel,
  opponentScore,
  playHaptics = false,
  compact = false,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [displayYourScore, setDisplayYourScore] = useState(ready ? yourScore : 0);
  const [displayOpponentScore, setDisplayOpponentScore] = useState(ready ? opponentScore : 0);
  const lastRevealKeyRef = useRef<string | null>(null);
  const hapticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const yourProgress = useSharedValue(ready ? 1 : 0);
  const opponentProgress = useSharedValue(ready ? 1 : 0);
  const verdictOpacity = useSharedValue(ready ? 1 : 0);
  const verdictScale = useSharedValue(ready ? 1 : 0.86);

  useAnimatedReaction(
    () => Math.round(interpolate(yourProgress.value, [0, 1], [0, yourScore], Extrapolation.CLAMP)),
    (next, previous) => {
      if (next !== previous) runOnJS(setDisplayYourScore)(next);
    },
    [yourScore]
  );

  useAnimatedReaction(
    () => Math.round(interpolate(opponentProgress.value, [0, 1], [0, opponentScore], Extrapolation.CLAMP)),
    (next, previous) => {
      if (next !== previous) runOnJS(setDisplayOpponentScore)(next);
    },
    [opponentScore]
  );

  useEffect(() => {
    return () => {
      if (hapticTimeoutRef.current) clearTimeout(hapticTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (hapticTimeoutRef.current) {
      clearTimeout(hapticTimeoutRef.current);
      hapticTimeoutRef.current = null;
    }

    if (!ready) {
      yourProgress.value = 0;
      opponentProgress.value = 0;
      verdictOpacity.value = 0;
      verdictScale.value = 0.86;
      setDisplayYourScore(0);
      setDisplayOpponentScore(0);
      lastRevealKeyRef.current = null;
      return;
    }

    if (lastRevealKeyRef.current === revealKey) {
      yourProgress.value = 1;
      opponentProgress.value = 1;
      verdictOpacity.value = 1;
      verdictScale.value = 1;
      setDisplayYourScore(yourScore);
      setDisplayOpponentScore(opponentScore);
      return;
    }
    lastRevealKeyRef.current = revealKey;

    if (prefersReducedMotion) {
      yourProgress.value = 1;
      opponentProgress.value = 1;
      verdictOpacity.value = 1;
      verdictScale.value = 1;
      setDisplayYourScore(yourScore);
      setDisplayOpponentScore(opponentScore);
      return;
    }

    setDisplayYourScore(0);
    setDisplayOpponentScore(0);
    yourProgress.value = 0;
    opponentProgress.value = 0;
    verdictOpacity.value = 0;
    verdictScale.value = 0.82;

    yourProgress.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    opponentProgress.value = withDelay(
      420,
      withTiming(1, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
      })
    );
    verdictOpacity.value = withDelay(
      860,
      withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      })
    );
    verdictScale.value = withDelay(
      860,
      withSpring(1, {
        damping: 9,
        stiffness: 180,
        mass: 0.78,
      })
    );

    if (playHaptics) {
      hapticTimeoutRef.current = setTimeout(() => {
        if (verdict === "win") void hapticSuccess();
        else if (verdict === "loss") void hapticError();
        else void tapMedium();
        hapticTimeoutRef.current = null;
      }, 960);
    }
  }, [
    opponentProgress,
    opponentScore,
    playHaptics,
    prefersReducedMotion,
    ready,
    revealKey,
    verdict,
    verdictOpacity,
    verdictScale,
    yourProgress,
    yourScore,
  ]);

  const verdictStyle = useAnimatedStyle(() => ({
    opacity: verdictOpacity.value,
    transform: [{ scale: verdictScale.value }],
  }));

  const verdictCopy = useMemo(() => {
    if (verdict === "win") return { label: "WIN", tone: styles.winVerdict };
    if (verdict === "loss") return { label: "LOSS", tone: styles.lossVerdict };
    return { label: "DRAW", tone: styles.drawVerdict };
  }, [verdict]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.scoreRow}>
        <ScoreColumn compact={compact} label={yourLabel} value={displayYourScore} />
        <View style={styles.vsPill}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <ScoreColumn compact={compact} label={opponentLabel} value={displayOpponentScore} />
      </View>

      <Animated.View style={[styles.verdictPill, verdictCopy.tone, verdictStyle]}>
        <Text style={styles.verdictText}>{verdictCopy.label}</Text>
      </Animated.View>
    </View>
  );
}

function ScoreColumn({ label, value, compact }: { label: string; value: number; compact: boolean }) {
  return (
    <View style={styles.scoreColumn}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, compact && styles.scoreValueCompact]}>{value.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  wrapCompact: {
    gap: 10,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreColumn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  scoreValue: {
    ...typography.statDisplay,
    fontSize: 24,
    color: C.ink,
    marginTop: 4,
    letterSpacing: -0.6,
  },
  scoreValueCompact: {
    fontSize: 20,
  },
  vsPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  vsText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  verdictPill: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  verdictText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  winVerdict: {
    backgroundColor: "#DCEBE0",
  },
  lossVerdict: {
    backgroundColor: "#F7DEDA",
  },
  drawVerdict: {
    backgroundColor: C.bgElevated,
  },
});
