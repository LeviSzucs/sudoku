import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AppPreferences = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

export type HapticEvent = "selection" | "success" | "warning" | "error";
export type SoundEvent = "button" | "complete" | "error" | "result";

const STORAGE_KEY = "sudoduel.app_preferences.v1";

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  soundEnabled: true,
  hapticsEnabled: true,
};

let cachedPreferences: AppPreferences = DEFAULT_APP_PREFERENCES;

function normalisePreferences(value: Partial<AppPreferences> | null | undefined): AppPreferences {
  return {
    soundEnabled: typeof value?.soundEnabled === "boolean" ? value.soundEnabled : DEFAULT_APP_PREFERENCES.soundEnabled,
    hapticsEnabled: typeof value?.hapticsEnabled === "boolean" ? value.hapticsEnabled : DEFAULT_APP_PREFERENCES.hapticsEnabled,
  };
}

function toStorage(value: AppPreferences): string {
  return JSON.stringify(value);
}

export async function loadAppPreferences(userId?: string | null): Promise<AppPreferences> {
  let localPreferences = DEFAULT_APP_PREFERENCES;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) localPreferences = normalisePreferences(JSON.parse(stored) as Partial<AppPreferences>);
  } catch {
    localPreferences = DEFAULT_APP_PREFERENCES;
  }

  if (userId && isSupabaseConfigured) {
    const { data } = await supabase
      .from("user_settings")
      .select("sound_enabled,haptics_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      const remotePreferences = normalisePreferences({
        soundEnabled: data.sound_enabled,
        hapticsEnabled: data.haptics_enabled,
      });
      cachedPreferences = remotePreferences;
      await AsyncStorage.setItem(STORAGE_KEY, toStorage(remotePreferences)).catch(() => {});
      return remotePreferences;
    }
  }

  cachedPreferences = localPreferences;
  return localPreferences;
}

export async function saveAppPreferences(preferences: AppPreferences, userId?: string | null): Promise<AppPreferences> {
  const next = normalisePreferences(preferences);
  cachedPreferences = next;
  await AsyncStorage.setItem(STORAGE_KEY, toStorage(next)).catch(() => {});

  if (userId && isSupabaseConfigured) {
    await supabase.from("user_settings").upsert({
      user_id: userId,
      sound_enabled: next.soundEnabled,
      haptics_enabled: next.hapticsEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  return next;
}

export function getCachedAppPreferences(): AppPreferences {
  return cachedPreferences;
}

export async function triggerHaptic(event: HapticEvent): Promise<void> {
  if (!cachedPreferences.hapticsEnabled) return;
  try {
    if (event === "selection") {
      await Haptics.selectionAsync();
      return;
    }
    const feedback =
      event === "success" ? Haptics.NotificationFeedbackType.Success :
      event === "warning" ? Haptics.NotificationFeedbackType.Warning :
      Haptics.NotificationFeedbackType.Error;
    await Haptics.notificationAsync(feedback);
  } catch {
    // Some simulators/devices do not support haptics. Gameplay should continue.
  }
}

export async function playSoundEffect(_event: SoundEvent): Promise<void> {
  if (!cachedPreferences.soundEnabled) return;
  // No bundled sound assets exist yet. This helper is intentionally centralised so
  // future sound effects can be added without scattering setting checks.
}
