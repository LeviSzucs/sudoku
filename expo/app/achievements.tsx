import { Stack, router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AnimatedUnlockSurface from "@/components/AnimatedUnlockSurface";
import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { BADGE_CATEGORIES, type AchievementBadge, type BadgeCategory } from "@/lib/playerProfile";

function pct(current: number, target: number): number {
  return target <= 0 ? 0 : Math.max(0, Math.min(1, current / target));
}

function rarityLabel(value: AchievementBadge["rarity"]): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayerProfile();
  const [category, setCategory] = useState<"All" | BadgeCategory>("All");
  const [selected, setSelected] = useState<AchievementBadge | null>(null);
  const [recentlyUnlockedKeys, setRecentlyUnlockedKeys] = useState<Record<string, string>>({});
  const previousUnlockMapRef = useRef<Map<string, boolean> | null>(null);
  const unlockSequenceRef = useRef(0);

  const unlocked = profile.badges_unlocked.filter((badge) => badge.unlocked).length;
  const badges = useMemo(
    () => category === "All"
      ? profile.badges_unlocked
      : profile.badges_unlocked.filter((badge) => badge.category === category),
    [category, profile.badges_unlocked]
  );

  useEffect(() => {
    const previousUnlockMap = previousUnlockMapRef.current;
    const nextUnlockMap = new Map(profile.badges_unlocked.map((badge) => [badge.badge_id, badge.unlocked]));

    if (previousUnlockMap) {
      const nextKeys: Record<string, string> = {};
      for (const badge of profile.badges_unlocked) {
        const wasUnlocked = previousUnlockMap.get(badge.badge_id) ?? badge.unlocked;
        if (!wasUnlocked && badge.unlocked) {
          unlockSequenceRef.current += 1;
          nextKeys[badge.badge_id] = `${badge.badge_id}:${unlockSequenceRef.current}`;
        }
      }
      if (Object.keys(nextKeys).length > 0) {
        setRecentlyUnlockedKeys((current) => ({ ...current, ...nextKeys }));
      }
    }

    previousUnlockMapRef.current = nextUnlockMap;
  }, [profile.badges_unlocked]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/(tabs)/profile")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Achievements</Text>
            <Text style={styles.sub}>{unlocked}/{profile.badges_unlocked.length} unlocked</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {BADGE_CATEGORIES.map((chipCategory) => (
            <Pressable
              key={chipCategory}
              onPress={() => setCategory(chipCategory)}
              style={[styles.chip, category === chipCategory && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === chipCategory && styles.chipTextActive]}>{chipCategory}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {badges.map((badge) => (
            <AchievementBadgeCard
              key={badge.badge_id}
              badge={badge}
              animateKey={recentlyUnlockedKeys[badge.badge_id] ?? null}
              onPress={() => setSelected(badge)}
            />
          ))}
        </View>
      </ScrollView>

      <BadgeModal badge={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

function AchievementBadgeCard({
  badge,
  animateKey,
  onPress,
}: {
  badge: AchievementBadge;
  animateKey: string | null;
  onPress: () => void;
}) {
  const progress = pct(badge.progress_current, badge.progress_target);

  return (
    <AnimatedUnlockSurface
      animateKey={badge.unlocked ? animateKey : null}
      delayMs={60}
      borderRadius={18}
      disabled={!badge.unlocked}
      style={styles.badgeCardWrap}
    >
      <Pressable style={[styles.badgeCard, !badge.unlocked && styles.locked]} onPress={onPress}>
        <View style={[styles.badgeIcon, { backgroundColor: badge.unlocked ? C.accent : C.border }]}>
          <Text style={styles.badgeEmoji}>{badge.icon}</Text>
        </View>
        <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
        <Text style={styles.badgeCategory}>{rarityLabel(badge.rarity)} / {badge.category}</Text>
        {!badge.unlocked ? (
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${progress * 100}%` }]} />
          </View>
        ) : null}
      </Pressable>
    </AnimatedUnlockSurface>
  );
}

function BadgeModal({ badge, onClose }: { badge: AchievementBadge | null; onClose: () => void }) {
  if (!badge) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Card style={styles.modalCard}>
          <View style={[styles.badgeIcon, { backgroundColor: badge.unlocked ? C.accent : C.border }]}>
            <Text style={styles.badgeEmoji}>{badge.icon}</Text>
          </View>
          <Text style={styles.modalTitle}>{badge.name}</Text>
          <Text style={styles.modalDesc}>{badge.description}</Text>
          <Text style={styles.modalMeta}>
            {rarityLabel(badge.rarity)} / {badge.category} / {badge.unlocked ? "Unlocked" : "Locked"}
          </Text>
          <View style={styles.fullTrack}>
            <View style={[styles.bar, { width: `${pct(badge.progress_current, badge.progress_target) * 100}%` }]} />
          </View>
          <Text style={styles.progress}>{badge.progress_current}/{badge.progress_target} progress</Text>
          <Text style={styles.modalDesc}>
            {badge.unlocked && badge.unlocked_at
              ? `Unlocked ${new Date(badge.unlocked_at).toLocaleDateString()}`
              : `How to unlock: ${badge.description}`}
          </Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 30, fontWeight: "800", color: C.ink, letterSpacing: -0.7 },
  sub: { color: C.muted, fontWeight: "700", marginTop: 4 },
  tabs: { gap: 8, paddingVertical: 18 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.muted, fontWeight: "800", fontSize: 12 },
  chipTextActive: { color: "#FBF8F2" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badgeCardWrap: { width: "30.8%", borderRadius: 18 },
  badgeCard: {
    minHeight: 148,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 10,
    alignItems: "center",
  },
  locked: { opacity: 0.48 },
  badgeIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  badgeEmoji: { fontSize: 18, color: "#FBF8F2", fontWeight: "900" },
  badgeName: { color: C.ink, fontSize: 12, fontWeight: "800", textAlign: "center", minHeight: 32 },
  badgeCategory: { color: C.muted, fontSize: 10, fontWeight: "700", marginTop: 3 },
  track: {
    width: "100%",
    height: 5,
    backgroundColor: C.border,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },
  fullTrack: {
    width: "100%",
    height: 8,
    backgroundColor: C.bgElevated,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 14,
  },
  bar: { height: "100%", backgroundColor: C.accent },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#15171CB8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { width: "100%", maxWidth: 360, padding: 24, alignItems: "center" },
  modalTitle: { fontSize: 24, color: C.ink, fontWeight: "800", marginTop: 8, textAlign: "center" },
  modalDesc: { fontSize: 13, color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 18 },
  modalMeta: { fontSize: 12, color: C.accent, fontWeight: "900", marginTop: 12, textTransform: "uppercase", letterSpacing: 1 },
  progress: { fontSize: 12, color: C.muted, fontWeight: "700", marginTop: 7 },
  button: {
    width: "100%",
    backgroundColor: C.ink,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 18,
  },
  buttonText: { color: "#FBF8F2", fontSize: 14, fontWeight: "800" },
});
