import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";

interface Props {
  title: string;
  action?: string;
  onAction?: () => void;
}

export default function SectionHeader({ title, action, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  action: {
    fontSize: 13,
    fontWeight: "600",
    color: C.accent,
  },
});
