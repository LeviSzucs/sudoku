import { Platform } from "react-native";

import {
  getRevenueCatApiKey,
  PURCHASES_ENABLED,
  PURCHASES_UNAVAILABLE_MESSAGE,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_OFFERING_ID,
} from "@/constants/purchases";

export type PurchasePackage = {
  identifier: string;
  packageType?: string;
  product: {
    identifier: string;
    title?: string;
    description?: string;
    priceString?: string;
  };
  raw: unknown;
};

export type CurrentOffering = {
  identifier: string;
  availablePackages: PurchasePackage[];
};

export type CustomerInfoLike = {
  entitlements?: {
    active?: Record<string, unknown>;
  };
};

export type PurchaseResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; unavailable?: boolean };

type PurchasesModule = {
  configure: (options: { apiKey: string; appUserID?: string }) => void;
  logIn?: (appUserID: string) => Promise<{ customerInfo: CustomerInfoLike }>;
  logOut?: () => Promise<CustomerInfoLike>;
  getCustomerInfo: () => Promise<CustomerInfoLike>;
  getOfferings: () => Promise<{ current?: unknown; all?: Record<string, unknown> }>;
  purchasePackage: (pkg: unknown) => Promise<{ customerInfo: CustomerInfoLike }>;
  restorePurchases: () => Promise<CustomerInfoLike>;
  addCustomerInfoUpdateListener?: (callback: (customerInfo: CustomerInfoLike) => void) => unknown;
  removeCustomerInfoUpdateListener?: (callback: (customerInfo: CustomerInfoLike) => void) => void;
  setLogLevel?: (level: string) => void;
};

let purchasesModule: PurchasesModule | null = null;
let configurePromise: Promise<PurchaseResult<boolean>> | null = null;
let hasConfigured = false;
let configuredApiKey: string | null = null;
let currentAppUserId: string | null = null;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
}

function unavailable(message = PURCHASES_UNAVAILABLE_MESSAGE): PurchaseResult<never> {
  return { ok: false, error: message, unavailable: true };
}

async function loadPurchasesModule(): Promise<PurchaseResult<PurchasesModule>> {
  if (!PURCHASES_ENABLED) return unavailable();
  if (Platform.OS !== "ios" && Platform.OS !== "android") return unavailable();
  if (purchasesModule) return { ok: true, data: purchasesModule };

  try {
    const mod = await import("react-native-purchases");
    purchasesModule = (mod.default ?? mod) as unknown as PurchasesModule;
    return { ok: true, data: purchasesModule };
  } catch {
    return unavailable();
  }
}

export async function configurePurchases(): Promise<PurchaseResult<boolean>> {
  const apiKey = getRevenueCatApiKey().trim();
  if (!apiKey) return unavailable();

  if (hasConfigured && configuredApiKey === apiKey) {
    return { ok: true, data: true };
  }

  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    const loaded = await loadPurchasesModule();
    if (!loaded.ok) return loaded;

    try {
      loaded.data.configure({ apiKey });
      configuredApiKey = apiKey;
      hasConfigured = true;
      return { ok: true, data: true };
    } catch (error) {
      console.warn("[Purchases] RevenueCat configuration failed.", {
        message: getErrorMessage(error, "Could not configure purchases."),
        platform: Platform.OS,
        purchasesEnabled: PURCHASES_ENABLED,
        entitlementId: REVENUECAT_ENTITLEMENT_ID,
        offeringId: REVENUECAT_OFFERING_ID,
      });
      configuredApiKey = null;
      currentAppUserId = null;
      hasConfigured = false;
      return { ok: false, error: PURCHASES_UNAVAILABLE_MESSAGE };
    } finally {
      configurePromise = null;
    }
  })();

  return configurePromise;
}

export async function identifyPurchasesUser(userId: string): Promise<PurchaseResult<CustomerInfoLike>> {
  const configured = await configurePurchases();
  if (!configured.ok) return configured;

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) return loaded;

  try {
    if (loaded.data.logIn && currentAppUserId !== userId) {
      const result = await loaded.data.logIn(userId);
      currentAppUserId = userId;
      return { ok: true, data: result.customerInfo };
    }
    return getCustomerInfo();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not identify purchase user." };
  }
}

export async function resetPurchasesUser(): Promise<PurchaseResult<CustomerInfoLike | null>> {
  currentAppUserId = null;

  if (!hasConfigured) {
    return { ok: true, data: null };
  }

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) return loaded;

  try {
    if (!loaded.data.logOut) {
      return { ok: true, data: null };
    }
    const info = await loaded.data.logOut();
    return { ok: true, data: info };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not reset purchases user." };
  }
}

export async function getCustomerInfo(): Promise<PurchaseResult<CustomerInfoLike>> {
  const configured = await configurePurchases();
  if (!configured.ok) return configured;

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) return loaded;

  try {
    return { ok: true, data: await loaded.data.getCustomerInfo() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not load purchase status." };
  }
}

function mapPackage(pkg: any): PurchasePackage {
  const product = pkg.product ?? {};
  return {
    identifier: String(pkg.identifier ?? product.identifier ?? "package"),
    packageType: pkg.packageType,
    product: {
      identifier: String(product.identifier ?? pkg.identifier ?? "product"),
      title: product.title,
      description: product.description,
      priceString: product.priceString ?? product.price_string,
    },
    raw: pkg,
  };
}

function mapOffering(offering: any): CurrentOffering | null {
  if (!offering) return null;
  const availablePackages = Array.isArray(offering.availablePackages)
    ? offering.availablePackages.map(mapPackage)
    : [];
  return {
    identifier: String(offering.identifier ?? REVENUECAT_OFFERING_ID),
    availablePackages,
  };
}

export async function getCurrentOffering(): Promise<PurchaseResult<CurrentOffering | null>> {
  const configured = await configurePurchases();
  if (!configured.ok) return configured;

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) return loaded;

  try {
    const offerings = await loaded.data.getOfferings();
    const offering = (offerings.all?.[REVENUECAT_OFFERING_ID] ?? offerings.current) as unknown;
    return { ok: true, data: mapOffering(offering) };
  } catch (error) {
    console.warn("[Purchases] RevenueCat offering fetch failed.", {
      message: getErrorMessage(error, "Could not load Premium offers."),
      platform: Platform.OS,
      purchasesEnabled: PURCHASES_ENABLED,
      entitlementId: REVENUECAT_ENTITLEMENT_ID,
      offeringId: REVENUECAT_OFFERING_ID,
    });
    return { ok: false, error: "Premium purchases are not available right now. Please try again later." };
  }
}

export async function purchasePackage(pkg: PurchasePackage): Promise<PurchaseResult<CustomerInfoLike>> {
  const configured = await configurePurchases();
  if (!configured.ok) return configured;

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) return loaded;

  try {
    const result = await loaded.data.purchasePackage(pkg.raw);
    return { ok: true, data: result.customerInfo };
  } catch (error: any) {
    if (error?.userCancelled) return { ok: false, error: "Purchase cancelled." };
    console.warn("[Purchases] RevenueCat purchase failed.", {
      message: getErrorMessage(error, "Purchase could not be completed."),
      platform: Platform.OS,
      productId: pkg.product.identifier,
    });
    return { ok: false, error: "Purchase could not be completed right now. Please try again later." };
  }
}

export async function restorePurchases(): Promise<PurchaseResult<CustomerInfoLike>> {
  const configured = await configurePurchases();
  if (!configured.ok) return configured;

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) return loaded;

  try {
    return { ok: true, data: await loaded.data.restorePurchases() };
  } catch (error) {
    console.warn("[Purchases] RevenueCat restore failed.", {
      message: getErrorMessage(error, "Purchases could not be restored."),
      platform: Platform.OS,
      entitlementId: REVENUECAT_ENTITLEMENT_ID,
    });
    return { ok: false, error: "Purchases could not be restored right now. Please try again later." };
  }
}

export function isPremiumActive(customerInfo: CustomerInfoLike | null | undefined): boolean {
  return Boolean(customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_ID]);
}

export async function subscribeToCustomerInfoUpdates(callback: (customerInfo: CustomerInfoLike) => void): Promise<() => void> {
  const configured = await configurePurchases();
  if (!configured.ok) return () => {};

  const loaded = await loadPurchasesModule();
  if (!loaded.ok || !loaded.data.addCustomerInfoUpdateListener) return () => {};

  const maybeSubscription = loaded.data.addCustomerInfoUpdateListener(callback);
  return () => {
    if (typeof maybeSubscription === "function") {
      maybeSubscription();
      return;
    }
    loaded.data.removeCustomerInfoUpdateListener?.(callback);
  };
}
