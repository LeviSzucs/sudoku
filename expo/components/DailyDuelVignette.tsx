import { CircleCheck } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { C, duelColors, resultStateColors } from "@/constants/colors";

const ANIMATION_DURATION_MS = 6600;
const REPLAY_AFTER_MS = 5 * 60 * 1000;
const CELL_SIZE = 14;
const BOARD_SIZE = CELL_SIZE * 4 + 2;

const SOLUTION = [
  1, 2, 3, 4,
  3, 4, 1, 2,
  2, 1, 4, 3,
  4, 3, 2, 1,
] as const;

const GIVEN_INDICES = new Set([0, 3, 5, 6, 9, 10, 12, 15]);

const YOU_REVEALS: Readonly<Record<number, number>> = {
  1: 0.12,
  2: 0.2,
  4: 0.31,
  7: 0.43,
  8: 0.51,
  11: 0.6,
  13: 0.7,
  14: 0.82,
};

const RIVAL_REVEALS: Readonly<Record<number, number>> = {
  1: 0.14,
  2: 0.19,
  4: 0.27,
  7: 0.39,
  8: 0.55,
  11: 0.64,
  13: 0.75,
  14: 0.91,
};

let hasPlayedThisSession = false;
let lastHomeBlurredAt: number | null = null;

interface DailyDuelVignetteProps {
  active: boolean;
}

export default function DailyDuelVignette({ active }: DailyDuelVignetteProps) {
  const prefersReducedMotion = useReducedMotion();
  const progress = useSharedValue(1);
  const wasActiveRef = useRef(false);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    cancelAnimation(progress);

    if (!active) {
      if (wasActiveRef.current) {
        lastHomeBlurredAt = Date.now();
      }
      wasActiveRef.current = false;
      progress.value = 1;
      return;
    }

    wasActiveRef.current = true;
    const replayWindowElapsed =
      lastHomeBlurredAt !== null && Date.now() - lastHomeBlurredAt >= REPLAY_AFTER_MS;
    const shouldPlay = !hasPlayedThisSession || replayWindowElapsed;
    lastHomeBlurredAt = null;

    if (prefersReducedMotion || !shouldPlay) {
      hasPlayedThisSession = true;
      progress.value = 1;
      return;
    }

    hasPlayedThisSession = true;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: ANIMATION_DURATION_MS,
      easing: Easing.linear,
    });
  }, [active, prefersReducedMotion, progress]);

  useEffect(() => {
    return () => {
      cancelAnimation(progress);
      if (activeRef.current) {
        lastHomeBlurredAt = Date.now();
      }
    };
  }, [progress]);

  const winnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.84, 0.9], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0.84, 0.92], [0.97, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.container}
    >
      <View style={styles.boards}>
        <PlayerBoard
          finishAt={0.82}
          label="YOU"
          place="1ST"
          progress={progress}
          revealThresholds={YOU_REVEALS}
          tone="daily"
        />
        <PlayerBoard
          finishAt={0.91}
          label="RIVAL"
          place="2ND"
          progress={progress}
          revealThresholds={RIVAL_REVEALS}
          tone="neutral"
        />
      </View>

      <Animated.View style={[styles.winner, winnerStyle]}>
        <CircleCheck color={resultStateColors.win.accent} size={12} strokeWidth={2.5} />
        <Text style={styles.winnerText}>YOU FINISH FIRST</Text>
      </Animated.View>
    </View>
  );
}

interface PlayerBoardProps {
  finishAt: number;
  label: string;
  place: string;
  progress: SharedValue<number>;
  revealThresholds: Readonly<Record<number, number>>;
  tone: "daily" | "neutral";
}

function PlayerBoard({
  finishAt,
  label,
  place,
  progress,
  revealThresholds,
  tone,
}: PlayerBoardProps) {
  const progressStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0.08, finishAt],
      [0, BOARD_SIZE],
      Extrapolation.CLAMP
    ),
  }));
  const placeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.84, 0.9], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.player}>
      <View style={styles.playerHeader}>
        <Text style={[styles.playerLabel, tone === "daily" && styles.playerLabelDaily]}>
          {label}
        </Text>
        <Animated.Text style={[styles.place, placeStyle]}>{place}</Animated.Text>
      </View>

      <View style={styles.grid}>
        {SOLUTION.map((value, index) => {
          const row = Math.floor(index / 4);
          const column = index % 4;
          const given = GIVEN_INDICES.has(index);
          return (
            <View
              key={index}
              style={[
                styles.cell,
                column < 3 && styles.cellRight,
                column === 1 && styles.cellRightStrong,
                row < 3 && styles.cellBottom,
                row === 1 && styles.cellBottomStrong,
              ]}
            >
              {given ? (
                <Text style={styles.givenDigit}>{value}</Text>
              ) : (
                <RevealDigit
                  progress={progress}
                  threshold={revealThresholds[index]}
                  value={value}
                />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            tone === "daily" ? styles.progressFillDaily : styles.progressFillNeutral,
            progressStyle,
          ]}
        />
      </View>
    </View>
  );
}

function RevealDigit({
  progress,
  threshold,
  value,
}: {
  progress: SharedValue<number>;
  threshold: number;
  value: number;
}) {
  const digitStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [threshold, threshold + 0.025],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [threshold, threshold + 0.03],
          [0.92, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  return <Animated.Text style={[styles.playedDigit, digitStyle]}>{value}</Animated.Text>;
}

const styles = StyleSheet.create({
  container: {
    width: 184,
    minHeight: 118,
    alignSelf: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: duelColors.daily.border,
    backgroundColor: duelColors.daily.softBackground,
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 7,
  },
  boards: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  player: {
    width: 78,
    alignItems: "center",
  },
  playerHeader: {
    width: BOARD_SIZE,
    minHeight: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerLabel: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  playerLabelDaily: {
    color: duelColors.daily.accentStrong,
  },
  place: {
    color: resultStateColors.win.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  grid: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: C.inkSoft,
    backgroundColor: C.card,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  cellRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: C.borderStrong,
  },
  cellRightStrong: {
    borderRightWidth: 1.25,
    borderRightColor: C.inkSoft,
  },
  cellBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderStrong,
  },
  cellBottomStrong: {
    borderBottomWidth: 1.25,
    borderBottomColor: C.inkSoft,
  },
  givenDigit: {
    color: C.ink,
    fontSize: 8,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  playedDigit: {
    color: duelColors.daily.accentStrong,
    fontSize: 8,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    width: BOARD_SIZE,
    height: 3,
    marginTop: 5,
    overflow: "hidden",
    borderRadius: 2,
    backgroundColor: C.border,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  progressFillDaily: {
    backgroundColor: duelColors.daily.accent,
  },
  progressFillNeutral: {
    backgroundColor: C.mutedSoft,
  },
  winner: {
    minHeight: 17,
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: resultStateColors.win.softBackground,
  },
  winnerText: {
    color: resultStateColors.win.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.45,
  },
});
