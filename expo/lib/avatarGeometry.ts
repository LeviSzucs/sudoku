export const AVATAR_EYE_REGION = {
  top: 42,
  pupilCenterY: 45,
  bottom: 48,
} as const;

export const AVATAR_HAIR_GEOMETRY = {
  buzz: { translateY: -1, frontMaxY: 38, hasBackLayer: false },
  short: { translateY: -6, frontMaxY: 41, hasBackLayer: false },
  side_part: { translateY: -7, frontMaxY: 41, hasBackLayer: false },
  curly: { translateY: -7, frontMaxY: 41, hasBackLayer: false },
  long: { translateY: -2, frontMaxY: 40, hasBackLayer: true },
  bun: { translateY: -1, frontMaxY: 38, hasBackLayer: false },
} as const;

export type AvatarHairStyle = keyof typeof AVATAR_HAIR_GEOMETRY;

export const AVATAR_LAYER_ORDER = [
  "background",
  "body",
  "hair-back",
  "face",
  "hair-front",
  "facial-features",
  "accessories",
  "frame",
] as const;

export function avatarHairKeepsEyesClear(style: AvatarHairStyle): boolean {
  return AVATAR_HAIR_GEOMETRY[style].frontMaxY < AVATAR_EYE_REGION.top;
}

export function avatarHairTranslateY(style: string | null | undefined): number {
  if (!style || !(style in AVATAR_HAIR_GEOMETRY)) return 0;
  return AVATAR_HAIR_GEOMETRY[style as AvatarHairStyle].translateY;
}

