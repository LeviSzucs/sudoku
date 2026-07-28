import type { Difficulty } from "@/constants/mockData";

export const primitiveColors = {
  cream: "#F4F1EA",
  creamElevated: "#FBF8F2",
  white: "#FFFFFF",
  ink: "#15171C",
  inkSoft: "#2A2D36",
  warmGray: "#7A7568",
  warmGraySoft: "#A8A294",
  border: "#E7E1D3",
  borderStrong: "#D4CCB8",
  indigo: "#1E1B4B",
  indigoPressed: "#17143D",
  indigoSoft: "#E5E2F1",
  indigoBorder: "#B8B4D2",
  teal: "#236A61",
  tealSoft: "#DDEFEA",
  tealBorder: "#9FCBC2",
  amber: "#9A6000",
  amberSoft: "#FFF0D1",
  amberBorder: "#D89C34",
  coral: "#A8425C",
  coralSoft: "#F7E1E7",
  coralBorder: "#DEA1B0",
  purple: "#6B4FA0",
  purpleSoft: "#EEE7F7",
  purpleBorder: "#C8B5DF",
  orange: "#B94F12",
  orangeStrong: "#9A3E0B",
  orangeSoft: "#FDE2D2",
  orangeBorder: "#E9A071",
  green: "#2F6745",
  greenSoft: "#DCEBE0",
  greenBorder: "#A9CBB5",
  red: "#A83B33",
  redSoft: "#F7DEDA",
  redBorder: "#E2A7A1",
  warning: "#8A5A10",
  warningSoft: "#FBEACF",
  gold: "#76590E",
  goldSoft: "#F4E9CB",
  goldBorder: "#D8C584",
} as const;

export const semanticColors = {
  background: primitiveColors.cream,
  elevatedBackground: primitiveColors.creamElevated,
  surface: primitiveColors.white,
  mutedSurface: primitiveColors.creamElevated,
  border: primitiveColors.border,
  strongBorder: primitiveColors.borderStrong,
  primaryText: primitiveColors.ink,
  secondaryText: primitiveColors.inkSoft,
  mutedText: primitiveColors.warmGray,
  textOnDark: primitiveColors.creamElevated,
  interactive: primitiveColors.indigo,
  interactivePressed: primitiveColors.indigoPressed,
  interactiveSoft: primitiveColors.indigoSoft,
  success: primitiveColors.green,
  successSoft: primitiveColors.greenSoft,
  warning: primitiveColors.warning,
  warningSoft: primitiveColors.warningSoft,
  danger: primitiveColors.red,
  dangerSoft: primitiveColors.redSoft,
  disabled: primitiveColors.border,
  disabledText: primitiveColors.warmGraySoft,
  prestige: primitiveColors.gold,
  prestigeSoft: primitiveColors.goldSoft,
} as const;

export interface FeatureColorSet {
  accent: string;
  softBackground: string;
  border: string;
  textOnAccent: string;
}

export const difficultyColors = {
  Easy: {
    accent: primitiveColors.teal,
    softBackground: primitiveColors.tealSoft,
    border: primitiveColors.tealBorder,
    textOnAccent: primitiveColors.white,
  },
  Medium: {
    accent: primitiveColors.indigo,
    softBackground: primitiveColors.indigoSoft,
    border: primitiveColors.indigoBorder,
    textOnAccent: primitiveColors.white,
  },
  Hard: {
    accent: primitiveColors.amber,
    softBackground: primitiveColors.amberSoft,
    border: primitiveColors.amberBorder,
    textOnAccent: primitiveColors.white,
  },
  Expert: {
    accent: primitiveColors.coral,
    softBackground: primitiveColors.coralSoft,
    border: primitiveColors.coralBorder,
    textOnAccent: primitiveColors.white,
  },
  Master: {
    accent: primitiveColors.purple,
    softBackground: primitiveColors.purpleSoft,
    border: primitiveColors.purpleBorder,
    textOnAccent: primitiveColors.white,
  },
} as const satisfies Readonly<Record<Difficulty, FeatureColorSet>>;

export type ResultState = "win" | "loss" | "draw" | "pending" | "incomplete";

export const resultStateColors = {
  win: {
    accent: semanticColors.success,
    softBackground: semanticColors.successSoft,
    border: primitiveColors.greenBorder,
    textOnAccent: primitiveColors.white,
  },
  loss: {
    accent: semanticColors.danger,
    softBackground: semanticColors.dangerSoft,
    border: primitiveColors.redBorder,
    textOnAccent: primitiveColors.white,
  },
  draw: {
    accent: semanticColors.secondaryText,
    softBackground: semanticColors.mutedSurface,
    border: semanticColors.border,
    textOnAccent: primitiveColors.white,
  },
  pending: {
    accent: semanticColors.interactive,
    softBackground: semanticColors.interactiveSoft,
    border: primitiveColors.indigoBorder,
    textOnAccent: primitiveColors.white,
  },
  incomplete: {
    accent: semanticColors.mutedText,
    softBackground: semanticColors.mutedSurface,
    border: semanticColors.border,
    textOnAccent: primitiveColors.white,
  },
} as const satisfies Readonly<Record<ResultState, FeatureColorSet>>;

export type DuelSurface = "daily" | "ranked" | "standard";

export const duelColors = {
  daily: {
    accent: primitiveColors.orange,
    accentStrong: primitiveColors.orangeStrong,
    softBackground: primitiveColors.orangeSoft,
    border: primitiveColors.orangeBorder,
    textOnAccent: primitiveColors.white,
  },
  ranked: {
    accent: semanticColors.prestige,
    accentStrong: semanticColors.prestige,
    softBackground: semanticColors.prestigeSoft,
    border: primitiveColors.goldBorder,
    textOnAccent: primitiveColors.white,
  },
  standard: {
    accent: semanticColors.interactive,
    accentStrong: semanticColors.interactivePressed,
    softBackground: semanticColors.interactiveSoft,
    border: primitiveColors.indigoBorder,
    textOnAccent: primitiveColors.white,
  },
} as const satisfies Readonly<
  Record<DuelSurface, FeatureColorSet & { accentStrong: string }>
>;

export const featuredColors = {
  dailySudoku: {
    background: primitiveColors.ink,
    backgroundAlt: primitiveColors.inkSoft,
    foreground: semanticColors.textOnDark,
  },
} as const;

/**
 * Compatibility aliases for existing surfaces. New work should prefer the
 * semantic and feature mappings above.
 */
const palette = {
  bg: semanticColors.background,
  bgElevated: semanticColors.elevatedBackground,
  card: semanticColors.surface,
  ink: semanticColors.primaryText,
  inkSoft: semanticColors.secondaryText,
  muted: semanticColors.mutedText,
  mutedSoft: semanticColors.disabledText,
  border: semanticColors.border,
  borderStrong: semanticColors.strongBorder,
  // Sudoku-specific
  cellSelected: "#D8C57A",
  cellPeer: "#F1E8CC",
  cellSame: "#E3D18F",
  cellError: "#F4D4D4",
  // Accents
  accent: semanticColors.interactive,
  accentSoft: semanticColors.interactiveSoft,
  amber: "#E89B2A",
  amberSoft: "#FBEACF",
  streak: "#F26B1F",
  streakSoft: "#FDE2D2",
  gold: "#B7912F",
  goldSoft: "#F4E9CB",
  success: "#3F7D58",
  successSoft: semanticColors.successSoft,
  danger: "#C5483E",
  dangerSoft: semanticColors.dangerSoft,
  warning: semanticColors.warning,
  warningSoft: semanticColors.warningSoft,
  disabled: semanticColors.disabled,
  disabledText: semanticColors.disabledText,
  prestige: semanticColors.prestige,
  prestigeSoft: semanticColors.prestigeSoft,
};

const Colors = {
  light: {
    ...palette,
    text: palette.ink,
    background: palette.bg,
    tint: palette.accent,
    tabIconDefault: palette.mutedSoft,
    tabIconSelected: palette.ink,
  },
};

export default Colors;
export const C = palette;
