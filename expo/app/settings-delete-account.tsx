import { Stack, router } from "expo-router";
import { ChevronLeft, TriangleAlert, Trash2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import { APP_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { SUPPORT_EMAIL_LABEL } from "@/constants/legal";
import { useAuth } from "@/hooks/useAuth";
import { deleteCurrentAccount } from "@/lib/accountDeletion";
import { openSupportEmail } from "@/lib/support";

const DELETE_CONFIRMATION_TEXT = "DELETE";

export default function SettingsDeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [understandsPermanentDeletion, setUnderstandsPermanentDeletion] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const emailOrUsername = useMemo(() => {
    const email = auth.user?.email?.trim();
    if (email) return email;
    return auth.user?.user_metadata?.username_handle as string | undefined;
  }, [auth.user?.email, auth.user?.user_metadata]);

  const readyToDelete = typedConfirmation.trim().toUpperCase() === DELETE_CONFIRMATION_TEXT && understandsPermanentDeletion && !isDeleting;

  const handleDelete = async () => {
    if (!readyToDelete) return;

    setIsDeleting(true);
    const result = await deleteCurrentAccount();
    setIsDeleting(false);

    if (!result.ok) {
      Alert.alert(
        "Delete account",
        result.error ?? "We could not delete this account right now.",
        [
          { text: "Close", style: "cancel" },
          {
            text: "Email support",
            onPress: () => {
              void openSupportEmail({
                subject: `${APP_NAME} account deletion help`,
                body: `Hi SudoDuel,\n\nI tried to delete my account in the app but the deletion did not complete.\n\nAccount email or username: ${emailOrUsername ?? ""}\n\n`,
              }).then((emailResult) => {
                if (!emailResult.ok) Alert.alert("Delete account", emailResult.error);
              });
            },
          },
        ],
      );
      return;
    }

    Alert.alert("Account deleted", "Your account has been removed from this device and any remaining match history has been anonymised where needed.", [
      {
        text: "OK",
        onPress: () => {
          void auth.signOut();
          router.replace("/auth");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/settings")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <View style={styles.icon}>
            <Trash2 size={20} color={C.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.title}>Delete Account</Text>
            <Text style={styles.sub}>This permanently removes your SudoDuel account from active use.</Text>
          </View>
        </View>

        <Card style={{ marginTop: 18 }}>
          <View style={styles.warningRow}>
            <TriangleAlert size={18} color={C.danger} />
            <Text style={styles.warningText}>This action is permanent and cannot be undone.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What will happen</Text>
            <Text style={styles.body}>Your public profile, username, display name, avatar presentation, friend links, pending requests, active challenges, notification tokens, and account-linked settings will be deleted or anonymised.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What may be retained in minimal form</Text>
            <Text style={styles.body}>Completed duel and result history may keep anonymised placeholders so other players do not lose legitimate match records, rankings integrity, or challenge outcomes.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support records</Text>
            <Text style={styles.body}>Support requests and device push tokens linked to this account will be removed or detached where safe.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Before you confirm</Text>
            <Text style={styles.body}>You will be signed out immediately after deletion. For now, starting fresh with the same email, Apple sign-in, or Google sign-in is not automatic. If you come back later, you may need a different sign-in or help from support.</Text>
          </View>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Type {DELETE_CONFIRMATION_TEXT}</Text>
          <Text style={styles.helper}>This helps prevent accidental account deletion.</Text>
          <TextInput
            value={typedConfirmation}
            onChangeText={setTypedConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={DELETE_CONFIRMATION_TEXT}
            placeholderTextColor={C.mutedSoft}
            style={styles.input}
          />

          <Pressable
            style={[styles.checkboxRow, understandsPermanentDeletion && styles.checkboxRowActive]}
            onPress={() => setUnderstandsPermanentDeletion((current) => !current)}
          >
            <View style={[styles.checkbox, understandsPermanentDeletion && styles.checkboxActive]}>
              {understandsPermanentDeletion ? <Text style={styles.checkboxTick}>X</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>I understand this permanently removes my account and signs me out.</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, !readyToDelete && styles.primaryButtonDisabled]}
            disabled={!readyToDelete}
            onPress={() => {
              Alert.alert(
                "Delete account permanently?",
                "This will delete or anonymise your account data and remove the account from active use.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: isDeleting ? "Deleting..." : "Delete account", style: "destructive", onPress: () => { void handleDelete(); } },
                ],
              );
            }}
          >
            <Text style={styles.primaryButtonText}>{isDeleting ? "Deleting..." : "Delete account"}</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              void openSupportEmail({
                subject: `${APP_NAME} account deletion help`,
                body: `Hi SudoDuel,\n\nI need help with account deletion.\n\nAccount email or username: ${emailOrUsername ?? ""}\n\n`,
              }).then((result) => {
                if (!result.ok) Alert.alert("Delete account", result.error);
              });
            }}
          >
            <Text style={styles.secondaryButtonText}>Email {SUPPORT_EMAIL_LABEL}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: C.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: C.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.6, marginTop: 2 },
  sub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.cellError,
    borderWidth: 1,
    borderColor: C.danger,
  },
  warningText: { color: C.danger, fontSize: 13, fontWeight: "900", flex: 1, lineHeight: 18 },
  section: { marginTop: 16 },
  sectionTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  body: { color: C.muted, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 6 },
  helper: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 6 },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    backgroundColor: C.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: C.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  checkboxRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
  },
  checkboxRowActive: {
    borderColor: C.danger,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
  },
  checkboxActive: {
    borderColor: C.danger,
    backgroundColor: C.cellError,
  },
  checkboxTick: { color: C.danger, fontWeight: "900" },
  checkboxLabel: { flex: 1, color: C.ink, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  primaryButton: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: C.danger,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: { color: "#FBF8F2", fontWeight: "900" },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: C.ink, fontWeight: "900" },
});
