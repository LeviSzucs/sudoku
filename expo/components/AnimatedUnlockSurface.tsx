import React, { useEffect, useRef } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface Props {
  animateKey?: string | null;
  delayMs?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  disabled?: boolean;
}

export default function AnimatedUnlockSurface({
  animateKey = null,
  delayMs = 0,
  children,
  style,
  borderRadius = 18,
  disabled = false,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glow = useSharedValue(0);
  const shine = useSharedValue(0);
  const lastAnimateKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!animateKey || disabled) {
      scale.value = 1;
      opacity.value = 1;
      glow.value = 0;
      shine.value = 0;
      lastAnimateKeyRef.current = animateKey;
      return;
    }

    if (lastAnimateKeyRef.current === animateKey) return;
    lastAnimateKeyRef.current = animateKey;

    if (prefersReducedMotion) {
      scale.value = 1;
      opacity.value = 1;
      glow.value = 0;
      shine.value = 0;
      return;
    }

    scale.value = 1.28;
    opacity.value = 0.9;
    glow.value = 0.22;
    shine.value = 0;

    scale.value = withDelay(
      delayMs,
      withSpring(1, {
        damping: 9,
        stiffness: 220,
        mass: 0.7,
      })
    );
    opacity.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      })
    );
    glow.value = withDelay(
      delayMs,
      withTiming(0, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      })
    );
    shine.value = withDelay(
      delayMs + 70,
      withTiming(1, {
        duration: 440,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [animateKey, delayMs, disabled, glow, opacity, prefersReducedMotion, scale, shine]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * 0.35,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.15, 0.82, 1], [0, 0.42, 0.14, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateX: interpolate(shine.value, [0, 1], [-72, 132], Extrapolation.CLAMP),
      },
      { rotate: "18deg" },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <View style={[styles.clip, { borderRadius }]}>
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
        <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]} />
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFF7DC",
  },
  shine: {
    position: "absolute",
    top: -18,
    bottom: -18,
    width: 34,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
});
