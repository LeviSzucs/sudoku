import {
  normalizeAvatarConfig,
  type AvatarCategory,
  type CharacterAvatarConfig,
} from "@/lib/avatar";

export type AvatarEditorCategoryId =
  | "appearance"
  | "hair"
  | "outfit"
  | "accessories"
  | "background"
  | "frame";

export type AvatarEditorIconId =
  | "appearance"
  | "hair"
  | "outfit"
  | "accessories"
  | "background"
  | "frame";

export type AvatarDraft = CharacterAvatarConfig & {
  initials: string;
  avatar_color: string;
  avatar_symbol?: string | null;
};

export interface AvatarEditorOptionGroup {
  id: string;
  label: string;
  category: AvatarCategory;
  field: keyof CharacterAvatarConfig;
  kind: "colour" | "style";
}

export interface AvatarEditorCategoryDefinition {
  id: AvatarEditorCategoryId;
  label: string;
  accessibleLabel: string;
  icon: AvatarEditorIconId;
  groups: readonly AvatarEditorOptionGroup[];
  includesInitials?: boolean;
}

export const AVATAR_EDITOR_CATEGORIES: readonly AvatarEditorCategoryDefinition[] = [
  {
    id: "appearance",
    label: "Appearance",
    accessibleLabel: "Appearance options",
    icon: "appearance",
    includesInitials: true,
    groups: [
      { id: "skin-tone", label: "Skin tone", category: "skinTone", field: "avatar_skin_tone", kind: "colour" },
    ],
  },
  {
    id: "hair",
    label: "Hair",
    accessibleLabel: "Hair options",
    icon: "hair",
    groups: [
      { id: "hair-style", label: "Hair style", category: "hairStyle", field: "avatar_hair_style", kind: "style" },
      { id: "hair-colour", label: "Hair colour", category: "hairColor", field: "avatar_hair_color", kind: "colour" },
    ],
  },
  {
    id: "outfit",
    label: "Outfit",
    accessibleLabel: "Outfit options",
    icon: "outfit",
    groups: [
      { id: "top-style", label: "Top style", category: "topStyle", field: "avatar_top_style", kind: "style" },
      { id: "top-colour", label: "Top colour", category: "topColor", field: "avatar_top_color", kind: "colour" },
    ],
  },
  {
    id: "accessories",
    label: "Accessories",
    accessibleLabel: "Accessory options",
    icon: "accessories",
    groups: [
      { id: "accessory", label: "Accessory", category: "accessory", field: "avatar_accessory", kind: "style" },
    ],
  },
  {
    id: "background",
    label: "Background",
    accessibleLabel: "Background options",
    icon: "background",
    groups: [
      { id: "background-colour", label: "Background colour", category: "background", field: "avatar_bg_color", kind: "colour" },
    ],
  },
  {
    id: "frame",
    label: "Frame",
    accessibleLabel: "Frame options",
    icon: "frame",
    groups: [
      { id: "frame", label: "Frame", category: "frame", field: "avatar_frame", kind: "style" },
    ],
  },
] as const;

const DRAFT_FIELDS: readonly (keyof AvatarDraft)[] = [
  "initials",
  "avatar_color",
  "avatar_symbol",
  "avatar_style_version",
  "avatar_bg_color",
  "avatar_initials",
  "avatar_skin_tone",
  "avatar_hair_style",
  "avatar_hair_color",
  "avatar_top_style",
  "avatar_top_color",
  "avatar_accessory",
  "avatar_frame",
] as const;

export function sanitizeAvatarInitials(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
}

export function createAvatarDraft(
  value: CharacterAvatarConfig & {
    initials?: string | null;
    avatar_color?: string | null;
    avatar_symbol?: string | null;
  },
): AvatarDraft {
  const config = normalizeAvatarConfig(value, {
    initials: value.initials,
    color: value.avatar_color,
    symbol: value.avatar_symbol,
  });
  const initials = sanitizeAvatarInitials(config.avatar_initials || value.initials || "SD") || "SD";
  return {
    ...config,
    initials,
    avatar_color: config.avatar_bg_color || value.avatar_color || "#1E1B4B",
    avatar_symbol: value.avatar_symbol ?? null,
    avatar_initials: initials,
  };
}

export function updateAvatarDraftField(
  draft: AvatarDraft,
  field: keyof CharacterAvatarConfig,
  value: string | null,
): AvatarDraft {
  return {
    ...draft,
    [field]: value,
    avatar_color: field === "avatar_bg_color" && value ? value : draft.avatar_color,
  };
}

export function updateAvatarDraftInitials(draft: AvatarDraft, value: string): AvatarDraft {
  const initials = sanitizeAvatarInitials(value);
  return { ...draft, initials, avatar_initials: initials };
}

export function avatarDraftsEqual(left: AvatarDraft, right: AvatarDraft): boolean {
  return DRAFT_FIELDS.every((field) => (left[field] ?? null) === (right[field] ?? null));
}

export function avatarOptionAccessibilityLabel(
  groupLabel: string,
  optionLabel: string,
  selected: boolean,
): string {
  return `${groupLabel}, ${optionLabel}, ${selected ? "selected" : "not selected"}`;
}

