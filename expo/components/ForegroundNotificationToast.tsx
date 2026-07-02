import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "@/constants/colors";

type ForegroundNotificationToastProps = {
  title: string;
  body: string;
  onPress: () => void;
};

export default function ForegroundNotificationToast({
  title,
  body,
  onPress,
}: ForegroundNotificationToastProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 10 }]}>
        <Pressable onPress={onPress} style={({ pressed }) => [styles.toast, pressed && styles.toastPressed]}>
          <Text style={styles.kicker}>NEW NOTIFICATION</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.body} numberOfLines={2}>{body}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  toastPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  kicker: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 4,
    color: C.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  body: {
    marginTop: 4,
    color: C.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
});
