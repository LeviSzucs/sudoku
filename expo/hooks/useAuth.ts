import createContextHook from "@nkzw/create-context-hook";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase, isSupabaseConfigured, supabaseConfigurationError } from "@/lib/supabase";

export type AuthMode = "loading" | "guest" | "signed_in" | "signed_out";
export type SocialAuthProvider = "apple" | "google";

WebBrowser.maybeCompleteAuthSession();

const AUTH_REDIRECT_PATH = "auth";
const AUTH_REDIRECT_URL = makeRedirectUri({
  scheme: "sudoduel",
  path: AUTH_REDIRECT_PATH,
});

function authUrlError(url: string): string | null {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  const errorMessage = typeof params.error_description === "string"
    ? params.error_description
    : typeof params.error === "string"
      ? params.error
      : null;

  if (errorCode) return errorMessage ?? errorCode;
  if (typeof params.error === "string") return errorMessage ?? params.error;
  return null;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AuthMode>("loading");
  const [authError, setAuthError] = useState<string | null>(null);

  const restoreSessionFromUrl = useCallback(async (url: string | null | undefined): Promise<{ ok: boolean; handled: boolean; error?: string }> => {
    if (!url || !isSupabaseConfigured) return { ok: false, handled: false };
    const { params } = QueryParams.getQueryParams(url);
    const accessToken = typeof params.access_token === "string" ? params.access_token : null;
    const refreshToken = typeof params.refresh_token === "string" ? params.refresh_token : null;

    if (!accessToken || !refreshToken) {
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

  const signInWithProvider = useCallback(async (provider: SocialAuthProvider): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> => {
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
