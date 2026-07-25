import { StyleSheet } from "react-native";

export const fontFamilies = {
  displaySemiBold: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
} as const;

export const typography = StyleSheet.create({
  wordmark: {
    fontFamily: fontFamilies.displayBold,
  },
  displayHero: {
    fontFamily: fontFamilies.displaySemiBold,
  },
  screenTitle: {
    fontFamily: fontFamilies.displaySemiBold,
  },
  profileName: {
    fontFamily: fontFamilies.displaySemiBold,
  },
  dailyDate: {
    fontFamily: fontFamilies.displaySemiBold,
  },
  statDisplay: {
    fontFamily: fontFamilies.displaySemiBold,
    fontVariant: ["tabular-nums"],
  },
  celebrationTitle: {
    fontFamily: fontFamilies.displaySemiBold,
  },
  celebrationNumber: {
    fontFamily: fontFamilies.displaySemiBold,
    fontVariant: ["tabular-nums"],
  },
  promotionTitle: {
    fontFamily: fontFamilies.displayBold,
  },
});
