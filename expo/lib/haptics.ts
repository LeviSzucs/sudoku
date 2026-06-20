import * as ExpoHaptics from "expo-haptics";
import { Platform } from "react-native";

async function run(effect: () => Promise<void>): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await effect();
  } catch {
    // Haptics are optional polish. Unsupported devices and preview builds should stay quiet.
  }
}

export async function tapLight(): Promise<void> {
  await run(() => ExpoHaptics.selectionAsync());
}

export async function tapMedium(): Promise<void> {
  await run(() => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium));
}

export async function success(): Promise<void> {
  await run(() => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success));
}

export async function warning(): Promise<void> {
  await run(() => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning));
}

export async function error(): Promise<void> {
  await run(() => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error));
}
