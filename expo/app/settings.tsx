import { Stack, router, useLocalSearchParams } from "expo-router";
import { Bell, Brush, ChevronLeft, Crown, Database, FlaskConical, HelpCircle, LifeBuoy, LogOut, MessageSquare, Palette, Shield, Trash2, UserRound, Volume2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AvatarEditor from "@/components/AvatarEditor";
import BrandMark from "@/components/BrandMark";
import Card from "@/components/Card";
import { APP_NAME, PREMIUM_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { buttonShadow } from "@/constants/depth";
import { SHOW_DEVELOPER_TOOLS } from "@/constants/developer";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { printActionAuditReport } from "@/lib/actionAudit";
import { loadAppPreferences, playSoundEffect, saveAppPreferences, triggerHaptic, type AppPreferences } from "@/lib/appPreferences";
import { normalizeAvatarConfig, type CharacterAvatarConfig } from "@/lib/avatar";
import type { PlayerProfile, ProfileSettings } from "@/lib/playerProfile";
import { supabaseConfigDiagnostics } from "@/lib/supabase";

type AvatarDraft = CharacterAvatarConfig & { initials: string; avatar_color: string; avatar_symbol?: string | null };

function avatarDraftFromProfile(profile: PlayerProfile): AvatarDraft {
  const config = normalizeAvatarConfig(profile, { initials: profile.initials, color: profile.avatar_color, symbol: profile.avatar_symbol });
  return {
    initials: config.avatar_initials ?? profile.initials,
    avatar_color: config.avatar_bg_color ?? profile.avatar_color,
    avatar_symbol: profile.avatar_symbol ?? null,
    ...config,
  };
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ panel?: string }>();
  const auth = useAuth();
  const profileState = usePlayerProfile();
  const {
    profile, diagnostics, updateAvatar, updateDisplayName, updateNotificationSettings, updatePrivacySettings,
    simulateResult, simulateRankedWin, simulateRankedLoss, resetLocalProfile, testSupabaseRead, testSupabaseWrite,
    testDailyResultQuery, repairMissingProfileRows, repairCompletedSessions,
  } = profileState;
  const [panel, setPanel] = useState<string | null>(null);
  const [name, setName] = useState<string>(profile.username);
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft>(() => avatarDraftFromProfile(profile));
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<ProfileSettings["notifications"]>(profile.settings.notifications);
  const [privacy, setPrivacy] = useState<ProfileSettings["privacy"]>(profile.settings.privacy);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [appPreferences, setAppPreferences] = useState<AppPreferences>({ soundEnabled: true, hapticsEnabled: true });
  const dailyDiagnostics = diagnostics.daily;
  const developerToolsEnabled = SHOW_DEVELOPER_TOOLS && profile.settings.devMode;

  useEffect(() => { if (params.panel) setPanel(params.panel); }, [params.panel]);
  useEffect(() => {
    let active = true;
    void loadAppPreferences(auth.user?.id ?? null).then((next) => {
      if (active) setAppPreferences(next);
    });
    return () => { active = false; };
  }, [auth.user?.id]);
  useEffect(() => {
    setName(profile.username);
    setAvatarDraft(avatarDraftFromProfile(profile));
    setNotifications(profile.settings.notifications);
    setPrivacy(profile.settings.privacy);
  }, [profile]);

  const showResult = async (label: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    const result = await action();
    Alert.alert(label, result.ok ? "Success." : result.error ?? "Something went wrong.");
  };

  const updateAppPreference = (next: AppPreferences) => {
    setAppPreferences(next);
    void saveAppPreferences(next, auth.user?.id ?? null);
  };

  const requestAccountDeletion = () => {
    Alert.alert(
      "Request account deletion?",
      "We will send you to Support to request account deletion. This helps prevent accidental deletion while we verify the account owner.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => router.push({
            pathname: "/settings-feedback",
            params: {
              category: "account_deletion",
              message: "I would like to request deletion of my SudoDuel account and associated personal data.",
            },
          }),
        },
      ],
    );
  };

  const saveName = () => {
    const result = updateDisplayName(name);
    if (!result.ok) {
      setNameError(result.error ?? "Unable to save display name.");
      return;
    }
    setNameError(null);
    setPanel(null);
  };

  const saveAvatar = async () => {
    setAvatarSaving(true);
    const result = await updateAvatar(avatarDraft);
    setAvatarSaving(false);
    if (!result.ok) {
      setAvatarError(result.error ?? "Unable to save avatar.");
      return;
    }
    setAvatarError(null);
    setPanel(null);
  };

  const closePanel = () => {
    setSettingsError(null);
    setPanel(null);
  };

  const saveNotifications = async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    const result = await updateNotificationSettings(notifications);
    setSettingsSaving(false);
    if (!result.ok) {
      setSettingsError(result.error ?? "Unable to save notification settings.");
      return;
    }
    setPanel(null);
  };

  const savePrivacy = async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    const result = await updatePrivacySettings(privacy);
    setSettingsSaving(false);
    if (!result.ok) {
      setSettingsError(result.error ?? "Unable to save privacy settings.");
      return;
    }
    setPanel(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/(tabs)/profile")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <BrandMark size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.sub}>{APP_NAME} · v1.0.0</Text>
          </View>
        </View>

        <Section title="Account">
          <Row icon={<UserRound size={18} color={C.inkSoft} />} title="Profile" detail={profile.display_name ?? profile.username} onPress={() => setPanel("display")} />
          <Row icon={<Palette size={18} color={C.inkSoft} />} title="Avatar" detail="Character, colours and frame" onPress={() => setPanel("avatar")} />
          <Row icon={<Bell size={18} color={C.inkSoft} />} title="Notifications" detail="Push, duels and social updates" onPress={() => router.push("/settings-notifications")} />
          <Row icon={<Shield size={18} color={C.inkSoft} />} title="Privacy" detail={privacy.publicProfile ? "Public profile" : "Private profile"} onPress={() => setPanel("privacy")} />
          <Row icon={<Trash2 size={18} color={C.danger} />} title="Delete account" detail="Request permanent account deletion" onPress={requestAccountDeletion} />
          <Row icon={<LogOut size={18} color={C.inkSoft} />} title="Sign out" detail="Return to the welcome screen" onPress={() => Alert.alert("Sign out?", "You will return to the welcome screen.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => { void auth.signOut(); } }])} last />
        </Section>

        <Section title="App">
          <Row icon={<Volume2 size={18} color={C.inkSoft} />} title="Sound" detail={appPreferences.soundEnabled ? "On" : "Off"} onPress={() => {
            const next = { ...appPreferences, soundEnabled: !appPreferences.soundEnabled };
            updateAppPreference(next);
            void playSoundEffect("button");
          }} />
          <Row icon={<Brush size={18} color={C.inkSoft} />} title="Haptics" detail={appPreferences.hapticsEnabled ? "On" : "Off"} onPress={() => {
            const next = { ...appPreferences, hapticsEnabled: !appPreferences.hapticsEnabled };
            updateAppPreference(next);
            if (next.hapticsEnabled) void triggerHaptic("selection");
          }} last />
        </Section>

        <Section title="Premium">
          <Row icon={<Crown size={18} color={C.gold} />} title={PREMIUM_NAME} detail="Current plan: Free" onPress={() => router.push({ pathname: "/settings-info", params: { page: "premium" } })} last />
        </Section>

        <Section title="Support">
          <Row icon={<HelpCircle size={18} color={C.inkSoft} />} title="Help & FAQ" detail="Answers and gameplay basics" onPress={() => router.push({ pathname: "/settings-info", params: { page: "help" } })} />
          <Row icon={<LifeBuoy size={18} color={C.inkSoft} />} title="Support" detail="Contact and account requests" onPress={() => router.push({ pathname: "/settings-info", params: { page: "support" } })} />
          <Row icon={<MessageSquare size={18} color={C.inkSoft} />} title="Send feedback" detail="Tell us what to improve" onPress={() => router.push({ pathname: "/settings-feedback", params: { category: "feedback" } })} />
          <Row icon={<LifeBuoy size={18} color={C.inkSoft} />} title="Report a problem" detail="Bug reports and issues" onPress={() => router.push({ pathname: "/settings-feedback", params: { category: "problem" } })} last />
        </Section>

        <Section title="Legal">
          <Row icon={<Shield size={18} color={C.inkSoft} />} title="Terms & Conditions" detail="Terms of Use" onPress={() => router.push({ pathname: "/settings-info", params: { page: "terms" } })} />
          <Row icon={<Shield size={18} color={C.inkSoft} />} title="Privacy Policy" detail="Data and privacy practices" onPress={() => router.push({ pathname: "/settings-info", params: { page: "privacy" } })} />
          <Row icon={<Database size={18} color={C.inkSoft} />} title="App version" detail="v1.0.0 · Source build: PR84+" onPress={() => Alert.alert(APP_NAME, "Version 1.0.0\nSource build: PR84+")} last />
        </Section>

        {auth.isGuest ? (
          <Pressable style={styles.resetRow} onPress={() => Alert.alert("Reset local profile?", "This resets local guest XP, rank, badges and results.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: resetLocalProfile }])}>
            <Text style={styles.resetText}>Reset local profile data</Text>
          </Pressable>
        ) : null}

        {developerToolsEnabled ? (
          <View style={styles.devSection}>
            <View style={styles.devHeader}><FlaskConical size={16} color={C.muted} /><Text style={styles.devTitle}>Developer Tools</Text></View>
            <View style={styles.devButtons}>
              <DevButton label="Simulate Result" onPress={() => { if (developerToolsEnabled) simulateResult(); }} />
              <DevButton label="Ranked Win" onPress={() => { if (developerToolsEnabled) simulateRankedWin(); }} />
              <DevButton label="Ranked Loss" onPress={() => { if (developerToolsEnabled) simulateRankedLoss(); }} />
              <DevButton label="Reset Local" onPress={() => { if (developerToolsEnabled) resetLocalProfile(); }} />
              <DevButton label="Backend Diagnostics" onPress={() => { if (developerToolsEnabled) setPanel("backend"); }} />
              <DevButton label="Action Report" onPress={() => { if (developerToolsEnabled) Alert.alert("Action Report", printActionAuditReport()); }} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={panel === "display"} transparent animationType="fade" onRequestClose={() => setPanel(null)}>
        <View style={styles.backdrop}><Card style={styles.modalCard}><Text style={styles.modalTitle}>Profile</Text><TextInput value={name} onChangeText={(value) => { setName(value); setNameError(null); }} maxLength={20} placeholder="Player" style={styles.input} /><Text style={styles.helper}>{name.trim().length}/20 characters · initials update automatically</Text>{nameError ? <Text style={styles.error}>{nameError}</Text> : null}<Actions onCancel={() => setPanel(null)} onSave={saveName} /></Card></View>
      </Modal>

      <Modal visible={panel === "avatar"} transparent animationType="fade" onRequestClose={() => setPanel(null)}>
        <View style={styles.backdrop}><Card style={styles.modalCard}><ScrollView showsVerticalScrollIndicator={false}><Text style={styles.modalTitle}>Avatar</Text><AvatarEditor value={avatarDraft} onChange={(next) => { setAvatarDraft(next); setAvatarError(null); }} error={avatarError} /><Actions onCancel={() => setPanel(null)} onSave={() => { void saveAvatar(); }} saveLabel={avatarSaving ? "Saving..." : "Done"} disabled={avatarSaving} /></ScrollView></Card></View>
      </Modal>

      <Modal visible={panel === "notifications"} transparent animationType="fade" onRequestClose={closePanel}>
        <View style={styles.backdrop}><Card style={styles.modalCard}><Text style={styles.modalTitle}>Notifications</Text><Toggle label="Daily puzzle reminder" value={notifications.dailyPuzzleReminder} onValueChange={(value) => { setSettingsError(null); setNotifications((current) => ({ ...current, dailyPuzzleReminder: value })); }} /><Toggle label="Streak reminder" value={notifications.streakReminder} onValueChange={(value) => { setSettingsError(null); setNotifications((current) => ({ ...current, streakReminder: value })); }} /><Toggle label="Duel results" value={notifications.duelResults} onValueChange={(value) => { setSettingsError(null); setNotifications((current) => ({ ...current, duelResults: value })); }} /><Toggle label="Ranked match updates" value={notifications.rankedMatchUpdates} onValueChange={(value) => { setSettingsError(null); setNotifications((current) => ({ ...current, rankedMatchUpdates: value })); }} />{settingsError ? <Text style={styles.error}>{settingsError}</Text> : null}<Actions onCancel={closePanel} onSave={() => { void saveNotifications(); }} saveLabel={settingsSaving ? "Saving..." : "Done"} disabled={settingsSaving} /></Card></View>
      </Modal>

      <Modal visible={panel === "privacy"} transparent animationType="fade" onRequestClose={closePanel}>
        <View style={styles.backdrop}><Card style={styles.modalCard}><Text style={styles.modalTitle}>Privacy</Text><Toggle label="Public profile" value={privacy.publicProfile} onValueChange={(value) => { setSettingsError(null); setPrivacy((current) => ({ ...current, publicProfile: value })); }} /><Toggle label="Show stats publicly" value={privacy.showStatsPublicly} onValueChange={(value) => { setSettingsError(null); setPrivacy((current) => ({ ...current, showStatsPublicly: value })); }} /><Toggle label="Show recent results publicly" value={privacy.showRecentResultsPublicly} onValueChange={(value) => { setSettingsError(null); setPrivacy((current) => ({ ...current, showRecentResultsPublicly: value })); }} /><Toggle label="Allow friend challenges" value={privacy.allowFriendChallenges} onValueChange={(value) => { setSettingsError(null); setPrivacy((current) => ({ ...current, allowFriendChallenges: value })); }} />{settingsError ? <Text style={styles.error}>{settingsError}</Text> : null}<Actions onCancel={closePanel} onSave={() => { void savePrivacy(); }} saveLabel={settingsSaving ? "Saving..." : "Done"} disabled={settingsSaving} /></Card></View>
      </Modal>

      <Modal visible={developerToolsEnabled && panel === "backend"} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
        <View style={styles.backdrop}><Card style={styles.modalCard}><ScrollView showsVerticalScrollIndicator={false}><View style={styles.modalHeader}><Database size={20} color={C.ink} /><Text style={styles.modalTitle}>Backend Diagnostics</Text></View><Diagnostic label="Supabase URL configured" value={supabaseConfigDiagnostics.urlConfigured ? "Yes" : "No"} /><Diagnostic label="Supabase URL host" value={supabaseConfigDiagnostics.urlHost || "None"} /><Diagnostic label="Supabase URL valid" value={supabaseConfigDiagnostics.urlValid ? "Yes" : "No"} /><Diagnostic label="Session" value={diagnostics.sessionStatus} /><Diagnostic label="User ID" value={diagnostics.userId ?? "None"} /><Diagnostic label="Profile loaded" value={diagnostics.profileLoaded ? "Yes" : "No"} /><Diagnostic label="Recent results" value={String(diagnostics.recentResultsCount)} /><Diagnostic label="Active sessions" value={String(diagnostics.activeSessionCount)} /><Diagnostic label="Last error" value={diagnostics.lastError ?? "None"} /><Text style={styles.devTitle}>Daily Diagnostics</Text><Diagnostic label="Current auth user id" value={dailyDiagnostics?.currentUserId ?? "None"} /><Diagnostic label="Today dateStr" value={dailyDiagnostics?.todayDateStr ?? "None"} /><Diagnostic label="Assigned puzzle_id" value={dailyDiagnostics?.assignedDailyPuzzleId ?? "None"} /><Diagnostic label="Replay query rows" value={String(dailyDiagnostics?.replayQueryResultCount ?? "N/A")} /><Diagnostic label="Leaderboard RPC rows" value={String(dailyDiagnostics?.leaderboardRpcResultCount ?? "N/A")} /><Diagnostic label="Daily errors" value={formatDiagnosticValue(dailyDiagnostics?.errors)} /><View style={styles.devButtons}><DevButton label="Test read" onPress={() => { void showResult("Supabase read", testSupabaseRead); }} /><DevButton label="Test write" onPress={() => { void showResult("Supabase write", testSupabaseWrite); }} /><DevButton label="Test Daily Result Query" onPress={() => { void showResult("Daily result query", testDailyResultQuery); }} /><DevButton label="Repair rows" onPress={() => { void showResult("Repair profile rows", repairMissingProfileRows); }} /><DevButton label="Repair sessions" onPress={() => { void showResult("Repair completed sessions", repairCompletedSessions); }} /></View><Actions onCancel={() => setPanel(null)} onSave={() => setPanel(null)} /></ScrollView></Card></View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Card padded={false}>{children}</Card></View>;
}

function Row({ icon, title, detail, onPress, last }: { icon: React.ReactNode; title: string; detail: string; onPress: () => void; last?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.row, !last && styles.divider]}><View style={styles.rowIcon}>{icon}</View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View><Text style={styles.chevron}>›</Text></Pressable>;
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: C.border, true: C.accentSoft }} thumbColor={value ? C.accent : C.mutedSoft} /></View>;
}

function Actions({ onCancel, onSave, saveLabel = "Done", disabled = false }: { onCancel: () => void; onSave: () => void; saveLabel?: string; disabled?: boolean }) {
  return <View style={styles.actions}><Pressable style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable disabled={disabled} style={[styles.save, disabled && { opacity: 0.55 }]} onPress={onSave}><Text style={styles.saveText}>{saveLabel}</Text></Pressable></View>;
}

function DevButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable style={styles.devButton} onPress={onPress}><Text style={styles.devButtonText}>{label}</Text></Pressable>;
}

function formatDiagnosticValue(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function Diagnostic({ label, value }: { label: string; value: string }) {
  return <View style={styles.diagnostic}><Text style={styles.diagnosticLabel}>{label}</Text><Text style={styles.diagnosticValue} numberOfLines={8}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", ...buttonShadow },
  title: { fontSize: 30, fontWeight: "800", color: C.ink, letterSpacing: -0.7 },
  sub: { color: C.muted, fontWeight: "700", marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { color: C.muted, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: C.bgElevated },
  rowTitle: { color: C.ink, fontWeight: "800", fontSize: 15 },
  rowDetail: { color: C.muted, fontSize: 12, marginTop: 2 },
  chevron: { color: C.mutedSoft, fontSize: 26 },
  resetRow: { alignItems: "center", paddingVertical: 18 },
  resetText: { color: C.danger, fontWeight: "800" },
  devSection: { marginTop: 28, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 },
  devHeader: { flexDirection: "row", gap: 7, alignItems: "center", marginBottom: 10 },
  devTitle: { color: C.muted, fontWeight: "900", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
  devButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  devButton: { backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  devButtonText: { color: "#FBF8F2", fontWeight: "800", fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: "#15171CB8", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 420, maxHeight: "90%", padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { color: C.ink, fontWeight: "900", fontSize: 22, marginBottom: 14 },
  input: { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: C.ink, fontSize: 16, fontWeight: "700" },
  helper: { color: C.muted, fontSize: 12, marginTop: 8 },
  error: { color: C.danger, fontWeight: "700", marginTop: 8 },
  avatarPreview: { alignItems: "center", marginBottom: 14 },
  optionLabel: { color: C.ink, fontWeight: "900", marginTop: 16, marginBottom: 8 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: C.ink },
  symbols: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  symbolButton: { minWidth: 54, borderRadius: 999, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  symbolActive: { backgroundColor: C.ink, borderColor: C.ink },
  symbolText: { color: C.ink, fontWeight: "800" },
  symbolTextActive: { color: "#FBF8F2" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  toggleLabel: { color: C.ink, fontWeight: "700", flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancel: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 12, alignItems: "center" },
  save: { flex: 1, borderRadius: 14, backgroundColor: C.ink, paddingVertical: 12, alignItems: "center", ...buttonShadow },
  cancelText: { color: C.ink, fontWeight: "800" },
  saveText: { color: "#FBF8F2", fontWeight: "800" },
  diagnostic: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  diagnosticLabel: { color: C.muted, fontSize: 12, fontWeight: "800" },
  diagnosticValue: { color: C.ink, fontWeight: "700", marginTop: 2 },
});
