import { Platform } from "react-native";

import {
  getRevenueCatApiKey,
  PURCHASES_ENABLED,
  PURCHASES_UNAVAILABLE_MESSAGE,
  PRODUCT_MONTHLY,
  PRODUCT_YEARLY,
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

export type PurchaseDiagnostics = {
  platform: typeof Platform.OS;
  purchasesEnabled: boolean;
  purchasesModuleImportAttempted: boolean;
  purchasesModuleImported: boolean;
  purchasesModuleLoaded: boolean;
  purchasesModuleHasConfigure: boolean;
  purchasesModuleHasGetOfferings: boolean;
  purchasesModuleHasPurchasePackage: boolean;
  purchasesModuleHasRestorePurchases: boolean;
  iosApiKeyPresent: boolean;
  iosApiKeyLength: number;
  iosApiKeyPrefix: string | null;
  entitlementId: string;
  offeringId: string;
  expectedMonthlyProductId: string;
  expectedYearlyProductId: string;
  configureAttempted: boolean;
  configureSucceeded: boolean;
  getOfferingsAttempted: boolean;
  getOfferingsSucceeded: boolean;
  currentOfferingIdentifier: string | null;
  allOfferingIdentifiers: string[];
  selectedOfferingIdentifier: string | null;
  selectedOfferingHasZeroPackages: boolean;
  availablePackageCount: number;
  packageIdentifiers: string[];
  productIdentifiers: string[];
  priceStrings: string[];
  packagesMissingPriceStrings: boolean;
  lastErrorCategory: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastModuleLoadErrorMessage: string | null;
  lastConfigureErrorMessage: string | null;
  lastGetOfferingsErrorMessage: string | null;
};

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
let lastRevenueCatError: { category: string; code: string | null; message: string | null } | null = null;
let purchaseDiagnosticState = {
  moduleImportAttempted: false,
  moduleImported: false,
  moduleLoaded: false,
  moduleHasConfigure: false,
  moduleHasGetOfferings: false,
  moduleHasPurchasePackage: false,
  moduleHasRestorePurchases: false,
  configureAttempted: false,
  configureSucceeded: false,
  getOfferingsAttempted: false,
  getOfferingsSucceeded: false,
  lastModuleLoadErrorMessage: null as string | null,
  lastConfigureErrorMessage: null as string | null,
  lastGetOfferingsErrorMessage: null as string | null,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
}

function getErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const value = (error as { code?: unknown }).code;
    return typeof value === "string" || typeof value === "number" ? String(value) : null;
  }
  return null;
}

function setLastRevenueCatError(category: string, error: unknown, fallback: string) {
  lastRevenueCatError = {
    category,
    code: getErrorCode(error),
    message: getErrorMessage(error, fallback),
  };
}

function clearLastRevenueCatError() {
  lastRevenueCatError = null;
}

function resetPurchaseDiagnosticState() {
  purchaseDiagnosticState = {
    moduleImportAttempted: false,
    moduleImported: false,
    moduleLoaded: false,
    moduleHasConfigure: false,
    moduleHasGetOfferings: false,
    moduleHasPurchasePackage: false,
    moduleHasRestorePurchases: false,
    configureAttempted: false,
    configureSucceeded: false,
    getOfferingsAttempted: false,
    getOfferingsSucceeded: false,
    lastModuleLoadErrorMessage: null,
    lastConfigureErrorMessage: null,
    lastGetOfferingsErrorMessage: null,
  };
}

function unavailable(message = PURCHASES_UNAVAILABLE_MESSAGE): PurchaseResult<never> {
  return { ok: false, error: message, unavailable: true };
}

function captureModuleShape(module: PurchasesModule | null) {
  purchaseDiagnosticState.moduleHasConfigure = Boolean(module && typeof module.configure === "function");
  purchaseDiagnosticState.moduleHasGetOfferings = Boolean(module && typeof module.getOfferings === "function");
  purchaseDiagnosticState.moduleHasPurchasePackage = Boolean(module && typeof module.purchasePackage === "function");
  purchaseDiagnosticState.moduleHasRestorePurchases = Boolean(module && typeof module.restorePurchases === "function");
}

async function loadPurchasesModule(): Promise<PurchaseResult<PurchasesModule>> {
  purchaseDiagnosticState.moduleImportAttempted = true;
  if (!PURCHASES_ENABLED) {
    purchaseDiagnosticState.moduleImported = false;
    purchaseDiagnosticState.moduleLoaded = false;
    purchaseDiagnosticState.lastModuleLoadErrorMessage = "RevenueCat API key missing.";
    setLastRevenueCatError("api_key_missing", "RevenueCat API key missing.", "RevenueCat API key missing.");
    return unavailable();
  }
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    purchaseDiagnosticState.moduleImported = false;
    purchaseDiagnosticState.moduleLoaded = false;
    purchaseDiagnosticState.lastModuleLoadErrorMessage = "Purchases are not supported on this platform.";
    setLastRevenueCatError("unsupported_platform", "Purchases are not supported on this platform.", "Purchases are not supported on this platform.");
    return unavailable();
  }
  if (purchasesModule) {
    purchaseDiagnosticState.moduleImported = true;
    purchaseDiagnosticState.moduleLoaded = true;
    captureModuleShape(purchasesModule);
    return { ok: true, data: purchasesModule };
  }

  try {
    const mod = await import("react-native-purchases");
    purchasesModule = (mod.default ?? mod) as unknown as PurchasesModule;
    purchaseDiagnosticState.moduleImported = true;
    purchaseDiagnosticState.moduleLoaded = true;
    captureModuleShape(purchasesModule);
    purchaseDiagnosticState.lastModuleLoadErrorMessage = null;
    if (!purchaseDiagnosticState.moduleHasConfigure || !purchaseDiagnosticState.moduleHasGetOfferings || !purchaseDiagnosticState.moduleHasPurchasePackage || !purchaseDiagnosticState.moduleHasRestorePurchases) {
      purchaseDiagnosticState.lastModuleLoadErrorMessage = "react-native-purchases loaded but is missing one or more required methods.";
      setLastRevenueCatError("module_methods_missing", "react-native-purchases loaded but is missing one or more required methods.", "react-native-purchases loaded but is missing one or more required methods.");
    }
    return { ok: true, data: purchasesModule };
  } catch (error) {
    const message = getErrorMessage(error, "Could not load react-native-purchases.");
    console.warn("[Purchases] react-native-purchases module load failed.", {
      message,
      platform: Platform.OS,
      purchasesEnabled: PURCHASES_ENABLED,
    });
    purchaseDiagnosticState.moduleImported = false;
    purchaseDiagnosticState.moduleLoaded = false;
    captureModuleShape(null);
    purchaseDiagnosticState.lastModuleLoadErrorMessage = message;
    setLastRevenueCatError("module_load_failed", error, "Could not load react-native-purchases.");
    return unavailable();
  }
}

export async function configurePurchases(): Promise<PurchaseResult<boolean>> {
  const apiKey = getRevenueCatApiKey().trim();
  if (!apiKey) {
    purchaseDiagnosticState.configureAttempted = false;
    purchaseDiagnosticState.configureSucceeded = false;
    purchaseDiagnosticState.lastConfigureErrorMessage = "RevenueCat API key missing.";
    setLastRevenueCatError("api_key_missing", "RevenueCat API key missing.", "RevenueCat API key missing.");
    return unavailable();
  }

  if (hasConfigured && configuredApiKey === apiKey) {
    purchaseDiagnosticState.configureAttempted = true;
    purchaseDiagnosticState.configureSucceeded = true;
    purchaseDiagnosticState.lastConfigureErrorMessage = null;
    return { ok: true, data: true };
  }

  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    const loaded = await loadPurchasesModule();
    if (!loaded.ok) return loaded;

    purchaseDiagnosticState.configureAttempted = true;
    try {
      loaded.data.configure({ apiKey });
      configuredApiKey = apiKey;
      hasConfigured = true;
      purchaseDiagnosticState.configureSucceeded = true;
      purchaseDiagnosticState.lastConfigureErrorMessage = null;
      clearLastRevenueCatError();
      return { ok: true, data: true };
    } catch (error) {
      const message = getErrorMessage(error, "Could not configure purchases.");
      console.warn("[Purchases] RevenueCat configuration failed.", {
        message,
        platform: Platform.OS,
        purchasesEnabled: PURCHASES_ENABLED,
        entitlementId: REVENUECAT_ENTITLEMENT_ID,
        offeringId: REVENUECAT_OFFERING_ID,
      });
      purchaseDiagnosticState.configureSucceeded = false;
      purchaseDiagnosticState.lastConfigureErrorMessage = message;
      setLastRevenueCatError("configure_failed", error, "Could not configure purchases.");
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
      clearLastRevenueCatError();
      return { ok: true, data: result.customerInfo };
    }
    return getCustomerInfo();
  } catch (error) {
    setLastRevenueCatError("login_failed", error, "Could not identify purchase user.");
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
    clearLastRevenueCatError();
    return { ok: true, data: info };
  } catch (error) {
    setLastRevenueCatError("logout_failed", error, "Could not reset purchases user.");
    return { ok: false, error: error instanceof Error ? error.message : "Could not reset purchases user." };
  }
}

export async function getCustomerInfo(): Promise<PurchaseResult<CustomerInfoLike>> {
  const configured = await configurePurchases();
  if (!configured.ok) return configured;

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) return loaded;

  try {
    clearLastRevenueCatError();
    return { ok: true, data: await loaded.data.getCustomerInfo() };
  } catch (error) {
    setLastRevenueCatError("customer_info_failed", error, "Could not load purchase status.");
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

  purchaseDiagnosticState.getOfferingsAttempted = true;
  try {
    const offerings = await loaded.data.getOfferings();
    purchaseDiagnosticState.getOfferingsSucceeded = true;
    purchaseDiagnosticState.lastGetOfferingsErrorMessage = null;
    clearLastRevenueCatError();
    const offering = (offerings.all?.[REVENUECAT_OFFERING_ID] ?? offerings.current) as unknown;
    return { ok: true, data: mapOffering(offering) };
  } catch (error) {
    const message = getErrorMessage(error, "Could not load Premium offers.");
    console.warn("[Purchases] RevenueCat offering fetch failed.", {
      message,
      platform: Platform.OS,
      purchasesEnabled: PURCHASES_ENABLED,
      entitlementId: REVENUECAT_ENTITLEMENT_ID,
      offeringId: REVENUECAT_OFFERING_ID,
    });
    purchaseDiagnosticState.getOfferingsSucceeded = false;
    purchaseDiagnosticState.lastGetOfferingsErrorMessage = message;
    setLastRevenueCatError("get_offerings_failed", error, "Could not load Premium offers.");
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
    clearLastRevenueCatError();
    return { ok: true, data: result.customerInfo };
  } catch (error: any) {
    if (error?.userCancelled) return { ok: false, error: "Purchase cancelled." };
    console.warn("[Purchases] RevenueCat purchase failed.", {
      message: getErrorMessage(error, "Purchase could not be completed."),
      platform: Platform.OS,
      productId: pkg.product.identifier,
    });
    setLastRevenueCatError("purchase_failed", error, "Purchase could not be completed.");
    return { ok: false, error: "Purchase could not be completed right now. Please try again later." };
  }
}

export async function restorePurchases(): Promise<PurchaseResult<CustomerInfoLike>> {
  const configured = await configurePurchases();
  if (!configured.ok) return configured;

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) return loaded;

  try {
    clearLastRevenueCatError();
    return { ok: true, data: await loaded.data.restorePurchases() };
  } catch (error) {
    console.warn("[Purchases] RevenueCat restore failed.", {
      message: getErrorMessage(error, "Purchases could not be restored."),
      platform: Platform.OS,
      entitlementId: REVENUECAT_ENTITLEMENT_ID,
    });
    setLastRevenueCatError("restore_failed", error, "Purchases could not be restored.");
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

export async function getPurchaseDiagnostics(): Promise<PurchaseDiagnostics> {
  resetPurchaseDiagnosticState();
  clearLastRevenueCatError();
  const iosKey = getRevenueCatApiKey("ios").trim();
  const diagnostics: PurchaseDiagnostics = {
    platform: Platform.OS,
    purchasesEnabled: PURCHASES_ENABLED,
    purchasesModuleImportAttempted: false,
    purchasesModuleImported: false,
    purchasesModuleLoaded: false,
    purchasesModuleHasConfigure: false,
    purchasesModuleHasGetOfferings: false,
    purchasesModuleHasPurchasePackage: false,
    purchasesModuleHasRestorePurchases: false,
    iosApiKeyPresent: iosKey.length > 0,
    iosApiKeyLength: iosKey.length,
    iosApiKeyPrefix: iosKey ? iosKey.slice(0, 6) : null,
    entitlementId: REVENUECAT_ENTITLEMENT_ID,
    offeringId: REVENUECAT_OFFERING_ID,
    expectedMonthlyProductId: PRODUCT_MONTHLY,
    expectedYearlyProductId: PRODUCT_YEARLY,
    configureAttempted: false,
    configureSucceeded: false,
    getOfferingsAttempted: false,
    getOfferingsSucceeded: false,
    currentOfferingIdentifier: null,
    allOfferingIdentifiers: [],
    selectedOfferingIdentifier: null,
    selectedOfferingHasZeroPackages: false,
    availablePackageCount: 0,
    packageIdentifiers: [],
    productIdentifiers: [],
    priceStrings: [],
    packagesMissingPriceStrings: false,
    lastErrorCategory: lastRevenueCatError?.category ?? null,
    lastErrorCode: lastRevenueCatError?.code ?? null,
    lastErrorMessage: lastRevenueCatError?.message ?? null,
    lastModuleLoadErrorMessage: null,
    lastConfigureErrorMessage: null,
    lastGetOfferingsErrorMessage: null,
  };

  const configured = await configurePurchases();
  diagnostics.purchasesModuleImportAttempted = purchaseDiagnosticState.moduleImportAttempted;
  diagnostics.purchasesModuleImported = purchaseDiagnosticState.moduleImported;
  diagnostics.purchasesModuleLoaded = purchaseDiagnosticState.moduleLoaded;
  diagnostics.purchasesModuleHasConfigure = purchaseDiagnosticState.moduleHasConfigure;
  diagnostics.purchasesModuleHasGetOfferings = purchaseDiagnosticState.moduleHasGetOfferings;
  diagnostics.purchasesModuleHasPurchasePackage = purchaseDiagnosticState.moduleHasPurchasePackage;
  diagnostics.purchasesModuleHasRestorePurchases = purchaseDiagnosticState.moduleHasRestorePurchases;
  diagnostics.configureAttempted = purchaseDiagnosticState.configureAttempted;
  diagnostics.configureSucceeded = configured.ok;
  diagnostics.lastModuleLoadErrorMessage = purchaseDiagnosticState.lastModuleLoadErrorMessage;
  diagnostics.lastConfigureErrorMessage = purchaseDiagnosticState.lastConfigureErrorMessage;
  diagnostics.lastErrorCategory = lastRevenueCatError?.category ?? diagnostics.lastErrorCategory;
  diagnostics.lastErrorCode = lastRevenueCatError?.code ?? diagnostics.lastErrorCode;
  diagnostics.lastErrorMessage = lastRevenueCatError?.message ?? diagnostics.lastErrorMessage;

  if (!configured.ok) {
    return diagnostics;
  }

  const loaded = await loadPurchasesModule();
  if (!loaded.ok) {
    diagnostics.purchasesModuleImportAttempted = purchaseDiagnosticState.moduleImportAttempted;
    diagnostics.purchasesModuleImported = purchaseDiagnosticState.moduleImported;
    diagnostics.purchasesModuleLoaded = purchaseDiagnosticState.moduleLoaded;
    diagnostics.purchasesModuleHasConfigure = purchaseDiagnosticState.moduleHasConfigure;
    diagnostics.purchasesModuleHasGetOfferings = purchaseDiagnosticState.moduleHasGetOfferings;
    diagnostics.purchasesModuleHasPurchasePackage = purchaseDiagnosticState.moduleHasPurchasePackage;
    diagnostics.purchasesModuleHasRestorePurchases = purchaseDiagnosticState.moduleHasRestorePurchases;
    diagnostics.lastModuleLoadErrorMessage = purchaseDiagnosticState.lastModuleLoadErrorMessage;
    return diagnostics;
  }

  diagnostics.purchasesModuleImportAttempted = purchaseDiagnosticState.moduleImportAttempted;
  diagnostics.purchasesModuleImported = purchaseDiagnosticState.moduleImported;
  diagnostics.purchasesModuleLoaded = true;
  diagnostics.purchasesModuleHasConfigure = purchaseDiagnosticState.moduleHasConfigure;
  diagnostics.purchasesModuleHasGetOfferings = purchaseDiagnosticState.moduleHasGetOfferings;
  diagnostics.purchasesModuleHasPurchasePackage = purchaseDiagnosticState.moduleHasPurchasePackage;
  diagnostics.purchasesModuleHasRestorePurchases = purchaseDiagnosticState.moduleHasRestorePurchases;
  diagnostics.getOfferingsAttempted = true;
  try {
    const offerings = await loaded.data.getOfferings();
    purchaseDiagnosticState.getOfferingsSucceeded = true;
    purchaseDiagnosticState.lastGetOfferingsErrorMessage = null;
    diagnostics.getOfferingsSucceeded = true;
    clearLastRevenueCatError();

    const allOfferings = offerings.all ?? {};
    diagnostics.allOfferingIdentifiers = Object.keys(allOfferings);
    const currentOffering = offerings.current as any;
    diagnostics.currentOfferingIdentifier = currentOffering?.identifier ? String(currentOffering.identifier) : null;

    const selectedOffering = (allOfferings[REVENUECAT_OFFERING_ID] ?? offerings.current) as any;
    const mapped = mapOffering(selectedOffering);
    diagnostics.selectedOfferingIdentifier = mapped?.identifier ?? null;
    diagnostics.availablePackageCount = mapped?.availablePackages.length ?? 0;
    diagnostics.selectedOfferingHasZeroPackages = Boolean(mapped && diagnostics.availablePackageCount === 0);
    diagnostics.packageIdentifiers = mapped?.availablePackages.map((pkg) => pkg.identifier) ?? [];
    diagnostics.productIdentifiers = mapped?.availablePackages.map((pkg) => pkg.product.identifier) ?? [];
    diagnostics.priceStrings = (mapped?.availablePackages
      .map((pkg) => pkg.product.priceString)
      .filter((value): value is string => typeof value === "string" && value.length > 0)) ?? [];
    diagnostics.packagesMissingPriceStrings = diagnostics.availablePackageCount > 0 && diagnostics.priceStrings.length === 0;
  } catch (error) {
    const message = getErrorMessage(error, "Could not load Premium offers.");
    purchaseDiagnosticState.getOfferingsSucceeded = false;
    purchaseDiagnosticState.lastGetOfferingsErrorMessage = message;
    setLastRevenueCatError("get_offerings_failed", error, "Could not load Premium offers.");
    diagnostics.getOfferingsSucceeded = false;
    diagnostics.lastErrorCategory = lastRevenueCatError?.category ?? diagnostics.lastErrorCategory;
    diagnostics.lastErrorCode = lastRevenueCatError?.code ?? diagnostics.lastErrorCode;
    diagnostics.lastErrorMessage = lastRevenueCatError?.message ?? diagnostics.lastErrorMessage;
  }

  diagnostics.lastGetOfferingsErrorMessage = purchaseDiagnosticState.lastGetOfferingsErrorMessage;

  return diagnostics;
}
