import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { C } from "@/constants/colors";

interface AdBreakPlaceholderProps {
  debugVisible?: boolean;
}

export default function AdBreakPlaceholder({ debugVisible = false }: AdBreakPlaceholderProps) {
  if (!debugVisible) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>Ad break would show here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, padding: 12 },
  text: { color: C.muted, fontSize: 12, fontWeight: "800", textAlign: "center" },
});
