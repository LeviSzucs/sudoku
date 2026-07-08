import { Platform } from "react-native";

export const REVENUECAT_ENTITLEMENT_ID = "premium";
export const REVENUECAT_OFFERING_ID = "default";
export const PRODUCT_MONTHLY = "sudoduel_premium_monthly";
export const PRODUCT_YEARLY = "sudoduel_premium_yearly";

export const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
export const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "";

export function getRevenueCatApiKey(platform: typeof Platform.OS = Platform.OS): string {
  if (platform === "ios") return REVENUECAT_IOS_API_KEY;
  if (platform === "android") return REVENUECAT_ANDROID_API_KEY;
  return "";
}

export const PURCHASES_ENABLED = Platform.OS === "ios" || Platform.OS === "android"
  ? getRevenueCatApiKey().trim().length > 0
  : false;

export const PURCHASES_UNAVAILABLE_MESSAGE = "Purchases are not available in this release.";
