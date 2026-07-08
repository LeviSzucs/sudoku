import React from "react";
import { StyleSheet, Text, View } from "react-native";

import BrandMark from "@/components/BrandMark";
import { APP_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";

export interface ResultShareStat {
  label: string;
  value: string;
}

interface Props {
  modeLabel: string;
  difficulty: string;
  title: string;
  subtitle?: string | null;
  dateLabel: string;
  primaryStats: ResultShareStat[];
  secondaryStats?: ResultShareStat[];
}

export default function ResultShareCard({
  modeLabel,
  difficulty,
  title,
  subtitle,
  dateLabel,
  primaryStats,
  secondaryStats = [],
}: Props) {
  return (
    <View style={styles.canvas}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <BrandMark size={96} />
          <View style={styles.headerText}>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.kicker}>{modeLabel} / {difficulty}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
          <Text style={styles.heroDate}>{dateLabel}</Text>
        </View>

        <View style={styles.statsGrid}>
          {primaryStats.map((stat) => (
            <View key={`${stat.label}-${stat.value}`} style={styles.statTile}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {secondaryStats.length > 0 ? (
          <View style={styles.secondaryRow}>
            {secondaryStats.map((stat) => (
              <View key={`${stat.label}-${stat.value}`} style={styles.secondaryPill}>
                <Text style={styles.secondaryLabel}>{stat.label}</Text>
                <Text style={styles.secondaryValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerTag}>Competitive Sudoku with friends</Text>
          <Text style={styles.footerCta}>Play SudoDuel</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: 360,
    height: 360,
    backgroundColor: "#0E1220",
    padding: 18,
  },
  inner: {
    flex: 1,
    borderRadius: 28,
    padding: 20,
    backgroundColor: "#131A2A",
    borderWidth: 1,
    borderColor: "rgba(219,179,101,0.20)",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerText: {
    flex: 1,
  },
  appName: {
    color: "#FBF8F2",
    fontSize: 26,
    fontWeight: "900",
  },
  kicker: {
    marginTop: 4,
    color: "#DBB365",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroCard: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "#0F1423",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroTitle: {
    color: "#FBF8F2",
    fontSize: 34,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 6,
    color: "#CDD3E1",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  heroDate: {
    marginTop: 12,
    color: "#8F97AB",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statTile: {
    width: "47%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#1A2235",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statValue: {
    color: "#FBF8F2",
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 4,
    color: "#9EA7BA",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  secondaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  secondaryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(219,179,101,0.12)",
    borderWidth: 1,
    borderColor: "rgba(219,179,101,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryLabel: {
    color: "#DBB365",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  secondaryValue: {
    color: "#FBF8F2",
    fontSize: 12,
    fontWeight: "900",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  footerTag: {
    color: "#9EA7BA",
    fontSize: 12,
    fontWeight: "700",
  },
  footerCta: {
    color: C.gold,
    fontSize: 13,
    fontWeight: "900",
  },
});
