import { Stack, Redirect, router } from "expo-router";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Flame, Sparkles, Trophy } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";

import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { buttonShadow } from "@/constants/depth";
import { SHOW_INTERNAL_QA_TOOLS } from "@/constants/internal";
import { error as hapticError, success as hapticSuccess, tapMedium } from "@/lib/haptics";

type DuelOutcome = "win" | "loss" | "draw";

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReducedMotion(Boolean(enabled));
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReducedMotion);
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reducedMotion;
}

function PreviewButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.previewButton} onPress={onPress}>
      <Text style={styles.previewButtonText}>{label}</Text>
    </Pressable>
  );
}

function AnimatedBadgeChip({
  label,
  icon,
  animateKey,
  delayMs = 0,
  reducedMotion,
}: {
  label: string;
  icon: string;
  animateKey: string | null;
  delayMs?: number;
  reducedMotion: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!animateKey || lastKeyRef.current === animateKey) return;
    lastKeyRef.current = animateKey;
    scale.stopAnimation();
    opacity.stopAnimation();
    shine.stopAnimation();

    if (reducedMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      shine.setValue(0);
      return;
    }

    scale.setValue(1.28);
    opacity.setValue(0.92);
    shine.setValue(0);

    Animated.sequence([
      Animated.delay(delayMs),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(shine, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [animateKey, delayMs, opacity, reducedMotion, scale, shine]);

  const shineTranslate = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-58, 112],
  });
  const shineOpacity = shine.interpolate({
    inputRange: [0, 0.15, 0.8, 1],
    outputRange: [0, 0.4, 0.14, 0],
  });

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <View style={styles.badgeChip}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.badgeShine,
            {
              opacity: shineOpacity,
              transform: [{ translateX: shineTranslate }, { rotate: "18deg" }],
            },
          ]}
        />
        <Text style={styles.badgeIcon}>{icon}</Text>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    </Animated.View>
  );
}

function BadgePreview({
  title,
  badges,
}: {
  title: string;
  badges: Array<{ label: string; icon: string }>;
}) {
  const reducedMotion = useReducedMotionPreference();
  const [replayCount, setReplayCount] = useState(0);
  const firedRef = useRef<string | null>(null);
  const animateKey = useMemo(() => (replayCount > 0 ? `${title}-${replayCount}` : null), [replayCount, title]);

  useEffect(() => {
    if (!animateKey || firedRef.current === animateKey) return;
    firedRef.current = animateKey;
    void tapMedium();
  }, [animateKey]);

  return (
    <Card style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>{title}</Text>
        <PreviewButton label="Replay" onPress={() => setReplayCount((count) => count + 1)} />
      </View>
      <View style={styles.badgeRow}>
        {badges.map((badge, index) => (
          <AnimatedBadgeChip
            key={`${badge.label}-${index}`}
            label={badge.label}
            icon={badge.icon}
            animateKey={animateKey ? `${animateKey}-${index}` : null}
            delayMs={index * 100}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>
    </Card>
  );
}

function DuelRevealPreview() {
  const reducedMotion = useReducedMotionPreference();
  const [outcome, setOutcome] = useState<DuelOutcome>("win");
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [showOpponent, setShowOpponent] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const verdictScale = useRef(new Animated.Value(1)).current;
  const playerProgress = useRef(new Animated.Value(0)).current;
  const opponentProgress = useRef(new Animated.Value(0)).current;
  const replayCountRef = useRef(0);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const presets: Record<DuelOutcome, { player: number; opponent: number; verdict: string; tone: string }> = {
    win: { player: 9650, opponent: 9010, verdict: "WIN", tone: C.gold },
    loss: { player: 8440, opponent: 9320, verdict: "LOSS", tone: C.danger },
    draw: { player: 9120, opponent: 9120, verdict: "DRAW", tone: C.accent },
  };

  useEffect(() => {
    const pListener = playerProgress.addListener(({ value }) => {
      setPlayerScore(Math.round(value));
    });
    const oListener = opponentProgress.addListener(({ value }) => {
      setOpponentScore(Math.round(value));
    });
    return () => {
      playerProgress.removeListener(pListener);
      opponentProgress.removeListener(oListener);
    };
  }, [opponentProgress, playerProgress]);

  useEffect(() => () => {
    playerProgress.stopAnimation();
    opponentProgress.stopAnimation();
    verdictScale.stopAnimation();
    timersRef.current.forEach(clearTimeout);
  }, [opponentProgress, playerProgress, verdictScale]);

  const replay = (nextOutcome: DuelOutcome) => {
    setOutcome(nextOutcome);
    const preset = presets[nextOutcome];
    replayCountRef.current += 1;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    playerProgress.stopAnimation();
    opponentProgress.stopAnimation();
    verdictScale.stopAnimation();

    setShowOpponent(false);
    setShowVerdict(false);
    setPlayerScore(reducedMotion ? preset.player : 0);
    setOpponentScore(reducedMotion ? preset.opponent : 0);
    verdictScale.setValue(reducedMotion ? 1 : 0.82);

    if (reducedMotion) {
      setShowOpponent(true);
      setShowVerdict(true);
      if (nextOutcome === "win") void hapticSuccess();
      else if (nextOutcome === "loss") void hapticError();
      else void tapMedium();
      return;
    }

    playerProgress.setValue(0);
    opponentProgress.setValue(0);
    Animated.timing(playerProgress, {
      toValue: preset.player,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    timersRef.current.push(setTimeout(() => {
      setShowOpponent(true);
      Animated.timing(opponentProgress, {
        toValue: preset.opponent,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, 380));

    timersRef.current.push(setTimeout(() => {
      setShowVerdict(true);
      verdictScale.setValue(0.84);
      Animated.spring(verdictScale, {
        toValue: 1,
        friction: 6,
        tension: 150,
        useNativeDriver: true,
      }).start();
      if (nextOutcome === "win") void hapticSuccess();
      else if (nextOutcome === "loss") void hapticError();
      else void tapMedium();
    }, 920));
  };

  const preset = presets[outcome];

  return (
    <Card style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Duel result reveal</Text>
        <View style={styles.inlineActions}>
          <PreviewButton label="Win" onPress={() => replay("win")} />
          <PreviewButton label="Loss" onPress={() => replay("loss")} />
          <PreviewButton label="Draw" onPress={() => replay("draw")} />
        </View>
      </View>
      <View style={styles.duelCard}>
        <View style={styles.duelRow}>
          <Text style={styles.duelLabel}>You</Text>
          <Text style={styles.duelScore}>{playerScore.toLocaleString()}</Text>
        </View>
        <View style={styles.duelRow}>
          <Text style={styles.duelLabel}>Opponent</Text>
          <Text style={[styles.duelScore, !showOpponent && styles.duelScoreMuted]}>
            {showOpponent ? opponentScore.toLocaleString() : "—"}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ scale: verdictScale }], opacity: showVerdict ? 1 : 0 }}>
          <Text style={[styles.verdictText, { color: preset.tone }]}>{showVerdict ? preset.verdict : ""}</Text>
        </Animated.View>
      </View>
    </Card>
  );
}

function StreakFlamePreview() {
  const reducedMotion = useReducedMotionPreference();
  const ambientScale = useRef(new Animated.Value(1)).current;
  const ambientOpacity = useRef(new Animated.Value(1)).current;
  const igniteScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ambientScale.stopAnimation();
    ambientOpacity.stopAnimation();
    if (reducedMotion) {
      ambientScale.setValue(1);
      ambientOpacity.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ambientScale, { toValue: 1.04, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(ambientScale, { toValue: 0.985, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ambientOpacity, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(ambientOpacity, { toValue: 0.86, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [ambientOpacity, ambientScale, reducedMotion]);

  const ignite = () => {
    if (reducedMotion) {
      void tapMedium();
      return;
    }
    igniteScale.stopAnimation();
    glowOpacity.stopAnimation();
    igniteScale.setValue(0.96);
    glowOpacity.setValue(0.55);
    Animated.sequence([
      Animated.timing(igniteScale, {
        toValue: 1.22,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(igniteScale, {
        toValue: 1,
        friction: 6,
        tension: 170,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.timing(glowOpacity, {
      toValue: 0,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    void tapMedium();
  };

  return (
    <Card style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Streak flame</Text>
        <PreviewButton label="Ignite" onPress={ignite} />
      </View>
      <View style={styles.streakPreviewWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flameGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowOpacity.interpolate({ inputRange: [0, 0.55], outputRange: [0.92, 1.18] }) }],
            },
          ]}
        />
        <Animated.View
          style={{
            opacity: ambientOpacity,
            transform: [{ scale: Animated.multiply(ambientScale, igniteScale) }],
          }}
        >
          <Flame size={34} color={C.streak} fill={C.streak} />
        </Animated.View>
        <Text style={styles.streakPreviewText}>7 day streak</Text>
      </View>
    </Card>
  );
}

function RankPromotionPreview() {
  const reducedMotion = useReducedMotionPreference();
  const [visible, setVisible] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.stopAnimation();
    opacity.stopAnimation();
    shine.stopAnimation();

    if (reducedMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      shine.setValue(0);
      void hapticSuccess();
      return;
    }

    scale.setValue(0.84);
    opacity.setValue(0);
    shine.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    Animated.sequence([
      Animated.delay(90),
      Animated.timing(shine, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    void hapticSuccess();
  }, [opacity, reducedMotion, scale, shine, visible]);

  const shineTranslate = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-84, 172],
  });
  const shineOpacity = shine.interpolate({
    inputRange: [0, 0.16, 0.8, 1],
    outputRange: [0, 0.36, 0.12, 0],
  });

  return (
    <Card style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Rank promotion celebration</Text>
        <PreviewButton label="Preview" onPress={() => setVisible(true)} />
      </View>
      <Text style={styles.previewSub}>Promoted to Bronze II</Text>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.promotionModal, { opacity, transform: [{ scale }] }]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.promotionShine,
                {
                  opacity: shineOpacity,
                  transform: [{ translateX: shineTranslate }, { rotate: "18deg" }],
                },
              ]}
            />
            <View style={styles.promotionIcon}>
              <Trophy size={24} color={C.gold} />
            </View>
            <Text style={styles.promotionKicker}>RANK PROMOTION</Text>
            <Text style={styles.promotionTitle}>Promoted to Bronze II</Text>
            <Text style={styles.promotionSub}>Up from Bronze III</Text>
            <Pressable style={styles.primaryAction} onPress={() => setVisible(false)}>
              <Text style={styles.primaryActionText}>Continue</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </Card>
  );
}

export default function LifeLayerQaScreen() {
  const insets = useSafeAreaInsets();

  if (!SHOW_INTERNAL_QA_TOOLS) {
    return <Redirect href="/settings" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/settings")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>INTERNAL QA</Text>
            <Text style={styles.title}>Life Layer previews</Text>
            <Text style={styles.sub}>Mock-only animation previews. No real player data is changed.</Text>
          </View>
        </View>

        <BadgePreview
          title="Badge: single unlock"
          badges={[{ label: "First Daily", icon: "D" }]}
        />

        <BadgePreview
          title="Badge: multiple unlocks"
          badges={[
            { label: "Streak 7", icon: "F" },
            { label: "Ranked Debut", icon: "R" },
            { label: "Clean Solve", icon: "C" },
          ]}
        />

        <DuelRevealPreview />
        <StreakFlamePreview />
        <RankPromotionPreview />

        <Card style={styles.noteCard}>
          <View style={styles.noteRow}>
            <Sparkles size={18} color={C.gold} />
            <Text style={styles.noteTitle}>Preview rules</Text>
          </View>
          <Text style={styles.noteText}>
            These previews are local only. They do not create results, sessions, challenges, RP changes, streak updates, badge unlocks, or Supabase writes.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    ...buttonShadow,
  },
  eyebrow: { color: C.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: C.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.6, marginTop: 2 },
  sub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  previewCard: { marginBottom: 14 },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  previewTitle: { color: C.ink, fontSize: 17, fontWeight: "900" },
  previewSub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 10 },
  previewButton: {
    backgroundColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...buttonShadow,
  },
  previewButtonText: { color: "#FBF8F2", fontSize: 12, fontWeight: "900" },
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  badgeChip: {
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: "#E4D6AF",
  },
  badgeShine: {
    position: "absolute",
    top: -18,
    bottom: -18,
    width: 28,
    backgroundColor: "rgba(255,255,255,0.38)",
  },
  badgeIcon: { color: C.ink, fontSize: 12, fontWeight: "900" },
  badgeText: { color: C.ink, fontSize: 12, fontWeight: "900" },
  duelCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 12,
  },
  duelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  duelLabel: { color: C.muted, fontSize: 13, fontWeight: "800" },
  duelScore: { color: C.ink, fontSize: 24, fontWeight: "900", letterSpacing: -0.6 },
  duelScoreMuted: { color: C.mutedSoft },
  verdictText: { textAlign: "center", fontSize: 22, fontWeight: "900", letterSpacing: 0.4, marginTop: 4 },
  streakPreviewWrap: {
    marginTop: 14,
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  flameGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F26B1F33",
  },
  streakPreviewText: { color: C.ink, fontSize: 18, fontWeight: "900" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#15171CB8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  promotionModal: {
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: C.card,
    padding: 24,
    alignItems: "center",
  },
  promotionShine: {
    position: "absolute",
    top: -26,
    bottom: -26,
    width: 36,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  promotionIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  promotionKicker: { color: C.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  promotionTitle: { color: C.ink, fontSize: 24, fontWeight: "900", textAlign: "center", marginTop: 6, letterSpacing: -0.5 },
  promotionSub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 6, textAlign: "center" },
  primaryAction: {
    marginTop: 18,
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    ...buttonShadow,
  },
  primaryActionText: { color: "#FBF8F2", fontSize: 14, fontWeight: "900" },
  noteCard: { marginTop: 6 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  noteTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  noteText: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 8, lineHeight: 19 },
});
