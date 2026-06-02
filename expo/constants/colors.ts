/**
 * Premium minimalist palette inspired by editorial puzzle games.
 * Warm parchment background, deep ink, amber accent, gold for premium.
 */
const palette = {
  bg: "#F4F1EA",
  bgElevated: "#FBF8F2",
  card: "#FFFFFF",
  ink: "#15171C",
  inkSoft: "#2A2D36",
  muted: "#7A7568",
  mutedSoft: "#A8A294",
  border: "#E7E1D3",
  borderStrong: "#D4CCB8",
  // Sudoku-specific
  cellSelected: "#D8C57A",
  cellPeer: "#F1E8CC",
  cellSame: "#E3D18F",
  cellError: "#F4D4D4",
  // Accents
  accent: "#1E1B4B", // deep indigo
  accentSoft: "#E5E2F1",
  amber: "#E89B2A",
  amberSoft: "#FBEACF",
  streak: "#F26B1F",
  streakSoft: "#FDE2D2",
  gold: "#B7912F",
  goldSoft: "#F4E9CB",
  success: "#3F7D58",
  danger: "#C5483E",
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
