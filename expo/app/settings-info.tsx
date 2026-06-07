import { Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Crown, HelpCircle, Shield } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import Card from "@/components/Card";
import { APP_NAME, PREMIUM_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";

type InfoPage = "premium" | "help" | "terms" | "privacy";

const CONTENT: Record<InfoPage, {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: "premium" | "help" | "legal";
  sections: { title: string; body: string }[];
}> = {
  premium: {
    eyebrow: "PREMIUM",
    title: PREMIUM_NAME,
    subtitle: "SudoDuel Premium is coming soon.",
    icon: "premium",
    sections: [
      { title: "Planned areas", body: "Advanced stats, extra themes, profile cosmetics, puzzle archive, deeper history, and an ad-free experience if ads are added later." },
      { title: "Current access", body: "No current gameplay, social, ranked, or leaderboard feature is gated behind Premium." },
      { title: "Subscriptions", body: "Payments and subscription management are not implemented yet." },
    ],
  },
  help: {
    eyebrow: "SUPPORT",
    title: "Help & FAQ",
    subtitle: "Quick answers for the current SudoDuel build.",
    icon: "help",
    sections: [
      { title: "Daily modes", body: "Daily Sudoku is one solo attempt per assigned puzzle. Daily Duel matches you asynchronously against another player on the same board." },
      { title: "Duels", body: "Friend Challenge, Daily Duel, and Ranked Duel use final score first, then time and completion timestamp as tiebreakers." },
      { title: "Failed attempts", body: "A failed Daily, Daily Duel, Friend Challenge, or Ranked Duel attempt is final and still appears in Results History." },
    ],
  },
  terms: {
    eyebrow: "LEGAL",
    title: "Terms & Conditions",
    subtitle: "Development placeholder.",
    icon: "legal",
    sections: [
      { title: "Review required", body: "These terms are placeholder copy for development and must be replaced with final legal terms before App Store release." },
      { title: "Current product", body: `${APP_NAME} is in active development. Features, scoring, rankings, and availability may change before release.` },
    ],
  },
  privacy: {
    eyebrow: "LEGAL",
    title: "Privacy Policy",
    subtitle: "Development placeholder.",
    icon: "legal",
    sections: [
      { title: "Review required", body: "This privacy policy is placeholder copy for development and must be replaced with final legal language before App Store release." },
      { title: "Data areas", body: "The app uses account profile data, gameplay results, leaderboard entries, friend relationships, and support feedback to operate current features." },
    ],
  },
};

function getPage(value: string | string[] | undefined): InfoPage {
  const page = Array.isArray(value) ? value[0] : value;
  return page === "help" || page === "terms" || page === "privacy" || page === "premium" ? page : "help";
}

function PageIcon({ type }: { type: "premium" | "help" | "legal" }) {
  if (type === "premium") return <BrandMark size={42} />;
  const Icon = type === "premium" ? Crown : type === "help" ? HelpCircle : Shield;
  return <View style={styles.icon}><Icon size={22} color={type === "premium" ? C.gold : C.inkSoft} /></View>;
}

export default function SettingsInfoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ page?: string }>();
  const content = CONTENT[getPage(params.page)];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/settings")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <PageIcon type={content.icon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{content.eyebrow}</Text>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.sub}>{content.subtitle}</Text>
          </View>
        </View>

        <Card style={{ marginTop: 18 }}>
          {content.sections.map((section, index) => (
            <View key={section.title} style={[styles.section, index < content.sections.length - 1 && styles.divider]}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.body}>{section.body}</Text>
            </View>
          ))}
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
  sub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4 },
  section: { paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 16, marginBottom: 6 },
  sectionTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  body: { color: C.muted, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 6 },
});
