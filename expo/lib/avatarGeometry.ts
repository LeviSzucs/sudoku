export const AVATAR_EYE_REGION = {
  top: 42,
  pupilCenterY: 45,
  bottom: 48,
} as const;

export const AVATAR_CHARACTER_CLIP_RADIUS = 49;
export const AVATAR_FRAMED_CHARACTER_CLIP_RADIUS = 43;

const VISIBLE_AVATAR_FRAMES = new Set(["bronze", "silver", "gold", "premium_crown", "ranked_crown"]);

export const AVATAR_HAIR_GEOMETRY = {
  buzz: geometry(0, 0, 1, 1, 39, 38, 39, false),
  short: geometry(0, -2, 1, 1, 41, 40, 45, false),
  side_part: geometry(0, -2, 1, 1, 40, 40, 46, false),
  curly: geometry(0, -2, 1, 1, 40, 40, 46, false),
  long: geometry(0, 0, 1, 1, 42, 39, 42, true),
  bun: geometry(0, 0, 1, 1, 39, 38, 39, false),
} as const;

export const AVATAR_LONG_HAIR_ANCHORS = {
  leftTempleX: 25,
  rightTempleX: 75,
  scalpTopY: 16,
  frontHairlineY: 42,
  sideBottomY: 78,
} as const;

export const AVATAR_LONG_HAIR_PATHS = {
  back: "M22 41 C22 24 34 14 50 14 C66 14 78 24 78 41 C78 53 76 67 71 78 C67 76 64 69 64 58 L64 44 C60 38 56 35 50 35 C44 35 40 38 36 44 L36 58 C36 69 33 76 29 78 C24 67 22 53 22 41 Z",
  front: "M25 42 C25 26 36 16 50 16 C64 16 75 26 75 42 C69 38 63 35 57 34 C54 36 52 39 50 42 C47 39 44 36 40 35 C34 36 29 39 25 42 Z",
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

function geometry(
  translateX: number,
  translateY: number,
  scaleX: number,
  scaleY: number,
  foreheadAnchorY: number,
  pupilFringeY: number,
  frontMaxY: number,
  hasBackLayer: boolean,
) {
  return { translateX, translateY, scaleX, scaleY, foreheadAnchorY, pupilFringeY, frontMaxY, hasBackLayer };
}

export function avatarHairKeepsPupilsClear(style: AvatarHairStyle): boolean {
  return AVATAR_HAIR_GEOMETRY[style].pupilFringeY <= AVATAR_EYE_REGION.top;
}

export function avatarHairIsAttached(style: AvatarHairStyle): boolean {
  const anchor = AVATAR_HAIR_GEOMETRY[style].foreheadAnchorY;
  return anchor >= 38 && anchor <= 43;
}

export function avatarHairTransform(style: string | null | undefined): string | null {
  if (!style || !(style in AVATAR_HAIR_GEOMETRY)) return null;
  const geometry = AVATAR_HAIR_GEOMETRY[style as AvatarHairStyle];
  return [
    `translate(${geometry.translateX} ${geometry.translateY})`,
    `translate(50 42)`,
    `scale(${geometry.scaleX} ${geometry.scaleY})`,
    `translate(-50 -42)`,
  ].join(" ");
}

export function avatarClipPathId(instanceId: string): string {
  const safeId = instanceId.replace(/[^a-zA-Z0-9_-]/g, "") || "root";
  return `avatar-character-clip-${safeId}`;
}

export function avatarHasVisibleFrame(frame: string | null | undefined): boolean {
  return typeof frame === "string" && VISIBLE_AVATAR_FRAMES.has(frame);
}

export function avatarCharacterClipRadius(frame: string | null | undefined): number {
  return avatarHasVisibleFrame(frame) ? AVATAR_FRAMED_CHARACTER_CLIP_RADIUS : AVATAR_CHARACTER_CLIP_RADIUS;
}

export function avatarCharacterClipInset(size: number, frame: string | null | undefined): number {
  return size * (50 - avatarCharacterClipRadius(frame)) / 100;
}

