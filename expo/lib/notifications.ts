import Constants from "expo-constants";
import { Platform } from "react-native";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined" | "unsupported";

export type NotificationPreferenceRow = {
  user_id: string;
  push_enabled: boolean;
  friend_requests: boolean;
  friend_challenges: boolean;
  challenge_results: boolean;
  daily_duel_matches: boolean;
  ranked_duel_matches: boolean;
  reminders: boolean;
  marketing: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AppNotification = {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  deep_link: string | null;
  read_at: string | null;
  created_at: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

type ExpoNotificationsModule = {
  getPermissionsAsync: () => Promise<{ status?: string; granted?: boolean }>;
  requestPermissionsAsync: () => Promise<{ status?: string; granted?: boolean }>;
  getExpoPushTokenAsync: (options?: { projectId?: string }) => Promise<{ data: string } | string>;
};

const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferenceRow, "user_id"> = {
  push_enabled: true,
  friend_requests: true,
  friend_challenges: true,
  challenge_results: true,
  daily_duel_matches: true,
  ranked_duel_matches: true,
  reminders: true,
  marketing: false,
};

let notificationsModule: ExpoNotificationsModule | null = null;

function normalisePermission(status: { status?: string; granted?: boolean } | null | undefined): NotificationPermissionStatus {
  if (!status) return "unsupported";
  if (status.granted || status.status === "granted") return "granted";
  if (status.status === "denied") return "denied";
  return "undetermined";
}

async function loadNotificationsModule(): Promise<Result<ExpoNotificationsModule>> {
  if (Platform.OS === "web") return { ok: false, error: "Push notifications are not supported on web." };
  if (notificationsModule) return { ok: true, data: notificationsModule };

  try {
    const mod = await import("expo-notifications");
    notificationsModule = mod as unknown as ExpoNotificationsModule;
    return { ok: true, data: notificationsModule };
  } catch (error) {
    console.warn("[Notifications] expo-notifications is unavailable.", error);
    return { ok: false, error: "Push notifications are unavailable in this build." };
  }
}

function expoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const eas = extra?.eas as Record<string, unknown> | undefined;
  const easConfig = Constants as unknown as { easConfig?: { projectId?: string } };
  const projectId = eas?.projectId ?? easConfig.easConfig?.projectId;
  return typeof projectId === "string" && projectId.trim().length > 0 ? projectId : undefined;
}

export function defaultNotificationPreferences(userId: string): NotificationPreferenceRow {
  return { user_id: userId, ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const loaded = await loadNotificationsModule();
  if (!loaded.ok) return "unsupported";

  try {
    return normalisePermission(await loaded.data.getPermissionsAsync());
  } catch (error) {
    console.warn("[Notifications] Could not read permission status.", error);
    return "unsupported";
  }
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  const loaded = await loadNotificationsModule();
  if (!loaded.ok) return "unsupported";

  try {
    return normalisePermission(await loaded.data.requestPermissionsAsync());
  } catch (error) {
    console.warn("[Notifications] Could not request notification permissions.", error);
    return "unsupported";
  }
}

export async function fetchNotificationPreferences(userId: string): Promise<Result<NotificationPreferenceRow>> {
  if (!isSupabaseConfigured) return { ok: false, error: "Notifications are available after sign in." };

  const { data, error } = await supabase.rpc("get_notification_preferences");
  if (error) return { ok: false, error: error.message };

  return { ok: true, data: (data as NotificationPreferenceRow | null) ?? defaultNotificationPreferences(userId) };
}

export async function saveNotificationPreferences(preferences: NotificationPreferenceRow): Promise<Result<NotificationPreferenceRow>> {
  if (!isSupabaseConfigured) return { ok: false, error: "Notifications are available after sign in." };

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(preferences, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data as NotificationPreferenceRow | null) ?? preferences };
}

export async function registerPushToken(userId: string): Promise<Result<string | null>> {
  const loaded = await loadNotificationsModule();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const permission = await getNotificationPermissionStatus();
  if (permission !== "granted") return { ok: true, data: null };

  try {
    const projectId = expoProjectId();
    const tokenResult = projectId
      ? await loaded.data.getExpoPushTokenAsync({ projectId })
      : await loaded.data.getExpoPushTokenAsync();
    const token = typeof tokenResult === "string" ? tokenResult : tokenResult.data;
    if (!token) return { ok: false, error: "Could not register this device for push notifications." };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from("push_tokens").upsert({
        user_id: userId,
        expo_push_token: token,
        device_id: null,
        platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unknown",
        app_version: Constants.expoConfig?.version ?? null,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id,expo_push_token" });
      if (error) return { ok: false, error: error.message };
    }

    return { ok: true, data: token };
  } catch (error) {
    console.warn("[Notifications] Could not register push token.", error);
    return { ok: false, error: "Could not register this device for push notifications." };
  }
}

export async function syncPushTokenOnLogin(userId: string): Promise<void> {
  const permission = await getNotificationPermissionStatus();
  if (permission !== "granted") return;
  await registerPushToken(userId);
}

export async function unregisterPushToken(userId: string, token: string): Promise<Result<boolean>> {
  if (!isSupabaseConfigured) return { ok: true, data: true };
  const { error } = await supabase
    .from("push_tokens")
    .update({ is_active: false, last_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("expo_push_token", token);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: true };
}

export async function fetchNotifications(limit = 50): Promise<Result<AppNotification[]>> {
  if (!isSupabaseConfigured) return { ok: false, error: "Notifications are available after sign in." };
  const { data, error } = await supabase
    .from("app_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as AppNotification[] };
}

export async function markNotificationRead(notificationId: string): Promise<Result<boolean>> {
  if (!isSupabaseConfigured) return { ok: false, error: "Notifications are available after sign in." };
  const { error } = await supabase.rpc("mark_app_notification_read", { p_notification_id: notificationId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: true };
}

export function subscribeToInAppNotifications(userId: string, onChange: () => void): () => void {
  if (!isSupabaseConfigured || !userId) return () => {};

  const channel = supabase
    .channel(`app-notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_notifications", filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
