export type AvatarExpression = "neutral" | "happy" | "sad" | "focused";
export type AvatarMotion = "static" | "idle" | "celebrate" | "defeated" | "thinking";
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarContext =
  | "home"
  | "profile"
  | "versus"
  | "matchmaking"
  | "result"
  | "leaderboard"
  | "friends"
  | "search"
  | "notification"
  | "share";

export type AvatarAssetStatus = "existing" | "placeholder" | "future";
export type AvatarAccessibilityMode = "identity" | "decorative";

export interface AvatarAppearance {
  characterId: string;
  backgroundId?: string | null;
  frameId?: string | null;
  outfitId?: string | null;
  accessoryId?: string | null;
}

export interface AvatarPresentation {
  expression: AvatarExpression;
  motion: AvatarMotion;
  size: AvatarSize;
  animated: boolean;
  showBackground: boolean;
  showFrame: boolean;
  accessibilityMode: AvatarAccessibilityMode;
}

export interface AvatarCharacterDefinition {
  id: string;
  displayName: string;
  assetStatus: AvatarAssetStatus;
  rendererId: string;
  supportedExpressions: readonly AvatarExpression[];
  supportedMotions: readonly AvatarMotion[];
}

export interface AvatarRegistryValidation {
  valid: boolean;
  errors: string[];
}

export type AvatarResultOutcome =
  | "win"
  | "loss"
  | "draw"
  | "completed"
  | "cancelled"
  | "unresolved"
  | "failed"
  | "failed_save"
  | string
  | null
  | undefined;

export interface AvatarReaction {
  expression: AvatarExpression;
  motion: AvatarMotion;
}

export interface AvatarReactionOptions {
  authoritative?: boolean;
  resultSaveStatus?: "guest" | "pending" | "saved" | "failed";
  soloCompletion?: boolean;
}

export const DEFAULT_AVATAR_CHARACTER_ID = "character_v1";
export const AVATAR_RENDERER_IDS = ["inline_character_v1"] as const;

export const AVATAR_SIZE_PIXELS: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 84,
};

export const AVATAR_EMOTION_PRESETS = {
  neutral: { expression: "neutral", motion: "idle" },
  happy: { expression: "happy", motion: "celebrate" },
  sad: { expression: "sad", motion: "defeated" },
  focused: { expression: "focused", motion: "thinking" },
} as const satisfies Record<AvatarExpression, { expression: AvatarExpression; motion: AvatarMotion }>;

export const AVATAR_CHARACTER_REGISTRY: readonly AvatarCharacterDefinition[] = [
  {
    id: DEFAULT_AVATAR_CHARACTER_ID,
    displayName: "SudoDuel character",
    assetStatus: "existing",
    rendererId: "inline_character_v1",
    supportedExpressions: ["neutral", "happy", "sad", "focused"],
    supportedMotions: ["static", "idle", "celebrate", "defeated", "thinking"],
  },
];

const STATIC_CONTEXTS = new Set<AvatarContext>([
  "home",
  "leaderboard",
  "friends",
  "search",
  "notification",
  "share",
]);

const CONTEXT_DEFAULTS: Record<AvatarContext, AvatarPresentation> = {
  home: presentation("md", "neutral", "static", false, "identity"),
  profile: presentation("xl", "neutral", "idle", true, "identity"),
  versus: presentation("xl", "neutral", "idle", true, "identity"),
  matchmaking: presentation("xl", "focused", "thinking", true, "identity"),
  result: presentation("xl", "happy", "celebrate", true, "identity"),
  leaderboard: presentation("sm", "neutral", "static", false, "identity"),
  friends: presentation("sm", "neutral", "static", false, "identity"),
  search: presentation("sm", "neutral", "static", false, "identity"),
  notification: presentation("xs", "neutral", "static", false, "identity"),
  share: presentation("xl", "neutral", "static", false, "decorative"),
};

function presentation(
  size: AvatarSize,
  expression: AvatarExpression,
  motion: AvatarMotion,
  animated: boolean,
  accessibilityMode: AvatarAccessibilityMode
): AvatarPresentation {
  return {
    expression,
    motion,
    size,
    animated,
    showBackground: true,
    showFrame: true,
    accessibilityMode,
  };
}

export interface AvatarPresentationOptions {
  expression?: AvatarExpression;
  motion?: AvatarMotion;
  size?: AvatarSize;
  animated?: boolean;
  active?: boolean;
  reducedMotion?: boolean;
  decorative?: boolean;
  showBackground?: boolean;
  showFrame?: boolean;
}

export function shouldAnimateAvatar(context: AvatarContext): boolean {
  return !STATIC_CONTEXTS.has(context);
}

export function isAvatarMotionAllowedForContext(context: AvatarContext, motion: AvatarMotion): boolean {
  if (motion === "static") return true;
  if (context === "profile" || context === "versus") return motion === "idle";
  if (context === "matchmaking") return motion === "thinking";
  if (context === "result") return motion === "celebrate" || motion === "defeated";
  return false;
}

export function getAvatarReactionForOutcome(
  outcome: AvatarResultOutcome,
  options: AvatarReactionOptions = {}
): AvatarReaction {
  const safe = AVATAR_EMOTION_PRESETS.neutral;
  if (options.authoritative === false || options.resultSaveStatus === "pending" || options.resultSaveStatus === "failed") {
    return { expression: safe.expression, motion: "static" };
  }

  if (outcome === "win") return { ...AVATAR_EMOTION_PRESETS.happy };
  if (outcome === "loss") return { ...AVATAR_EMOTION_PRESETS.sad };
  if (outcome === "draw") return { expression: "neutral", motion: "static" };
  if (outcome === "completed" && options.soloCompletion) return { ...AVATAR_EMOTION_PRESETS.happy };
  return { expression: safe.expression, motion: "static" };
}

export function getOpponentAvatarReactionForOutcome(outcome: AvatarResultOutcome): AvatarReaction {
  if (outcome === "win") return getAvatarReactionForOutcome("loss");
  if (outcome === "loss") return getAvatarReactionForOutcome("win");
  return getAvatarReactionForOutcome(outcome);
}

export function getAvatarReactionForMatchState(state?: string | null): AvatarReaction {
  if (state === "searching" || state === "waiting" || state === "waiting_for_opponent") {
    return { ...AVATAR_EMOTION_PRESETS.focused };
  }
  return { ...AVATAR_EMOTION_PRESETS.neutral };
}

export function getAvatarPresentationForContext(
  context: AvatarContext,
  options: AvatarPresentationOptions = {}
): AvatarPresentation {
  const defaults = CONTEXT_DEFAULTS[context];
  const animationAllowed = shouldAnimateAvatar(context);
  const active = options.active ?? true;
  const animated = animationAllowed && (options.animated ?? defaults.animated) && active && !options.reducedMotion;
  const requestedMotion = options.motion ?? defaults.motion;
  const allowedMotion = isAvatarMotionAllowedForContext(context, requestedMotion)
    ? requestedMotion
    : defaults.motion;

  return {
    expression: options.expression ?? defaults.expression,
    motion: animated ? allowedMotion : "static",
    size: options.size ?? defaults.size,
    animated,
    showBackground: options.showBackground ?? defaults.showBackground,
    showFrame: options.showFrame ?? defaults.showFrame,
    accessibilityMode: options.decorative ? "decorative" : defaults.accessibilityMode,
  };
}

export function resolveAvatarCharacter(
  characterId?: string | null,
  registry: readonly AvatarCharacterDefinition[] = AVATAR_CHARACTER_REGISTRY
): AvatarCharacterDefinition {
  return registry.find((character) => character.id === characterId)
    ?? registry.find((character) => character.id === DEFAULT_AVATAR_CHARACTER_ID)
    ?? AVATAR_CHARACTER_REGISTRY[0];
}

export function resolveAvatarCapabilities(
  character: AvatarCharacterDefinition,
  requested: Pick<AvatarPresentation, "expression" | "motion" | "animated">
): Pick<AvatarPresentation, "expression" | "motion" | "animated"> {
  const expression = character.supportedExpressions.includes(requested.expression)
    ? requested.expression
    : "neutral";
  let motion: AvatarMotion = requested.motion;
  if (!character.supportedMotions.includes(motion)) {
    motion = requested.animated && character.supportedMotions.includes("idle") ? "idle" : "static";
  }
  if (!requested.animated) motion = "static";
  return { expression, motion, animated: requested.animated && motion !== "static" };
}

export function validateAvatarCharacterRegistry(
  registry: readonly AvatarCharacterDefinition[],
  validRendererIds: readonly string[] = AVATAR_RENDERER_IDS
): AvatarRegistryValidation {
  const errors: string[] = [];
  const ids = new Set<string>();
  const rendererIds = new Set(validRendererIds);

  for (const character of registry) {
    if (!character.id.trim()) errors.push("Character ID must not be empty.");
    if (ids.has(character.id)) errors.push(`Duplicate avatar character ID: ${character.id}`);
    ids.add(character.id);
    if (!rendererIds.has(character.rendererId)) {
      errors.push(`Avatar character ${character.id} references unknown renderer ${character.rendererId}.`);
    }
    if (!character.supportedExpressions.includes("neutral")) {
      errors.push(`Avatar character ${character.id} must support the neutral expression.`);
    }
    if (!character.supportedMotions.includes("static")) {
      errors.push(`Avatar character ${character.id} must support static motion.`);
    }
  }

  if (!ids.has(DEFAULT_AVATAR_CHARACTER_ID)) {
    errors.push(`Avatar registry must include ${DEFAULT_AVATAR_CHARACTER_ID}.`);
  }

  return { valid: errors.length === 0, errors };
}
