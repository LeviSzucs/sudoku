import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
}

export default function Avatar({ initials, color, size = 40 }: AvatarProps) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FBF8F2",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
