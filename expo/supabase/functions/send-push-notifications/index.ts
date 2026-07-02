import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type PendingDelivery = {
  notification_id: string;
  token_id: string;
  user_id: string;
  expo_push_token: string;
  type: string;
  title: string;
  body: string;
  deep_link: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
};

type ExpoTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type DeliveryStatus = "sending" | "sent" | "failed" | "skipped";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function authIsAllowed(request: Request): boolean {
  const secret = Deno.env.get("PUSH_DELIVERY_SECRET");
  if (!secret) return true;

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

function clampLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(1, Math.min(Math.trunc(parsed), 500));
}

function isDeviceNotRegistered(ticket: ExpoTicket): boolean {
  return ticket.details?.error === "DeviceNotRegistered";
}

function errorMessage(ticket: ExpoTicket): string {
  return ticket.message ?? ticket.details?.error ?? "Expo push delivery failed.";
}

function tokenPreview(token: string): string {
  return token.length <= 24 ? token : `${token.slice(0, 24)}...`;
}

function createExpoMessage(row: PendingDelivery) {
  return {
    to: row.expo_push_token,
    title: row.title,
    body: row.body,
    sound: "default",
    priority: "high",
    data: {
      notification_id: row.notification_id,
      type: row.type,
      deep_link: row.deep_link,
      related_entity_type: row.related_entity_type,
      related_entity_id: row.related_entity_id,
    },
  };
}

async function parseFailedExpoResponse(response: Response) {
  const text = await response.text().catch(() => "");

  try {
    const payload = JSON.parse(text) as {
      errors?: Array<{ code?: string; message?: string }>;
      data?: ExpoTicket[];
    };
    const firstError = Array.isArray(payload.errors) ? payload.errors[0] : undefined;
    const firstTicket = Array.isArray(payload.data) ? payload.data[0] : undefined;
    return {
      text,
      code: firstError?.code ?? firstTicket?.details?.error ?? undefined,
      message: firstError?.message ?? firstTicket?.message ?? undefined,
    };
  } catch {
    return { text, code: undefined, message: undefined };
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  if (!authIsAllowed(request)) {
    return jsonResponse(401, { error: "Unauthorised." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Push delivery is not configured." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        "x-application-name": "sudoduel-push-delivery",
      },
    },
  });

  let limit = 100;
  try {
    const body = await request.json().catch(() => ({}));
    limit = clampLimit(body?.limit);
  } catch {
    limit = 100;
  }

  const { data: pendingRows, error: pendingError } = await supabase.rpc(
    "reserve_pending_push_notification_deliveries",
    { p_limit: limit },
  );

  if (pendingError) {
    console.error("[PushDelivery] Could not load pending notifications.", pendingError);
    return jsonResponse(500, { error: "Could not load pending notifications." });
  }

  const rows = (pendingRows ?? []) as PendingDelivery[];
  if (rows.length === 0) {
    return jsonResponse(200, { processed: 0, sent: 0, failed: 0, deactivatedTokens: 0 });
  }

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  let sent = 0;
  let failed = 0;
  let deactivatedTokens = 0;

  for (const row of rows) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(expoAccessToken ? { authorization: `Bearer ${expoAccessToken}` } : {}),
      },
      body: JSON.stringify(createExpoMessage(row)),
    });

    if (!response.ok) {
      const parsed = await parseFailedExpoResponse(response);
      const mixedProjects = parsed.code === "PUSH_TOO_MANY_EXPERIENCE_IDS"
        || parsed.message?.includes("same project")
        || parsed.text.includes("PUSH_TOO_MANY_EXPERIENCE_IDS");
      const message = [
        `Expo push API returned ${response.status}`,
        parsed.code ? `code=${parsed.code}` : null,
        parsed.message ? `message=${parsed.message}` : null,
        mixedProjects ? "Likely mixed Expo project tokens remain active." : null,
      ].filter(Boolean).join(" | ");
      console.error("[PushDelivery] HTTP failure.", {
        notificationId: row.notification_id,
        tokenId: row.token_id,
        tokenPreview: tokenPreview(row.expo_push_token),
        type: row.type,
        message,
      });

      failed += 1;
      await updateDelivery(supabase, row, {
        status: "failed",
        error_message: message,
        provider_message_id: null,
      });
      continue;
    }

    const payload = await response.json().catch(() => null);
    const ticket = Array.isArray(payload?.data)
      ? payload.data[0] as ExpoTicket | undefined
      : (payload?.data as ExpoTicket | undefined);

    if (!ticket) {
      failed += 1;
      await updateDelivery(supabase, row, {
        status: "failed",
        error_message: "Expo did not return a delivery ticket.",
        provider_message_id: null,
      });
      continue;
    }

    if (ticket.status === "ok") {
      sent += 1;
      await updateDelivery(supabase, row, {
        status: "sent",
        error_message: null,
        provider_message_id: ticket.id ?? null,
      });
      continue;
    }

    failed += 1;
    if (isDeviceNotRegistered(ticket)) {
      deactivatedTokens += 1;
      const { error } = await supabase
        .from("push_tokens")
        .update({ is_active: false, last_seen_at: new Date().toISOString() })
        .eq("token_id", row.token_id);
      if (error) console.warn("[PushDelivery] Could not deactivate push token.", error);
    }

    console.warn("[PushDelivery] Expo ticket failure.", {
      notificationId: row.notification_id,
      tokenId: row.token_id,
      tokenPreview: tokenPreview(row.expo_push_token),
      type: row.type,
      error: errorMessage(ticket),
      code: ticket.details?.error ?? null,
    });

    await updateDelivery(supabase, row, {
      status: "failed",
      error_message: errorMessage(ticket),
      provider_message_id: ticket.id ?? null,
    });
  }

  return jsonResponse(200, {
    processed: rows.length,
    sent,
    failed,
    deactivatedTokens,
  });
});

async function updateDelivery(
  supabase: ReturnType<typeof createClient>,
  row: PendingDelivery,
  updates: {
    status: DeliveryStatus;
    provider_message_id: string | null;
    error_message: string | null;
  },
) {
  const { error } = await supabase
    .from("push_notification_deliveries")
    .update({
      status: updates.status,
      provider_message_id: updates.provider_message_id,
      error_message: updates.error_message,
      attempted_at: new Date().toISOString(),
    })
    .eq("notification_id", row.notification_id)
    .eq("token_id", row.token_id);

  if (error) {
    console.error("[PushDelivery] Could not update delivery row.", {
      notification_id: row.notification_id,
      token_id: row.token_id,
      message: error.message,
    });
  }
}
