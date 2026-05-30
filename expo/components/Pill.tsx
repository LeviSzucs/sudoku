import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";

interface PillProps {
  label: string;
  tone?: "neutral" | "amber" | "indigo" | "gold" | "danger" | "success" | "streak";
  size?: "sm" | "md";
}

const TONES: Record<NonNullable<PillProps["tone"]>, { bg: string; fg: string }> = {
  neutral: { bg: C.bgElevated, fg: C.inkSoft },
  amber: { bg: C.amberSoft, fg: "#7A5410" },
  indigo: { bg: C.accentSoft, fg: C.accent },
  gold: { bg: C.goldSoft, fg: C.gold },
  danger: { bg: "#F7DEDA", fg: C.danger },
  success: { bg: "#DCEBE0", fg: C.success },
  streak: { bg: C.streakSoft, fg: C.streak },
};

export default function Pill({ label, tone = "neutral", size = "sm" }: PillProps) {
  const t = TONES[tone];
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: t.bg },
        size === "md" && { paddingHorizontal: 12, paddingVertical: 6 },
      ]}
    >
      <Text style={[styles.text, { color: t.fg, fontSize: size === "md" ? 13 : 11 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
