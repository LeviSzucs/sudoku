import { Check } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { C, resultStateColors } from "@/constants/colors";
import type { DailyHistorySnapshot } from "@/hooks/useDailyHistory";
import { deriveWeeklyDailySummary, type WeeklyDailyDay, type WeeklyDailyDayState } from "@/lib/weeklyDailySummary";

interface Props {
  history: DailyHistorySnapshot;
  todayInProgress?: boolean;
}

export default function WeeklyDailySummary({ history, todayInProgress = false }: Props) {
  const summary = useMemo(() => deriveWeeklyDailySummary({
    todayKey: history.todayKey,
    entries: history.entries,
    queryStatus: history.status,
    todayInProgress,
  }), [history.entries, history.status, history.todayKey, todayInProgress]);

  if (history.status === "idle") return null;

  const loading = history.status === "loading";
  const unavailable = history.status === "unavailable";
  const summaryText = `${summary.solvedCount} of ${summary.elapsedDayCount} dailies solved this week`;
  const todayCopy = summary.todayState === "today_solved"
    ? "Today complete"
    : summary.todayState === "today_in_progress"
    ? "Today's puzzle is in progress"
    : "Today is still available";
  const accessibilityLabel = unavailable
    ? "Your week. Daily Sudoku history is unavailable."
    : `Your week. ${summaryText}.${summary.bestScore === null ? "" : ` Best score ${summary.bestScore}.`}`;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>YOUR WEEK</Text>
      <View style={styles.card}>
        {loading ? (
          <LoadingSummary />
        ) : (
          <>
            <View accessibilityLabel={accessibilityLabel} accessible style={styles.summaryRow}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryText}>{unavailable ? "Weekly history unavailable" : summaryText}</Text>
                <Text style={styles.todayText}>{unavailable ? "Try again when Home refreshes." : todayCopy}</Text>
              </View>
              {!unavailable && summary.bestScore !== null ? (
                <View style={styles.bestMetric}>
                  <Text style={styles.bestLabel}>BEST SCORE</Text>
                  <Text style={styles.bestValue}>{summary.bestScore.toLocaleString()}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.daysRow}>
              {summary.days.map((day) => <DayIndicator day={day} key={day.dateKey} />)}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function DayIndicator({ day }: { day: WeeklyDailyDay }) {
  const solved = day.state === "solved" || day.state === "today_solved";
  const today = day.state === "today_available" || day.state === "today_in_progress";
  const accessibilityLabel = `${formatDayName(day.dateKey)}, ${stateLabel(day.state)}.`;

  return (
    <View accessibilityLabel={accessibilityLabel} accessible style={styles.dayItem}>
      <Text style={[styles.dayLabel, today && styles.dayLabelToday]}>{day.label}</Text>
      <View style={[
        styles.dayDot,
        solved && styles.dayDotSolved,
        day.state === "missed" && styles.dayDotMissed,
        today && styles.dayDotToday,
        day.state === "upcoming" && styles.dayDotUpcoming,
        day.state === "unavailable" && styles.dayDotUnavailable,
      ]}>
        {solved ? <Check accessibilityElementsHidden color={resultStateColors.win.textOnAccent} size={14} strokeWidth={3} /> : today ? (
          <View accessibilityElementsHidden style={styles.todayMark} />
        ) : (
          <Text accessibilityElementsHidden style={styles.dayMark}>{day.state === "missed" ? "-" : ""}</Text>
        )}
      </View>
    </View>
  );
}

function LoadingSummary() {
  return (
    <View style={styles.loadingWrap}>
      <View style={[styles.skeleton, styles.skeletonWide]} />
      <View style={[styles.skeleton, styles.skeletonShort]} />
      <View style={styles.loadingDays}>
        {Array.from({ length: 7 }, (_, index) => <View key={index} style={styles.loadingDot} />)}
      </View>
    </View>
  );
}

function formatDayName(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00.000Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

function stateLabel(state: WeeklyDailyDayState): string {
  switch (state) {
    case "solved": return "solved";
    case "missed": return "missed";
    case "today_available": return "today, available";
    case "today_in_progress": return "today, in progress";
    case "today_solved": return "today, solved";
    case "upcoming": return "upcoming";
    case "unavailable": return "unavailable";
  }
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  heading: { marginBottom: 10, color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 },
  card: { minHeight: 138, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 14 },
  summaryRow: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryText: { color: C.ink, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  todayText: { marginTop: 2, color: C.muted, fontSize: 12, lineHeight: 17, fontWeight: "500" },
  bestMetric: { flexShrink: 0, alignItems: "flex-end", borderRadius: 10, backgroundColor: C.bgElevated, paddingHorizontal: 10, paddingVertical: 7 },
  bestLabel: { color: C.muted, fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  bestValue: { marginTop: 1, color: C.ink, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  daysRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between", gap: 4 },
  dayItem: { flex: 1, alignItems: "center", gap: 5 },
  dayLabel: { color: C.muted, fontSize: 10, lineHeight: 12, fontWeight: "700" },
  dayLabelToday: { color: C.ink },
  dayDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.bgElevated },
  dayDotSolved: { borderColor: resultStateColors.win.accent, backgroundColor: resultStateColors.win.accent },
  dayDotMissed: { borderColor: C.borderStrong, backgroundColor: C.card },
  dayDotToday: { borderColor: C.ink, borderWidth: 2, backgroundColor: C.card },
  dayDotUpcoming: { borderColor: C.border, backgroundColor: C.bg },
  dayDotUnavailable: { borderColor: C.border, backgroundColor: C.bgElevated, opacity: 0.65 },
  dayMark: { color: C.mutedSoft, fontSize: 10, lineHeight: 12, fontWeight: "700" },
  todayMark: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink },
  loadingWrap: { minHeight: 108 },
  skeleton: { height: 10, borderRadius: 5, backgroundColor: C.bgElevated },
  skeletonWide: { width: "62%" },
  skeletonShort: { width: "38%", marginTop: 9 },
  loadingDays: { marginTop: 22, flexDirection: "row", justifyContent: "space-between" },
  loadingDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bgElevated },
});

