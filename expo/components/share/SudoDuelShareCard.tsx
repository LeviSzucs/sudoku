import React from "react";
import { StyleSheet, Text, View } from "react-native";

import BrandMark from "@/components/BrandMark";
import { C } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { shareCardDateLabel, shareCardTimeLabel, type SudoDuelShareCardPayload } from "@/lib/shareCards";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

type CardStat = {
  label: string;
  value: string;
};

type CardContent = {
  kicker: string;
  title: string;
  primary: CardStat;
  supporting: CardStat[];
};

function SupportingStat({
  label,
  value,
  wide = false,
  compact = false,
  relaxed = false,
}: CardStat & { wide?: boolean; compact?: boolean; relaxed?: boolean }) {
  return (
    <View
      style={[
        styles.supportingCard,
        compact && styles.supportingCardCompact,
        relaxed && styles.supportingCardRelaxed,
        wide && styles.supportingCardWide,
      ]}
    >
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.supportingValue}
      >
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.supportingLabel}>
        {label}
      </Text>
    </View>
  );
}

function getCardContent(payload: SudoDuelShareCardPayload): CardContent {
  switch (payload.kind) {
    case "daily":
      return {
        kicker: `Daily Sudoku / ${payload.difficulty}`,
        title: payload.resultLabel?.trim() || "Daily Complete",
        primary: {
          label: "Completion time",
          value: shareCardTimeLabel(payload.timeSeconds),
        },
        supporting: [
          { label: "Mistakes", value: `${payload.mistakes}` },
          {
            label: "Daily streak",
            value: typeof payload.streak === "number" && payload.streak > 0 ? `${payload.streak}` : "Keep going",
          },
        ],
      };
    case "ranked":
      return {
        kicker: `Ranked Duel / ${payload.difficulty}`,
        title: payload.outcomeLabel.trim() || "Ranked Duel Complete",
        primary: {
          label: "RP change",
          value: typeof payload.rpChange === "number"
            ? `${payload.rpChange > 0 ? "+" : ""}${payload.rpChange}`
            : "Settled",
        },
        supporting: [
          { label: "Time", value: shareCardTimeLabel(payload.timeSeconds) },
          { label: "Mistakes", value: `${payload.mistakes}` },
          { label: "Current rank", value: payload.currentTierLabel || "Unranked" },
          {
            label: "Current RP",
            value: typeof payload.currentRp === "number" ? payload.currentRp.toLocaleString() : "0",
          },
        ],
      };
    case "season": {
      const winRate = payload.matchesPlayed > 0 ? `${Math.round((payload.wins / payload.matchesPlayed) * 100)}%` : "0%";
      const finish = payload.finalRankPosition ? `#${payload.finalRankPosition}` : "Unplaced";
      const standing = typeof payload.topPercent === "number" ? `Top ${payload.topPercent.toFixed(1)}%` : "Complete";
      return {
        kicker: payload.seasonName || (payload.seasonNumber ? `Season ${payload.seasonNumber}` : "Ranked Season"),
        title: "Season Complete",
        primary: {
          label: "Final tier",
          value: payload.finalTier || "Unranked",
        },
        supporting: [
          { label: "Final RP", value: payload.finalRp.toLocaleString() },
          { label: "Record", value: `${payload.wins}-${payload.losses}-${payload.draws}` },
          { label: "Win rate", value: winRate },
          { label: "Final position", value: finish },
          { label: "Standing", value: standing },
        ],
      };
    }
    case "puzzle":
    default:
      return {
        kicker: `${payload.modeLabel} / ${payload.difficulty}`,
        title: payload.resultLabel?.trim() || "Puzzle Complete",
        primary: {
          label: "Final score",
          value: typeof payload.score === "number" ? payload.score.toLocaleString() : "Solved",
        },
        supporting: [
          { label: "Time", value: shareCardTimeLabel(payload.timeSeconds) },
          { label: "Mistakes", value: `${payload.mistakes}` },
          {
            label: "XP earned",
            value: typeof payload.xpEarned === "number" && payload.xpEarned > 0 ? `+${payload.xpEarned}` : "Complete",
          },
        ],
      };
  }
}

export default function SudoDuelShareCard({ payload }: { payload: SudoDuelShareCardPayload }) {
  const content = getCardContent(payload);
  const hasOddSupportingCount = content.supporting.length % 2 === 1;
  const usesCompactSupportingCards = content.supporting.length > 4;
  const usesRelaxedSupportingCards = content.supporting.length <= 2;

  return (
    <View collapsable={false} style={styles.canvas}>
      <View style={styles.frame}>
        <View style={styles.brand}>
          <BrandMark size={78} />
          <Text style={styles.wordmark}>SudoDuel</Text>
        </View>

        <View style={styles.hero}>
          <Text numberOfLines={1} style={styles.kicker}>
            {content.kicker}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.62}
            numberOfLines={1}
            style={styles.title}
          >
            {content.title}
          </Text>
          <Text style={styles.date}>{shareCardDateLabel(payload)}</Text>
        </View>

        <View style={styles.primaryCard}>
          <View style={styles.primaryAccent} />
          <Text style={styles.primaryLabel}>{content.primary.label}</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={styles.primaryValue}
          >
            {content.primary.value}
          </Text>
        </View>

        <View style={styles.supportingGrid}>
          {content.supporting.map((stat, index) => (
            <SupportingStat
              key={`${stat.label}-${index}`}
              {...stat}
              compact={usesCompactSupportingCards}
              relaxed={usesRelaxedSupportingCards}
              wide={hasOddSupportingCount && index === content.supporting.length - 1}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRule} />
          <View style={styles.footerCopy}>
            <Text style={styles.footerTitle}>Ready for your next puzzle?</Text>
            <Text style={styles.footerMeta}>Competitive Sudoku with friends.</Text>
          </View>
          <View style={styles.footerCta}>
            <Text style={styles.footerCtaText}>Play SudoDuel</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    padding: 48,
    backgroundColor: C.bg,
  },
  frame: {
    flex: 1,
    overflow: "hidden",
    paddingHorizontal: 56,
    paddingTop: 60,
    paddingBottom: 56,
    borderWidth: 2,
    borderColor: C.borderStrong,
    borderRadius: 46,
    backgroundColor: C.bgElevated,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  wordmark: {
    ...typography.wordmark,
    color: C.ink,
    fontSize: 46,
    letterSpacing: 0,
  },
  hero: {
    alignItems: "center",
    marginTop: 42,
  },
  kicker: {
    color: C.gold,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    ...typography.displayHero,
    maxWidth: 850,
    marginTop: 10,
    color: C.ink,
    fontSize: 66,
    lineHeight: 74,
    textAlign: "center",
  },
  date: {
    marginTop: 9,
    color: C.muted,
    fontSize: 25,
    fontWeight: "600",
  },
  primaryCard: {
    position: "relative",
    minHeight: 250,
    marginTop: 38,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 30,
    backgroundColor: C.card,
    paddingHorizontal: 38,
    paddingVertical: 28,
  },
  primaryAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: C.gold,
  },
  primaryLabel: {
    color: C.muted,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  primaryValue: {
    ...typography.statDisplay,
    marginTop: 8,
    color: C.accent,
    fontSize: 88,
    lineHeight: 96,
    textAlign: "center",
  },
  supportingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 30,
  },
  supportingCard: {
    width: 425,
    minHeight: 148,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 22,
    backgroundColor: C.card,
    paddingHorizontal: 26,
    paddingVertical: 18,
  },
  supportingCardCompact: {
    minHeight: 104,
  },
  supportingCardRelaxed: {
    minHeight: 188,
  },
  supportingCardWide: {
    width: "100%",
  },
  supportingValue: {
    color: C.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  supportingLabel: {
    marginTop: 6,
    color: C.muted,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
    paddingTop: 24,
  },
  footerRule: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.border,
  },
  footerCopy: {
    alignItems: "center",
  },
  footerTitle: {
    color: C.ink,
    fontSize: 21,
    fontWeight: "800",
  },
  footerMeta: {
    marginTop: 4,
    color: C.muted,
    fontSize: 18,
    fontWeight: "600",
  },
  footerCta: {
    width: "100%",
    minHeight: 58,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  footerCtaText: {
    color: C.bgElevated,
    fontSize: 18,
    fontWeight: "800",
  },
});
