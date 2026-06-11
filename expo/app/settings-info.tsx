import { Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Crown, HelpCircle, Shield } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import Card from "@/components/Card";
import { AD_POLICY_NOTE } from "@/constants/ads";
import { APP_NAME, PREMIUM_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { FREE_FEATURES, FUTURE_PREMIUM_FEATURES, PREMIUM_FAIRNESS_NOTE } from "@/constants/premium";
import { LEGAL_LAST_UPDATED, PRIVACY_POLICY_VERSION, SUPPORT_EMAIL_LABEL, TERMS_VERSION } from "@/constants/legal";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

type InfoPage = "premium" | "help" | "support" | "terms" | "privacy";

const CONTACT = `Contact us at ${SUPPORT_EMAIL_LABEL}.`;

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
    subtitle: "Current plan: Free. Premium is coming soon.",
    icon: "premium",
    sections: [
      { title: "Premium is coming soon", body: "Premium is not available for purchase yet. Every current account is on the Free plan." },
      { title: "Planned Premium benefits", body: "Premium may include an ad-free experience, advanced stats, full result history, more challenge tools, Premium avatar items, themes, and season recaps." },
      { title: "All difficulties stay free", body: "Classic Easy, Medium, Hard, Expert, and Master are playable on the Free plan. Premium is not centred on locking Sudoku difficulty." },
      { title: "Competitive fairness", body: PREMIUM_FAIRNESS_NOTE },
      { title: "Included for everyone", body: "Daily Sudoku, Daily Duel, Ranked Duel, Friend Challenge basic access, leaderboards, Basic stats, Basic result history, and Basic avatar customisation remain available without Premium." },
      { title: "Payments", body: "Payments, subscriptions, trials, and subscription management are not available yet. Any future paid features will be clearly explained before purchase." },
    ],
  },
  help: {
    eyebrow: "SUPPORT",
    title: "Help & FAQ",
    subtitle: "Quick answers for the current SudoDuel build.",
    icon: "help",
    sections: [
      { title: "What is Daily Sudoku?", body: "Daily Sudoku is a solo puzzle assigned for the day. You get one official attempt, and successful solves can count toward daily stats and relevant leaderboards." },
      { title: "What is Daily Duel?", body: "Daily Duel matches you asynchronously with another player on the same daily duel puzzle. The winner is decided by highest final score, then elapsed time, then completion time." },
      { title: "What is Ranked Duel?", body: "Ranked Duel is an asynchronous competitive match against another player near your RP. Completed matches can change RP. Cancelling while still searching does not count as a match." },
      { title: "How does RP work?", body: "RP changes after completed Ranked Duel matches. Wins, losses, draws, opponent strength, and the final match result can affect RP. Ranked queue cancellation does not award or remove RP." },
      { title: "What are streaks?", body: "Streaks track successfully solved Daily Sudoku puzzles. Failed or abandoned attempts may be saved as final attempts, but they do not extend solved streaks." },
      { title: "Why did my result not count?", body: "A result may be excluded from solved stats if the puzzle was failed, abandoned, duplicated, or not finalised correctly. Rankings and stats may be corrected if data integrity issues are found." },
      { title: "What is SudoDuel Premium?", body: "Premium is a coming-soon plan for extra experience and cosmetic features. Premium is not currently available for purchase." },
      { title: "Can Premium affect Ranked RP?", body: "No. Premium will never boost Ranked RP, leaderboard scores, duel outcomes, or competitive matchmaking results." },
      { title: "Are there ads?", body: "Free accounts may see occasional ads at natural breaks in the future, never during an active puzzle or before a result is saved. Premium removes ads. No real ad SDK is active in this build." },
      { title: "How do I report a bug?", body: "Use Settings > Report a problem and include what you were doing, which mode you were playing, and what happened." },
      { title: "How do I request account deletion?", body: `In-app self-service account deletion is not currently available. Contact support at ${SUPPORT_EMAIL_LABEL} to request account or data deletion.` },
    ],
  },
  support: {
    eyebrow: "SUPPORT",
    title: "Support",
    subtitle: "Help, feedback, bug reports, and account requests.",
    icon: "help",
    sections: [
      { title: "Contact support", body: `Need help with ${APP_NAME}? Send feedback or report an issue from the app. For account, privacy, or data requests, contact ${SUPPORT_EMAIL_LABEL}.` },
      { title: "Report a bug", body: "Use Report a problem for crashes, broken screens, missing results, incorrect stats, or anything that blocks play." },
      { title: "Feedback", body: "Use Send feedback for suggestions about puzzle difficulty, avatars, leaderboards, Premium ideas, or general product feedback." },
      { title: "Account and data requests", body: "For account access, privacy questions, data export requests, or deletion requests, contact support and include the email or username tied to your account." },
      { title: "Useful categories", body: "Bug report, Account issue, Gameplay/result issue, Ranked Duel issue, Feedback, and Privacy/data request." },
      { title: "Response expectations", body: "During TestFlight, support responses may be slower than a public release. We will prioritise account, privacy, data, crash, and result-integrity issues." },
    ],
  },
  terms: {
    eyebrow: "LEGAL",
    title: "Terms of Use",
    subtitle: `Version ${TERMS_VERSION} - Last updated ${LEGAL_LAST_UPDATED}`,
    icon: "legal",
    sections: [
      { title: "About SudoDuel", body: `${APP_NAME} is a competitive Sudoku puzzle game with solo puzzles, daily play, asynchronous duels, ranked progression, leaderboards, profile stats, avatars, friends, and feedback tools.` },
      { title: "Eligibility", body: "You are responsible for using the app in a lawful way and only if you are allowed to use online game services in your location. If you are under the age required by your region, use the app only with permission from a parent or guardian." },
      { title: "Your account", body: "You are responsible for your account activity, display name, username, avatar choices, and keeping access to your sign-in method secure. Do not impersonate another person or use misleading profile information." },
      { title: "Fair play", body: "SudoDuel is designed to be competitive but fair. Do not use cheats, automation, exploits, modified clients, or other methods that give an unfair advantage." },
      { title: "Game results, rankings, and stats", body: "Scores, RP, streaks, results, leaderboards, achievements, and stats may be recalculated or corrected if we identify bugs, duplicate results, abuse, exploits, or data integrity issues." },
      { title: "Usernames, avatars, and profile content", body: "Choose usernames, display names, avatars, and feedback content that are respectful and do not impersonate others, harass people, include hate or abuse, or violate another person's rights." },
      { title: "Premium features", body: "Premium features are not currently available. Premium may remove ads and add richer stats, history, cosmetics, season identity, and duel tools. Premium will not provide competitive advantages in Ranked Duel, Daily Duel, Friend Challenge, or leaderboards." },
      { title: "Acceptable use", body: "Do not attack, disrupt, scrape, overload, reverse engineer, exploit, or interfere with the app, backend, matchmaking, scoring, leaderboards, feedback tools, or other users." },
      { title: "Service availability", body: "SudoDuel is in TestFlight and may have downtime, bugs, resets, balance changes, or unavailable features. Some features may change before public release." },
      { title: "Changes to the app", body: "We may update, add, remove, rebalance, or rename features during testing. We may also update these Terms as the product evolves." },
      { title: "Limitation of liability", body: "To the fullest extent allowed by law, SudoDuel is provided as-is for testing and entertainment. We are not responsible for indirect losses, lost progress, unavailable service, or issues outside our reasonable control." },
      { title: "Contact us", body: CONTACT },
    ],
  },
  privacy: {
    eyebrow: "LEGAL",
    title: "Privacy Policy",
    subtitle: `Version ${PRIVACY_POLICY_VERSION} - Last updated ${LEGAL_LAST_UPDATED}`,
    icon: "legal",
    sections: [
      { title: "What we collect", body: "SudoDuel may store your account identifier from the authentication provider, display name, username handle, avatar settings, user settings, friend relationships, feedback submissions, and support/report messages." },
      { title: "Game and progress data", body: "We store puzzle progress, continue state, completed and failed attempts, mode, difficulty, score, elapsed time, mistakes, hints, undos, XP, RP changes, streak information, leaderboard records, ranked duel records, daily duel records, and friend challenge records." },
      { title: "How we use data", body: "We use your data to operate the app, save progress, calculate scores, run duels, maintain leaderboards, provide support, investigate bugs, prevent abuse, and improve reliability." },
      { title: "Game data and leaderboards", body: "Some profile and gameplay information can be visible to other players, such as display name, username, avatar, rank, leaderboard position, duel outcome, and public challenge or friend-related information needed for gameplay." },
      { title: "Feedback and support", body: "When you send feedback or report a problem, we store the category, message, account identifier if signed in, app version if available, and submission time so we can review and respond to issues." },
      { title: "Premium and payments", body: "Premium payments are not currently implemented. SudoDuel does not currently process subscription payments or store payment details in this build." },
      { title: "Data sharing", body: "SudoDuel does not currently sell personal data. We use backend service providers, such as Supabase, to operate account, profile, gameplay, and feedback features." },
      // TODO: Update privacy disclosures before enabling a real ad SDK or tracking.
      { title: "Advertising and tracking", body: "SudoDuel does not currently include a real ad SDK or third-party advertising network. Ads are planned for Free accounts at natural breaks only. Before enabling a real ad SDK, this policy and app privacy disclosures must be updated." },
      { title: "Data storage and security", body: "We use backend access controls and authentication to protect user-owned data. No system can be guaranteed perfectly secure, especially during beta testing." },
      { title: "Your choices", body: "You can update profile information, avatar settings, notification preferences, and privacy settings in the app. Some game results and duel records are kept to preserve competitive integrity." },
      { title: "Account deletion", body: `In-app self-service account deletion is not currently available. Contact ${SUPPORT_EMAIL_LABEL} to request account deletion or a data request.` },
      { title: "Children", body: "SudoDuel is not intended to knowingly collect personal data from children below the age required by applicable law without appropriate permission." },
      { title: "Changes to this policy", body: "We may update this Privacy Policy as SudoDuel changes. App privacy disclosures should match the app's actual data collection before public release." },
      { title: "Contact us", body: CONTACT },
    ],
  },
};

function getPage(value: string | string[] | undefined): InfoPage {
  const page = Array.isArray(value) ? value[0] : value;
  return page === "help" || page === "support" || page === "terms" || page === "privacy" || page === "premium" ? page : "help";
}

function PageIcon({ type }: { type: "premium" | "help" | "legal" }) {
  if (type === "premium") return <BrandMark size={42} />;
  const Icon = type === "premium" ? Crown : type === "help" ? HelpCircle : Shield;
  return <View style={styles.icon}><Icon size={22} color={type === "premium" ? C.gold : C.inkSoft} /></View>;
}

export default function SettingsInfoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ page?: string }>();
  const page = getPage(params.page);
  const content = CONTENT[page];
  const premium = usePremiumStatus();
  const planLabel = premium.isLoading ? "checking..." : premium.isPremium ? "Premium" : "Free";

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
          {page === "premium" ? (
            <View style={[styles.planCard, styles.divider]}>
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planEyebrow}>PLAN STATUS</Text>
                  <Text style={styles.planTitle}>Current plan: {planLabel}</Text>
                </View>
                <View style={[styles.planBadge, premium.isPremium && styles.planBadgePremium]}>
                  <Text style={[styles.planBadgeText, premium.isPremium && styles.planBadgeTextPremium]}>
                    {premium.isPremium ? "Active" : "Free"}
                  </Text>
                </View>
              </View>
              <Text style={styles.planBody}>
                {premium.isPremium
                  ? "Premium entitlement is active for this account."
                  : "Every account is on the Free plan. All Classic difficulties are free, including Expert and Master."}
              </Text>
              <View style={styles.disabledCta}>
                <Text style={styles.disabledCtaText}>{premium.isPremium ? "Premium active" : "Coming soon"}</Text>
              </View>
            </View>
          ) : null}

          {page === "premium" ? (
            <View style={[styles.featureStrip, styles.divider]}>
              <Text style={styles.featureStripTitle}>Premium focus</Text>
              <Text style={styles.featureStripBody}>
                {FUTURE_PREMIUM_FEATURES.map((feature) => feature.title).join(" - ")}
              </Text>
              <Text style={styles.adPolicyNote}>{AD_POLICY_NOTE}</Text>
              <Text style={[styles.featureStripTitle, { marginTop: 14 }]}>Free for everyone</Text>
              <Text style={styles.featureStripBody}>
                {FREE_FEATURES.map((feature) => feature.title).join(" - ")}
              </Text>
            </View>
          ) : null}
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
  sub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  section: { paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 16, marginBottom: 6 },
  sectionTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  body: { color: C.muted, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 6 },
  planCard: { paddingBottom: 16, marginBottom: 6 },
  planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  planEyebrow: { color: C.gold, fontSize: 12, fontWeight: "900", letterSpacing: 1.1 },
  planTitle: { color: C.ink, fontSize: 24, fontWeight: "900", marginTop: 4 },
  planBadge: { borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, paddingHorizontal: 12, paddingVertical: 7 },
  planBadgePremium: { borderColor: C.gold, backgroundColor: C.goldSoft },
  planBadgeText: { color: C.muted, fontSize: 12, fontWeight: "900" },
  planBadgeTextPremium: { color: C.ink },
  planBody: { color: C.muted, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 10 },
  disabledCta: { alignSelf: "flex-start", borderRadius: 14, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  disabledCtaText: { color: C.muted, fontSize: 13, fontWeight: "900" },
  featureStrip: { paddingBottom: 16, marginBottom: 6 },
  featureStripTitle: { color: C.gold, fontSize: 12, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  featureStripBody: { color: C.ink, fontSize: 13, fontWeight: "800", lineHeight: 19, marginTop: 8 },
  adPolicyNote: { color: C.muted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 10 },
});
