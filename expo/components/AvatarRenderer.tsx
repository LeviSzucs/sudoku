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
  layer?: "full" | "static" | "character";
}

const INK = "#15171C";
const CREAM = "#FBF8F2";

function frameColor(frame: string | null): string | null {
  if (frame === "bronze") return "#B86246";
  if (frame === "silver") return "#A8A294";
  if (frame === "gold" || frame === "ranked_crown" || frame === "premium_crown") return "#C8A45D";
  return null;
}

export default function AvatarRenderer({
  initials,
  legacyColor,
  legacySymbol,
  size = 40,
  layer = "full",
  ...config
}: AvatarRendererProps) {
  const avatar = normalizeAvatarConfig(config, { initials, color: legacyColor, symbol: legacySymbol });
  const bg = avatar.avatar_bg_color || "#1E1B4B";
  const skin = avatar.avatar_skin_tone || "#D19A6E";
  const hair = avatar.avatar_hair_color || "#6E432D";
  const top = avatar.avatar_top_color || "#1E1B4B";
  const frame = frameColor(avatar.avatar_frame);
  const showInitialFallback = Boolean(legacySymbol) && avatar.avatar_style_version !== "character_v1";
  const showStaticLayer = layer !== "character";
  const showCharacterLayer = layer !== "static";

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: showStaticLayer ? bg : "transparent",
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {showStaticLayer ? <Circle cx="50" cy="50" r="50" fill={bg} /> : null}
        {showStaticLayer ? <Circle cx="68" cy="18" r="20" fill={CREAM} opacity="0.08" /> : null}

        {showCharacterLayer ? <Path d="M14 100 C19 75 33 64 50 64 C67 64 81 75 86 100 Z" fill="#000000" opacity="0.14" /> : null}
        {showCharacterLayer ? <Path d="M17 100 C22 76 35 66 50 66 C65 66 78 76 83 100 Z" fill={top} /> : null}
        {showCharacterLayer ? <Path d="M28 86 C37 79 63 79 72 86 L78 100 L22 100 Z" fill="#000000" opacity="0.1" /> : null}
        {showCharacterLayer && avatar.avatar_top_style === "hoodie" ? (
          <>
            <Path d="M28 75 C34 62 45 59 50 59 C55 59 66 62 72 75 C63 71 57 70 50 70 C43 70 37 71 28 75 Z" fill={CREAM} opacity="0.28" />
            <Line x1="43" y1="72" x2="39" y2="88" stroke={CREAM} strokeWidth="2" opacity="0.5" />
            <Line x1="57" y1="72" x2="61" y2="88" stroke={CREAM} strokeWidth="2" opacity="0.5" />
          </>
        ) : null}
        {showCharacterLayer && avatar.avatar_top_style === "collared" ? (
          <>
            <Polygon points="35,68 49,81 39,84" fill={CREAM} opacity="0.9" />
            <Polygon points="65,68 51,81 61,84" fill={CREAM} opacity="0.9" />
          </>
        ) : null}
        {showCharacterLayer && avatar.avatar_top_style === "jersey" ? (
          <>
            <Line x1="50" y1="69" x2="50" y2="98" stroke={CREAM} strokeWidth="3" opacity="0.45" />
            <Line x1="33" y1="75" x2="67" y2="75" stroke={CREAM} strokeWidth="3" opacity="0.24" />
          </>
        ) : null}

        {showCharacterLayer ? <Ellipse cx="50" cy="45" rx="23" ry="25" fill="#000000" opacity="0.16" /> : null}
        {showCharacterLayer ? <Ellipse cx="50" cy="42" rx="23" ry="24" fill={skin} /> : null}
        {showCharacterLayer ? <Ellipse cx="28" cy="43" rx="5" ry="7" fill={skin} /> : null}
        {showCharacterLayer ? <Ellipse cx="72" cy="43" rx="5" ry="7" fill={skin} /> : null}
        {showCharacterLayer ? <Ellipse cx="41" cy="51" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.18" /> : null}
        {showCharacterLayer ? <Ellipse cx="59" cy="51" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.18" /> : null}

        {showCharacterLayer && avatar.avatar_hair_style === "buzz" ? (
          <>
            <Path d="M26 39 C25 24 36 16 50 16 C64 16 75 24 74 39 C68 34 60 32 50 32 C40 32 32 34 26 39 Z" fill={hair} />
            <Path d="M29 36 C37 31 63 31 71 36" stroke={INK} strokeWidth="1.5" opacity="0.16" strokeLinecap="round" fill="none" />
            <Path d="M31 31 C40 25 60 25 69 31" stroke={CREAM} strokeWidth="2" opacity="0.08" strokeLinecap="round" fill="none" />
          </>
        ) : null}
        {showCharacterLayer && avatar.avatar_hair_style === "short" ? (
          <>
            <Path d="M24 39 C25 24 36 16 50 16 C65 16 76 25 76 41 C67 35 58 33 48 34 C40 34 32 37 24 43 Z" fill={hair} />
            <Path d="M27 40 C35 34 45 32 55 33 C63 33 70 36 75 41 L73 47 C64 39 38 38 28 47 Z" fill={hair} />
          </>
        ) : null}
        {showCharacterLayer && avatar.avatar_hair_style === "side_part" ? (
          <>
            <Path d="M24 40 C28 22 42 16 55 18 C66 20 74 28 77 42 C64 34 51 34 39 41 C34 44 30 46 26 48 Z" fill={hair} />
            <Path d="M35 24 C45 30 60 31 76 39 C65 26 49 20 35 24 Z" fill={hair} />
            <Path d="M44 22 C42 30 35 38 27 45" stroke={CREAM} strokeWidth="2.2" opacity="0.18" strokeLinecap="round" />
          </>
        ) : null}
        {showCharacterLayer && avatar.avatar_hair_style === "curly" ? (
          <>
            <Path d="M23 42 C25 27 37 18 50 18 C64 18 75 27 77 42 C66 36 34 36 23 42 Z" fill={hair} />
            {[28, 36, 44, 52, 60, 68, 74].map((cx, index) => <Circle key={cx} cx={cx} cy={31 + (index % 2) * 3} r="7.4" fill={hair} />)}
            <Path d="M27 42 C37 36 63 36 73 42 L72 48 C63 40 37 40 28 48 Z" fill={hair} />
          </>
        ) : null}
        {showCharacterLayer && avatar.avatar_hair_style === "long" ? (
          <>
            <Path d="M22 40 C24 20 36 15 50 15 C64 15 76 20 78 40 L75 72 C68 66 65 54 66 43 C59 36 41 36 34 43 C35 54 32 66 25 72 Z" fill={hair} />
            <Path d="M28 42 C38 33 62 33 72 42 C63 39 37 39 28 42 Z" fill={hair} />
          </>
        ) : null}
        {showCharacterLayer && avatar.avatar_hair_style === "bun" ? (
          <>
            <Circle cx="50" cy="15" r="9.5" fill={hair} />
            <Path d="M25 39 C27 23 38 18 50 18 C62 18 73 23 75 39 C64 33 36 33 25 39 Z" fill={hair} />
            <Path d="M32 34 C40 28 60 28 68 34" stroke={CREAM} strokeWidth="2" opacity="0.1" strokeLinecap="round" fill="none" />
          </>
        ) : null}

        {showCharacterLayer ? <Path d="M36 40 C39 38 43 38 46 40" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" /> : null}
        {showCharacterLayer ? <Path d="M54 40 C57 38 61 38 64 40" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" /> : null}
        {showCharacterLayer ? <Ellipse cx="42" cy="45" rx="2.6" ry="3" fill={INK} /> : null}
        {showCharacterLayer ? <Ellipse cx="58" cy="45" rx="2.6" ry="3" fill={INK} /> : null}
        {showCharacterLayer ? <Circle cx="43" cy="44" r="0.8" fill={CREAM} opacity="0.9" /> : null}
        {showCharacterLayer ? <Circle cx="59" cy="44" r="0.8" fill={CREAM} opacity="0.9" /> : null}
        {showCharacterLayer ? <Path d="M43 57 C47 61 53 61 57 57" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.58" /> : null}

        {showCharacterLayer && avatar.avatar_accessory === "glasses" ? (
          <>
            <Circle cx="42" cy="45" r="7.5" stroke={INK} strokeWidth="2.5" fill="none" opacity="0.88" />
            <Circle cx="58" cy="45" r="7.5" stroke={INK} strokeWidth="2.5" fill="none" opacity="0.88" />
            <Line x1="49" y1="45" x2="51" y2="45" stroke={INK} strokeWidth="2.5" />
          </>
        ) : null}
        {showCharacterLayer && avatar.avatar_accessory === "headband" ? <Path d="M27 36 C39 29 61 29 73 36" stroke={CREAM} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.92" /> : null}
        {showCharacterLayer && avatar.avatar_accessory === "headphones" ? (
          <>
            <Path d="M27 43 C27 25 73 25 73 43" stroke={INK} strokeWidth="4" fill="none" />
            <Rect x="21" y="38" width="9" height="16" rx="4.5" fill={INK} />
            <Rect x="70" y="38" width="9" height="16" rx="4.5" fill={INK} />
          </>
        ) : null}
        {showStaticLayer && frame ? (
          <>
            <Circle cx="50" cy="50" r="47" stroke="#000000" strokeWidth="7" opacity="0.16" fill="none" />
            <Circle cx="50" cy="50" r="46" stroke={frame} strokeWidth={avatar.avatar_frame === "ranked_crown" || avatar.avatar_frame === "premium_crown" ? "6" : "5"} fill="none" />
            <Circle cx="50" cy="50" r="39" stroke={frame} strokeWidth="1.4" opacity="0.5" fill="none" />
          </>
        ) : null}
        {showStaticLayer && (avatar.avatar_frame === "ranked_crown" || avatar.avatar_frame === "premium_crown")
          ? <Polygon points="37,13 45,18 50,8 55,18 63,13 60,26 40,26" fill="#C8A45D" stroke={INK} strokeWidth="1.2" />
          : null}
      </Svg>
      {showCharacterLayer && showInitialFallback ? <Text style={[styles.fallbackText, { fontSize: size * 0.34 }]}>{legacySymbol || avatar.avatar_initials}</Text> : null}
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
