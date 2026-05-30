import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase, isSupabaseConfigured, supabaseConfigurationError } from "@/lib/supabase";

const GUEST_MODE_KEY = "sudoku.guest_mode.v1";

export type AuthMode = "loading" | "guest" | "signed_in" | "signed_out";

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AuthMode>("loading");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restore(): Promise<void> {
      const guest = await AsyncStorage.getItem(GUEST_MODE_KEY);
      if (!isSupabaseConfigured) {
        if (active) setMode(guest === "true" ? "guest" : "signed_out");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setMode(data.session ? "signed_in" : guest === "true" ? "guest" : "signed_out");
    }

    void restore().catch(() => {
      if (active) setMode("signed_out");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setMode(nextSession ? "signed_in" : "signed_out");
      if (nextSession) void AsyncStorage.removeItem(GUEST_MODE_KEY);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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

  const continueAsGuest = useCallback(async (): Promise<void> => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, "true");
    setSession(null);
    setMode("guest");
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setSession(null);
    setMode("signed_out");
  }, []);

  const user: User | null = session?.user ?? null;
  const isGuest = mode === "guest";
  const isSignedIn = mode === "signed_in";

  return useMemo(() => ({ session, user, mode, isGuest, isSignedIn, authError, signUp, signIn, continueAsGuest, signOut }), [authError, continueAsGuest, isGuest, isSignedIn, mode, session, signIn, signOut, signUp, user]);
});
