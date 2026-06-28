import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import BrandMark from "@/components/BrandMark";
import { C } from "@/constants/colors";

export default function LoadingScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <BrandMark size={74} showWordmark />
        <Text style={styles.title}>Getting your profile ready</Text>
        <Text style={styles.subtitle}>Loading your progress, friends, and settings.</Text>
        <ActivityIndicator color={C.accent} style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#15171C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  title: {
    marginTop: 18,
    color: C.ink,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  spinner: {
    marginTop: 20,
  },
});
