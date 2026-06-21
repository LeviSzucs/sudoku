import { Lock } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import Avatar from "@/components/Avatar";
import { C } from "@/constants/colors";
import { avatarItemsFor, normalizeAvatarConfig, type AvatarCategory, type CharacterAvatarConfig } from "@/lib/avatar";

interface AvatarEditorProps {
  value: CharacterAvatarConfig & { initials: string; avatar_color: string; avatar_symbol?: string | null };
  onChange: (value: CharacterAvatarConfig & { initials: string; avatar_color: string; avatar_symbol?: string | null }) => void;
  error?: string | null;
  hasPremiumCosmetics?: boolean;
  onLockedPress?: (itemLabel: string, unlockRequirement?: string | null) => void;
}

const sections: { title: string; category: AvatarCategory; field: keyof CharacterAvatarConfig }[] = [
  { title: "Background", category: "background", field: "avatar_bg_color" },
  { title: "Skin tone", category: "skinTone", field: "avatar_skin_tone" },
  { title: "Hair style", category: "hairStyle", field: "avatar_hair_style" },
  { title: "Hair colour", category: "hairColor", field: "avatar_hair_color" },
  { title: "Top style", category: "topStyle", field: "avatar_top_style" },
  { title: "Top colour", category: "topColor", field: "avatar_top_color" },
  { title: "Accessories", category: "accessory", field: "avatar_accessory" },
  { title: "Frame", category: "frame", field: "avatar_frame" },
];

export default function AvatarEditor({ value, onChange, error, hasPremiumCosmetics = false, onLockedPress }: AvatarEditorProps) {
  const config = normalizeAvatarConfig(value, { initials: value.initials, color: value.avatar_color, symbol: value.avatar_symbol });

  const setField = (field: keyof CharacterAvatarConfig, nextValue: string | null) => {
    onChange({
      ...value,
      [field]: nextValue,
      avatar_color: field === "avatar_bg_color" && nextValue ? nextValue : value.avatar_color,
    });
  };

  return (
    <View>
      <View style={styles.preview}>
        <View style={styles.previewHalo}>
          <Avatar
            {...config}
            initials={value.initials}
            color={config.avatar_bg_color || value.avatar_color}
            symbol={null}
            variant="xl"
            size={108}
          />
        </View>
      </View>

      <Text style={styles.label}>Initials fallback</Text>
      <TextInput
        value={value.initials}
        onChangeText={(text) => onChange({ ...value, initials: text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3), avatar_initials: text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) })}
        maxLength={3}
        placeholder="AB"
        style={styles.input}
      />
      <Text style={styles.helper}>Used only when a compact fallback is needed.</Text>

      {sections.map((section) => {
        const selected = config[section.field];
        return (
          <View key={section.title} style={styles.section}>
            <Text style={styles.label}>{section.title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroller} contentContainerStyle={styles.options}>
              {avatarItemsFor(section.category).map((item) => {
                const active = selected === item.value;
                const selectable = item.is_available || (item.unlock_type === "premium" && hasPremiumCosmetics);
                const lockedLabel = item.unlock_type === "premium" ? "Premium" : item.unlock_requirement ?? "Locked";
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => selectable ? setField(section.field, item.value) : onLockedPress?.(item.label, item.unlock_requirement)}
                    style={[styles.option, item.color ? styles.colorOption : null, active && styles.optionActive, !selectable && styles.optionLocked]}
                  >
                    {item.color ? <View style={[styles.swatch, { backgroundColor: item.color }]} /> : null}
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</Text>
                    {!selectable ? (
                      <View style={styles.lockedTag}>
                        <Lock size={11} color={active ? C.bgElevated : C.muted} />
                        <Text style={[styles.lockedTagText, active && styles.optionTextActive]}>{lockedLabel}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        );
      })}

      <Text style={styles.futureNote}>Locked cosmetics preview future rewards and Premium items.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: "center", marginBottom: 14 },
  previewHalo: { borderRadius: 64, padding: 8, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
  label: { color: C.ink, fontWeight: "900", marginTop: 14, marginBottom: 8 },
  input: { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: C.ink, fontSize: 16, fontWeight: "700" },
  helper: { color: C.muted, fontSize: 12, marginTop: 8 },
  section: { marginTop: 4 },
  optionScroller: { marginHorizontal: -8, overflow: "visible" },
  options: { gap: 8, paddingHorizontal: 8, paddingRight: 18 },
  option: { minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.card },
  colorOption: { paddingLeft: 8 },
  optionActive: { backgroundColor: C.ink, borderColor: C.ink },
  optionLocked: { opacity: 0.72 },
  optionText: { color: C.ink, fontWeight: "800", fontSize: 12 },
  optionTextActive: { color: C.bgElevated },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: "rgba(21,23,28,0.14)" },
  lockedTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  lockedTagText: { color: C.muted, fontSize: 11, fontWeight: "800" },
  futureNote: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 14 },
  error: { color: C.danger, fontWeight: "700", marginTop: 8 },
});
