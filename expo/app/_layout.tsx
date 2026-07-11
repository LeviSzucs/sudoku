import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Share } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppErrorBoundary from "@/components/AppErrorBoundary";
import ForegroundNotificationToast from "@/components/ForegroundNotificationToast";
import RankedSeasonMoments from "@/components/RankedSeasonMoments";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PlayerProfileProvider, usePlayerProfile, type RankedSeasonInfo, type RankedSeasonRecap } from "@/hooks/usePlayerProfile";
import { loadAppPreferences } from "@/lib/appPreferences";
import {
  configureNotificationRuntime,
  getLastNotificationResponsePayload,
  markNotificationRead,
  subscribeToNotificationEvents,
  subscribeToNotificationResponses,
  syncPushTokenOnLogin,
  type AppNotification,
} from "@/lib/notifications";
import { parseNotificationDeepLink } from "@/lib/notificationNavigation";
import { flushPendingRuntimeErrorReports, installGlobalErrorHandlers, setRuntimeErrorContext } from "@/lib/runtimeErrors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function NotificationRuntimeBridge({ enabled, userId, currentPath }: { enabled: boolean; userId: string | null; currentPath: string }) {
  const [queue, setQueue] = useState<AppNotification[]>([]);
  const seenToastIdsRef = useRef<Set<string>>(new Set());
  const lastOpenedResponseRef = useRef<string | null>(null);
  const currentToast = queue[0] ?? null;

  const dismissToast = useCallback((notificationId: string) => {
    setQueue((current) => current.filter((item) => item.notification_id !== notificationId));
  }, []);

  const openDeepLink = useCallback(async (deepLink: string | null, notificationId?: string | null) => {
    const target = parseNotificationDeepLink(deepLink);
    if (!target.ok) {
      console.info("[Notifications] Ignored notification navigation.", {
        notificationId: notificationId ?? null,
        reason: target.reason,
        hasDeepLink: Boolean(deepLink),
      });
      return;
    }

    if (target.normalisedPath === currentPath) {
      console.info("[Notifications] Ignored notification navigation to current screen.", {
        notificationId: notificationId ?? null,
        path: target.normalisedPath,
      });
      return;
    }

    try {
      router.push(target.href);
    } catch (error) {
      console.warn("[Notifications] Notification navigation failed.", {
        notificationId: notificationId ?? null,
        path: target.normalisedPath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [currentPath]);

  const openToast = useCallback(async (notification: AppNotification) => {
    dismissToast(notification.notification_id);
    if (!notification.read_at) {
      const result = await markNotificationRead(notification.notification_id);
      if (!result.ok) {
        console.info("[Notifications] Could not mark foreground notification as read.", {
          notificationId: notification.notification_id,
          message: result.error,
        });
      }
    }
    await openDeepLink(notification.deep_link, notification.notification_id);
  }, [dismissToast, openDeepLink]);

  useEffect(() => {
    if (!enabled) {
      setQueue([]);
      return;
    }
    void configureNotificationRuntime();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    return subscribeToNotificationEvents(userId, ({ eventType, notification }) => {
      if (eventType !== "INSERT") return;
      if (notification.read_at) return;
      if (currentPath === "/settings-notifications") return;
      if (seenToastIdsRef.current.has(notification.notification_id)) return;
      seenToastIdsRef.current.add(notification.notification_id);
      setQueue((current) => current.some((item) => item.notification_id === notification.notification_id)
        ? current
        : [...current, notification]);
    }, { source: "foreground-toast" });
  }, [currentPath, enabled, userId]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let removeResponseListener: (() => void) | undefined;

    void (async () => {
      const initial = await getLastNotificationResponsePayload();
      if (!cancelled && initial?.deepLink) {
        const responseKey = `${initial.notificationId ?? "none"}:${initial.deepLink}`;
        if (lastOpenedResponseRef.current !== responseKey) {
          lastOpenedResponseRef.current = responseKey;
          await openDeepLink(initial.deepLink, initial.notificationId);
        }
      }

      removeResponseListener = await subscribeToNotificationResponses(async (payload) => {
        if (!payload.deepLink) return;
        const responseKey = `${payload.notificationId ?? "none"}:${payload.deepLink}`;
        if (lastOpenedResponseRef.current === responseKey) return;
        lastOpenedResponseRef.current = responseKey;
        await openDeepLink(payload.deepLink, payload.notificationId);
      });
    })();

    return () => {
      cancelled = true;
      removeResponseListener?.();
    };
  }, [enabled, openDeepLink]);

  useEffect(() => {
    if (!currentToast) return undefined;
    const timeout = setTimeout(() => {
      dismissToast(currentToast.notification_id);
    }, 4500);
    return () => clearTimeout(timeout);
  }, [currentToast, dismissToast]);

  if (!enabled || !currentToast) return null;

  return (
    <ForegroundNotificationToast
      title={currentToast.title}
      body={currentToast.body}
      onPress={() => { void openToast(currentToast); }}
    />
  );
}

function buildRankedSeasonShareMessage(recap: RankedSeasonRecap): string {
  const matchesPlayed = recap.matches_played ?? 0;
  const wins = recap.wins ?? 0;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
  const rankSuffix = recap.final_rank_position ? `, finished #${recap.final_rank_position}` : "";
  return `I wrapped up ${recap.season_name} in SudoDuel at ${recap.final_tier ?? "Unranked"} with ${recap.final_rp.toLocaleString()} RP, a ${wins}-${recap.losses}-${recap.draws} record, and a ${winRate}% win rate${rankSuffix}. Play SudoDuel.`;
}

function RankedSeasonRuntimeBridge({ enabled, userId }: { enabled: boolean; userId: string | null }) {
  const {
    fetchCurrentRankedSeasonInfo,
    fetchLatestUnseenRankedSeasonRecap,
    markRankedSeasonRecapViewed,
  } = usePlayerProfile();
  const [phase, setPhase] = useState<"hidden" | "recap" | "intro">("hidden");
  const [recap, setRecap] = useState<RankedSeasonRecap | null>(null);
  const [currentSeason, setCurrentSeason] = useState<RankedSeasonInfo | null>(null);
  const bootstrapKeyRef = useRef<string | null>(null);
  const handledRecapIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !userId) {
      setPhase("hidden");
      setRecap(null);
      setCurrentSeason(null);
      bootstrapKeyRef.current = null;
      return;
    }

    const bootstrapKey = `${userId}:season-recap`;
    if (bootstrapKeyRef.current === bootstrapKey) return;
    bootstrapKeyRef.current = bootstrapKey;

    let cancelled = false;
    const startedAt = Date.now();

    void (async () => {
      console.info("[RankedSeasonRecap] Checking for unseen season recap.", {
        userId,
        bootstrapKey,
      });
      const nextRecap = await fetchLatestUnseenRankedSeasonRecap();
      if (cancelled) return;
      console.info("[RankedSeasonRecap] Recap lookup finished.", {
        userId,
        bootstrapKey,
        elapsedMs: Date.now() - startedAt,
        seasonId: nextRecap?.season_id ?? null,
      });
      if (!nextRecap || handledRecapIdsRef.current.has(nextRecap.season_id)) {
        setPhase("hidden");
        return;
      }
      setRecap(nextRecap);
      setPhase("recap");
    })().catch((error) => {
      console.warn("[RankedSeasonRecap] Failed to load recap state.", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      if (!cancelled) setPhase("hidden");
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, fetchLatestUnseenRankedSeasonRecap, userId]);

  const handleShare = useCallback(() => {
    if (!recap) return;
    void Share.share({ message: buildRankedSeasonShareMessage(recap) }).catch(() => {
      console.info("[RankedSeasonRecap] Share unavailable for ranked season recap.");
    });
  }, [recap]);

  const handleContinue = useCallback(async () => {
    if (!recap) {
      setPhase("hidden");
      return;
    }

    handledRecapIdsRef.current.add(recap.season_id);
    const markViewed = await markRankedSeasonRecapViewed(recap.season_id);
    if (!markViewed.ok) {
      console.info("[RankedSeasonRecap] Could not mark recap as viewed.", {
        seasonId: recap.season_id,
        error: markViewed.error ?? null,
      });
    }

    const seasonInfo = await fetchCurrentRankedSeasonInfo();
    if (seasonInfo) {
      setCurrentSeason(seasonInfo);
      setPhase("intro");
      return;
    }

    setRecap(null);
    setCurrentSeason(null);
    setPhase("hidden");
  }, [fetchCurrentRankedSeasonInfo, markRankedSeasonRecapViewed, recap]);

  const handleClose = useCallback(() => {
    setPhase("hidden");
    setRecap(null);
    setCurrentSeason(null);
  }, []);

  const handlePlayRanked = useCallback(() => {
    handleClose();
    router.push("/(tabs)/versus");
  }, [handleClose]);

  if (!enabled || phase === "hidden") return null;

  return (
    <RankedSeasonMoments
      visible
      phase={phase === "intro" ? "intro" : "recap"}
      recap={recap}
      currentSeason={currentSeason}
      onContinue={() => { void handleContinue(); }}
      onPlayRanked={handlePlayRanked}
      onShare={phase === "recap" ? handleShare : undefined}
      onClose={handleClose}
    />
  );
}

function RootLayoutNav() {
  const auth = useAuth();
  const { isLoaded, profileSetupRequired } = usePlayerProfile();
  const pathname = usePathname();
  const isCheckingProfile = auth.mode === "signed_in" && !isLoaded;
  const showLoading = auth.mode === "loading" || isCheckingProfile;
  const showAuth = auth.mode === "signed_out";
  const showSetup = auth.mode === "signed_in" && isLoaded && profileSetupRequired;
  const showApp = auth.mode === "signed_in" && isLoaded && !profileSetupRequired;

  useEffect(() => {
    if (!auth.user?.id || !showApp) return;
    void syncPushTokenOnLogin(auth.user.id);
    void loadAppPreferences(auth.user.id);
    void flushPendingRuntimeErrorReports(auth.user.id);
  }, [auth.user?.id, showApp]);

  useEffect(() => {
    setRuntimeErrorContext({ userId: auth.user?.id ?? null });
  }, [auth.user?.id]);

  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Protected guard={showLoading}>
          <Stack.Screen name="loading" options={{ headerShown: false, animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={showAuth}>
          <Stack.Screen name="auth" options={{ headerShown: false, animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={showSetup}>
          <Stack.Screen name="username-setup" options={{ headerShown: false, animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={showApp}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="game" options={{ headerShown: false, animation: "fade" }} />
          <Stack.Screen name="achievements" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="friends" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="friend-h2h" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="player/[id]" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="results" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="settings" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="settings-delete-account" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="settings-feedback" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="settings-info" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="settings-notifications" options={{ headerShown: false, presentation: "card" }} />
        </Stack.Protected>
      </Stack>
      <NotificationRuntimeBridge enabled={showApp} userId={auth.user?.id ?? null} currentPath={pathname} />
      <RankedSeasonRuntimeBridge enabled={showApp} userId={auth.user?.id ?? null} />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    installGlobalErrorHandlers();
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProfileProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StatusBar style="dark" />
              <AppErrorBoundary>
                <RootLayoutNav />
              </AppErrorBoundary>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </PlayerProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
