import { ArrowRight } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { C, difficultyColors, duelColors } from "@/constants/colors";
import { buttonShadow } from "@/constants/depth";
import { createResultContinuationTapGuard, type ResultContinuation } from "@/lib/resultContinuation";

interface Props {
  continuation: ResultContinuation;
  onPress: () => void | Promise<void>;
}

export default function ResultContinuationAction({ continuation, onPress }: Props) {
  const guardRef = useRef(createResultContinuationTapGuard());
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    guardRef.current.reset();
    setIsOpening(false);
  }, [continuation.key]);

  const colors = continuation.tone === "difficulty" && continuation.targetDifficulty
    ? difficultyColors[continuation.targetDifficulty]
    : continuation.tone === "daily_duel"
    ? duelColors.daily
    : continuation.tone === "ranked"
    ? duelColors.ranked
    : { accent: C.ink, textOnAccent: C.bg };

  const handlePress = async () => {
    if (!guardRef.current.tryStart()) return;
    setIsOpening(true);
    try {
      await onPress();
    } catch {
      guardRef.current.reset();
      setIsOpening(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {continuation.supportingText ? <Text style={styles.supportingText}>{continuation.supportingText}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={continuation.accessibleLabel}
        accessibilityState={{ disabled: isOpening, busy: isOpening }}
        disabled={isOpening}
        onPress={() => void handlePress()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent },
          pressed && !isOpening ? styles.pressed : null,
          isOpening ? styles.disabled : null,
        ]}
      >
        {isOpening ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <ArrowRight size={17} color={colors.textOnAccent} />
        )}
        <Text style={[styles.buttonText, { color: colors.textOnAccent }]}>
          {isOpening ? "Opening..." : continuation.label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", marginTop: 16, gap: 8 },
  supportingText: { color: C.muted, fontSize: 12, fontWeight: "600", textAlign: "center" },
  button: {
    minHeight: 50,
    width: "100%",
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...buttonShadow,
  },
  buttonText: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.72 },
});
