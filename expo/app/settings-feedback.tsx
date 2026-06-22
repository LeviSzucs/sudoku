import { Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, LifeBuoy, MessageSquare } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import { APP_VERSION } from "@/constants/appInfo";
import { APP_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { SUPPORT_EMAIL_LABEL } from "@/constants/legal";
import { useAuth } from "@/hooks/useAuth";
import { openSupportEmail } from "@/lib/support";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type FeedbackCategory = "general_feedback" | "bug_report" | "account_issue" | "gameplay_issue" | "ranked_duel_issue" | "privacy_data_request" | "account_deletion" | "other";

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: "general_feedback", label: "General feedback" },
  { value: "bug_report", label: "Bug report" },
  { value: "account_issue", label: "Account issue" },
  { value: "gameplay_issue", label: "Gameplay issue" },
  { value: "ranked_duel_issue", label: "Ranked Duel issue" },
  { value: "privacy_data_request", label: "Privacy/data request" },
  { value: "account_deletion", label: "Delete account request" },
  { value: "other", label: "Other" },
];

function getCategory(value: string | string[] | undefined): FeedbackCategory {
  const category = Array.isArray(value) ? value[0] : value;
  if (category === "problem") return "bug_report";
  if (CATEGORY_OPTIONS.some((option) => option.value === category)) return category as FeedbackCategory;
  return "general_feedback";
}

export default function SettingsFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const params = useLocalSearchParams<{ category?: string; message?: string }>();
  const isProblemReport = params.category === "problem";
  const [message, setMessage] = useState<string>(() => typeof params.message === "string" ? params.message : "");
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory>(() => getCategory(params.category));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(isProblemReport || getCategory(params.category) === "account_deletion");
  const isDeletionRequest = selectedCategory === "account_deletion";
  const title = isDeletionRequest ? "Delete account" : isProblemReport ? "Report a problem" : "Send feedback";
  const helper = isDeletionRequest
    ? "Send a deletion request so we can verify the account owner before removing data."
    : isProblemReport ? "Describe what went wrong and what you were doing." : "Tell us what would make SudoDuel better.";
  const Icon = isProblemReport ? LifeBuoy : MessageSquare;
  const canSubmit = message.trim().length >= 3 && !isSubmitting;

  const appVersion = useMemo(() => APP_VERSION, []);
  const platform = useMemo(() => Platform.OS, []);
  const submissionMessage = useMemo(() => {
    const trimmed = message.trim();
    if (!includeDiagnostics) return trimmed;
    return `${trimmed}\n\n---\nApp version: ${appVersion}\nPlatform: ${platform}`;
  }, [appVersion, includeDiagnostics, message, platform]);

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (!auth.user || !isSupabaseConfigured) {
        Alert.alert(title, "Feedback capture is available after sign in.");
        return;
      }
      const { error } = await supabase.from("feedback").insert({
        user_id: auth.user.id,
        category: selectedCategory,
        message: submissionMessage,
        app_version: appVersion,
      });
      if (error) throw error;
      setMessage("");
      setSent(true);
    } catch (error: unknown) {
      Alert.alert(title, error instanceof Error ? error.message : "Could not send this yet. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/settings")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <View style={styles.icon}><Icon size={22} color={C.inkSoft} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SUPPORT</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>{helper}</Text>
          </View>
        </View>

        {sent ? (
          <Card style={{ marginTop: 18 }}>
            <Text style={styles.successTitle}>Thanks - your feedback has been sent.</Text>
            <Text style={styles.successBody}>We saved your message for the {APP_NAME} team. For account, privacy, or data requests, you can also contact {SUPPORT_EMAIL_LABEL}.</Text>
            <Pressable
              onPress={() => {
                void openSupportEmail({
                  subject: `${APP_NAME} support follow-up`,
                  body: "Hi SudoDuel,\n\nI am following up on a feedback or support request.\n\n",
                }).then((result) => {
                  if (!result.ok) Alert.alert("Support", result.error);
                });
              }}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Email support</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/settings")} style={styles.primary}>
              <Text style={styles.primaryText}>Done</Text>
            </Pressable>
          </Card>
        ) : (
          <Card style={{ marginTop: 18 }}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {CATEGORY_OPTIONS.map((option) => (
                <Pressable key={option.value} onPress={() => setSelectedCategory(option.value)} style={[styles.chip, selectedCategory === option.value && styles.chipActive]}>
                  <Text style={[styles.chipText, selectedCategory === option.value && styles.chipTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 16 }]}>Message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              placeholder={`Share details for the ${APP_NAME} team`}
              placeholderTextColor={C.mutedSoft}
              style={styles.input}
            />
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Include app diagnostics</Text>
                <Text style={styles.toggleBody}>Adds the app version and platform to help support reproduce the issue.</Text>
              </View>
              <Switch
                value={includeDiagnostics}
                onValueChange={setIncludeDiagnostics}
                trackColor={{ false: C.border, true: C.accentSoft }}
                thumbColor={includeDiagnostics ? C.accent : C.mutedSoft}
              />
            </View>
            <Text style={styles.helper}>For account, privacy, or deletion requests, include the email or username tied to your account. Minimum 3 characters.</Text>
            <Pressable
              onPress={() => {
                void openSupportEmail({
                  subject: `${APP_NAME} ${isDeletionRequest ? "account request" : isProblemReport ? "bug report" : "feedback"}`,
                  body: message.trim() || `Hi SudoDuel,\n\nI need help with ${isDeletionRequest ? "an account deletion request" : isProblemReport ? "a problem in the app" : "feedback about the app"}.\n\n`,
                }).then((result) => {
                  if (!result.ok) Alert.alert("Support", result.error);
                });
              }}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Email support instead</Text>
            </Pressable>
            <Pressable disabled={!canSubmit} onPress={() => { void submit(); }} style={[styles.primary, !canSubmit && { opacity: 0.5 }]}>
              <Text style={styles.primaryText}>{isSubmitting ? "Sending..." : "Send"}</Text>
            </Pressable>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.bgElevated, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: C.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: C.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.6, marginTop: 2 },
  sub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  label: { color: C.ink, fontWeight: "900", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.inkSoft, fontWeight: "800", fontSize: 12 },
  chipTextActive: { color: "#FBF8F2" },
  input: { minHeight: 160, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, color: C.ink, fontSize: 15, fontWeight: "700" },
  helper: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 8 },
  toggleRow: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
  toggleTitle: { color: C.ink, fontSize: 13, fontWeight: "900" },
  toggleBody: { color: C.muted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 4 },
  successTitle: { color: C.ink, fontSize: 20, fontWeight: "900" },
  successBody: { color: C.muted, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 8 },
  secondary: { borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  secondaryText: { color: C.ink, fontWeight: "900" },
  primary: { backgroundColor: C.ink, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  primaryText: { color: "#FBF8F2", fontWeight: "900" },
});
