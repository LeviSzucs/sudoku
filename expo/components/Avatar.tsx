import React from "react";

import AvatarRenderer from "@/components/AvatarRenderer";
import type { CharacterAvatarConfig } from "@/lib/avatar";

export type AvatarSizeVariant = "xs" | "sm" | "md" | "lg" | "xl";

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
}

export function resolveAvatarSize(variant: AvatarSizeVariant = "md", size?: number): number {
  return typeof size === "number" ? size : AVATAR_SIZES[variant];
}

export default function Avatar({ initials, color, variant = "md", size, symbol = null, ...avatarConfig }: AvatarProps) {
  return (
    <AvatarRenderer
      {...avatarConfig}
      initials={initials}
      legacyColor={color}
      legacySymbol={symbol}
      size={resolveAvatarSize(variant, size)}
    />
  );
}
