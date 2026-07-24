import { router } from "expo-router";
import { AtSign, CheckCircle2, Palette, UserRound } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import BrandMark from "@/components/BrandMark";
import { DEFAULT_AVATAR_COLOR } from "@/constants/branding";
import { C } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile, type UsernameAvailability } from "@/hooks/usePlayerProfile";
import { initialsFromName } from "@/lib/playerProfile";

function normalizeUsernameInput(value: string): string {
  return value.trim().toLowerCase();
}

export default function UsernameSetupScreen() {
  const auth = useAuth();
  const { completeProfileSetup, checkUsernameAvailable, isLoaded, profile, profileSetupRequired } = usePlayerProfile();
  const [displayName, setDisplayName] = useState<string>(profile.display_name ?? "");
  const [username, setUsername] = useState<string>(profile.username_handle ?? "");
  const [availability, setAvailability] = useState<UsernameAvailability | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeUsernameInput(username);
  const trimmedDisplayName = displayName.trim();
  const previewInitials = useMemo(() => initialsFromName(trimmedDisplayName || normalized || "??"), [normalized, trimmedDisplayName]);

  useEffect(() => {
    if (auth.mode !== "signed_in") router.replace("/auth");
  }, [auth.mode]);

  useEffect(() => {
    if (isLoaded && !profileSetupRequired) router.replace("/(tabs)");
  }, [isLoaded, profileSetupRequired]);

  useEffect(() => {
    setError(null);
    setAvailability(null);
    if (username.trim().length === 0) return;
    let active = true;
    const timer = setTimeout(() => {
      setChecking(true);
      void checkUsernameAvailable(normalized)
        .then((result) => {
          if (!active) return;
          setAvailability(result);
        })
        .catch((checkError: unknown) => {
          if (!active) return;
          setAvailability({ username: normalized, status: "error", message: checkError instanceof Error ? checkError.message : "Could not check username." });
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [checkUsernameAvailable, normalized, username]);

  const handleUsernameChange = (value: string) => {
    setUsername(normalizeUsernameInput(value));
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setError(null);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await completeProfileSetup(trimmedDisplayName, normalized);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save your profile just now.");
      return;
    }
    router.replace("/(tabs)");
  };

  const availabilityTone =
    availability?.status === "available"
      ? styles.available
      : availability?.status === "invalid" || availability?.status === "unavailable" || availability?.status === "error"
        ? styles.errorText
        : null;
  const availabilityText = checking ? "Checking availability..." : availability?.message ?? "Use lowercase letters, numbers, and underscores.";
  const displayNameValid = trimmedDisplayName.length >= 2 && trimmedDisplayName.length <= 30;
  const canSubmit = !saving && !checking && displayNameValid && availability?.status === "available";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            <View style={styles.heroCard}>
              <View style={styles.heroGlow} />
              <BrandMark size={80} showWordmark />
              <Text style={styles.eyebrow}>One last step</Text>
              <Text style={styles.heroTitle}>Set up the name friends will see</Text>
              <Text style={styles.heroSubtitle}>
                Pick your display name and username now. You can update your avatar later in Profile.
              </Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.formTitle}>Create your profile</Text>
              <Text style={styles.formSubtitle}>This only takes a moment, and you can change it later if needed.</Text>

              <View style={styles.previewCard}>
                <Avatar initials={previewInitials} color={DEFAULT_AVATAR_COLOR} variant="lg" />
                <View style={styles.previewCopy}>
                  <Text style={styles.previewName}>{trimmedDisplayName || "Your display name"}</Text>
                  <Text style={styles.previewHandle}>{normalized ? `@${normalized}` : "@username"}</Text>
                  <View style={styles.previewHintRow}>
                    <Palette size={14} color={C.gold} />
                    <Text style={styles.previewHint}>Avatar can be updated later.</Text>
                  </View>
                </View>
              </View>

              <Field
                icon={<UserRound size={16} color={C.accent} />}
                label="Display name"
                helper="2-30 characters. Capitals and spaces are fine."
              >
                <TextInput
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={displayName}
                  onChangeText={handleDisplayNameChange}
                  maxLength={30}
                  placeholder="Enter your display name"
                  placeholderTextColor={C.mutedSoft}
                  style={styles.input}
                />
              </Field>
              {displayName.length > 0 && !displayNameValid ? <Text style={[styles.helper, styles.errorText]}>Display name must be between 2 and 30 characters.</Text> : null}

              <Field
                icon={<AtSign size={16} color={C.gold} />}
                label="Username"
                helper="Used for friend search. Lowercase letters, numbers, and underscores only."
              >
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={handleUsernameChange}
                  maxLength={20}
                  placeholder="choose_username"
                  placeholderTextColor={C.mutedSoft}
                  style={styles.input}
                />
              </Field>

              <View style={styles.statusRow}>
                {availability?.status === "available" ? <CheckCircle2 size={15} color={C.success} /> : null}
                <Text style={[styles.helper, availabilityTone, styles.statusText]}>{availabilityText}</Text>
              </View>

              {error ? (
                <View style={[styles.banner, styles.errorBanner]}>
                  <Text style={[styles.bannerText, styles.errorTextStrong]}>{error}</Text>
                </View>
              ) : null}

              <Pressable disabled={!canSubmit} onPress={submit} style={[styles.primary, !canSubmit && styles.disabledPrimary]}>
                {saving ? <ActivityIndicator color="#FBF8F2" /> : <Text style={styles.primaryText}>Continue</Text>}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  icon,
  label,
  helper,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldIcon}>{icon}</View>
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, padding: 20, justifyContent: "center" },
  shell: { width: "100%", maxWidth: 540, alignSelf: "center", gap: 16, paddingVertical: 12 },
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#15171C",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    alignItems: "flex-start",
  },
  heroGlow: {
    position: "absolute",
    left: -10,
    top: -24,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: C.accentSoft,
    opacity: 0.65,
  },
  eyebrow: {
    color: C.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 10,
  },
  heroTitle: { ...typography.displayHero, color: C.ink, fontSize: 31, lineHeight: 37, marginBottom: 10 },
  heroSubtitle: { color: C.inkSoft, fontSize: 15, lineHeight: 22, fontWeight: "500" },
  panel: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#15171C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  formTitle: { ...typography.screenTitle, fontSize: 28, lineHeight: 34, color: C.ink, marginBottom: 8 },
  formSubtitle: { color: C.muted, fontSize: 14, lineHeight: 21, fontWeight: "500" },
  previewCard: {
    marginTop: 18,
    borderRadius: 22,
    padding: 16,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  previewCopy: { flex: 1 },
  previewName: { color: C.ink, fontSize: 18, fontWeight: "900" },
  previewHandle: { color: C.accent, fontSize: 13, fontWeight: "800", marginTop: 2 },
  previewHintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  previewHint: { color: C.muted, fontSize: 12, lineHeight: 17, fontWeight: "700", flex: 1 },
  fieldBlock: { marginTop: 16 },
  fieldHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  fieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: C.ink, fontWeight: "900", fontSize: 13 },
  input: {
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: C.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  helper: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 8, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 26, marginTop: 2 },
  statusText: { marginTop: 0, flex: 1 },
  available: { color: C.success },
  errorText: { color: C.danger },
  banner: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1,
  },
  errorBanner: { backgroundColor: "#FFF3F0", borderColor: "#F4D4D4" },
  bannerText: { fontSize: 13, lineHeight: 19, fontWeight: "800" },
  errorTextStrong: { color: C.danger },
  primary: { backgroundColor: C.ink, borderRadius: 18, paddingVertical: 16, alignItems: "center", marginTop: 18, minHeight: 56, justifyContent: "center" },
  disabledPrimary: { opacity: 0.55 },
  primaryText: { color: "#FBF8F2", fontWeight: "900", fontSize: 15 },
});
