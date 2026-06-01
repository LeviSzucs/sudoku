import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Grid3X3 } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import { APP_NAME, DEFAULT_AVATAR_COLOR } from "@/constants/branding";
import { C } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile, type UsernameAvailability } from "@/hooks/usePlayerProfile";
import { initialsFromName } from "@/lib/playerProfile";

function normalizeUsernameInput(value: string): string {
  return value.trim().toLowerCase();
}

export default function UsernameSetupScreen() {
  const auth = useAuth();
  const { completeProfileSetup, checkUsernameAvailable, isLoaded, profile, profileSetupRequired } = usePlayerProfile();
  const [username, setUsername] = useState<string>(profile.username_handle ?? "");
  const [availability, setAvailability] = useState<UsernameAvailability | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeUsernameInput(username);
  const previewInitials = useMemo(() => initialsFromName(normalized || "??"), [normalized]);

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
      void checkUsernameAvailable(normalized).then((result) => {
        if (!active) return;
        setAvailability(result);
      }).catch((checkError: unknown) => {
        if (!active) return;
        setAvailability({ username: normalized, status: "error", message: checkError instanceof Error ? checkError.message : "Could not check username." });
      }).finally(() => {
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

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await completeProfileSetup(normalized);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save username.");
      return;
    }
    router.replace("/(tabs)");
  };

  const availabilityText = checking ? "Checking..." : availability?.message ?? "Use lowercase letters, numbers, and underscores.";
  const canSubmit = !saving && !checking && availability?.status === "available";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <LinearGradient colors={["#1E1B4B", "#C8A45D"]} style={styles.logo}>
              <Grid3X3 color="#FBF8F2" size={34} strokeWidth={2.6} />
            </LinearGradient>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.tagline}>Choose the username people will use to find you.</Text>
          </View>
          <View style={styles.panel}>
            <Text style={styles.formTitle}>Choose your username</Text>
            <View style={styles.avatarWrap}>
              <Avatar initials={previewInitials} color={DEFAULT_AVATAR_COLOR} size={82} />
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={handleUsernameChange}
              maxLength={20}
              placeholder="username"
              placeholderTextColor={C.mutedSoft}
              style={styles.input}
            />
            <Text style={[styles.helper, availability?.status === "available" && styles.available, (availability?.status === "invalid" || availability?.status === "unavailable" || availability?.status === "error") && styles.errorText]}>{availabilityText}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable disabled={!canSubmit} onPress={submit} style={[styles.primary, !canSubmit && { opacity: 0.55 }]}>
              {saving ? <ActivityIndicator color="#FBF8F2" /> : <Text style={styles.primaryText}>Continue</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, padding: 24, justifyContent: "center" },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  logo: { width: 78, height: 78, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  appName: { fontSize: 32, fontWeight: "900", color: C.ink, letterSpacing: -0.8 },
  tagline: { color: C.muted, fontWeight: "700", textAlign: "center", marginTop: 6 },
  panel: { backgroundColor: C.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: C.border },
  formTitle: { fontSize: 26, fontWeight: "900", color: C.ink, marginBottom: 16, letterSpacing: -0.5 },
  avatarWrap: { alignItems: "center", marginBottom: 8 },
  input: { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13, color: C.ink, fontSize: 16, fontWeight: "700", marginTop: 10 },
  helper: { color: C.muted, fontSize: 12, marginTop: 8, fontWeight: "700" },
  available: { color: C.success },
  errorText: { color: C.danger },
  error: { color: C.danger, fontWeight: "800", marginTop: 10 },
  primary: { backgroundColor: C.ink, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  primaryText: { color: "#FBF8F2", fontWeight: "900", fontSize: 15 },
});
