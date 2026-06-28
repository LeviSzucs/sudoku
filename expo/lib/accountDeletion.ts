import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface DeleteAccountResult {
  ok: boolean;
  error?: string;
}

interface DeleteAccountResponse {
  success?: boolean;
  message?: string;
}

function fallbackDeleteError(): string {
  return "We could not delete this account right now. Please try again later or contact support.";
}

export async function deleteCurrentAccount(): Promise<DeleteAccountResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "Account deletion is unavailable in this build." };
  }

  try {
    const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>("delete-account", {
      body: {},
    });

    if (error) {
      return { ok: false, error: error.message || fallbackDeleteError() };
    }

    if (!data?.success) {
      return { ok: false, error: data?.message || fallbackDeleteError() };
    }

    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : fallbackDeleteError(),
    };
  }
}
