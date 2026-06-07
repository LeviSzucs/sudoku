import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { C } from "@/constants/colors";

type Props = {
  size?: number;
  showWordmark?: boolean;
  tagline?: string;
};

export default function BrandMark({ size = 78, showWordmark = false, tagline }: Props) {
  const radius = Math.max(16, Math.round(size * 0.3));
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#160F35", "#2A195C", "#B7912F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mark, { width: size, height: size, borderRadius: radius }]}
      >
        <View style={[styles.grid, { width: size * 0.62, height: size * 0.62 }]}>
          <View style={[styles.lineVertical, { left: "33%" }]} />
          <View style={[styles.lineVertical, { left: "66%" }]} />
          <View style={[styles.lineHorizontal, { top: "33%" }]} />
          <View style={[styles.lineHorizontal, { top: "66%" }]} />
          <Text style={[styles.monogram, { fontSize: size * 0.28 }]}>SD</Text>
        </View>
      </LinearGradient>
      {showWordmark ? <Text style={styles.wordmark}>SudoDuel</Text> : null}
      {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  mark: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#160F35",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  grid: {
    borderWidth: 2,
    borderColor: "#F7E7B4",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  lineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(247, 231, 180, 0.48)",
  },
  lineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(247, 231, 180, 0.48)",
  },
  monogram: {
    color: "#FBF8F2",
    fontWeight: "900",
    letterSpacing: 0,
  },
  wordmark: { fontSize: 32, fontWeight: "900", color: C.ink, letterSpacing: 0, marginTop: 16 },
  tagline: { color: C.muted, fontWeight: "800", textAlign: "center", marginTop: 6 },
});
