import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Polygon, Rect } from "react-native-svg";

import { C } from "@/constants/colors";
import { typography } from "@/constants/typography";

type Props = {
  size?: number;
  showWordmark?: boolean;
  tagline?: string;
};

const BRAND_NAVY = "#0F1026";
const BRAND_GOLD = "#DBB365";

export default function BrandMark({ size = 78, showWordmark = false, tagline }: Props) {
  const radius = Math.max(12, Math.round(size * 0.26));

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Rect x="0" y="0" width="100" height="100" rx="24" fill={BRAND_NAVY} />
          <Polygon
            points="19,30 34,40 50,19 66,40 81,30 73,56 27,56"
            fill={BRAND_GOLD}
          />
          <Polygon
            points="30,59 70,59 66,78 50,88 34,78"
            fill={BRAND_GOLD}
          />
          <Line x1="27" y1="56" x2="73" y2="56" stroke={BRAND_NAVY} strokeWidth="3.8" strokeLinecap="round" />
          <Line x1="43" y1="59" x2="43" y2="80" stroke={BRAND_NAVY} strokeWidth="3.8" strokeLinecap="round" />
          <Line x1="57" y1="59" x2="57" y2="80" stroke={BRAND_NAVY} strokeWidth="3.8" strokeLinecap="round" />
          <Line x1="31" y1="66" x2="69" y2="66" stroke={BRAND_NAVY} strokeWidth="3.8" strokeLinecap="round" />
          <Line x1="33" y1="73" x2="67" y2="73" stroke={BRAND_NAVY} strokeWidth="3.8" strokeLinecap="round" />
        </Svg>
      </View>

      {showWordmark ? <Text style={styles.wordmark}>SudoDuel</Text> : null}
      {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  mark: {
    alignItems: "center",
    backgroundColor: BRAND_NAVY,
    borderWidth: 1,
    borderColor: "rgba(219,179,101,0.22)",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#0F1026",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  wordmark: {
    ...typography.wordmark,
    marginTop: 14,
    color: C.ink,
    fontSize: 30,
    letterSpacing: 0,
  },
  tagline: {
    marginTop: 2,
    color: C.muted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
