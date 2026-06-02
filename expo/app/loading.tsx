import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { C } from "@/constants/colors";

export default function LoadingScreen() {
  return (
    <View style={styles.screen}>
      <ActivityIndicator color={C.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
});
