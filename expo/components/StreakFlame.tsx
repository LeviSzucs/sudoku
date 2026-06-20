import { Flame } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { C } from "@/constants/colors";
import { tapMedium } from "@/lib/haptics";

interface Props {
  active?: boolean;
  size?: number;
  igniteKey?: string | null;
}

export default function StreakFlame({
  active = true,
  size = 26,
  igniteKey = null,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const ambientScale = useSharedValue(1);
  const ambientOpacity = useSharedValue(active ? 1 : 0.72);
  const igniteScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const lastIgniteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    cancelAnimation(ambientScale);
    cancelAnimation(ambientOpacity);

    if (!active) {
      ambientScale.value = 1;
      ambientOpacity.value = 0.72;
      return;
    }

    if (prefersReducedMotion) {
      ambientScale.value = 1;
      ambientOpacity.value = 1;
      return;
    }

    ambientScale.value = withRepeat(
      withSequence(
        withTiming(1.04, {
          duration: 1450,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0.985, {
          duration: 1250,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        })
      ),
      -1,
      true
    );
    ambientOpacity.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0.86, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(ambientScale);
      cancelAnimation(ambientOpacity);
    };
  }, [active, ambientOpacity, ambientScale, prefersReducedMotion]);

  useEffect(() => {
    if (!active || !igniteKey || lastIgniteKeyRef.current === igniteKey) return;
    lastIgniteKeyRef.current = igniteKey;

    cancelAnimation(igniteScale);
    cancelAnimation(glowOpacity);

    if (!prefersReducedMotion) {
      igniteScale.value = 0.96;
      igniteScale.value = withSequence(
        withTiming(1.22, {
          duration: 170,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
        withSpring(1, {
          damping: 10,
          stiffness: 220,
          mass: 0.7,
          reduceMotion: ReduceMotion.System,
        })
      );
      glowOpacity.value = 0.5;
      glowOpacity.value = withTiming(0, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }

    void tapMedium();
  }, [active, glowOpacity, igniteKey, igniteScale, prefersReducedMotion]);

  const flameStyle = useAnimatedStyle(() => ({
    opacity: ambientOpacity.value,
    transform: [{ scale: ambientScale.value * igniteScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 0.92 + glowOpacity.value * 0.26 }],
  }));

  const flameColor = active ? C.streak : C.mutedSoft;

  return (
    <View style={[styles.wrap, { width: size + 18, height: size + 18 }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: C.streak,
            width: size + 10,
            height: size + 10,
            borderRadius: (size + 10) / 2,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={flameStyle}>
        <Flame
          color={flameColor}
          fill={active ? flameColor : "none"}
          size={size}
          strokeWidth={1.5}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    opacity: 0,
  },
});
