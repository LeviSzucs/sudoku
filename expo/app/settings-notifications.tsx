import { Stack, router } from "expo-router";
import { Bell, BellOff, ChevronLeft, CheckCircle2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import {
  defaultNotificationPreferences,
  fetchNotificationPreferences,
  fetchNotifications,
  getPushAvailabilityState,
  getNotificationPermissionStatus,
  markNotificationRead,
  registerPushToken,
  requestNotificationPermissions,
  saveNotificationPreferences,
  subscribeToInAppNotifications,
  type AppNotification,
  type NotificationPermissionStatus,
  type NotificationPreferenceRow,
} from "@/lib/notifications";

const TOGGLE_ROWS: { key: keyof NotificationPreferenceRow; label: string; description: string }[] = [
  { key: "push_enabled", label: "Push notifications", description: "Controls device push delivery. Your in-app inbox still works." },
  { key: "friend_requests", label: "Friend requests", description: "When someone wants to add you." },
  { key: "friend_challenges", label: "Friend Challenges", description: "New challenges and accepted challenges." },
  { key: "challenge_results", label: "Challenge results", description: "When a Friend Challenge result is ready." },
  { key: "daily_duel_matches", label: "Daily Duel matches", description: "When your Daily Duel opponent is found." },
  { key: "ranked_duel_matches", label: "Ranked Duel matches", description: "When your Ranked Duel opponent is found." },
  { key: "reminders", label: "Reminders", description: "Gentle reminders for waiting challenges." },
  { key: "marketing", label: "News and offers", description: "Product news. Off by default." },
];

function permissionCopy(status: NotificationPermissionStatus, pushAvailable: boolean): { title: string; body: string } {
  if (status === "granted" && pushAvailable) return { title: "Push notifications are on", body: "This device can receive SudoDuel push updates." };
  if (!pushAvailable) return { title: "Inbox notifications are available", body: "Phone push notifications are not available in this build." };
  if (status === "denied") return { title: "Push notifications are off", body: "Push notifications are turned off in iOS Settings. You can still use SudoDuel normally." };
  if (status === "unsupported") return { title: "Push unavailable in this build", body: "You can still use in-app notifications and all gameplay normally." };
  return { title: "Push notifications are optional", body: "Gameplay works without notifications. Enable them if you want duel and social updates." };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function isCalmPushUnavailableMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return message.includes("Phone push notifications are not available in this build.")
    || message.includes("Push project ID missing.");
}

export default function SettingsNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const [preferences, setPreferences] = useState<NotificationPreferenceRow | null>(userId ? defaultNotificationPreferences(userId) : null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>("undetermined");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushAvailable, setPushAvailable] = useState<boolean>(false);
  const tokenSyncAttemptRef = useRef<string | null>(null);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);
  const permission = permissionCopy(permissionStatus, pushAvailable);

  const load = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setError(null);
    const [status, availability, prefs, inbox] = await Promise.all([
      getNotificationPermissionStatus(),
      getPushAvailabilityState(),
      fetchNotificationPreferences(userId),
      fetchNotifications(),
    ]);
    setPermissionStatus(status);
    setPushAvailable(availability.available);
    if (prefs.ok) setPreferences(prefs.data);
    else setError(prefs.error);
    if (inbox.ok) setNotifications(inbox.data);
    else setError((current) => current ?? inbox.error);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeToInAppNotifications(userId, () => { void load(); });
  }, [load, userId]);

  useEffect(() => {
    if (!userId || permissionStatus !== "granted") return;
    const attemptKey = `${userId}:${permissionStatus}`;
    if (tokenSyncAttemptRef.current === attemptKey) return;
    tokenSyncAttemptRef.current = attemptKey;
    void registerPushToken(userId).then((result) => {
      if (!result.ok && !isCalmPushUnavailableMessage(result.error)) {
        setError((current) => current ?? result.error);
      }
    });
  }, [permissionStatus, userId]);

  const updatePreference = async (key: keyof NotificationPreferenceRow, value: boolean) => {
    if (!preferences || !userId) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setIsSaving(true);
    setError(null);
    const result = await saveNotificationPreferences(next);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      setPreferences(preferences);
      return;
    }
    setPreferences(result.data);
  };

  const enablePush = async () => {
    if (!userId) return;
    setIsSaving(true);
    setError(null);
    const status = await requestNotificationPermissions();
    setPermissionStatus(status);
    if (status === "granted") {
      const token = await registerPushToken(userId);
      if (!token.ok && !isCalmPushUnavailableMessage(token.error)) setError(token.error);
    }
    setIsSaving(false);
  };

  const openNotification = async (item: AppNotification) => {
    if (!item.read_at) {
      const result = await markNotificationRead(item.notification_id);
      if (!result.ok) setError(result.error);
      setNotifications((current) => current.map((entry) => entry.notification_id === item.notification_id ? { ...entry, read_at: entry.read_at ?? new Date().toISOString() } : entry));
    }
    if (item.deep_link) {
      router.push(item.deep_link as never);
    }
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyWrap}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.body}>Sign in to manage SudoDuel notifications.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/settings")}>
            <ChevronLeft size={20} color={C.ink} />
          </Pressable>
          <View style={styles.icon}><Bell size={22} color={C.inkSoft} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SETTINGS</Text>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.sub}>Choose which SudoDuel updates you want to receive.</Text>
          </View>
        </View>

        {isLoading ? (
          <Card style={{ marginTop: 18 }}>
            <ActivityIndicator color={C.gold} />
          </Card>
        ) : (
          <>
            <Card style={{ marginTop: 18 }}>
              <View style={styles.permissionHeader}>
                <View style={[styles.permissionIcon, permissionStatus === "granted" && styles.permissionIconOn]}>
                  {permissionStatus === "granted" ? <CheckCircle2 size={20} color={C.success} /> : <BellOff size={20} color={C.muted} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{permission.title}</Text>
                  <Text style={styles.body}>{permission.body}</Text>
                </View>
              </View>
              {pushAvailable && permissionStatus !== "granted" && permissionStatus !== "unsupported" ? (
                <Pressable style={styles.primaryButton} onPress={() => { void enablePush(); }} disabled={isSaving}>
                  <Text style={styles.primaryButtonText}>{isSaving ? "Enabling..." : "Enable push notifications"}</Text>
                </Pressable>
              ) : null}
            </Card>

            <Card style={{ marginTop: 14 }} padded={false}>
              {preferences ? TOGGLE_ROWS.map((row, index) => {
                const value = Boolean(preferences[row.key]);
                return (
                  <View key={row.key} style={[styles.toggleRow, index < TOGGLE_ROWS.length - 1 && styles.divider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toggleLabel}>{row.label}</Text>
                      <Text style={styles.toggleDesc}>{row.description}</Text>
                    </View>
                    <Switch
                      value={value}
                      onValueChange={(next) => { void updatePreference(row.key, next); }}
                      trackColor={{ false: C.border, true: C.accentSoft }}
                      thumbColor={value ? C.accent : C.mutedSoft}
                    />
                  </View>
                );
              }) : null}
            </Card>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {isSaving ? <Text style={styles.saving}>Saving notification settings...</Text> : null}

            <View style={styles.inboxHeader}>
              <Text style={styles.sectionTitle}>Inbox</Text>
              <Text style={styles.unread}>{unreadCount} unread</Text>
            </View>
            <Card padded={false}>
              {notifications.length === 0 ? (
                <Text style={styles.emptyInbox}>Duel and social updates will appear here.</Text>
              ) : notifications.map((item, index) => (
                <Pressable
                  key={item.notification_id}
                  style={[styles.notificationRow, index < notifications.length - 1 && styles.divider, !item.read_at && styles.notificationUnread]}
                  onPress={() => { void openNotification(item); }}
                >
                  <View style={styles.notificationDotWrap}>
                    {!item.read_at ? <View style={styles.notificationDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationBody}>{item.body}</Text>
                    <Text style={styles.notificationDate}>{formatDate(item.created_at)}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  emptyWrap: { flex: 1, padding: 24, justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.bgElevated, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: C.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: C.ink, fontSize: 28, fontWeight: "900", marginTop: 2 },
  sub: { color: C.muted, fontSize: 13, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  cardTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  body: { color: C.muted, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 4 },
  permissionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  permissionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.bgElevated, alignItems: "center", justifyContent: "center" },
  permissionIconOn: { backgroundColor: "#DCEBE0" },
  primaryButton: { alignSelf: "flex-start", marginTop: 14, borderRadius: 14, backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 11 },
  primaryButtonText: { color: C.card, fontSize: 13, fontWeight: "900" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
  toggleLabel: { color: C.ink, fontSize: 15, fontWeight: "900" },
  toggleDesc: { color: C.muted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 3 },
  error: { color: C.danger, fontSize: 13, fontWeight: "800", marginTop: 12 },
  saving: { color: C.muted, fontSize: 12, fontWeight: "800", marginTop: 10 },
  inboxHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 },
  sectionTitle: { color: C.muted, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  unread: { color: C.gold, fontSize: 12, fontWeight: "900" },
  emptyInbox: { color: C.muted, fontSize: 13, fontWeight: "700", lineHeight: 19, padding: 16 },
  notificationRow: { flexDirection: "row", gap: 10, padding: 16 },
  notificationUnread: { backgroundColor: C.bgElevated },
  notificationDotWrap: { width: 10, alignItems: "center", paddingTop: 6 },
  notificationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold },
  notificationTitle: { color: C.ink, fontSize: 14, fontWeight: "900" },
  notificationBody: { color: C.muted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 3 },
  notificationDate: { color: C.mutedSoft, fontSize: 11, fontWeight: "800", marginTop: 6 },
});
