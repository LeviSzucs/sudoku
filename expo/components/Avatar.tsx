import React, { useEffect } from "react";
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
  const translateY = useSharedValue(0);
  const shouldAnimate = motion === "idle" && active && !prefersReducedMotion;

  useEffect(() => {
    cancelAnimation(translateY);
    translateY.value = 0;

    if (!shouldAnimate) {
      return () => {
        cancelAnimation(translateY);
        translateY.value = 0;
      };
    }

    translateY.value = withRepeat(
      withSequence(
        withTiming(-1.5, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(1.5, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(translateY);
      translateY.value = 0;
    };
  }, [shouldAnimate, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AvatarRenderer
        {...avatarConfig}
        initials={initials}
        legacyColor={color}
        legacySymbol={symbol}
        size={resolveAvatarSize(variant, size)}
      />
    </Animated.View>
  );
}
