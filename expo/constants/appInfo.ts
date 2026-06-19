import Constants from "expo-constants";

export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export function formatAppVersionLabel(): string {
  return `Version ${APP_VERSION}`;
}
