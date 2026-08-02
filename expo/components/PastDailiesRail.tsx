import { CircleCheck } from "lucide-react-native";
import React, { memo, useMemo } from "react";
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { C, resultStateColors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import {
  getPastDailyDateKeys,
  type PastDailyHistoryEntry,
} from "@/lib/pastDailies";
import type { DailyHistorySnapshot } from "@/hooks/useDailyHistory";

const CARD_GAP = 12;
const CARD_HEIGHT = 148;
interface PastDailiesRailProps {
  history: DailyHistorySnapshot;
}

export default function PastDailiesRail({ history }: PastDailiesRailProps) {
  const { width } = useWindowDimensions();
  const entriesByDate = useMemo(() => new Map(history.entries.map((entry) => [entry.dateKey, entry])), [history.entries]);
  const entries = useMemo(() => getPastDailyDateKeys(history.todayKey).map<PastDailyHistoryEntry>((dateKey) =>
    entriesByDate.get(dateKey) ?? {
      dateKey,
      state: history.status === "unavailable" ? "unavailable" : "loading",
      result: null,
    }
  ), [entriesByDate, history.status, history.todayKey]);

  const contentWidth = Math.min(Math.max(width - 40, 0), 860);
  const cardWidth = Math.min(188, Math.max(132, Math.round(contentWidth * 0.44)));

  if (history.status === "idle") return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>PAST DAILIES</Text>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={entries}
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={(_, index) => ({
          index,
          length: cardWidth + CARD_GAP,
          offset: (cardWidth + CARD_GAP) * index,
        })}
        horizontal
        ItemSeparatorComponent={RailSeparator}
        keyExtractor={(item) => item.dateKey}
        nestedScrollEnabled
        renderItem={({ item }) => <PastDailyCard entry={item} width={cardWidth} />}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={cardWidth + CARD_GAP}
      />
    </View>
  );
}

function RailSeparator() {
  return <View style={styles.separator} />;
}

const PastDailyCard = memo(function PastDailyCard({
  entry,
  width,
}: {
  entry: PastDailyHistoryEntry;
  width: number;
}) {
  const date = useMemo(() => new Date(`${entry.dateKey}T12:00:00.000Z`), [entry.dateKey]);
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const compactDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const accessibilityLabel = buildAccessibilityLabel(entry, date);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible
      style={[styles.card, { width }]}
    >
      <Text numberOfLines={1} style={styles.weekday}>
        {weekday}
      </Text>
      <Text style={styles.date}>{compactDate}</Text>

      <View style={styles.stateArea}>
        {entry.state === "loading" ? (
          <LoadingState />
        ) : entry.state === "solved" && entry.result ? (
          <SolvedState entry={entry} />
        ) : (
          <Text style={styles.quietState}>
            {entry.state === "unavailable" ? "Unavailable" : "Missed"}
          </Text>
        )}
      </View>
    </View>
  );
});

function LoadingState() {
  return (
    <View>
      <View style={[styles.skeleton, styles.skeletonShort]} />
      <View style={[styles.skeleton, styles.skeletonLong]} />
    </View>
  );
}

function SolvedState({ entry }: { entry: PastDailyHistoryEntry }) {
  if (!entry.result) return null;
  return (
    <View>
      <View style={styles.solvedRow}>
        <CircleCheck
          color={resultStateColors.win.accent}
          size={14}
          strokeWidth={2.4}
        />
        <Text style={styles.solvedLabel}>Solved</Text>
      </View>
      <Text style={styles.score}>{entry.result.score.toLocaleString()} pts</Text>
      <Text style={styles.time}>{formatElapsed(entry.result.elapsedSeconds)}</Text>
    </View>
  );
}

function buildAccessibilityLabel(entry: PastDailyHistoryEntry, date: Date): string {
  const fullDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  if (entry.state === "loading") return `${fullDate}. Loading.`;
  if (entry.state === "unavailable") return `${fullDate}. Unavailable.`;
  if (entry.state === "missed" || !entry.result) return `${fullDate}. Missed.`;
  return `${fullDate}. Solved. Score ${entry.result.score.toLocaleString()}. Time ${formatAccessibleTime(entry.result.elapsedSeconds)}.`;
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatAccessibleTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const minuteLabel = minutes === 1 ? "minute" : "minutes";
  const secondLabel = remainingSeconds === 1 ? "second" : "seconds";
  return `${minutes} ${minuteLabel} ${remainingSeconds} ${secondLabel}`;
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  heading: {
    marginBottom: 10,
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  listContent: {
    paddingRight: 20,
  },
  separator: {
    width: CARD_GAP,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    padding: 14,
  },
  weekday: {
    ...typography.dailyDate,
    color: C.ink,
    fontSize: 18,
    lineHeight: 23,
  },
  date: {
    marginTop: 1,
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  stateArea: {
    flex: 1,
    justifyContent: "flex-end",
    paddingTop: 10,
  },
  solvedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  solvedLabel: {
    color: resultStateColors.win.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  score: {
    marginTop: 7,
    color: C.ink,
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  time: {
    marginTop: 2,
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  quietState: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  skeleton: {
    height: 10,
    borderRadius: 5,
    backgroundColor: C.bgElevated,
  },
  skeletonShort: {
    width: "48%",
  },
  skeletonLong: {
    width: "76%",
    marginTop: 9,
  },
});

