import createContextHook from "@nkzw/create-context-hook";
import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { supabase, isSupabaseConfigured, supabaseConfigurationError } from "@/lib/supabase";

export type AuthMode = "loading" | "guest" | "signed_in" | "signed_out";
export type SocialAuthProvider = "apple" | "google";

const AUTH_REDIRECT_URL = "sudoduel://auth";

type AuthUrlParams = {
  access_token?: string;
  refresh_token?: string;
  code?: string;
  error?: string;
  error_description?: string;
};

function parseAuthUrl(url: string): AuthUrlParams {
  try {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    const hashParams = new URLSearchParams(parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash);
    const merged = new Map<string, string>();

    params.forEach((value, key) => {
      merged.set(key, value);
    });
    hashParams.forEach((value, key) => {
      merged.set(key, value);
    });

    return {
      access_token: merged.get("access_token") ?? undefined,
      refresh_token: merged.get("refresh_token") ?? undefined,
      code: merged.get("code") ?? undefined,
      error: merged.get("error") ?? undefined,
      error_description: merged.get("error_description") ?? undefined,
    };
  } catch {
    return {};
  }
}

function authUrlError(url: string): string | null {
  const params = parseAuthUrl(url);
  return params.error_description ?? params.error ?? null;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AuthMode>("loading");
  const [authError, setAuthError] = useState<string | null>(null);

  const restoreSessionFromUrl = useCallback(async (url: string | null | undefined): Promise<{ ok: boolean; handled: boolean; error?: string }> => {
    if (!url || !isSupabaseConfigured) return { ok: false, handled: false };
    const params = parseAuthUrl(url);
    const accessToken = typeof params.access_token === "string" ? params.access_token : null;
    const refreshToken = typeof params.refresh_token === "string" ? params.refresh_token : null;
    const authCode = typeof params.code === "string" ? params.code : null;

    if (!accessToken || !refreshToken) {
      if (authCode) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) {
          setAuthError(error.message);
          return { ok: false, handled: true, error: error.message };
        }

        setSession(data.session);
        setMode(data.session ? "signed_in" : "signed_out");
        setAuthError(null);
        return { ok: true, handled: true };
      }
      const message = authUrlError(url);
      return message ? { ok: false, handled: true, error: message } : { ok: false, handled: false };
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      setAuthError(error.message);
      return { ok: false, handled: true, error: error.message };
    }

    setSession(data.session);
    setMode(data.session ? "signed_in" : "signed_out");
    setAuthError(null);
    return { ok: true, handled: true };
  }, []);

  useEffect(() => {
    let active = true;

    async function restore(): Promise<void> {
      if (!isSupabaseConfigured) {
        if (active) setMode("signed_out");
        return;
      }
      const initialUrl = await Linking.getInitialURL();
      const restoredFromUrl = await restoreSessionFromUrl(initialUrl);
      if (!active) return;
      if (!restoredFromUrl.ok && restoredFromUrl.error) {
        setAuthError(restoredFromUrl.error);
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setMode(data.session ? "signed_in" : "signed_out");
    }

    void restore().catch(() => {
      if (active) setMode("signed_out");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setMode(nextSession ? "signed_in" : "signed_out");
    });

    const urlSubscription = Linking.addEventListener("url", ({ url }) => {
      void restoreSessionFromUrl(url).then((result) => {
        if (!result.ok && result.error) setAuthError(result.error);
      });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, [restoreSessionFromUrl]);

  const signUp = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    setAuthError(null);
    if (!isSupabaseConfigured) return { ok: false, error: supabaseConfigurationError ?? "Supabase is not configured yet." };
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setAuthError(error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    setAuthError(null);
    if (!isSupabaseConfigured) return { ok: false, error: supabaseConfigurationError ?? "Supabase is not configured yet." };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setAuthError(error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const signInWithOAuthBrowser = useCallback(async (provider: SocialAuthProvider): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> => {
    setAuthError(null);
    if (!isSupabaseConfigured) return { ok: false, error: supabaseConfigurationError ?? "Supabase is not configured yet." };

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: AUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
        queryParams: provider === "google"
          ? {
            access_type: "offline",
            prompt: "select_account",
          }
          : undefined,
      },
    });

    if (error) {
      setAuthError(error.message);
      return { ok: false, error: error.message };
    }

    if (!data?.url) {
      return { ok: false, error: "Could not start sign-in right now." };
    }

    const WebBrowser = await import("expo-web-browser");
    const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT_URL);

    if (result.type === "cancel" || result.type === "dismiss") {
      return { ok: false, cancelled: true, error: "Sign-in was cancelled." };
    }

    if (result.type !== "success") {
      return { ok: false, error: "Could not complete sign-in right now." };
    }

    const restored = await restoreSessionFromUrl(result.url);
    if (!restored.ok) {
      const message = restored.error ?? "Could not complete sign-in right now.";
      setAuthError(message);
      return { ok: false, error: message };
    }

    return { ok: true };
  }, [restoreSessionFromUrl]);

  const signInWithAppleNative = useCallback(async (): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> => {
    setAuthError(null);
    if (!isSupabaseConfigured) return { ok: false, error: supabaseConfigurationError ?? "Supabase is not configured yet." };

    const AppleAuthentication = await import("expo-apple-authentication");
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return signInWithOAuthBrowser("apple");
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        const message = "Could not verify your Apple sign-in right now.";
        setAuthError(message);
        return { ok: false, error: message };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: credential.nonce ?? undefined,
        access_token: credential.authorizationCode ?? undefined,
      });

      if (error) {
        setAuthError(error.message);
        return { ok: false, error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setMode("signed_in");
      }
      setAuthError(null);
      return { ok: true };
    } catch (error: unknown) {
      const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
      if (code === "ERR_REQUEST_CANCELED") {
        return { ok: false, cancelled: true, error: "Sign-in was cancelled." };
      }

      const message = error instanceof Error ? error.message : "Could not complete Apple sign-in right now.";
      setAuthError(message);
      return { ok: false, error: message };
    }
  }, [setMode, setSession, signInWithOAuthBrowser]);

  const signInWithProvider = useCallback(async (provider: SocialAuthProvider): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> => {
    if (provider === "apple" && Platform.OS === "ios") {
      return signInWithAppleNative();
    }
    return signInWithOAuthBrowser(provider);
  }, [signInWithAppleNative, signInWithOAuthBrowser]);

  const signOut = useCallback(async (): Promise<void> => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setSession(null);
    setMode("signed_out");
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ ok: boolean; error?: string }> => {
    setAuthError(null);
    if (!isSupabaseConfigured) return { ok: false, error: supabaseConfigurationError ?? "Supabase is not configured yet." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL("/auth", { queryParams: { step: "reset_update" } }),
    });
    if (error) {
      setAuthError(error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<{ ok: boolean; error?: string }> => {
    setAuthError(null);
    if (!isSupabaseConfigured) return { ok: false, error: supabaseConfigurationError ?? "Supabase is not configured yet." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setAuthError(error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const user: User | null = session?.user ?? null;
  const isGuest = mode === "guest";
  const isSignedIn = mode === "signed_in";

  return useMemo(() => ({
    session,
    user,
    mode,
    isGuest,
    isSignedIn,
    authError,
    authRedirectUrl: AUTH_REDIRECT_URL,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
  }), [authError, isGuest, isSignedIn, mode, resetPassword, session, signIn, signInWithProvider, signOut, signUp, updatePassword, user]);
});
