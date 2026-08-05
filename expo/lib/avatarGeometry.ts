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

