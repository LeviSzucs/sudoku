import {
  Check,
  CircleSlash2,
  Glasses,
  Lock,
  Palette,
  Scissors,
  Shirt,
  Square,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import React, { memo, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import Avatar from "@/components/Avatar";
import { C } from "@/constants/colors";
import { avatarItemsFor, type AvatarItem } from "@/lib/avatar";
import {
  AVATAR_EDITOR_CATEGORIES,
  avatarOptionAccessibilityLabel,
  createAvatarDraft,
  updateAvatarDraftField,
  updateAvatarDraftInitials,
  type AvatarDraft,
  type AvatarEditorCategoryDefinition,
  type AvatarEditorIconId,
  type AvatarEditorOptionGroup,
} from "@/lib/avatarEditor";

interface AvatarEditorProps {
  value: AvatarDraft;
  onChange: (value: AvatarDraft) => void;
  error?: string | null;
  hasPremiumCosmetics?: boolean;
  onLockedPress?: (itemLabel: string, unlockRequirement?: string | null) => void;
}

const CATEGORY_ICONS: Record<AvatarEditorIconId, LucideIcon> = {
  appearance: UserRound,
  hair: Scissors,
  outfit: Shirt,
  accessories: Glasses,
  background: Palette,
  frame: Square,
};

export default function AvatarEditor({
  value,
  onChange,
  error,
  hasPremiumCosmetics = false,
  onLockedPress,
}: AvatarEditorProps) {
  const { height, width } = useWindowDimensions();
  const [activeCategoryId, setActiveCategoryId] = useState(AVATAR_EDITOR_CATEGORIES[0].id);
  const optionScrollRef = useRef<ScrollView | null>(null);
  const config = createAvatarDraft(value);
  const isTablet = Math.min(width, height) >= 700;
  const activeCategory = AVATAR_EDITOR_CATEGORIES.find((category) => category.id === activeCategoryId)
    ?? AVATAR_EDITOR_CATEGORIES[0];

  useEffect(() => {
    optionScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeCategoryId]);

  const setField = (field: AvatarEditorOptionGroup["field"], nextValue: string | null) => {
    onChange(updateAvatarDraftField(value, field, nextValue));
  };

  return (
    <View style={[styles.editor, isTablet && styles.editorTablet]}>
      <View style={[styles.previewPane, isTablet && styles.previewPaneTablet]}>
        <Text style={styles.previewKicker}>LIVE PREVIEW</Text>
        <View style={styles.previewStage}>
          <Avatar
            {...config}
            initials={config.initials}
            color={config.avatar_color}
            symbol={null}
            size={isTablet ? 160 : 122}
            context="share"
            expression="neutral"
            motion="static"
            animated={false}
            decorative
          />
        </View>
        <Text style={styles.previewTitle}>Your SudoDuel avatar</Text>
        <Text style={styles.previewText}>Changes stay on this device until you save.</Text>
      </View>

      <View style={styles.controlsPane}>
        <CategoryTabs
          activeCategory={activeCategory}
          onSelect={setActiveCategoryId}
        />
        <ScrollView
          ref={optionScrollRef}
          style={styles.optionScroll}
          contentContainerStyle={styles.optionContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.categoryTitle}>{activeCategory.label}</Text>
          {activeCategory.includesInitials ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Initials fallback</Text>
              <TextInput
                value={value.initials}
                onChangeText={(text) => onChange(updateAvatarDraftInitials(value, text))}
                accessibilityLabel="Avatar initials"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={3}
                placeholder="SD"
                returnKeyType="done"
                style={styles.input}
              />
              <Text style={styles.helper}>One to three letters or numbers, used only when artwork cannot be shown.</Text>
            </View>
          ) : null}

          {activeCategory.groups.map((group) => (
            <OptionGroup
              key={group.id}
              group={group}
              draft={config}
              hasPremiumCosmetics={hasPremiumCosmetics}
              onSelect={(nextValue) => setField(group.field, nextValue)}
              onLockedPress={onLockedPress}
            />
          ))}

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function CategoryTabs({
  activeCategory,
  onSelect,
}: {
  activeCategory: AvatarEditorCategoryDefinition;
  onSelect: (categoryId: AvatarEditorCategoryDefinition["id"]) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
      style={styles.tabScroll}
    >
      {AVATAR_EDITOR_CATEGORIES.map((category) => {
        const selected = category.id === activeCategory.id;
        const Icon = CATEGORY_ICONS[category.icon];
        return (
          <Pressable
            key={category.id}
            accessibilityLabel={category.accessibleLabel}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(category.id)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && styles.pressed,
            ]}
          >
            <Icon size={17} color={selected ? C.card : C.inkSoft} />
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{category.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function OptionGroup({
  group,
  draft,
  hasPremiumCosmetics,
  onSelect,
  onLockedPress,
}: {
  group: AvatarEditorOptionGroup;
  draft: AvatarDraft;
  hasPremiumCosmetics: boolean;
  onSelect: (value: string | null) => void;
  onLockedPress?: (itemLabel: string, unlockRequirement?: string | null) => void;
}) {
  const items = avatarItemsFor(group.category);
  const selectedValue = draft[group.field] ?? null;
  const hasKnownSelection = items.some((item) => item.value === selectedValue);

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{group.label}</Text>
      {!hasKnownSelection ? (
        <Text style={styles.legacyNote}>Your saved avatar uses a legacy option. Choose a new one only if you want to replace it.</Text>
      ) : null}
      <View style={styles.optionGrid}>
        {items.map((item) => {
          const selected = selectedValue === item.value;
          const selectable = item.is_available || (item.unlock_type === "premium" && hasPremiumCosmetics);
          return (
            <AvatarOption
              key={item.id}
              draft={draft}
              field={group.field}
              groupLabel={group.label}
              item={item}
              kind={group.kind}
              selectable={selectable}
              selected={selected}
              onPress={() => {
                if (selectable) onSelect(item.value);
                else onLockedPress?.(item.label, item.unlock_requirement);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const AvatarOption = memo(function AvatarOption({
  draft,
  field,
  groupLabel,
  item,
  kind,
  selectable,
  selected,
  onPress,
}: {
  draft: AvatarDraft;
  field: AvatarEditorOptionGroup["field"];
  groupLabel: string;
  item: AvatarItem;
  kind: AvatarEditorOptionGroup["kind"];
  selectable: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const previewDraft = updateAvatarDraftField(draft, field, item.value);
  const selectedIconColor = item.color ? readableCheckColor(item.color) : C.card;

  return (
    <Pressable
      accessibilityLabel={avatarOptionAccessibilityLabel(groupLabel, item.label, selected)}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !selectable }}
      onPress={onPress}
      style={({ pressed }) => [
        kind === "colour" ? styles.colourOption : styles.styleOption,
        selected && styles.optionSelected,
        !selectable && styles.optionUnavailable,
        pressed && styles.pressed,
      ]}
    >
      {kind === "colour" && item.color ? (
        <View style={[styles.swatchRing, selected && styles.swatchRingSelected]}>
          <View style={[styles.swatch, { backgroundColor: item.color }]}>
            {selected ? <Check size={18} strokeWidth={3} color={selectedIconColor} /> : null}
          </View>
        </View>
      ) : item.value === null ? (
        <View style={[styles.nonePreview, selected && styles.nonePreviewSelected]}>
          <CircleSlash2 size={24} color={selected ? C.accent : C.muted} />
        </View>
      ) : (
        <View style={styles.optionAvatar}>
          <Avatar
            {...previewDraft}
            initials={previewDraft.initials}
            color={previewDraft.avatar_color}
            symbol={null}
            size={50}
            context="share"
            expression="neutral"
            motion="static"
            animated={false}
            decorative
          />
          {selected ? (
            <View style={styles.optionCheck}>
              <Check size={12} strokeWidth={3} color={C.card} />
            </View>
          ) : null}
        </View>
      )}
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]} numberOfLines={2}>{item.label}</Text>
      {!selectable ? (
        <View style={styles.lockedTag}>
          <Lock size={10} color={C.muted} />
          <Text style={styles.lockedText}>{item.unlock_requirement ?? "Unavailable"}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

function readableCheckColor(hex: string): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return C.card;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 170 ? C.ink : C.card;
}

const styles = StyleSheet.create({
  editor: { flex: 1, minHeight: 0 },
  editorTablet: { flexDirection: "row", gap: 24 },
  previewPane: { alignItems: "center", paddingBottom: 14 },
  previewPaneTablet: {
    width: 224,
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingBottom: 0,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  previewKicker: { color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  previewStage: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: { color: C.ink, fontWeight: "800", fontSize: 15, marginTop: 10 },
  previewText: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 3, maxWidth: 200 },
  controlsPane: { flex: 1, minWidth: 0, minHeight: 0 },
  tabScroll: { flexGrow: 0, marginHorizontal: -2 },
  tabs: { gap: 8, paddingHorizontal: 2, paddingBottom: 12 },
  tab: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  tabSelected: { backgroundColor: C.ink, borderColor: C.ink },
  tabText: { color: C.inkSoft, fontSize: 12, fontWeight: "700" },
  tabTextSelected: { color: C.card },
  optionScroll: { flex: 1, minHeight: 0 },
  optionContent: { paddingBottom: 18 },
  categoryTitle: { color: C.ink, fontSize: 20, fontWeight: "800", marginTop: 2 },
  group: { marginTop: 18 },
  groupTitle: { color: C.ink, fontWeight: "800", marginBottom: 10 },
  input: {
    minHeight: 48,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  helper: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 7 },
  legacyNote: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: -3, marginBottom: 9 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colourOption: {
    width: 72,
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  styleOption: {
    width: 94,
    minHeight: 104,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  optionSelected: { borderColor: C.accent, borderWidth: 2, backgroundColor: C.accentSoft },
  optionUnavailable: { opacity: 0.62 },
  swatchRing: { width: 42, height: 42, borderRadius: 21, padding: 3, borderWidth: 2, borderColor: C.border },
  swatchRingSelected: { borderColor: C.accent },
  swatch: {
    flex: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(21,23,28,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  nonePreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  nonePreviewSelected: { borderColor: C.accent },
  optionAvatar: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  optionCheck: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { color: C.inkSoft, fontWeight: "700", fontSize: 11, textAlign: "center", marginTop: 7, lineHeight: 14 },
  optionLabelSelected: { color: C.ink },
  lockedTag: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  lockedText: { color: C.muted, fontSize: 9, fontWeight: "700", maxWidth: 76, textAlign: "center" },
  error: { color: C.danger, fontWeight: "700", marginTop: 14, lineHeight: 18 },
  pressed: { opacity: 0.78 },
});
