import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface DeleteAccountResult {
  ok: boolean;
  error?: string;
}

interface DeleteAccountResponse {
  success?: boolean;
  code?: string;
  message?: string;
  requestId?: string;
}

function fallbackDeleteError(): string {
  return "We could not delete this account right now. Please try again later or contact support.";
}

function friendlyDeleteError(payload?: DeleteAccountResponse): string {
  const reference = payload?.requestId ? ` Reference: ${payload.requestId.slice(0, 8)}.` : "";
  switch (payload?.code) {
    case "DELETE_ACCOUNT_AUTH_REQUIRED":
      return "Please sign in again, then try deleting your account once more.";
    case "DELETE_ACCOUNT_REVOKE_FAILED":
      return `We could not finish removing this sign-in right now. Please try again shortly or contact support.${reference}`;
    case "DELETE_ACCOUNT_DATA_CLEANUP_FAILED":
      return `We could not finish deleting this account right now. Please try again shortly.${reference}`;
    default:
      return payload?.message?.trim() ? `${payload.message.trim()}${reference}` : fallbackDeleteError();
  }
}

async function extractFunctionErrorPayload(error: unknown): Promise<DeleteAccountResponse | undefined> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof context !== "object" || !("json" in context)) return undefined;

  const response = context as Response;
  if (typeof response.clone !== "function" || typeof response.json !== "function") return undefined;

  try {
    return await response.clone().json() as DeleteAccountResponse;
  } catch {
    return undefined;
  }
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
      const payload = await extractFunctionErrorPayload(error);
      return { ok: false, error: friendlyDeleteError(payload) };
    }

    if (!data?.success) {
      return { ok: false, error: friendlyDeleteError(data) };
    }

    return { ok: true };
  } catch (error: unknown) {
    const payload = await extractFunctionErrorPayload(error);
    return {
      ok: false,
      error: payload ? friendlyDeleteError(payload) : error instanceof Error ? error.message : fallbackDeleteError(),
    };
  }
}
