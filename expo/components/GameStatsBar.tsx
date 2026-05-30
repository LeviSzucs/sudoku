import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";
import { formatTime } from "@/lib/sudoku";
import { MAX_MISTAKES } from "@/hooks/useSudokuGame";

interface Props {
  mistakes: number;
  score: number;
  seconds: number;
}

export default function GameStatsBar({ mistakes, score, seconds }: Props) {
  return (
    <View style={styles.row}>
      <Stat
        label="Mistakes"
        value={`${mistakes}/${MAX_MISTAKES}`}
        tone={mistakes >= MAX_MISTAKES ? "danger" : mistakes > 0 ? "warn" : "neutral"}
      />
      <View style={styles.divider} />
      <Stat label="Score" value={score.toLocaleString()} />
      <View style={styles.divider} />
      <Stat label="Time" value={formatTime(seconds)} mono />
    </View>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
  mono,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warn" | "danger";
  mono?: boolean;
}) {
  const color = tone === "danger" ? C.danger : tone === "warn" ? "#9C5B14" : C.ink;
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color },
          mono ? { fontVariant: ["tabular-nums"] } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  divider: { width: 1, height: 26, backgroundColor: C.border },
  stat: { flex: 1, alignItems: "center" },
  label: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  value: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 3,
    letterSpacing: -0.2,
  },
});
