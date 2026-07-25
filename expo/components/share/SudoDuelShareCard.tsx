import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { C } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { shareCardDateLabel, shareCardTimeLabel, type SudoDuelShareCardPayload } from "@/lib/shareCards";

const CARD_SIZE = 1080;

function Stat({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, primary ? styles.primaryStatValue : styles.supportingStatValue]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getHeaderCopy(payload: SudoDuelShareCardPayload): { eyebrow: string; title: string; subtitle: string } {
  switch (payload.kind) {
    case "daily":
      return {
        eyebrow: `Daily Sudoku · ${payload.difficulty}`,
        title: payload.resultLabel?.trim() || "Daily Complete",
        subtitle: shareCardDateLabel(payload),
      };
    case "ranked":
      return {
        eyebrow: `Ranked Duel · ${payload.difficulty}`,
        title: payload.outcomeLabel.trim() || "Ranked Duel Complete",
        subtitle: shareCardDateLabel(payload),
      };
    case "season":
      return {
        eyebrow: payload.seasonNumber ? `Season ${payload.seasonNumber}` : "Ranked Season",
        title: payload.seasonName,
        subtitle: `Season complete · ${shareCardDateLabel(payload)}`,
      };
    case "puzzle":
    default:
      return {
        eyebrow: `${payload.modeLabel} · ${payload.difficulty}`,
        title: payload.resultLabel?.trim() || "Puzzle Complete",
        subtitle: shareCardDateLabel(payload),
      };
  }
}

function renderStats(payload: SudoDuelShareCardPayload) {
  switch (payload.kind) {
    case "daily":
      return (
        <>
          <Stat label="Time" value={shareCardTimeLabel(payload.timeSeconds)} primary />
          <Stat label="Mistakes" value={`${payload.mistakes}`} />
          <Stat label="Streak" value={typeof payload.streak === "number" && payload.streak > 0 ? `${payload.streak}` : "Keep it going"} />
        </>
      );
    case "ranked":
      return (
        <>
          <Stat label="Time" value={shareCardTimeLabel(payload.timeSeconds)} />
          <Stat label="Mistakes" value={`${payload.mistakes}`} />
          <Stat label="RP Change" value={typeof payload.rpChange === "number" ? `${payload.rpChange > 0 ? "+" : ""}${payload.rpChange}` : "Settled"} primary />
          <Stat label="Current Rank" value={payload.currentTierLabel || "Unranked"} />
          <Stat label="Current RP" value={typeof payload.currentRp === "number" ? payload.currentRp.toLocaleString() : "0"} />
        </>
      );
    case "season": {
      const winRate = payload.matchesPlayed > 0 ? `${Math.round((payload.wins / payload.matchesPlayed) * 100)}%` : "0%";
      const finish = payload.finalRankPosition ? `#${payload.finalRankPosition}` : "Unplaced";
      const standing = typeof payload.topPercent === "number" ? `Top ${payload.topPercent.toFixed(1)}%` : "Season complete";
      return (
        <>
          <Stat label="Final Tier" value={payload.finalTier || "Unranked"} primary />
          <Stat label="Final RP" value={payload.finalRp.toLocaleString()} />
          <Stat label="Record" value={`${payload.wins}-${payload.losses}-${payload.draws}`} />
          <Stat label="Win Rate" value={winRate} />
          <Stat label="Finish" value={finish} />
          <Stat label="Standing" value={standing} />
        </>
      );
    }
    case "puzzle":
    default:
      return (
        <>
          <Stat label="Time" value={shareCardTimeLabel(payload.timeSeconds)} />
          <Stat label="Mistakes" value={`${payload.mistakes}`} />
          <Stat label="Score" value={typeof payload.score === "number" ? payload.score.toLocaleString() : "Solved"} primary />
          <Stat label="XP" value={typeof payload.xpEarned === "number" && payload.xpEarned > 0 ? `+${payload.xpEarned}` : "Complete"} />
        </>
      );
  }
}

export default function SudoDuelShareCard({ payload }: { payload: SudoDuelShareCardPayload }) {
  const header = getHeaderCopy(payload);

  return (
    <View collapsable={false} style={styles.canvas}>
      <View style={styles.card}>
        <View style={styles.glowA} />
        <View style={styles.glowB} />

        <View style={styles.topRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>SD</Text>
          </View>
          <Text style={styles.brandText}>SudoDuel</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{header.eyebrow}</Text>
          <Text style={styles.title}>{header.title}</Text>
          <Text style={styles.subtitle}>{header.subtitle}</Text>
        </View>

        <View style={styles.statsGrid}>{renderStats(payload)}</View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Play SudoDuel</Text>
          <Text style={styles.footerMeta}>Competitive Sudoku with friends.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: C.accent,
  },
  card: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: C.accent,
    paddingHorizontal: 72,
    paddingTop: 72,
    paddingBottom: 64,
  },
  glowA: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 999,
    backgroundColor: "rgba(232,155,42,0.18)",
    top: -70,
    right: -80,
  },
  glowB: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(251,248,242,0.08)",
    bottom: 110,
    left: -100,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: C.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: C.accent,
    fontSize: 28,
    fontWeight: "900",
  },
  brandText: {
    ...typography.wordmark,
    color: C.bgElevated,
    fontSize: 30,
    letterSpacing: 0.4,
  },
  hero: {
    marginTop: 92,
    gap: 12,
  },
  eyebrow: {
    color: C.goldSoft,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    ...typography.displayHero,
    color: C.bgElevated,
    fontSize: 82,
    lineHeight: 92,
    letterSpacing: -1.8,
  },
  subtitle: {
    color: "rgba(251,248,242,0.78)",
    fontSize: 30,
    fontWeight: "700",
  },
  statsGrid: {
    marginTop: 74,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  statCard: {
    width: 294,
    minHeight: 148,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 28,
    backgroundColor: "rgba(251,248,242,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,248,242,0.12)",
    justifyContent: "space-between",
  },
  statValue: {
    color: C.bgElevated,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  supportingStatValue: {
    fontWeight: "900",
  },
  primaryStatValue: {
    ...typography.statDisplay,
  },
  statLabel: {
    marginTop: 16,
    color: "rgba(251,248,242,0.68)",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "rgba(251,248,242,0.12)",
    paddingTop: 24,
  },
  footerText: {
    color: C.bgElevated,
    fontSize: 30,
    fontWeight: "900",
  },
  footerMeta: {
    marginTop: 8,
    color: "rgba(251,248,242,0.7)",
    fontSize: 22,
    fontWeight: "700",
  },
});
