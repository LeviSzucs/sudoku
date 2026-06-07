import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import NumberPadButton from "./NumberPadButton";

interface Props {
  onPressNumber: (n: number) => void;
  counts: Record<number, number>;
  disabled?: boolean;
  highlighted?: number;
  height?: number;
}

function NumberPad({
  onPressNumber,
  counts,
  disabled,
  highlighted,
  height,
}: Props) {
  const values = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9], []);
  return (
    <View style={[styles.grid, height ? { height } : null]}>
      {values.map((n) => (
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
});

export default memo(NumberPad);
