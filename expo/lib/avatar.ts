import { DEFAULT_AVATAR_COLOR, DEFAULT_INITIALS } from "@/constants/branding";

export type AvatarCategory = "background" | "hairStyle" | "hairColor" | "topStyle" | "topColor" | "accessory" | "frame";
export type AvatarUnlockType = "free" | "premium" | "ranked" | "achievement" | "season";

export interface AvatarItem {
  id: string;
  label: string;
  category: AvatarCategory;
  value: string | null;
  color?: string;
  unlock_type: AvatarUnlockType;
  unlock_requirement?: string | null;
  is_available: boolean;
}

export interface CharacterAvatarConfig {
  avatar_style_version?: string | null;
  avatar_bg_color?: string | null;
  avatar_initials?: string | null;
  avatar_hair_style?: string | null;
  avatar_hair_color?: string | null;
  avatar_top_style?: string | null;
  avatar_top_color?: string | null;
  avatar_accessory?: string | null;
  avatar_frame?: string | null;
}

export const AVATAR_STYLE_VERSION = "character_v1";

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: "bg_navy", label: "Navy", category: "background", value: "#1E1B4B", color: "#1E1B4B", unlock_type: "free", is_available: true },
  { id: "bg_green", label: "Green", category: "background", value: "#2F5D62", color: "#2F5D62", unlock_type: "free", is_available: true },
  { id: "bg_purple", label: "Purple", category: "background", value: "#7A4EAB", color: "#7A4EAB", unlock_type: "free", is_available: true },
  { id: "bg_clay", label: "Clay", category: "background", value: "#B86246", color: "#B86246", unlock_type: "free", is_available: true },
  { id: "bg_gold", label: "Gold", category: "background", value: "#C8A45D", color: "#C8A45D", unlock_type: "free", is_available: true },
  { id: "bg_blue", label: "Blue", category: "background", value: "#4169A8", color: "#4169A8", unlock_type: "free", is_available: true },

  { id: "hair_none", label: "None", category: "hairStyle", value: null, unlock_type: "free", is_available: true },
  { id: "hair_buzz", label: "Buzz", category: "hairStyle", value: "buzz", unlock_type: "free", is_available: true },
  { id: "hair_short", label: "Short", category: "hairStyle", value: "short", unlock_type: "free", is_available: true },
  { id: "hair_side_part", label: "Side part", category: "hairStyle", value: "side_part", unlock_type: "free", is_available: true },
  { id: "hair_curly", label: "Curly", category: "hairStyle", value: "curly", unlock_type: "free", is_available: true },
  { id: "hair_long", label: "Long", category: "hairStyle", value: "long", unlock_type: "free", is_available: true },
  { id: "hair_bun", label: "Bun", category: "hairStyle", value: "bun", unlock_type: "free", is_available: true },

  { id: "hair_black", label: "Black", category: "hairColor", value: "#1C1718", color: "#1C1718", unlock_type: "free", is_available: true },
  { id: "hair_brown", label: "Brown", category: "hairColor", value: "#6E432D", color: "#6E432D", unlock_type: "free", is_available: true },
  { id: "hair_blonde", label: "Blonde", category: "hairColor", value: "#D7B56D", color: "#D7B56D", unlock_type: "free", is_available: true },
  { id: "hair_ginger", label: "Ginger", category: "hairColor", value: "#B86246", color: "#B86246", unlock_type: "free", is_available: true },
  { id: "hair_grey", label: "Grey", category: "hairColor", value: "#A8A294", color: "#A8A294", unlock_type: "free", is_available: true },
  { id: "hair_indigo", label: "Indigo", category: "hairColor", value: "#2B1E4A", color: "#2B1E4A", unlock_type: "free", is_available: true },

  { id: "top_tee", label: "Tee", category: "topStyle", value: "tee", unlock_type: "free", is_available: true },
  { id: "top_hoodie", label: "Hoodie", category: "topStyle", value: "hoodie", unlock_type: "free", is_available: true },
  { id: "top_collared", label: "Collared", category: "topStyle", value: "collared", unlock_type: "free", is_available: true },
  { id: "top_jersey", label: "Jersey", category: "topStyle", value: "jersey", unlock_type: "free", is_available: true },

  { id: "top_navy", label: "Navy", category: "topColor", value: "#1E1B4B", color: "#1E1B4B", unlock_type: "free", is_available: true },
  { id: "top_cream", label: "Cream", category: "topColor", value: "#F4F1EA", color: "#F4F1EA", unlock_type: "free", is_available: true },
  { id: "top_gold", label: "Gold", category: "topColor", value: "#C8A45D", color: "#C8A45D", unlock_type: "free", is_available: true },
  { id: "top_green", label: "Green", category: "topColor", value: "#3F7D58", color: "#3F7D58", unlock_type: "free", is_available: true },
  { id: "top_red", label: "Red", category: "topColor", value: "#C5483E", color: "#C5483E", unlock_type: "free", is_available: true },
  { id: "top_purple", label: "Purple", category: "topColor", value: "#7A4EAB", color: "#7A4EAB", unlock_type: "free", is_available: true },

  { id: "accessory_none", label: "None", category: "accessory", value: null, unlock_type: "free", is_available: true },
  { id: "accessory_glasses", label: "Glasses", category: "accessory", value: "glasses", unlock_type: "free", is_available: true },
  { id: "accessory_headband", label: "Headband", category: "accessory", value: "headband", unlock_type: "free", is_available: true },
  { id: "accessory_headphones", label: "Headphones", category: "accessory", value: "headphones", unlock_type: "free", is_available: true },

  { id: "frame_none", label: "None", category: "frame", value: null, unlock_type: "free", is_available: true },
  { id: "frame_bronze", label: "Bronze", category: "frame", value: "bronze", unlock_type: "free", is_available: true },
  { id: "frame_silver", label: "Silver", category: "frame", value: "silver", unlock_type: "free", is_available: true },
  { id: "frame_gold", label: "Gold", category: "frame", value: "gold", unlock_type: "free", is_available: true },
  { id: "frame_ranked_crown", label: "Ranked crown", category: "frame", value: "ranked_crown", unlock_type: "ranked", unlock_requirement: "Win 25 ranked duels", is_available: false },
];

export function avatarItemsFor(category: AvatarCategory): AvatarItem[] {
  return AVATAR_ITEMS.filter((item) => item.category === category);
}

export function normalizeAvatarConfig(config: CharacterAvatarConfig, legacy?: { initials?: string | null; color?: string | null; symbol?: string | null }): Required<CharacterAvatarConfig> {
  return {
    avatar_style_version: config.avatar_style_version || AVATAR_STYLE_VERSION,
    avatar_bg_color: config.avatar_bg_color || legacy?.color || DEFAULT_AVATAR_COLOR,
    avatar_initials: (config.avatar_initials || legacy?.initials || DEFAULT_INITIALS).trim().toUpperCase().slice(0, 3),
    avatar_hair_style: config.avatar_hair_style || (legacy?.symbol ? null : "short"),
    avatar_hair_color: config.avatar_hair_color || "#6E432D",
    avatar_top_style: config.avatar_top_style || "tee",
    avatar_top_color: config.avatar_top_color || "#1E1B4B",
    avatar_accessory: config.avatar_accessory || null,
    avatar_frame: config.avatar_frame || null,
  };
}
