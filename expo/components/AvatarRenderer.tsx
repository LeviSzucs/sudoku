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
  const bg = avatar.avatar_bg_color || "#1E1B4B";
  const skin = avatar.avatar_skin_tone || "#D19A6E";
  const hair = avatar.avatar_hair_color || "#6E432D";
  const top = avatar.avatar_top_color || "#1E1B4B";
  const frame = frameColor(avatar.avatar_frame);
  const showInitialFallback = Boolean(legacySymbol) && avatar.avatar_style_version !== "character_v1";

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="50" fill={bg} />
        <Circle cx="68" cy="18" r="20" fill={CREAM} opacity="0.08" />
        <Path d="M14 100 C19 75 33 64 50 64 C67 64 81 75 86 100 Z" fill="#000000" opacity="0.14" />
        <Path d="M17 100 C22 76 35 66 50 66 C65 66 78 76 83 100 Z" fill={top} />
        <Path d="M28 86 C37 79 63 79 72 86 L78 100 L22 100 Z" fill="#000000" opacity="0.1" />
        {avatar.avatar_top_style === "hoodie" ? (
          <>
            <Path d="M28 75 C34 62 45 59 50 59 C55 59 66 62 72 75 C63 71 57 70 50 70 C43 70 37 71 28 75 Z" fill={CREAM} opacity="0.28" />
            <Line x1="43" y1="72" x2="39" y2="88" stroke={CREAM} strokeWidth="2" opacity="0.5" />
            <Line x1="57" y1="72" x2="61" y2="88" stroke={CREAM} strokeWidth="2" opacity="0.5" />
          </>
        ) : null}
        {avatar.avatar_top_style === "collared" ? (
          <>
            <Polygon points="35,68 49,81 39,84" fill={CREAM} opacity="0.9" />
            <Polygon points="65,68 51,81 61,84" fill={CREAM} opacity="0.9" />
          </>
        ) : null}
        {avatar.avatar_top_style === "jersey" ? (
          <>
            <Line x1="50" y1="69" x2="50" y2="98" stroke={CREAM} strokeWidth="3" opacity="0.45" />
            <Line x1="33" y1="75" x2="67" y2="75" stroke={CREAM} strokeWidth="3" opacity="0.24" />
          </>
        ) : null}

        <Ellipse cx="50" cy="45" rx="23" ry="25" fill="#000000" opacity="0.16" />
        <Ellipse cx="50" cy="42" rx="23" ry="24" fill={skin} />
        <Ellipse cx="28" cy="43" rx="5" ry="7" fill={skin} />
        <Ellipse cx="72" cy="43" rx="5" ry="7" fill={skin} />
        <Ellipse cx="41" cy="51" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.18" />
        <Ellipse cx="59" cy="51" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.18" />

        {avatar.avatar_hair_style === "buzz" ? <Path d="M27 35 C30 22 69 22 73 35 C62 29 39 29 27 35 Z" fill={hair} /> : null}
        {avatar.avatar_hair_style === "short" ? <Path d="M25 38 C27 20 44 16 57 20 C68 23 75 31 73 43 C63 35 47 32 32 40 C30 40 27 39 25 38 Z" fill={hair} /> : null}
        {avatar.avatar_hair_style === "side_part" ? (
          <>
            <Path d="M25 39 C31 19 55 17 73 34 C60 31 48 35 35 45 C31 42 28 40 25 39 Z" fill={hair} />
            <Path d="M50 22 C45 30 38 37 30 41" stroke={CREAM} strokeWidth="2" opacity="0.16" strokeLinecap="round" />
          </>
        ) : null}
        {avatar.avatar_hair_style === "curly" ? (
          <>
            {[29, 38, 47, 56, 65, 72].map((cx) => <Circle key={cx} cx={cx} cy={30 + (cx % 2) * 3} r="7.8" fill={hair} />)}
            <Path d="M24 40 C32 28 68 27 76 41 C66 36 37 36 24 40 Z" fill={hair} />
          </>
        ) : null}
        {avatar.avatar_hair_style === "long" ? <Path d="M23 39 C26 18 73 18 77 40 L73 69 C68 64 65 53 66 43 C57 34 43 34 34 43 C35 54 32 64 27 69 Z" fill={hair} /> : null}
        {avatar.avatar_hair_style === "bun" ? (
          <>
            <Circle cx="50" cy="16" r="9" fill={hair} />
            <Path d="M26 38 C29 21 71 21 74 38 C63 32 37 32 26 38 Z" fill={hair} />
          </>
        ) : null}

        <Path d="M36 40 C39 38 43 38 46 40" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <Path d="M54 40 C57 38 61 38 64 40" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <Ellipse cx="42" cy="45" rx="2.6" ry="3" fill={INK} />
        <Ellipse cx="58" cy="45" rx="2.6" ry="3" fill={INK} />
        <Circle cx="43" cy="44" r="0.8" fill={CREAM} opacity="0.9" />
        <Circle cx="59" cy="44" r="0.8" fill={CREAM} opacity="0.9" />
        <Path d="M43 57 C47 61 53 61 57 57" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.58" />

        {avatar.avatar_accessory === "glasses" ? (
          <>
            <Circle cx="42" cy="45" r="7.5" stroke={INK} strokeWidth="2.5" fill="none" opacity="0.88" />
            <Circle cx="58" cy="45" r="7.5" stroke={INK} strokeWidth="2.5" fill="none" opacity="0.88" />
            <Line x1="49" y1="45" x2="51" y2="45" stroke={INK} strokeWidth="2.5" />
          </>
        ) : null}
        {avatar.avatar_accessory === "headband" ? <Path d="M27 36 C39 29 61 29 73 36" stroke={CREAM} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.92" /> : null}
        {avatar.avatar_accessory === "headphones" ? (
          <>
            <Path d="M27 43 C27 25 73 25 73 43" stroke={INK} strokeWidth="4" fill="none" />
            <Rect x="21" y="38" width="9" height="16" rx="4.5" fill={INK} />
            <Rect x="70" y="38" width="9" height="16" rx="4.5" fill={INK} />
          </>
        ) : null}
        {frame ? (
          <>
            <Circle cx="50" cy="50" r="47" stroke="#000000" strokeWidth="7" opacity="0.16" fill="none" />
            <Circle cx="50" cy="50" r="46" stroke={frame} strokeWidth={avatar.avatar_frame === "ranked_crown" ? "6" : "5"} fill="none" />
            <Circle cx="50" cy="50" r="39" stroke={frame} strokeWidth="1.4" opacity="0.5" fill="none" />
          </>
        ) : null}
        {avatar.avatar_frame === "ranked_crown" ? <Polygon points="37,13 45,18 50,8 55,18 63,13 60,26 40,26" fill="#C8A45D" stroke={INK} strokeWidth="1.2" /> : null}
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
