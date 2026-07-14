import React from "react";

import AvatarRenderer from "@/components/AvatarRenderer";
import type { CharacterAvatarConfig } from "@/lib/avatar";

export type AvatarSizeVariant = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarExpression = "neutral" | "happy" | "sad" | "focused";
export type AvatarMotion = "static" | "idle" | "celebrate" | "defeated" | "thinking";

export interface AvatarMotionDebugConfig {
  blinkIntervalMs?: number | readonly [number, number];
  thinkingPauseMs?: number | readonly [number, number];
  disableBlink?: boolean;
}

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
  expression?: AvatarExpression;
  motion?: AvatarMotion;
  motionKey?: string | null;
  active?: boolean;
  reduceMotion?: boolean;
  debugMotionConfig?: AvatarMotionDebugConfig;
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
  expression = "neutral",
  motion = "static",
  motionKey = null,
  active = true,
  reduceMotion,
  debugMotionConfig,
  ...avatarConfig
}: AvatarProps) {
  return (
    <AvatarRenderer
      {...avatarConfig}
      initials={initials}
      legacyColor={color}
      legacySymbol={symbol}
      expression={expression}
      motion={motion}
      motionKey={motionKey}
      active={active}
      reduceMotion={reduceMotion}
      debugMotionConfig={debugMotionConfig}
      size={resolveAvatarSize(variant, size)}
    />
  );
}
