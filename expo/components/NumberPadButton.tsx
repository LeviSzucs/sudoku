import React from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { C } from "@/constants/colors";

interface Props {
  value: number;
  remaining: number;
  highlighted?: boolean;
  disabled?: boolean;
  onPress: (n: number) => void;
}

const mono =
  Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }) ?? "monospace";

function NumberPadButton({ value, remaining, highlighted, disabled, onPress }: Props) {
  const exhausted = remaining <= 0;
  const isDisabled = disabled || exhausted;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={() => onPress(value)}
      hitSlop={4}
      style={({ pressed }) => [
        styles.btn,
        highlighted && styles.btnHighlight,
        { opacity: exhausted ? 0.25 : pressed ? 0.55 : 1 },
      ]}
    >
      <Text
        style={[
          styles.num,
          { fontFamily: mono },
          highlighted && { color: "#FBF8F2" },
        ]}
        allowFontScaling={false}
      >
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnHighlight: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  num: {
    fontSize: 26,
    lineHeight: 30,
    color: C.ink,
    fontWeight: "700",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
});

export default React.memo(NumberPadButton);
