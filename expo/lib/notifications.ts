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

export type PushProjectDiagnostics = {
  extraEasProjectId: string | null;
  constantsEasConfigProjectId: string | null;
  expoPublicEasProjectId: string | null;
  expoPublicProjectId: string | null;
  selectedProjectIdSource: string;
  selectedProjectId: string | null;
  selectedProjectIdLength: number;
  selectedProjectIdIsUuidShaped: boolean;
  permissionStatus: NotificationPermissionStatus;
  lastTokenErrorCategory: string | null;
  lastTokenErrorMessage: string | null;
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
let lastPushTokenError: { category: string; message: string } | null = null;

function logNotificationDiagnostic(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(`[Notifications] ${message}`, details);
    return;
  }
  console.info(`[Notifications] ${message}`);
}

function tokenDiagnostic(token: string): Record<string, unknown> {
  return { hasToken: Boolean(token), tokenLength: token.length };
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function setLastPushTokenError(category: string, message: string) {
  lastPushTokenError = { category, message };
}

function clearLastPushTokenError() {
  lastPushTokenError = null;
}

function isUuidShaped(value: string | undefined): boolean {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

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

function expoProjectIdState(): {
  projectId?: string;
  selectedSource: string;
  values: {
    extraEasProjectId?: string;
    constantsEasConfigProjectId?: string;
    expoPublicEasProjectId?: string;
    expoPublicProjectId?: string;
  };
  diagnostics: Record<string, boolean>;
} {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const eas = extra?.eas as Record<string, unknown> | undefined;
  const easConfig = Constants as unknown as { easConfig?: { projectId?: string } };
  const env = typeof process !== "undefined" ? process.env : undefined;
  const extraProjectId = nonEmptyString(eas?.projectId);
  const easConfigProjectId = nonEmptyString(easConfig.easConfig?.projectId);
  const envEasProjectId = nonEmptyString(env?.EXPO_PUBLIC_EAS_PROJECT_ID);
  const envRorkProjectId = nonEmptyString(env?.EXPO_PUBLIC_PROJECT_ID);
  const candidates = [
    { source: "Constants.expoConfig.extra.eas.projectId", value: extraProjectId },
    { source: "Constants.easConfig.projectId", value: easConfigProjectId },
    { source: "EXPO_PUBLIC_EAS_PROJECT_ID", value: envEasProjectId },
    { source: "EXPO_PUBLIC_PROJECT_ID", value: envRorkProjectId },
  ];
  const selected = candidates.find((candidate) => Boolean(candidate.value));

  return {
    projectId: selected?.value,
    selectedSource: selected?.source ?? "None",
    values: {
      extraEasProjectId: extraProjectId,
      constantsEasConfigProjectId: easConfigProjectId,
      expoPublicEasProjectId: envEasProjectId,
      expoPublicProjectId: envRorkProjectId,
    },
    diagnostics: {
      hasExtraEasProjectId: Boolean(extraProjectId),
      hasConstantsEasConfigProjectId: Boolean(easConfigProjectId),
      hasExpoPublicEasProjectId: Boolean(envEasProjectId),
      hasExpoPublicProjectId: Boolean(envRorkProjectId),
    },
  };
}

export function defaultNotificationPreferences(userId: string): NotificationPreferenceRow {
  return { user_id: userId, ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const loaded = await loadNotificationsModule();
  if (!loaded.ok) return "unsupported";

  try {
    const status = normalisePermission(await loaded.data.getPermissionsAsync());
    logNotificationDiagnostic("Permission status checked.", { status });
    return status;
  } catch (error) {
    console.warn("[Notifications] Could not read permission status.", error);
    return "unsupported";
  }
}

export async function getPushProjectDiagnostics(): Promise<PushProjectDiagnostics> {
  const projectIdInfo = expoProjectIdState();
  const permissionStatus = await getNotificationPermissionStatus();
  const selectedProjectId = projectIdInfo.projectId ?? null;

  return {
    extraEasProjectId: projectIdInfo.values.extraEasProjectId ?? null,
    constantsEasConfigProjectId: projectIdInfo.values.constantsEasConfigProjectId ?? null,
    expoPublicEasProjectId: projectIdInfo.values.expoPublicEasProjectId ?? null,
    expoPublicProjectId: projectIdInfo.values.expoPublicProjectId ?? null,
    selectedProjectIdSource: projectIdInfo.selectedSource,
    selectedProjectId,
    selectedProjectIdLength: selectedProjectId?.length ?? 0,
    selectedProjectIdIsUuidShaped: isUuidShaped(projectIdInfo.projectId),
    permissionStatus,
    lastTokenErrorCategory: lastPushTokenError?.category ?? null,
    lastTokenErrorMessage: lastPushTokenError?.message ?? null,
  };
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  const loaded = await loadNotificationsModule();
  if (!loaded.ok) return "unsupported";

  try {
    const status = normalisePermission(await loaded.data.requestPermissionsAsync());
    logNotificationDiagnostic("Permission request finished.", { status });
    return status;
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
  const projectIdInfo = expoProjectIdState();
  const projectId = projectIdInfo.projectId;
  logNotificationDiagnostic("Push token registration started.", {
    hasUserId: Boolean(userId),
    platform: Platform.OS,
    supabaseConfigured: isSupabaseConfigured,
    hasProjectId: Boolean(projectId),
    ...projectIdInfo.diagnostics,
  });

  if (!userId) return { ok: false, error: "Sign in is required before registering this device for push notifications." };

  const loaded = await loadNotificationsModule();
  if (!loaded.ok) {
    logNotificationDiagnostic("Push token registration skipped.", { reason: loaded.error });
    setLastPushTokenError("notifications_unavailable", loaded.error);
    return { ok: false, error: loaded.error };
  }

  const permission = await getNotificationPermissionStatus();
  if (permission !== "granted") {
    logNotificationDiagnostic("Push token registration skipped.", { permission });
    return { ok: true, data: null };
  }

  if (!projectId) {
    logNotificationDiagnostic("Push token registration failed.", {
      category: "missing_project_id",
      permission,
      platform: Platform.OS,
      ...projectIdInfo.diagnostics,
    });
    setLastPushTokenError("missing_project_id", "Push project ID missing.");
    return { ok: false, error: "Push project ID missing." };
  }

  try {
    clearLastPushTokenError();
    logNotificationDiagnostic("Requesting Expo push token.", { hasProjectId: true, platform: Platform.OS });
    const tokenResult = await loaded.data.getExpoPushTokenAsync({ projectId });
    const token = typeof tokenResult === "string" ? tokenResult : tokenResult.data;
    if (!token) {
      logNotificationDiagnostic("Expo push token request failed.", { category: "empty_token", permission, platform: Platform.OS });
      setLastPushTokenError("empty_token", "Could not get Expo push token.");
      return { ok: false, error: "Could not get Expo push token." };
    }
    logNotificationDiagnostic("Expo push token obtained.", tokenDiagnostic(token));

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
      if (error) {
        console.warn("[Notifications] Push token upsert failed.", { message: error.message, code: error.code });
        logNotificationDiagnostic("Push token upsert failed.", { category: "supabase_upsert_failed", code: error.code, platform: Platform.OS });
        setLastPushTokenError("supabase_upsert_failed", "Could not save push token.");
        return { ok: false, error: "Could not save push token." };
      }
      logNotificationDiagnostic("Push token upsert succeeded.", { platform: Platform.OS });
    }

    return { ok: true, data: token };
  } catch (error) {
    console.warn("[Notifications] Could not get Expo push token.", { message: safeErrorMessage(error) });
    const message = safeErrorMessage(error);
    logNotificationDiagnostic("Expo push token request failed.", {
      category: "expo_token_failed",
      message,
      permission,
      platform: Platform.OS,
      hasProjectId: true,
    });
    setLastPushTokenError("expo_token_failed", message);
    return { ok: false, error: "Could not get Expo push token." };
  }
}

export async function syncPushTokenOnLogin(userId: string): Promise<void> {
  logNotificationDiagnostic("Login push sync started.", { hasUserId: Boolean(userId) });
  const permission = await getNotificationPermissionStatus();
  if (permission !== "granted") {
    logNotificationDiagnostic("Login push sync skipped.", { permission });
    return;
  }
  const result = await registerPushToken(userId);
  if (!result.ok) console.warn("[Notifications] Login push sync failed.", result.error);
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
  logNotificationDiagnostic("Fetched in-app notifications.", { count: data?.length ?? 0 });
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
