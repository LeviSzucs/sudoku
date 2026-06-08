import { useCallback, useEffect, useMemo, useState } from "react";

import { PAYMENT_SYSTEM_IMPLEMENTED, PREMIUM_ENTITLEMENT_TYPE, type PremiumFeatureKey } from "@/constants/premium";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type PremiumPlan = "free" | "premium";
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
  canUseFeature: (feature: PremiumFeatureKey) => boolean;
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadEntitlement(): Promise<void> {
      if (!auth.user || !isSupabaseConfigured) {
        setRow(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_entitlements")
          .select("entitlement_type,status,source,expires_at")
          .eq("user_id", auth.user.id)
          .eq("entitlement_type", PREMIUM_ENTITLEMENT_TYPE)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!active) return;
        setRow(error ? null : (data as EntitlementRow | null));
      } catch {
        if (active) setRow(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadEntitlement();
    return () => {
      active = false;
    };
  }, [auth.user]);

  const isPremium = entitlementIsActive(row);
  const canUseFeature = useCallback((_feature: PremiumFeatureKey) => {
    return isPremium;
  }, [isPremium]);

  return useMemo(() => ({
    plan: isPremium ? "premium" : "free",
    isPremium,
    isLoading,
    entitlementStatus: row?.status ?? null,
    source: row?.source ?? null,
    expiresAt: row?.expires_at ?? null,
    paymentSystemImplemented: PAYMENT_SYSTEM_IMPLEMENTED,
    canUseFeature,
  }), [canUseFeature, isLoading, isPremium, row?.expires_at, row?.source, row?.status]);
}
