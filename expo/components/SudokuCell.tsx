import React, { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";

interface Props {
  row: number;
  col: number;
  value: number;
  given: boolean;
  notes: number[];
  selected: boolean;
  peer: boolean;
  sameValue: boolean;
  hasError: boolean;
  size: number;
  onSelect: (r: number, c: number) => void;
}

const mono =
  Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) ?? "monospace";

function notesEqual(a: number[], b: number[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function SudokuCellBase({
  row,
  col,
  value,
  given,
  notes,
  selected,
  peer,
  sameValue,
  hasError,
  size,
  onSelect,
}: Props) {
  let bg: string = "transparent";
  if (selected) bg = C.cellSelected;
  else if (sameValue) bg = C.cellSame;
  else if (peer) bg = C.cellPeer;
  if (hasError && !selected) bg = C.cellError;

  // Uniform thin borders on right + bottom — outer border + thick 3x3 dividers
  // are drawn as overlay lines by SudokuGrid for perfect consistency.
  const isRightEdge = col === 8;
  const isBottomEdge = row === 8;

  return (
    <Pressable
      onPress={() => onSelect(row, col)}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        borderRightWidth: isRightEdge ? 0 : StyleSheet.hairlineWidth,
        borderBottomWidth: isBottomEdge ? 0 : StyleSheet.hairlineWidth,
        borderRightColor: C.borderStrong,
        borderBottomColor: C.borderStrong,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {value !== 0 ? (
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: mono,
            fontSize: Math.round(size * 0.5),
            lineHeight: Math.round(size * 0.55),
            fontWeight: given ? "800" : "700",
            color: hasError ? C.danger : given ? C.ink : "#2B256D",
            textAlign: "center",
            fontVariant: ["tabular-nums"],
            includeFontPadding: false,
          }}
        >
          {value}
        </Text>
      ) : notes.length > 0 ? (
        <View style={styles.notesGrid}>
          {[0, 1, 2].map((nr) => (
            <View key={nr} style={styles.notesRow}>
              {[1, 2, 3].map((nc) => {
                const n = nr * 3 + nc;
                const has = notes.includes(n);
                return (
                  <View key={nc} style={styles.notesCell}>
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontFamily: mono,
                        fontSize: Math.round(size * 0.2),
                        lineHeight: Math.round(size * 0.22),
                        color: C.inkSoft,
                        fontWeight: "700",
                        textAlign: "center",
                        fontVariant: ["tabular-nums"],
                        includeFontPadding: false,
                      }}
                    >
                      {has ? n : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notesGrid: { width: "100%", height: "100%", padding: 2 },
  notesRow: { flex: 1, flexDirection: "row" },
  notesCell: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default memo(SudokuCellBase, (prev, next) => (
  prev.row === next.row &&
  prev.col === next.col &&
  prev.value === next.value &&
  prev.given === next.given &&
  prev.selected === next.selected &&
  prev.peer === next.peer &&
  prev.sameValue === next.sameValue &&
  prev.hasError === next.hasError &&
  prev.size === next.size &&
  prev.onSelect === next.onSelect &&
  notesEqual(prev.notes, next.notes)
));
