import { Crown } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Card from "@/components/Card";
import { C } from "@/constants/colors";

interface PremiumGateCardProps {
  title: string;
  body: string;
  cta?: string;
  onPress?: () => void;
}

export default function PremiumGateCard({
  title,
  body,
  cta = "View Premium",
  onPress,
}: PremiumGateCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Crown size={16} color={C.gold} />
        </View>
        <Text style={styles.kicker}>PREMIUM</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {onPress ? (
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onPress}>
          <Text style={styles.buttonText}>{cta}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.goldSoft,
  },
  kicker: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  title: {
    color: C.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  body: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  button: {
    marginTop: 4,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#FBF8F2",
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.92,
  },
});
