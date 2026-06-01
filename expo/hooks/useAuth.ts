import createContextHook from "@nkzw/create-context-hook";
import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase, isSupabaseConfigured, supabaseConfigurationError } from "@/lib/supabase";

export type AuthMode = "loading" | "guest" | "signed_in" | "signed_out";

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AuthMode>("loading");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restore(): Promise<void> {
      if (!isSupabaseConfigured) {
        if (active) setMode("signed_out");
        return;
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

  const signOut = useCallback(async (): Promise<void> => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setSession(null);
    setMode("signed_out");
  }, []);

  const user: User | null = session?.user ?? null;
  const isGuest = mode === "guest";
  const isSignedIn = mode === "signed_in";

  return useMemo(() => ({ session, user, mode, isGuest, isSignedIn, authError, signUp, signIn, signOut }), [authError, isGuest, isSignedIn, mode, session, signIn, signOut, signUp, user]);
});
