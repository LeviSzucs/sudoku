import { useCallback, useEffect, useMemo, useState } from "react";

import {
  canUsePremiumFeature,
  planFromPremium,
  PREMIUM_ENTITLEMENT_TYPE,
  type PremiumFeatureKey,
  type PremiumPlan,
} from "@/constants/premium";
import { PURCHASES_ENABLED } from "@/constants/purchases";
import { useAuth } from "@/hooks/useAuth";
import {
  identifyPurchasesUser,
  isPremiumActive,
  resetPurchasesUser,
  subscribeToCustomerInfoUpdates,
  type CustomerInfoLike,
} from "@/lib/purchases";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type EntitlementStatus = "active" | "inactive" | "expired" | "trialing";

interface EntitlementRow {
  entitlement_type: string;
  status: EntitlementStatus;
  source: string | null;
  expires_at: string | null;
}

export interface PremiumStatus {
  plan: PremiumPlan;
  isPremium: boolean;
  isLoading: boolean;
  entitlementStatus: EntitlementStatus | null;
  source: string | null;
  expiresAt: string | null;
  paymentSystemImplemented: boolean;
  purchaseStatus: "unavailable" | "available" | "premium";
  purchaseError: string | null;
  canUseFeature: (feature: PremiumFeatureKey) => boolean;
  refresh: () => Promise<void>;
}

function entitlementIsActive(row: EntitlementRow | null): boolean {
  if (!row) return false;
  if (row.status !== "active" && row.status !== "trialing") return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

export function usePremiumStatus(): PremiumStatus {
  const auth = useAuth();
  const [row, setRow] = useState<EntitlementRow | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfoLike | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (!auth.user) {
      setRow(null);
      setCustomerInfo(null);
      setPurchaseError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("user_entitlements")
          .select("entitlement_type,status,source,expires_at")
          .eq("user_id", auth.user.id)
          .eq("entitlement_type", PREMIUM_ENTITLEMENT_TYPE)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setRow(error ? null : (data as EntitlementRow | null));
      } else {
        setRow(null);
      }

      const identified = await identifyPurchasesUser(auth.user.id);
      if (identified.ok) {
        setCustomerInfo(identified.data);
        setPurchaseError(null);
      } else {
        setCustomerInfo(null);
        setPurchaseError(identified.error);
      }
    } catch {
      setRow(null);
      setCustomerInfo(null);
      setPurchaseError("Could not load Premium status.");
    } finally {
      setIsLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function load(): Promise<void> {
      await refresh();
      if (!active || !auth.user) return;
      unsubscribe = await subscribeToCustomerInfoUpdates((nextInfo) => {
        if (active) {
          setCustomerInfo(nextInfo);
          setPurchaseError(null);
        }
      });
    }

    void load();

    return () => {
      active = false;
      unsubscribe?.();
      if (!auth.user) void resetPurchasesUser();
    };
  }, [auth.user, refresh]);

  useEffect(() => {
    if (!auth.user) void resetPurchasesUser();
  }, [auth.user]);

  const revenueCatPremium = isPremiumActive(customerInfo);
  const isPremium = entitlementIsActive(row) || revenueCatPremium;
  const plan = planFromPremium(isPremium);
  const canUseFeature = useCallback((feature: PremiumFeatureKey) => {
    return canUsePremiumFeature(plan, feature);
  }, [plan]);
  const purchaseStatus: PremiumStatus["purchaseStatus"] = revenueCatPremium
    ? "premium"
    : purchaseError
      ? "unavailable"
      : "available";

  return useMemo(() => ({
    plan,
    isPremium,
    isLoading,
    entitlementStatus: revenueCatPremium ? "active" : row?.status ?? null,
    source: revenueCatPremium ? "revenuecat" : row?.source ?? null,
    expiresAt: row?.expires_at ?? null,
    paymentSystemImplemented: PURCHASES_ENABLED,
    purchaseStatus,
    purchaseError,
    canUseFeature,
    refresh,
  }), [canUseFeature, isLoading, isPremium, plan, purchaseError, purchaseStatus, refresh, revenueCatPremium, row?.expires_at, row?.source, row?.status]);
}
