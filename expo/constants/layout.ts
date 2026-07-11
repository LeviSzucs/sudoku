export const TABLET_BREAKPOINT = 768;

export function isTabletWidth(width: number): boolean {
  return width >= TABLET_BREAKPOINT;
}

export function getCenteredContentMaxWidth(width: number, maxWidth: number): number {
  return Math.min(Math.max(width, 0), maxWidth);
}
