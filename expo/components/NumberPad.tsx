import React from "react";
import { StyleSheet, View } from "react-native";
import NumberPadButton from "./NumberPadButton";

interface Props {
  onPressNumber: (n: number) => void;
  counts: Record<number, number>;
  disabled?: boolean;
  highlighted?: number;
  height?: number;
}

export default function NumberPad({
  onPressNumber,
  counts,
  disabled,
  highlighted,
  height,
}: Props) {
  return (
    <View style={[styles.row, height ? { height } : null]}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <NumberPadButton
          key={n}
          value={n}
          remaining={counts[n] ?? 9}
          highlighted={highlighted === n}
          disabled={disabled}
          onPress={onPressNumber}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
});
