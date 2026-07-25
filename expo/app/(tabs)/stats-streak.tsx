import { Stack, router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import StreakFlame from "@/components/StreakFlame";
import { C } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import type { RecentResult } from "@/lib/playerProfile";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function dayDiff(fromKey: string | null, toKey = isoDate(new Date())): number {
  if (!fromKey) return 0;
  const start = dateFromKey(fromKey).getTime();
  const end = dateFromKey(toKey).getTime();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function calculateStreaks(days: string[]): { current: number; longest: number; missed: number; last: string | null } {
  const sorted = Array.from(new Set(days)).sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous && dayDiff(previous, day) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  const solved = new Set(sorted);
  const today = isoDate(new Date());
  let cursor = solved.has(today) ? today : (() => {
    const date = dateFromKey(today);
    date.setDate(date.getDate() - 1);
    return isoDate(date);
  })();
  let current = 0;
  while (solved.has(cursor)) {
    current += 1;
    const date = dateFromKey(cursor);
    date.setDate(date.getDate() - 1);
    cursor = isoDate(date);
  }
  const last = sorted[sorted.length - 1] ?? null;
  return { current, longest, missed: Math.max(0, dayDiff(last) - 1), last };
}

function monthCalendar(selectedMonth: Date): { key: string; day: number | null; isToday: boolean }[] {
  const now = new Date();
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: { key: string; day: number | null; isToday: boolean }[] = [];
  for (let index = 0; index < first.getDay(); index += 1) {
    cells.push({ key: `blank-${index}`, day: null, isToday: false });
  }
  const todayKey = isoDate(now);
  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const key = isoDate(date);
    cells.push({ key, day, isToday: key === todayKey });
  }
  return cells;
}

function monthTitle(selectedMonth: Date): string {
  return selectedMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function isSolvedDaily(result: RecentResult): boolean {
  return result.mode === "daily" && result.completed === true && result.won === true;
}

export default function StreakStatsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayerProfile();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const dailyDays = useMemo(
    () => profile.recent_results.filter(isSolvedDaily).map((result) => result.completed_at.slice(0, 10)),
    [profile.recent_results]
  );
  const solvedDaily = useMemo(
    () => new Set(dailyDays),
    [dailyDays]
  );
  const streaks = useMemo(() => calculateStreaks(dailyDays), [dailyDays]);
  const calendar = useMemo(() => monthCalendar(selectedMonth), [selectedMonth]);
  const currentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const canGoNext = selectedMonth.getTime() < currentMonth.getTime();
  const moveMonth = (offset: number) => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/(tabs)/profile")}>
            <ChevronLeft color={C.ink} size={20} />
          </Pressable>
          <View style={styles.flameBadge}>
            <StreakFlame active={streaks.current > 0} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Streak</Text>
            <Text style={styles.sub}>Successful Daily solves</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <Mini title="Current" value={`${streaks.current}`} detail="days" />
          <Mini title="Longest" value={`${streaks.longest}`} detail="days" />
          <Mini title="Missed" value={`${streaks.missed}`} detail="recent days" />
          <Mini
            title="Last daily"
            value={streaks.last ? dateFromKey(streaks.last).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "-"}
            detail="solved"
          />
        </View>

        <Text style={styles.section}>Daily puzzle calendar</Text>
        <Card>
          <View style={styles.monthHeader}>
            <Pressable style={styles.monthButton} onPress={() => moveMonth(-1)}>
              <ChevronLeft color={C.ink} size={18} />
            </Pressable>
            <Text style={styles.monthTitle}>{monthTitle(selectedMonth)}</Text>
            <Pressable style={[styles.monthButton, !canGoNext && styles.monthButtonDisabled]} onPress={() => canGoNext && moveMonth(1)} disabled={!canGoNext}>
              <ChevronRight color={canGoNext ? C.ink : C.muted} size={18} />
            </Pressable>
          </View>
          <View style={styles.weekHeader}>
            {WEEKDAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
          </View>
          <View style={styles.calendar}>
            {calendar.map((cell) => {
              const done = cell.day !== null && solvedDaily.has(cell.key);
              return (
                <View key={cell.key} style={[styles.day, cell.day === null && styles.dayBlank, cell.isToday && styles.dayToday, done && styles.dayDone]}>
                  <Text style={[styles.dayText, cell.isToday && styles.dayTextToday, done && styles.dayTextDone]}>{cell.day ?? ""}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.note}>Filled days indicate a successful Daily Sudoku solve.</Text>
        </Card>

        <Card style={{ marginTop: 14 }}>
          <Text style={styles.freezeTitle}>How streaks work</Text>
          <Text style={styles.freezeText}>Streaks increase only when you successfully solve the Daily Sudoku. Missing a day or failing the daily puzzle ends the current streak.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Mini({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  flameBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.streakSoft, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  title: { ...typography.screenTitle, fontSize: 30, color: C.ink },
  sub: { color: C.muted, fontWeight: "700", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  mini: { flexBasis: "48%", flexGrow: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14 },
  miniTitle: { color: C.muted, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  miniValue: { color: C.ink, fontWeight: "900", fontSize: 30, marginTop: 4 },
  miniDetail: { color: C.muted, fontWeight: "700" },
  section: { color: C.ink, fontWeight: "900", fontSize: 18, marginTop: 24, marginBottom: 10 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthTitle: { color: C.ink, fontWeight: "900", fontSize: 18 },
  monthButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  monthButtonDisabled: { opacity: 0.42 },
  weekHeader: { flexDirection: "row", gap: 6, marginBottom: 8 },
  weekday: { width: 36, color: C.muted, fontWeight: "900", fontSize: 10, textAlign: "center", textTransform: "uppercase" },
  calendar: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  day: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  dayBlank: { backgroundColor: "transparent", borderColor: "transparent" },
  dayToday: { borderColor: C.accent, borderWidth: 2 },
  dayDone: { backgroundColor: C.streakSoft, borderColor: C.streak },
  dayText: { color: C.muted, fontWeight: "800", fontSize: 12 },
  dayTextToday: { color: C.accent },
  dayTextDone: { color: C.streak },
  note: { color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 12, lineHeight: 17 },
  freezeTitle: { color: C.ink, fontWeight: "900", fontSize: 18 },
  freezeText: { color: C.muted, fontWeight: "700", marginTop: 6, lineHeight: 19 },
});
