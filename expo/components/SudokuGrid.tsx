import React, { memo, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { C } from "@/constants/colors";
import { isGivenCell } from "@/lib/givenCells";
import { logDevDiagnostic } from "@/lib/performanceDiagnostics";
import type { Board, NotesBoard } from "@/lib/sudoku";
import SudokuCell from "./SudokuCell";

interface Props {
  initial: Board;
  board: Board;
  notes: NotesBoard;
  selected: { r: number; c: number } | null;
  errors: Set<string>;
  boardSize: number;
  onSelect: (r: number, c: number) => void;
}

const THICK = 2;

function isPeer(a: { r: number; c: number }, r: number, c: number): boolean {
  if (a.r === r && a.c === c) return false;
  if (a.r === r || a.c === c) return true;
  return Math.floor(a.r / 3) === Math.floor(r / 3) && Math.floor(a.c / 3) === Math.floor(c / 3);
}

function SudokuGridBase({ initial, board, notes, selected, errors, boardSize, onSelect }: Props) {
  const renderCountRef = useRef<number>(0);
  renderCountRef.current += 1;
  const cellSize = boardSize / 9;
  const selectedValue = selected ? board[selected.r][selected.c] : 0;
  const rows = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);

  useEffect(() => {
    logDevDiagnostic("SudokuGrid mount", { boardSize });
    return () => {
      logDevDiagnostic("SudokuGrid unmount", { boardSize });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logDevDiagnostic("SudokuGrid render", {
      count: renderCountRef.current,
      boardSize,
      selected,
      errorCount: errors.size,
    });
  });

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {rows.map((r) => (
        <View key={r} style={styles.row}>
          {rows.map((c) => {
            const value = board[r][c];
            const given = isGivenCell(initial[r][c]);
            const isSelected = selected?.r === r && selected?.c === c;
            const peer = selected ? isPeer(selected, r, c) : false;
            const sameValue = value !== 0 && value === selectedValue && !isSelected;
            const hasError = errors.has(`${r},${c}`);
            return (
              <SudokuCell
                key={c}
                row={r}
                col={c}
                value={value}
                given={given}
                notes={notes[r][c]}
                selected={isSelected}
                peer={peer}
                sameValue={sameValue}
                hasError={hasError}
                size={cellSize}
                onSelect={onSelect}
              />
            );
          })}
        </View>
      ))}

      {/* Thick 3x3 dividers — drawn as overlay lines for perfect consistency */}
      {[3, 6].map((i) => (
        <View
          key={`v${i}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: cellSize * i - THICK / 2,
            width: THICK,
            backgroundColor: C.ink,
          }}
        />
      ))}
      {[3, 6].map((i) => (
        <View
          key={`h${i}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cellSize * i - THICK / 2,
            height: THICK,
            backgroundColor: C.ink,
          }}
        />
      ))}

      {/* Outer border */}
      <View pointerEvents="none" style={styles.outer} />
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: C.card,
    overflow: "hidden",
    borderRadius: 4,
  },
  row: { flexDirection: "row", flex: 1 },
  outer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: THICK,
    borderColor: C.ink,
    borderRadius: 4,
  },
});

export default memo(SudokuGridBase);
