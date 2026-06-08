import React from "react";

import AvatarRenderer from "@/components/AvatarRenderer";
import type { CharacterAvatarConfig } from "@/lib/avatar";

interface AvatarProps extends CharacterAvatarConfig {
  initials: string;
  color: string;
  size?: number;
  symbol?: string | null;
}

export default function Avatar({ initials, color, size = 40, symbol = null, ...avatarConfig }: AvatarProps) {
  return (
    <AvatarRenderer
      {...avatarConfig}
      initials={initials}
      legacyColor={color}
      legacySymbol={symbol}
      size={size}
    />
  );
}
