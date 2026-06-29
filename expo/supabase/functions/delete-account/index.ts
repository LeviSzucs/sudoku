import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DELETED_USERNAME = "Deleted Player";
const DELETED_INITIALS = "DEL";
const DELETED_AVATAR_COLOUR = "#A8A294";
const DELETED_HAIR_COLOUR = "#6E432D";
const DELETED_TOP_COLOUR = "#6B7280";
const ACCOUNT_BAN_DURATION = "876000h";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function deletedEmailForUser(userId: string): string {
  return `deleted+${userId}@deleted.sudoduel.app`;
}

function deletedPassword(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

function deletedUsernameHandle(userId: string): string {
  return `deleted_${userId.replace(/-/g, "").slice(0, 18)}`;
}

function deletedUsernameValue(userId: string): string {
  return deletedUsernameHandle(userId);
}

async function requireAuthenticatedUser(
  supabase: ReturnType<typeof createClient>,
  request: Request,
) {
  const token = getBearerToken(request);
  if (!token) {
    return { user: null, error: "Authentication required." };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: "Could not verify the signed-in user." };
  }

  return { user: data.user, error: null };
}

function userProviders(user: { app_metadata?: Record<string, unknown>; identities?: Array<{ provider?: string | null }> | null }) {
  const providerSet = new Set<string>();
  const primaryProvider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : null;
  if (primaryProvider) providerSet.add(primaryProvider);

  const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
  for (const provider of providers) {
    if (typeof provider === "string" && provider.trim()) providerSet.add(provider);
  }

  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const identity of identities) {
    if (typeof identity?.provider === "string" && identity.provider.trim()) providerSet.add(identity.provider);
  }

  return [...providerSet];
}

async function cancelActiveFriendChallenges(supabase: ReturnType<typeof createClient>, userId: string) {
  const { error } = await supabase
    .from("friend_challenges")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .in("status", ["pending", "accepted", "challenger_completed", "challenged_completed"]);

  if (error) throw new Error(`Could not cancel active Friend Challenges: ${error.message}`);
}

async function cancelActiveDailyDuels(supabase: ReturnType<typeof createClient>, userId: string) {
  const { error } = await supabase
    .from("daily_duels")
    .update({
      status: "cancelled",
      winner_user_id: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .in("status", ["waiting_for_opponent", "matched", "player_a_completed", "player_b_completed", "expired"]);

  if (error) throw new Error(`Could not close active Daily Duel records: ${error.message}`);
}

async function cancelActiveRankedDuels(supabase: ReturnType<typeof createClient>, userId: string) {
  const { error } = await supabase
    .from("ranked_duels")
    .update({
      status: "cancelled",
      winner_user_id: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .in("status", ["waiting_for_opponent", "matched", "player_a_completed", "player_b_completed", "expired"]);

  if (error) throw new Error(`Could not close active Ranked Duel records: ${error.message}`);
}

async function anonymiseProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const deletedUsername = deletedUsernameValue(userId);
  const { error } = await supabase
    .from("profiles")
    .update({
      username: deletedUsername,
      display_name: DELETED_USERNAME,
      username_handle: null,
      initials: DELETED_INITIALS,
      avatar_color: DELETED_AVATAR_COLOUR,
      avatar_symbol: null,
      avatar_style_version: "character_v1",
      avatar_bg_color: DELETED_AVATAR_COLOUR,
      avatar_initials: DELETED_INITIALS,
      avatar_skin_tone: "#D19A6E",
      avatar_hair_style: "short",
      avatar_hair_color: DELETED_HAIR_COLOUR,
      avatar_top_style: "tee",
      avatar_top_color: DELETED_TOP_COLOUR,
      avatar_accessory: null,
      avatar_frame: null,
      profile_setup_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(`Could not anonymise the user profile: ${error.message}`);
}

async function anonymiseSettings(supabase: ReturnType<typeof createClient>, userId: string) {
  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: userId,
      daily_reminder: false,
      streak_reminder: false,
      duel_results: false,
      ranked_updates: false,
      public_profile: false,
      show_stats_publicly: false,
      show_recent_results_publicly: false,
      allow_friend_challenges: false,
      sound_enabled: false,
      haptics_enabled: false,
    }, { onConflict: "user_id" });

  if (error) throw new Error(`Could not lock down user settings: ${error.message}`);
}

async function anonymiseResults(supabase: ReturnType<typeof createClient>, userId: string) {
  const { error } = await supabase
    .from("game_results")
    .update({
      eligible_for_leaderboard: false,
      eligible_for_ranked: false,
    })
    .eq("user_id", userId);

  if (error) throw new Error(`Could not remove the user from leaderboard-eligible results: ${error.message}`);
}

async function abandonSessions(supabase: ReturnType<typeof createClient>, userId: string) {
  const { error } = await supabase
    .from("puzzle_sessions")
    .update({
      status: "abandoned",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "in_progress");

  if (error) throw new Error(`Could not close active puzzle sessions: ${error.message}`);
}

async function deleteLinkedRows(supabase: ReturnType<typeof createClient>, userId: string) {
  const operations = [
    supabase.from("friends").delete().or(`user_id.eq.${userId},friend_id.eq.${userId}`),
    supabase.from("friend_requests").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
    supabase.from("notification_preferences").delete().eq("user_id", userId),
    supabase.from("push_tokens").delete().eq("user_id", userId),
    supabase.from("app_notifications").delete().eq("user_id", userId),
    supabase.from("push_notification_deliveries").delete().eq("user_id", userId),
    supabase.from("feedback").delete().eq("user_id", userId),
    supabase.from("ranked_profiles").delete().eq("user_id", userId),
    supabase.from("player_stats").delete().eq("user_id", userId),
    supabase.from("user_achievements").delete().eq("user_id", userId),
  ];

  const results = await Promise.all(operations);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    throw new Error(`Could not remove linked account data: ${firstError.message}`);
  }
}

async function revokeAuthAccess(
  supabase: ReturnType<typeof createClient>,
  user: { id: string; app_metadata?: Record<string, unknown>; identities?: Array<{ provider?: string | null }> | null },
) {
  const providers = userProviders(user);
  const deletedEmail = deletedEmailForUser(user.id);
  const passwordPayload = providers.includes("email") ? { password: deletedPassword() } : {};
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    email: deletedEmail,
    email_confirm: true,
    ban_duration: ACCOUNT_BAN_DURATION,
    user_metadata: {
      display_name: DELETED_USERNAME,
      username_handle: deletedUsernameHandle(user.id),
      deleted_account: true,
    },
    ...passwordPayload,
  });

  if (error) throw new Error(`Could not revoke account sign-in: ${error.message}`);
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST") {
    return jsonResponse(405, { success: false, code: "DELETE_ACCOUNT_METHOD_NOT_ALLOWED", message: "Method not allowed.", requestId });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[DeleteAccount]", { requestId, step: "config", error: "Missing Supabase env vars" });
    return jsonResponse(500, { success: false, code: "DELETE_ACCOUNT_NOT_CONFIGURED", message: "Account deletion is not configured.", requestId });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { "x-application-name": "sudoduel-delete-account" } },
  });

  const { user, error: authError } = await requireAuthenticatedUser(supabase, request);
  if (authError || !user) {
    console.error("[DeleteAccount]", { requestId, step: "auth", error: authError ?? "Authentication required" });
    return jsonResponse(401, {
      success: false,
      code: "DELETE_ACCOUNT_AUTH_REQUIRED",
      message: "Please sign in again, then try deleting your account once more.",
      requestId,
    });
  }

  try {
    await cancelActiveFriendChallenges(supabase, user.id);
    await cancelActiveDailyDuels(supabase, user.id);
    await cancelActiveRankedDuels(supabase, user.id);
    await abandonSessions(supabase, user.id);
    await anonymiseResults(supabase, user.id);
    await anonymiseSettings(supabase, user.id);
    await anonymiseProfile(supabase, user.id);
    await deleteLinkedRows(supabase, user.id);
    await revokeAuthAccess(supabase, user);

    return jsonResponse(200, {
      success: true,
      message: "Account deletion completed.",
      requestId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Account deletion did not complete.";
    const code = message.startsWith("Could not revoke account sign-in:")
      ? "DELETE_ACCOUNT_REVOKE_FAILED"
      : message.startsWith("Could not")
        ? "DELETE_ACCOUNT_DATA_CLEANUP_FAILED"
        : "DELETE_ACCOUNT_FAILED";
    console.error("[DeleteAccount]", {
      requestId,
      userId: user.id,
      providers: userProviders(user),
      error: message,
    });
    return jsonResponse(500, {
      success: false,
      code,
      message: code === "DELETE_ACCOUNT_REVOKE_FAILED"
        ? "We could not finish removing this sign-in right now. Please try again shortly."
        : "We could not finish deleting this account right now. Please try again shortly.",
      requestId,
    });
  }
});
