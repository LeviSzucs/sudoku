import { Home, Play, RotateCcw, X } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";
import { formatTime } from "@/lib/sudoku";

interface Props {
  visible: boolean;
  variant?: "pause" | "gameover";
  time: number;
  mistakes: number;
  onResume?: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export default function PauseModal({
  visible,
  variant = "pause",
  time,
  mistakes,
  onResume,
  onRestart,
  onExit,
}: Props) {
  const isGameOver = variant === "gameover";
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType={isGameOver ? "none" : "fade"} onRequestClose={onExit}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View
            style={[
              styles.iconWrap,
              isGameOver && { backgroundColor: "#F7DEDA" },
            ]}
          >
            <Text style={{ fontSize: 28 }}>{isGameOver ? "!" : "II"}</Text>
          </View>
          <Text
            style={[
              styles.kicker,
              isGameOver && { color: C.danger },
            ]}
          >
            {isGameOver ? "GAME OVER" : "PAUSED"}
          </Text>
          <Text style={styles.title}>
            {isGameOver ? "Out of mistakes" : "Take a breath"}
          </Text>
          <Text style={styles.sub}>
            {isGameOver
              ? "You reached the mistake limit. Try again?"
              : "Your puzzle is safe. Resume when ready."}
          </Text>

          <View style={styles.stats}>
            <Stat label="Time" value={formatTime(time)} />
            <Stat label="Mistakes" value={`${mistakes}`} />
          </View>

          {!isGameOver && onResume ? (
            <Pressable style={styles.primary} onPress={onResume}>
              <Play size={16} color="#FBF8F2" fill="#FBF8F2" />
              <Text style={styles.primaryText}>Resume</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primary} onPress={onRestart}>
              <RotateCcw size={16} color="#FBF8F2" />
              <Text style={styles.primaryText}>Retry</Text>
            </Pressable>
          )}

          <View style={styles.secondaryRow}>
            {!isGameOver ? (
              <Pressable style={styles.secondary} onPress={onRestart}>
                <RotateCcw size={15} color={C.ink} />
                <Text style={styles.secondaryText}>Restart</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondary} onPress={onExit}>
              <Home size={15} color={C.ink} />
              <Text style={styles.secondaryText}>{isGameOver ? "Back Home" : "Save and Exit"}</Text>
            </Pressable>
          </View>

          {!isGameOver && onResume ? (
            <Pressable style={styles.close} onPress={onResume} hitSlop={10}>
              <X size={18} color={C.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#15171CB8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  kicker: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: C.ink,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  stats: {
    flexDirection: "row",
    width: "100%",
    marginTop: 18,
    paddingVertical: 14,
    backgroundColor: C.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: "700", letterSpacing: 1.2 },
  statValue: { fontSize: 18, fontWeight: "700", color: C.ink, marginTop: 3 },
  primary: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: C.ink,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  primaryText: { color: "#FBF8F2", fontSize: 15, fontWeight: "700" },
  secondaryRow: { flexDirection: "row", width: "100%", gap: 10, marginTop: 10 },
  secondary: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: C.bgElevated,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryText: { color: C.ink, fontSize: 14, fontWeight: "700" },
  close: { position: "absolute", top: 14, right: 14 },
});
