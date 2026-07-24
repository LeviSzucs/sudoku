import { Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, HelpCircle, Shield } from "lucide-react-native";
import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import Card from "@/components/Card";
import { APP_NAME, PREMIUM_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { LEGAL_LAST_UPDATED, SUPPORT_EMAIL_LABEL } from "@/constants/legal";
import { openSupportEmail } from "@/lib/support";

type InfoPage = "premium" | "help" | "support" | "terms" | "privacy" | "delete-account";

type Section = { title: string; body: string };
type PageAction = {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  onPress: () => void;
};

const CONTACT = `Contact us at ${SUPPORT_EMAIL_LABEL}.`;

const CONTENT: Record<InfoPage, {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: "premium" | "help" | "legal";
  sections: Section[];
}> = {
  premium: {
    eyebrow: "PREMIUM",
    title: PREMIUM_NAME,
    subtitle: "SudoDuel is free in this release.",
    icon: "premium",
    sections: [
      { title: "Current release", body: `${APP_NAME} is fully playable in this release without a purchase flow.` },
      { title: "What stays available", body: "All Classic difficulties, Daily Sudoku, Daily Duel, Friend Challenges, Ranked Duel, leaderboards, public profiles, achievements, streaks, core stats, and current avatar customisation remain available." },
      { title: "Looking ahead", body: "If supporter perks or cosmetics are added later, they will be introduced without affecting competitive fairness or core gameplay access." },
    ],
  },
  help: {
    eyebrow: "SUPPORT",
    title: "Help & FAQ",
    subtitle: "Quick answers for the current SudoDuel build.",
    icon: "help",
    sections: [
      { title: "How do I play?", body: "Choose a Classic Sudoku, Daily Sudoku, Daily Duel, Friend Challenge, or Ranked Duel mode, then fill the board so every row, column, and 3x3 box contains the digits 1 to 9 once." },
      { title: "How do Friend Challenges work?", body: "Choose a friend, pick a difficulty, and send a challenge. Both players get the same puzzle and the final result is compared once both attempts are complete." },
      { title: "How do notifications work?", body: "Inbox notifications work inside the app. Phone push notifications may depend on the current build environment, but gameplay still works if device push is unavailable." },
      { title: "Can I customise my profile and avatar?", body: "Yes. You can update your display name, avatar appearance, and privacy settings from Settings. Other players only see public profile information that your privacy settings allow." },
      { title: "What about Premium?", body: `${APP_NAME} is fully playable in this release. If supporter perks or cosmetics arrive later, they will not block the core game loop.` },
      { title: "How do I get help?", body: `Open Settings > Contact support to email us, or use Settings > Message support to send a support request from inside the app.` },
      { title: "How do I delete my account?", body: `Open Settings > Delete account to permanently delete or anonymise your account in-app. If deletion cannot complete, you can still contact ${SUPPORT_EMAIL_LABEL} for help.` },
    ],
  },
  support: {
    eyebrow: "SUPPORT",
    title: "Contact Support",
    subtitle: "Help, account, and privacy requests.",
    icon: "help",
    sections: [
      { title: "Contact support", body: `Need help with ${APP_NAME}? Email ${SUPPORT_EMAIL_LABEL} for account, privacy, or data requests, or use the in-app support form to send a message.` },
      { title: "When to use support", body: "Contact us for account access issues, puzzle progress problems, missing results, privacy questions, social feature issues, or anything else that blocks normal play." },
      { title: "What to include", body: "Include the mode you were in, what you expected, and what happened so we can investigate quickly." },
      { title: "Account and privacy requests", body: "You can use the in-app Delete account flow for permanent deletion. If something fails or you need privacy help first, email support and include the email address or username linked to your account." },
      { title: "Response expectations", body: "We aim to respond as soon as we can, with priority given to account, privacy, and gameplay-blocking issues." },
    ],
  },
  terms: {
    eyebrow: "LEGAL",
    title: "Terms of Use",
    subtitle: `Last updated ${LEGAL_LAST_UPDATED}`,
    icon: "legal",
    sections: [
      { title: "About SudoDuel", body: `${APP_NAME} is a puzzle and social game app built around solo Sudoku, daily play, asynchronous duels, ranked competition, and profile identity.` },
      { title: "Eligibility", body: "Use SudoDuel only if you are allowed to use online game services in your location. If your region requires parental or guardian permission, please use the app only with that permission." },
      { title: "Your account", body: "You are responsible for your sign-in method, account activity, username, display name, avatar choices, and keeping access to your account secure." },
      { title: "Fair use", body: "Do not cheat, automate play, manipulate rankings, exploit bugs, impersonate others, spam other users, or misuse social features, support channels, or backend services." },
      { title: "Results, rankings, and stats", body: "Scores, streaks, results, achievements, RP, and leaderboard positions may be corrected if we detect bugs, duplicate results, abuse, or data integrity issues." },
      { title: "Profile content", body: "Choose respectful usernames, display names, avatars, and messages. Do not use content that is abusive, misleading, hateful, or infringes someone else's rights." },
      { title: "Service changes", body: `${APP_NAME} may change over time, and some features or online services may be updated, paused, or removed as the app evolves.` },
      { title: "Limitation of liability", body: "To the fullest extent allowed by law, SudoDuel is provided as-is for entertainment. We are not responsible for indirect losses, unavailable service, or issues outside our reasonable control." },
      { title: "Contact us", body: CONTACT },
    ],
  },
  privacy: {
    eyebrow: "LEGAL",
    title: "Privacy Policy",
    subtitle: `Last updated ${LEGAL_LAST_UPDATED}`,
    icon: "legal",
    sections: [
      { title: "What we store", body: "SudoDuel stores account and profile information such as your account identifier, username, display name, avatar configuration, settings, and privacy preferences." },
      { title: "Gameplay and progress data", body: "We store puzzle sessions, continue state, completed and failed results, scores, timings, mistakes, hints, undos, streak progress, achievements, leaderboards, ranked records, daily duel records, and friend challenge records." },
      { title: "Social data", body: "We store friend relationships, friend requests, challenge records, public profile details that your settings allow, and in-app notifications needed to support social and competitive play." },
      { title: "Push notifications", body: "If you allow device notifications, we store push token information so we can deliver duel, challenge, and account-related notifications to your devices." },
      { title: "Support messages and error reports", body: "When you contact support, we store the category, message, and app version so we can investigate and respond. We may also store limited in-app runtime error reports such as platform, screen route, and error messages through our own support backend. We do not intentionally include puzzle boards, passwords, auth tokens, or full push tokens in these reports." },
      { title: "Analytics and crash data", body: "SudoDuel does not currently use a dedicated third-party analytics or crash provider in this client flow." },
      { title: "Payments and subscriptions", body: `${APP_NAME} does not currently offer in-app purchases or subscriptions in this release.` },
      { title: "How we use data", body: "We use stored data to run the app, save progress, calculate results, support social play, maintain leaderboards, deliver notifications, investigate issues, and keep the game fair and reliable." },
      { title: "Your choices", body: "You can update profile, avatar, privacy, and notification settings in the app. Some competitive records and result history may be retained to preserve match integrity." },
      { title: "Account deletion", body: `You can delete your account inside the app. Public profile details, active social links, push tokens, and account-linked settings are removed or anonymised. Some completed match records may be retained in minimal anonymised form so other players do not lose legitimate history.` },
      { title: "Contact us", body: CONTACT },
    ],
  },
  "delete-account": {
    eyebrow: "ACCOUNT",
    title: "Delete Account",
    subtitle: "Permanently delete or anonymise this account.",
    icon: "legal",
    sections: [
      { title: "What this does", body: "The in-app deletion flow permanently removes this account from active use. Public profile details, friend links, pending requests, active challenges, notification tokens, and account-linked settings are deleted or anonymised." },
      { title: "What may be retained", body: "Completed duel and result history may keep minimal anonymised placeholders so other players do not lose legitimate match records or broken challenge history." },
      { title: "Before you continue", body: "Account deletion is permanent. If you only want a break, signing out is safer. Once deletion finishes, you will be signed out and will need a fresh account to use SudoDuel again." },
      { title: "Need help first?", body: CONTACT },
    ],
  },
};

function getPage(value: string | string[] | undefined): InfoPage {
  const page = Array.isArray(value) ? value[0] : value;
  return page === "premium" || page === "help" || page === "support" || page === "terms" || page === "privacy" || page === "delete-account"
    ? page
    : "help";
}

function PageIcon({ type }: { type: "premium" | "help" | "legal" }) {
  if (type === "premium") return <BrandMark size={42} />;
  const Icon = type === "help" ? HelpCircle : Shield;
  return <View style={styles.icon}><Icon size={22} color={C.inkSoft} /></View>;
}

export default function SettingsInfoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ page?: string }>();
  const page = getPage(params.page);
  const content = CONTENT[page];

  const pageActions = useMemo<PageAction[]>(() => {
    if (page === "support") {
      return [
        {
          label: `Email ${SUPPORT_EMAIL_LABEL}`,
          onPress: () => {
            void openSupportEmail({
              subject: `${APP_NAME} support request`,
              body: "Hi SudoDuel,\n\nI need help with:\n\n",
            }).then((result) => {
              if (!result.ok) Alert.alert("Support", result.error);
            });
          },
        },
        { label: "Message support", variant: "secondary", onPress: () => router.push("/settings-feedback") },
        { label: "Delete account", variant: "danger", onPress: () => router.push("/settings-delete-account") },
      ];
    }

    if (page === "delete-account") {
      return [
        {
          label: "Continue to deletion",
          variant: "danger",
          onPress: () => router.push("/settings-delete-account"),
        },
        {
          label: `Email ${SUPPORT_EMAIL_LABEL}`,
          variant: "secondary",
          onPress: () => {
            void openSupportEmail({
              subject: `${APP_NAME} account deletion help`,
              body: "Hi SudoDuel,\n\nI need help with account deletion.\n\nAccount email or username:\n",
            }).then((result) => {
              if (!result.ok) Alert.alert("Delete account", result.error);
            });
          },
        },
      ];
    }

    return [];
  }, [page]);

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

        {pageActions.length ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.actionTitle}>{page === "delete-account" ? "Next steps" : "Actions"}</Text>
            <View style={styles.actionList}>
              {pageActions.map((action) => (
                <Pressable
                  key={action.label}
                  style={[
                    styles.actionButton,
                    action.variant === "secondary" && styles.actionButtonSecondary,
                    action.variant === "danger" && styles.actionButtonDanger,
                  ]}
                  onPress={action.onPress}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      action.variant === "secondary" && styles.actionButtonTextSecondary,
                      action.variant === "danger" && styles.actionButtonTextDanger,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}
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
  title: { ...typography.screenTitle, color: C.ink, fontSize: 28, letterSpacing: -0.6, marginTop: 2 },
  sub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  section: { paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 16, marginBottom: 6 },
  sectionTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  body: { color: C.muted, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 6 },
  actionTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  actionList: { gap: 10, marginTop: 14 },
  actionButton: { borderRadius: 16, backgroundColor: C.ink, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  actionButtonSecondary: { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
  actionButtonDanger: { backgroundColor: C.cellError, borderWidth: 1, borderColor: C.danger },
  actionButtonText: { color: "#FBF8F2", fontWeight: "900" },
  actionButtonTextSecondary: { color: C.ink },
  actionButtonTextDanger: { color: C.danger },
});
