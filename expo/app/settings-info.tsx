import { Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Crown, HelpCircle, Shield } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import Card from "@/components/Card";
import { APP_NAME, PREMIUM_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { PREMIUM_FAIRNESS_NOTE } from "@/constants/premium";
import { PRODUCT_MONTHLY, PRODUCT_YEARLY } from "@/constants/purchases";
import { LEGAL_LAST_UPDATED, PRIVACY_POLICY_VERSION, SUPPORT_EMAIL_LABEL, TERMS_VERSION } from "@/constants/legal";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { getCurrentOffering, getPurchaseDiagnostics, purchasePackage, restorePurchases, type CurrentOffering, type PurchaseDiagnostics, type PurchasePackage } from "@/lib/purchases";

type InfoPage = "premium" | "help" | "support" | "terms" | "privacy";

const CONTACT = `Contact us at ${SUPPORT_EMAIL_LABEL}.`;
const PURCHASES_UNAVAILABLE_TITLE = "Purchases temporarily unavailable";
const PURCHASES_UNAVAILABLE_BODY = "Premium purchases are not available right now. Please try again later.";
const PURCHASES_UNAVAILABLE_HELP = "Your Free plan is still active. All Classic difficulties, Daily Sudoku, Daily Duel, Ranked Duel, achievements, and basic stats remain available.";
const RESTORE_UNAVAILABLE_BODY = "Purchases cannot be restored right now. Please try again later.";

type DiagnosticRow = { label: string; value: string };

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
    subtitle: "Current plan: Free.",
    icon: "premium",
    sections: [
      { title: "Premium includes", body: "Ad-free play when ads are introduced, more Friend Challenge creation, advanced stats, full result history, head-to-head history, Premium themes, avatar items and frames, season recaps and rewards, and the puzzle archive." },
      { title: "Free for everyone", body: "Unlimited Classic Sudoku, Easy, Medium, Hard, Expert, and Master difficulties, Daily Sudoku, Daily Duel, Ranked Duel fair access, accepting Friend Challenges, basic stats, achievements, basic profile and avatar customisation, and basic result history." },
      { title: "Fair play promise", body: PREMIUM_FAIRNESS_NOTE },
      { title: "Ads", body: "Free accounts may see occasional ads at natural breaks in a future version. Ads will never appear during active puzzles or before results are saved." },
      { title: "Payments", body: "Purchases are handled securely through the App Store. You can restore purchases at any time." },
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
      { title: "What is SudoDuel Premium?", body: "Premium is the paid plan for ad-free play when ads are introduced, deeper stats, fuller history, fair challenge tools, cosmetics, themes, season extras, and the puzzle archive." },
      { title: "Can Premium affect Ranked RP?", body: "No. Premium never boosts Ranked RP, leaderboard scores, matchmaking, or duel outcomes." },
      { title: "Are there ads?", body: "A future version may show Free accounts occasional ads at natural breaks, never during an active puzzle or before a result is saved. Premium removes ads when ads are introduced." },
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
      { title: "Premium features", body: "Premium may remove ads and add richer stats, full history, cosmetics, season identity, and fair duel tools. Premium will not provide competitive advantages in Ranked Duel, Daily Duel, Friend Challenge, or leaderboards." },
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
      { title: "Premium and payments", body: "Premium purchases are handled through the App Store when available. SudoDuel does not store payment card details." },
      { title: "Data sharing", body: "SudoDuel does not currently sell personal data. We use backend service providers, such as Supabase, to operate account, profile, gameplay, and feedback features." },
      // TODO: Update privacy disclosures before enabling a real ad SDK or tracking.
      { title: "Advertising and tracking", body: "SudoDuel does not currently show ads. If ads are introduced, Free accounts may see occasional ads at natural breaks only, never during active puzzles or before results are saved." },
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
  const Icon = type === "help" ? HelpCircle : Shield;
  return <View style={styles.icon}><Icon size={22} color={C.inkSoft} /></View>;
}

export default function SettingsInfoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ page?: string }>();
  const page = getPage(params.page);
  const content = CONTENT[page];
  const premium = usePremiumStatus();
  const planLabel = premium.isLoading ? "checking..." : premium.isPremium ? "Premium" : "Free";
  const [offering, setOffering] = useState<CurrentOffering | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isLoadingOffering, setIsLoadingOffering] = useState(false);
  const [purchaseAction, setPurchaseAction] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [purchaseDiagnostics, setPurchaseDiagnostics] = useState<PurchaseDiagnostics | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOffering(): Promise<void> {
      if (page !== "premium") return;
      setIsLoadingOffering(true);
      const result = await getCurrentOffering();
      if (!active) return;
      if (result.ok) {
        setOffering(result.data);
        if (result.data?.availablePackages.length) {
          setPurchaseError(null);
        } else {
          console.warn("[Premium] RevenueCat offering returned no packages.");
          setPurchaseError(PURCHASES_UNAVAILABLE_BODY);
        }
      } else {
        console.warn("[Premium] RevenueCat offering unavailable.", result.error);
        setOffering(null);
        setPurchaseError(PURCHASES_UNAVAILABLE_BODY);
      }
      setIsLoadingOffering(false);
    }

    void loadOffering();
    return () => {
      active = false;
    };
  }, [page]);

  const premiumPackages = useMemo(() => {
    const packages = offering?.availablePackages ?? [];
    return [...packages].sort((a, b) => {
      const order = (pkg: PurchasePackage) => {
        if (pkg.product.identifier === PRODUCT_MONTHLY) return 0;
        if (pkg.product.identifier === PRODUCT_YEARLY) return 1;
        return 2;
      };
      return order(a) - order(b);
    });
  }, [offering?.availablePackages]);

  const handlePurchase = useCallback(async (pkg: PurchasePackage) => {
    setPurchaseAction(pkg.identifier);
    const result = await purchasePackage(pkg);
    setPurchaseAction(null);
    if (!result.ok) {
      if (result.error === "Purchase cancelled.") return;
      console.warn("[Premium] Purchase failed.", result.error);
      Alert.alert("Purchase unavailable", PURCHASES_UNAVAILABLE_BODY);
      return;
    }
    await premium.refresh();
    Alert.alert("Premium updated", "Your Premium status has been refreshed.");
  }, [premium]);

  const handleRestore = useCallback(async () => {
    setPurchaseAction("restore");
    const result = await restorePurchases();
    setPurchaseAction(null);
    if (!result.ok) {
      console.warn("[Premium] Restore purchases failed.", result.error);
      Alert.alert("Restore unavailable", RESTORE_UNAVAILABLE_BODY);
      return;
    }
    await premium.refresh();
    Alert.alert("Purchases restored", "Your Premium status has been refreshed.");
  }, [premium]);
  const premiumSubtitle = premium.isPremium
    ? "Current plan: Premium."
    : premium.paymentSystemImplemented
      ? "Current plan: Free."
      : "Current plan: Free.";
  const hasMonthlyAndYearly = premiumPackages.some((pkg) => pkg.product.identifier === PRODUCT_MONTHLY)
    && premiumPackages.some((pkg) => pkg.product.identifier === PRODUCT_YEARLY);

  const openDiagnostics = useCallback(async () => {
    if (page !== "premium") return;
    setShowDiagnostics(true);
    setIsLoadingDiagnostics(true);
    const result = await getPurchaseDiagnostics();
    setPurchaseDiagnostics(result);
    setIsLoadingDiagnostics(false);
  }, [page]);

  const diagnosticRows = useMemo<DiagnosticRow[]>(() => {
    if (!purchaseDiagnostics) return [];
    return [
      { label: "Platform", value: String(purchaseDiagnostics.platform) },
      { label: "Purchases enabled", value: purchaseDiagnostics.purchasesEnabled ? "Yes" : "No" },
      { label: "iOS API key present", value: purchaseDiagnostics.iosApiKeyPresent ? "Yes" : "No" },
      { label: "API key length", value: String(purchaseDiagnostics.iosApiKeyLength) },
      { label: "API key prefix", value: purchaseDiagnostics.iosApiKeyPrefix ?? "None" },
      { label: "Entitlement ID", value: purchaseDiagnostics.entitlementId },
      { label: "Offering ID", value: purchaseDiagnostics.offeringId },
      { label: "Expected monthly product", value: purchaseDiagnostics.expectedMonthlyProductId },
      { label: "Expected yearly product", value: purchaseDiagnostics.expectedYearlyProductId },
      { label: "configurePurchases() succeeded", value: purchaseDiagnostics.configureSucceeded ? "Yes" : "No" },
      { label: "getOfferings() succeeded", value: purchaseDiagnostics.getOfferingsSucceeded ? "Yes" : "No" },
      { label: "Current offering identifier", value: purchaseDiagnostics.currentOfferingIdentifier ?? "None" },
      { label: "All offering identifiers", value: purchaseDiagnostics.allOfferingIdentifiers.length ? purchaseDiagnostics.allOfferingIdentifiers.join(", ") : "None" },
      { label: "Selected offering identifier", value: purchaseDiagnostics.selectedOfferingIdentifier ?? "None" },
      { label: "Available package count", value: String(purchaseDiagnostics.availablePackageCount) },
      { label: "Package identifiers", value: purchaseDiagnostics.packageIdentifiers.length ? purchaseDiagnostics.packageIdentifiers.join(", ") : "None" },
      { label: "Product identifiers", value: purchaseDiagnostics.productIdentifiers.length ? purchaseDiagnostics.productIdentifiers.join(", ") : "None" },
      { label: "Price strings", value: purchaseDiagnostics.priceStrings.length ? purchaseDiagnostics.priceStrings.join(", ") : "None" },
      { label: "Last error category", value: purchaseDiagnostics.lastErrorCategory ?? "None" },
      { label: "Last error code", value: purchaseDiagnostics.lastErrorCode ?? "None" },
      { label: "Last error message", value: purchaseDiagnostics.lastErrorMessage ?? "None" },
    ];
  }, [purchaseDiagnostics]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/settings")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <PageIcon type={content.icon} />
          <Pressable style={{ flex: 1 }} disabled={page !== "premium"} onLongPress={() => { void openDiagnostics(); }} delayLongPress={500}>
            <Text style={styles.eyebrow}>{content.eyebrow}</Text>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.sub}>{page === "premium" ? premiumSubtitle : content.subtitle}</Text>
          </Pressable>
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
                  ? "Premium is active for this account."
                  : premium.paymentSystemImplemented
                    ? "All Classic difficulties are free, including Expert and Master. Premium adds extra convenience, deeper stats, history, and cosmetic options."
                    : "All Classic difficulties are free, including Expert and Master. Premium adds extra convenience, deeper stats, history, and cosmetic options."}
              </Text>
              <View style={styles.disabledCta}>
                <Text style={styles.disabledCtaText}>{premium.isPremium ? "Premium active" : "Free plan active"}</Text>
              </View>
            </View>
          ) : null}

          {page === "premium" ? (
            <View style={[styles.purchaseBlock, styles.divider]}>
              <Text style={styles.featureStripTitle}>Choose a plan</Text>
              <Text style={styles.purchaseIntro}>
                Subscribe to unlock Premium benefits. Prices are loaded securely from the App Store.
              </Text>
              {isLoadingOffering ? (
                <View style={styles.purchaseLoading}>
                  <ActivityIndicator color={C.gold} />
                  <Text style={styles.purchaseMuted}>Checking purchase availability...</Text>
                </View>
              ) : premiumPackages.length > 0 ? (
                <View style={styles.packageList}>
                  {premiumPackages.map((pkg) => (
                    <Pressable
                      key={pkg.identifier}
                      style={({ pressed }) => [styles.packageCard, pressed && styles.pressed]}
                      onPress={() => void handlePurchase(pkg)}
                      disabled={purchaseAction !== null}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.packageTitle}>
                          {pkg.product.identifier === PRODUCT_YEARLY ? "Yearly plan" : pkg.product.identifier === PRODUCT_MONTHLY ? "Monthly plan" : pkg.product.title ?? "Premium"}
                        </Text>
                        <Text style={styles.packageSub}>
                          {pkg.product.identifier === PRODUCT_YEARLY && hasMonthlyAndYearly ? "Better value for regular players" : pkg.product.description || "SudoDuel Premium"}
                        </Text>
                        {pkg.product.priceString ? <Text style={styles.packagePrice}>{pkg.product.priceString}</Text> : null}
                      </View>
                      <View style={styles.packageButton}>
                        {purchaseAction === pkg.identifier ? <ActivityIndicator color={C.ink} /> : <Text style={styles.packageButtonText}>Subscribe</Text>}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.unavailableBox}>
                  <Text style={styles.unavailableTitle}>{PURCHASES_UNAVAILABLE_TITLE}</Text>
                  <Text style={styles.unavailableBody}>{purchaseError ?? PURCHASES_UNAVAILABLE_BODY}</Text>
                  <Text style={styles.unavailableHelp}>{PURCHASES_UNAVAILABLE_HELP}</Text>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}
                onPress={() => void handleRestore()}
                disabled={purchaseAction !== null}
              >
                {purchaseAction === "restore" ? <ActivityIndicator color={C.ink} /> : <Text style={styles.restoreButtonText}>Restore purchases</Text>}
              </Pressable>
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

      <Modal
        visible={showDiagnostics}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDiagnostics(false)}
      >
        <View style={styles.modalScrim}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>INTERNAL</Text>
                <Text style={styles.modalTitle}>Premium diagnostics</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setShowDiagnostics(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSub}>Hidden RevenueCat diagnostics for TestFlight purchase debugging.</Text>
            {isLoadingDiagnostics ? (
              <View style={styles.purchaseLoading}>
                <ActivityIndicator color={C.gold} />
                <Text style={styles.purchaseMuted}>Loading diagnostics...</Text>
              </View>
            ) : (
              <ScrollView style={styles.diagnosticsList} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
                {diagnosticRows.map((row, index) => (
                  <View key={row.label} style={[styles.diagnosticRow, index < diagnosticRows.length - 1 && styles.diagnosticDivider]}>
                    <Text style={styles.diagnosticLabel}>{row.label}</Text>
                    <Text style={styles.diagnosticValue}>{row.value}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  purchaseBlock: { paddingBottom: 16, marginBottom: 6 },
  purchaseIntro: { color: C.muted, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 8 },
  purchaseLoading: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  purchaseMuted: { color: C.muted, fontSize: 13, fontWeight: "700" },
  packageList: { gap: 10, marginTop: 12 },
  packageCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, padding: 12 },
  packageTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  packageSub: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  packagePrice: { color: C.gold, fontSize: 13, fontWeight: "900", marginTop: 6 },
  packageButton: { minWidth: 92, borderRadius: 14, backgroundColor: C.gold, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  packageButtonText: { color: C.ink, fontSize: 13, fontWeight: "900" },
  unavailableBox: { borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, padding: 14, marginTop: 12 },
  unavailableTitle: { color: C.ink, fontSize: 15, fontWeight: "900" },
  unavailableBody: { color: C.muted, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 4 },
  unavailableHelp: { color: C.muted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 10 },
  restoreButton: { alignSelf: "flex-start", borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12, minHeight: 42, justifyContent: "center" },
  restoreButtonText: { color: C.ink, fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  featureStripTitle: { color: C.gold, fontSize: 12, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  modalScrim: { flex: 1, backgroundColor: "rgba(15, 16, 38, 0.48)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, maxHeight: "78%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  modalEyebrow: { color: C.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.3 },
  modalTitle: { color: C.ink, fontSize: 24, fontWeight: "900", marginTop: 3 },
  modalSub: { color: C.muted, fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 8, marginBottom: 10 },
  modalClose: { borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, paddingHorizontal: 14, paddingVertical: 9 },
  modalCloseText: { color: C.ink, fontSize: 13, fontWeight: "900" },
  diagnosticsList: { marginTop: 6 },
  diagnosticRow: { paddingVertical: 10 },
  diagnosticDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  diagnosticLabel: { color: C.gold, fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  diagnosticValue: { color: C.ink, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 4 },
});
