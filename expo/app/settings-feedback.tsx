import { Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, LifeBuoy, MessageSquare } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import { APP_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type FeedbackCategory = "feedback" | "problem";

function getCategory(value: string | string[] | undefined): FeedbackCategory {
  const category = Array.isArray(value) ? value[0] : value;
  return category === "problem" ? "problem" : "feedback";
}

export default function SettingsFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();
  const category = getCategory(params.category);
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const title = category === "problem" ? "Report a problem" : "Send feedback";
  const helper = category === "problem" ? "Describe what went wrong and what you were doing." : "Tell us what would make SudoDuel better.";
  const Icon = category === "problem" ? LifeBuoy : MessageSquare;
  const canSubmit = message.trim().length >= 10 && !isSubmitting;

  const appVersion = useMemo(() => "1.0.0", []);

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
        category,
        message: message.trim(),
        app_version: appVersion,
      });
      if (error) throw error;
      setMessage("");
      Alert.alert("Thanks", "Your message was saved.", [{ text: "Done", onPress: () => router.replace("/settings") }]);
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

        <Card style={{ marginTop: 18 }}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            placeholder={`Share details for the ${APP_NAME} team`}
            placeholderTextColor={C.mutedSoft}
            style={styles.input}
          />
          <Text style={styles.helper}>{message.trim().length}/10 minimum characters</Text>
          <Pressable disabled={!canSubmit} onPress={() => { void submit(); }} style={[styles.primary, !canSubmit && { opacity: 0.5 }]}>
            <Text style={styles.primaryText}>{isSubmitting ? "Sending..." : "Send"}</Text>
          </Pressable>
        </Card>
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
  input: { minHeight: 160, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, color: C.ink, fontSize: 15, fontWeight: "700" },
  helper: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 8 },
  primary: { backgroundColor: C.ink, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  primaryText: { color: "#FBF8F2", fontWeight: "900" },
});
