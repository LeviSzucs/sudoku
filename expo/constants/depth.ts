import type { ViewStyle } from "react-native";

export const cardShadow: ViewStyle = {
  shadowColor: "#15171C",
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 3,
};

export const buttonShadow: ViewStyle = {
  shadowColor: "#15171C",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 9,
  elevation: 2,
};

export const premiumShadow: ViewStyle = {
  shadowColor: "#B7912F",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 18,
  elevation: 4,
};

export const pressedDepth: ViewStyle = {
  opacity: 0.92,
  transform: [{ scale: 0.99 }],
  shadowOpacity: 0.04,
  elevation: 1,
};
