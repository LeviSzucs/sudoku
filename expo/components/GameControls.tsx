import { Eraser, Lightbulb, Pencil, RotateCcw } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";

interface Props {
  notesMode: boolean;
  hintAllowed: boolean;
  hintsUsed: number;
  onUndo: () => void;
  onErase: () => void;
  onToggleNotes: () => void;
  onHint: () => void;
}

export default function GameControls({
  notesMode,
  hintAllowed,
  hintsUsed,
  onUndo,
  onErase,
  onToggleNotes,
  onHint,
}: Props) {
  return (
    <View style={styles.row}>
      <ActionButton
        icon={<RotateCcw size={20} color={C.inkSoft} />}
        label="Undo"
        onPress={onUndo}
      />
      <ActionButton
        icon={<Eraser size={20} color={C.inkSoft} />}
        label="Erase"
        onPress={onErase}
      />
      <ActionButton
        icon={<Pencil size={20} color={notesMode ? "#FBF8F2" : C.inkSoft} />}
        label={notesMode ? "Notes On" : "Notes Off"}
        onPress={onToggleNotes}
        active={notesMode}
      />
      <ActionButton
        icon={
          <Lightbulb
            size={20}
            color={hintAllowed ? C.inkSoft : C.mutedSoft}
          />
        }
        label={hintAllowed ? (hintsUsed > 0 ? `Hint · ${hintsUsed}` : "Hint") : "Hint Off"}
        onPress={onHint}
        visuallyDisabled={!hintAllowed}
      />
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  active,
  disabled,
  visuallyDisabled,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  visuallyDisabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        active && styles.actionBtnActive,
        { opacity: disabled || visuallyDisabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      {icon}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  label: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  labelActive: {
    color: "#FBF8F2",
  },
});
