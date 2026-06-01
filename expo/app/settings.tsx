import { Stack, useLocalSearchParams } from "expo-router";
import { Bell, Crown, FlaskConical, LogOut, Shield, UserRound, Database } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import { APP_NAME, PREMIUM_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { printActionAuditReport } from "@/lib/actionAudit";
import type { ProfileSettings } from "@/lib/playerProfile";
import { supabaseConfigDiagnostics } from "@/lib/supabase";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ panel?: string }>();
  const auth = useAuth();
  const profileState = usePlayerProfile();
  const { profile, diagnostics, updateDisplayName, updateNotificationSettings, updatePrivacySettings, simulateResult, simulateRankedWin, simulateRankedLoss, resetLocalProfile, testSupabaseRead, testSupabaseWrite, testDailyResultQuery, repairMissingProfileRows, repairCompletedSessions } = profileState;
  const [panel, setPanel] = useState<string | null>(null);
  const [name, setName] = useState<string>(profile.username);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ProfileSettings["notifications"]>(profile.settings.notifications);
  const [privacy, setPrivacy] = useState<ProfileSettings["privacy"]>(profile.settings.privacy);
  const dailyDiagnostics = diagnostics.daily;

  useEffect(() => { if (params.panel) setPanel(params.panel); }, [params.panel]);
  useEffect(() => { setName(profile.username); setNotifications(profile.settings.notifications); setPrivacy(profile.settings.privacy); }, [profile]);

  const clearLocalDemoData = () => {
    Alert.alert("Clear demo data?", "This removes all locally stored progress for guest users. Signed-in user data from Supabase is not affected.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => { resetLocalProfile(); Alert.alert("Cleared", "Local demo data has been reset."); } },
    ]);
  };

  const showResult = async (label: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    const result = await action();
    Alert.alert(label, result.ok ? "Success." : result.error ?? "Something went wrong.");
  };

  const saveName = () => {
    const result = updateDisplayName(name);
    if (!result.ok) { setError(result.error ?? "Unable to save display name."); return; }
    setError(null);
    setPanel(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ title: "Settings", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>{APP_NAME} · v1.0.0</Text>
        <Card padded={false} style={{ marginTop: 18 }}>
          <Row icon={<Bell size={18} color={C.inkSoft} />} title="Notifications" detail="Daily puzzle, streaks, duels" onPress={() => setPanel("notifications")} />
          <Row icon={<UserRound size={18} color={C.inkSoft} />} title="Display name" detail={profile.display_name ?? profile.username} onPress={() => setPanel("display")} />
          <Row icon={<UserRound size={18} color={C.inkSoft} />} title="Username" detail={profile.username_handle ? `@${profile.username_handle}` : "Setup required"} onPress={() => Alert.alert("Username", "Username changes are coming soon.")} />
          <Row icon={<Shield size={18} color={C.inkSoft} />} title="Privacy" detail={privacy.publicProfile ? "Public profile" : "Private profile"} onPress={() => setPanel("privacy")} />
          <Row icon={<Crown size={18} color={C.gold} />} title={PREMIUM_NAME} detail="Manage plan later" onPress={() => Alert.alert(PREMIUM_NAME, "Premium settings will be connected when subscriptions are added.")} />
          <Row icon={<LogOut size={18} color={C.inkSoft} />} title="Log out" detail="Sign out of this account" onPress={() => Alert.alert("Log out?", "You will return to the welcome screen.", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: () => { void auth.signOut(); } }])} last />
        </Card>
        {auth.isGuest ? (
          <Pressable style={styles.resetRow} onPress={() => Alert.alert("Reset local profile?", "This resets local guest XP, rank, badges and results.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: resetLocalProfile }])}>
            <Text style={styles.resetText}>Reset local profile data</Text>
          </Pressable>
        ) : null}
        {profile.settings.devMode ? (
          <View style={styles.devSection}>
            <View style={styles.devHeader}><FlaskConical size={16} color={C.muted} /><Text style={styles.devTitle}>Developer Tools</Text></View>
            <View style={styles.devButtons}>
              <DevButton label="Simulate Result" onPress={() => { simulateResult(); }} />
              <DevButton label="Ranked Win" onPress={() => { simulateRankedWin(); }} />
              <DevButton label="Ranked Loss" onPress={() => { simulateRankedLoss(); }} />
              <DevButton label="Reset Local" onPress={resetLocalProfile} />
              <DevButton label="Clear Demo Data" onPress={clearLocalDemoData} />
              <DevButton label="Backend Diagnostics" onPress={() => setPanel("backend")} />
              <DevButton label="Action Report" onPress={() => Alert.alert("Action Report", printActionAuditReport())} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={panel === "display"} transparent animationType="fade" onRequestClose={() => setPanel(null)}><View style={styles.backdrop}><Card style={styles.modalCard}><Text style={styles.modalTitle}>Display name</Text><TextInput value={name} onChangeText={(v) => { setName(v); setError(null); }} maxLength={20} placeholder="Player" style={styles.input} /><Text style={styles.helper}>{name.trim().length}/20 characters · initials update automatically</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<Actions onCancel={() => setPanel(null)} onSave={saveName} /></Card></View></Modal>
      <Modal visible={panel === "notifications"} transparent animationType="fade" onRequestClose={() => setPanel(null)}><View style={styles.backdrop}><Card style={styles.modalCard}><Text style={styles.modalTitle}>Notifications</Text><Toggle label="Daily puzzle reminder" value={notifications.dailyPuzzleReminder} onValueChange={(v) => setNotifications({ ...notifications, dailyPuzzleReminder: v })} /><Toggle label="Streak reminder" value={notifications.streakReminder} onValueChange={(v) => setNotifications({ ...notifications, streakReminder: v })} /><Toggle label="Duel results" value={notifications.duelResults} onValueChange={(v) => setNotifications({ ...notifications, duelResults: v })} /><Toggle label="Ranked match updates" value={notifications.rankedMatchUpdates} onValueChange={(v) => setNotifications({ ...notifications, rankedMatchUpdates: v })} /><Actions onCancel={() => setPanel(null)} onSave={() => { updateNotificationSettings(notifications); setPanel(null); }} /></Card></View></Modal>
      <Modal visible={panel === "privacy"} transparent animationType="fade" onRequestClose={() => setPanel(null)}><View style={styles.backdrop}><Card style={styles.modalCard}><Text style={styles.modalTitle}>Privacy</Text><Toggle label="Public profile" value={privacy.publicProfile} onValueChange={(v) => setPrivacy({ ...privacy, publicProfile: v })} /><Toggle label="Show stats publicly" value={privacy.showStatsPublicly} onValueChange={(v) => setPrivacy({ ...privacy, showStatsPublicly: v })} /><Toggle label="Show recent results publicly" value={privacy.showRecentResultsPublicly} onValueChange={(v) => setPrivacy({ ...privacy, showRecentResultsPublicly: v })} /><Toggle label="Allow friend challenges" value={privacy.allowFriendChallenges} onValueChange={(v) => setPrivacy({ ...privacy, allowFriendChallenges: v })} /><Actions onCancel={() => setPanel(null)} onSave={() => { updatePrivacySettings(privacy); setPanel(null); }} /></Card></View></Modal>
      <Modal visible={panel === "backend"} transparent animationType="slide" onRequestClose={() => setPanel(null)}><View style={styles.backdrop}><Card style={styles.modalCard}><ScrollView showsVerticalScrollIndicator={false}><View style={styles.modalHeader}><Database size={20} color={C.ink} /><Text style={styles.modalTitle}>Backend Diagnostics</Text></View><Diagnostic label="Supabase URL configured" value={supabaseConfigDiagnostics.urlConfigured ? "Yes" : "No"} /><Diagnostic label="Supabase URL host" value={supabaseConfigDiagnostics.urlHost || "None"} /><Diagnostic label="Supabase URL path" value={supabaseConfigDiagnostics.urlPath || "None"} /><Diagnostic label="Supabase URL valid" value={supabaseConfigDiagnostics.urlValid ? "Yes" : "No"} /><Diagnostic label="Supabase URL preview" value={supabaseConfigDiagnostics.urlPreview || "None"} /><Diagnostic label="Supabase anon key configured" value={supabaseConfigDiagnostics.anonKeyConfigured ? "Yes" : "No"} /><Diagnostic label="Supabase config error" value={supabaseConfigDiagnostics.error ?? "None"} /><Diagnostic label="Session" value={diagnostics.sessionStatus} /><Diagnostic label="User ID" value={diagnostics.userId ?? "None"} /><Diagnostic label="Profile loaded" value={diagnostics.profileLoaded ? "Yes" : "No"} /><Diagnostic label="Stats loaded" value={diagnostics.statsLoaded ? "Yes" : "No"} /><Diagnostic label="Settings loaded" value={diagnostics.settingsLoaded ? "Yes" : "No"} /><Diagnostic label="Recent results" value={String(diagnostics.recentResultsCount)} /><Diagnostic label="Active in-progress sessions" value={String(diagnostics.activeSessionCount)} /><Diagnostic label="Latest session status" value={diagnostics.latestSessionStatus ?? "None"} /><Diagnostic label="Latest result puzzle" value={diagnostics.latestResultPuzzleId ?? "None"} /><Diagnostic label="Last error" value={diagnostics.lastError ?? "None"} /><Diagnostic label="Last session save attempted" value={diagnostics.lastSessionSaveAttemptedAt ?? "Never"} /><Diagnostic label="Last session save succeeded" value={diagnostics.lastSessionSaveSucceeded === null ? "N/A" : diagnostics.lastSessionSaveSucceeded ? "Yes" : "No"} /><Diagnostic label="Last session save error" value={diagnostics.lastSessionSaveError ?? "None"} /><Text style={styles.devTitle}>Daily Diagnostics</Text><Diagnostic label="Current auth user id" value={dailyDiagnostics?.currentUserId ?? "None"} /><Diagnostic label="Today dateStr" value={dailyDiagnostics?.todayDateStr ?? "None"} /><Diagnostic label="Assigned daily row" value={formatDiagnosticValue(dailyDiagnostics?.assignedDailyPuzzle)} /><Diagnostic label="Assigned puzzle_id" value={dailyDiagnostics?.assignedDailyPuzzleId ?? "None"} /><Diagnostic label="Replay query rows" value={String(dailyDiagnostics?.replayQueryResultCount ?? "N/A")} /><Diagnostic label="Replay query data" value={formatDiagnosticValue(dailyDiagnostics?.replayQueryRows)} /><Diagnostic label="Replay RPC result" value={dailyDiagnostics?.replayRpcResult === null || dailyDiagnostics?.replayRpcResult === undefined ? "N/A" : dailyDiagnostics.replayRpcResult ? "true" : "false"} /><Diagnostic label="Leaderboard query rows" value={String(dailyDiagnostics?.leaderboardQueryResultCount ?? "N/A")} /><Diagnostic label="Leaderboard raw rows" value={formatDiagnosticValue(dailyDiagnostics?.leaderboardRawRows)} /><Diagnostic label="Leaderboard RPC rows" value={String(dailyDiagnostics?.leaderboardRpcResultCount ?? "N/A")} /><Diagnostic label="Displayed rows" value={String(dailyDiagnostics?.leaderboardFinalDisplayedRowCount ?? "N/A")} /><Diagnostic label="Daily errors" value={formatDiagnosticValue(dailyDiagnostics?.errors)} /><View style={styles.devButtons}><DevButton label="Test read" onPress={() => { void showResult("Supabase read", testSupabaseRead); }} /><DevButton label="Test write" onPress={() => { void showResult("Supabase write", testSupabaseWrite); }} /><DevButton label="Test Daily Result Query" onPress={() => { void showResult("Daily result query", testDailyResultQuery); }} /><DevButton label="Repair rows" onPress={() => { void showResult("Repair profile rows", repairMissingProfileRows); }} /><DevButton label="Repair completed sessions" onPress={() => { void showResult("Repair completed sessions", repairCompletedSessions); }} /><DevButton label="Action Report" onPress={() => Alert.alert("Action Report", printActionAuditReport())} /></View><Actions onCancel={() => setPanel(null)} onSave={() => setPanel(null)} /></ScrollView></Card></View></Modal>
    </SafeAreaView>
  );
}

function Row({ icon, title, detail, onPress, last }: { icon: React.ReactNode; title: string; detail: string; onPress: () => void; last?: boolean }) { return <Pressable onPress={onPress} style={[styles.row, !last && styles.divider]}><View style={styles.rowIcon}>{icon}</View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View><Text style={styles.chevron}>›</Text></Pressable>; }
function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) { return <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: C.border, true: C.accentSoft }} thumbColor={value ? C.accent : C.mutedSoft} /></View>; }
function Actions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) { return <View style={styles.actions}><Pressable style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable style={styles.save} onPress={onSave}><Text style={styles.saveText}>Done</Text></Pressable></View>; }
function DevButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable style={styles.devButton} onPress={onPress}><Text style={styles.devButtonText}>{label}</Text></Pressable>; }
function formatDiagnosticValue(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}
function Diagnostic({ label, value }: { label: string; value: string }) { return <View style={styles.diagnostic}><Text style={styles.diagnosticLabel}>{label}</Text><Text style={styles.diagnosticValue} numberOfLines={8}>{value}</Text></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 30, fontWeight: "800", color: C.ink, letterSpacing: -0.7 },
  sub: { color: C.muted, fontWeight: "700", marginTop: 4 },
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
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  toggleLabel: { color: C.ink, fontWeight: "700", flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancel: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 12, alignItems: "center" },
  save: { flex: 1, borderRadius: 14, backgroundColor: C.ink, paddingVertical: 12, alignItems: "center" },
  cancelText: { color: C.ink, fontWeight: "800" },
  saveText: { color: "#FBF8F2", fontWeight: "800" },
  diagnostic: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  diagnosticLabel: { color: C.muted, fontSize: 12, fontWeight: "800" },
  diagnosticValue: { color: C.ink, fontWeight: "700", marginTop: 2 },
});
