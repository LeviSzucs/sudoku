import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import AvatarRenderer from "@/components/AvatarRenderer";
import type { CharacterAvatarConfig } from "@/lib/avatar";

export type AvatarSizeVariant = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarMotion = "static" | "idle";

export const AVATAR_SIZES: Record<AvatarSizeVariant, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 84,
};

interface AvatarProps extends CharacterAvatarConfig {
  initials: string;
  color: string;
  variant?: AvatarSizeVariant;
  size?: number;
  symbol?: string | null;
  motion?: AvatarMotion;
  active?: boolean;
}

export function resolveAvatarSize(variant: AvatarSizeVariant = "md", size?: number): number {
  return typeof size === "number" ? size : AVATAR_SIZES[variant];
}

export default function Avatar({
  initials,
  color,
  variant = "md",
  size,
  symbol = null,
  motion = "static",
  active = true,
  ...avatarConfig
}: AvatarProps) {
  const prefersReducedMotion = useReducedMotion();
  const resolvedSize = resolveAvatarSize(variant, size);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const shouldAnimate = motion === "idle" && active && !prefersReducedMotion;

  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(scale);
    translateY.value = 0;
    scale.value = 1;

    if (!shouldAnimate) {
      return () => {
        cancelAnimation(translateY);
        cancelAnimation(scale);
        translateY.value = 0;
        scale.value = 1;
      };
    }

    translateY.value = withRepeat(
      withSequence(
        withTiming(-0.5, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0.8, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.012, {
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(1, {
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(scale);
      translateY.value = 0;
      scale.value = 1;
    };
  }, [scale, shouldAnimate, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (motion !== "idle") {
    return (
      <AvatarRenderer
        {...avatarConfig}
        initials={initials}
        legacyColor={color}
        legacySymbol={symbol}
        size={resolvedSize}
      />
    );
  }

  return (
    <View style={[styles.layerWrap, { width: resolvedSize, height: resolvedSize }]}>
      <AvatarRenderer
        {...avatarConfig}
        initials={initials}
        legacyColor={color}
        legacySymbol={symbol}
        size={resolvedSize}
        layer="static"
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.characterLayer, animatedStyle]}>
        <AvatarRenderer
          {...avatarConfig}
          initials={initials}
          legacyColor={color}
          legacySymbol={symbol}
          size={resolvedSize}
          layer="character"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layerWrap: {
    position: "relative",
  },
  characterLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
