import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";

import { C } from "@/constants/colors";
import { normalizeAvatarConfig, type CharacterAvatarConfig } from "@/lib/avatar";

interface AvatarRendererProps extends CharacterAvatarConfig {
  initials?: string | null;
  legacyColor?: string | null;
  legacySymbol?: string | null;
  size?: number;
}

const SKIN = "#D9A476";
const SKIN_DARK = "#B87856";
const INK = "#15171C";
const CREAM = "#FBF8F2";

function frameColor(frame: string | null): string | null {
  if (frame === "bronze") return "#B86246";
  if (frame === "silver") return "#A8A294";
  if (frame === "gold" || frame === "ranked_crown") return "#C8A45D";
  return null;
}

export default function AvatarRenderer({
  initials,
  legacyColor,
  legacySymbol,
  size = 40,
  ...config
}: AvatarRendererProps) {
  const avatar = normalizeAvatarConfig(config, { initials, color: legacyColor, symbol: legacySymbol });
  const bg = avatar.avatar_bg_color;
  const hair = avatar.avatar_hair_color;
  const top = avatar.avatar_top_color;
  const frame = frameColor(avatar.avatar_frame);
  const showInitialFallback = Boolean(legacySymbol) && avatar.avatar_style_version !== "character_v1";

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="50" fill={bg} />
        <Path d="M18 96 C22 73 35 63 50 63 C65 63 78 73 82 96 Z" fill={top} />
        {avatar.avatar_top_style === "hoodie" ? <Path d="M32 74 C36 64 44 60 50 60 C56 60 64 64 68 74 C62 71 56 70 50 70 C44 70 38 71 32 74 Z" fill="#FBF8F2" opacity="0.28" /> : null}
        {avatar.avatar_top_style === "collared" ? (
          <>
            <Polygon points="36,67 48,78 40,80" fill={CREAM} opacity="0.9" />
            <Polygon points="64,67 52,78 60,80" fill={CREAM} opacity="0.9" />
          </>
        ) : null}
        {avatar.avatar_top_style === "jersey" ? <Line x1="50" y1="68" x2="50" y2="96" stroke={CREAM} strokeWidth="3" opacity="0.45" /> : null}

        <Circle cx="50" cy="43" r="23" fill={SKIN} />
        <Ellipse cx="28" cy="45" rx="5" ry="7" fill={SKIN} />
        <Ellipse cx="72" cy="45" rx="5" ry="7" fill={SKIN} />

        {avatar.avatar_hair_style === "buzz" ? <Path d="M28 36 C31 21 69 21 72 36 C60 29 40 29 28 36 Z" fill={hair} /> : null}
        {avatar.avatar_hair_style === "short" ? <Path d="M26 38 C28 19 45 17 56 20 C67 22 74 30 73 43 C63 36 48 33 32 40 Z" fill={hair} /> : null}
        {avatar.avatar_hair_style === "side_part" ? <Path d="M25 39 C31 19 54 17 72 34 C59 32 48 36 35 45 C31 41 28 39 25 39 Z" fill={hair} /> : null}
        {avatar.avatar_hair_style === "curly" ? (
          <>
            {[30, 39, 48, 57, 66].map((cx) => <Circle key={cx} cx={cx} cy={30 + (cx % 2) * 3} r="8" fill={hair} />)}
            <Path d="M25 39 C32 27 67 26 75 41 C66 35 37 35 25 39 Z" fill={hair} />
          </>
        ) : null}
        {avatar.avatar_hair_style === "long" ? <Path d="M24 39 C27 18 72 18 76 40 L72 67 C67 62 64 52 66 43 C56 34 42 34 34 43 C36 53 33 62 28 67 Z" fill={hair} /> : null}
        {avatar.avatar_hair_style === "bun" ? (
          <>
            <Circle cx="50" cy="17" r="9" fill={hair} />
            <Path d="M26 38 C29 21 71 21 74 38 C63 32 37 32 26 38 Z" fill={hair} />
          </>
        ) : null}

        <Circle cx="42" cy="45" r="2.2" fill={INK} />
        <Circle cx="58" cy="45" r="2.2" fill={INK} />
        <Path d="M42 56 C46 60 54 60 58 56" stroke={SKIN_DARK} strokeWidth="3" strokeLinecap="round" fill="none" />

        {avatar.avatar_accessory === "glasses" ? (
          <>
            <Circle cx="42" cy="45" r="7" stroke={INK} strokeWidth="2.5" fill="none" />
            <Circle cx="58" cy="45" r="7" stroke={INK} strokeWidth="2.5" fill="none" />
            <Line x1="49" y1="45" x2="51" y2="45" stroke={INK} strokeWidth="2.5" />
          </>
        ) : null}
        {avatar.avatar_accessory === "headband" ? <Path d="M27 36 C39 29 61 29 73 36" stroke={CREAM} strokeWidth="5" strokeLinecap="round" fill="none" /> : null}
        {avatar.avatar_accessory === "headphones" ? (
          <>
            <Path d="M27 43 C27 25 73 25 73 43" stroke={INK} strokeWidth="4" fill="none" />
            <Rect x="22" y="39" width="8" height="15" rx="4" fill={INK} />
            <Rect x="70" y="39" width="8" height="15" rx="4" fill={INK} />
          </>
        ) : null}
        {avatar.avatar_frame === "ranked_crown" ? <Polygon points="38,13 45,18 50,9 55,18 62,13 59,25 41,25" fill="#C8A45D" /> : null}
        {frame ? <Circle cx="50" cy="50" r="47" stroke={frame} strokeWidth="5" fill="none" /> : null}
      </Svg>
      {showInitialFallback ? <Text style={[styles.fallbackText, { fontSize: size * 0.34 }]}>{legacySymbol || avatar.avatar_initials}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackText: {
    color: C.bgElevated,
    fontWeight: "900",
    letterSpacing: 0,
    position: "absolute",
  },
});
