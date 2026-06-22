import type { Href } from "expo-router";

type NotificationNavigationResult =
  | { ok: true; href: Href; normalisedPath: string }
  | { ok: false; reason: string };

const INTERNAL_ORIGIN = "https://sudoduel.app";
const ALLOWED_GAME_MODES = new Set([
  "classic",
  "daily",
  "daily_duel",
  "duel",
  "friend_challenge",
  "ranked",
  "ranked_duel",
]);
const ALLOWED_DIFFICULTIES = new Set(["Easy", "Medium", "Hard", "Expert", "Master"]);

function firstParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value && value.trim().length > 0 ? value : undefined;
}

function isUuidLike(value: string | undefined): boolean {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function buildFriendsHref(params: URLSearchParams): NotificationNavigationResult {
  const mode = firstParam(params, "mode");
  const source = firstParam(params, "source");
  const nextParams: Record<string, string> = {};

  if (mode) {
    if (mode !== "challenge") return { ok: false, reason: "Unsupported friends mode." };
    nextParams.mode = mode;
  }

  if (source) {
    if (source !== "notifications") return { ok: false, reason: "Unsupported friends source." };
    nextParams.source = source;
  }

  return {
    ok: true,
    href: Object.keys(nextParams).length ? { pathname: "/friends", params: nextParams } : "/friends",
    normalisedPath: "/friends",
  };
}

function buildFriendH2HHref(params: URLSearchParams): NotificationNavigationResult {
  const friendId = firstParam(params, "friendId");
  if (!isUuidLike(friendId)) return { ok: false, reason: "Missing or invalid friend head-to-head id." };
  return {
    ok: true,
    href: { pathname: "/friend-h2h", params: { friendId } },
    normalisedPath: "/friend-h2h",
  };
}

function buildGameHref(params: URLSearchParams): NotificationNavigationResult {
  const mode = firstParam(params, "mode");
  const difficulty = firstParam(params, "difficulty");
  const puzzleId = firstParam(params, "puzzleId") ?? firstParam(params, "puzzle_id");
  const sessionId = firstParam(params, "sessionId") ?? firstParam(params, "session_id");
  const excludePuzzleId = firstParam(params, "excludePuzzleId");
  const nextParams: Record<string, string> = {};

  if (!mode || !ALLOWED_GAME_MODES.has(mode)) return { ok: false, reason: "Missing or invalid game mode." };
  if (difficulty && !ALLOWED_DIFFICULTIES.has(difficulty)) return { ok: false, reason: "Invalid game difficulty." };
  if (!puzzleId && !sessionId) return { ok: false, reason: "Missing game target." };

  nextParams.mode = mode;
  if (difficulty) nextParams.difficulty = difficulty;
  if (puzzleId) nextParams.puzzleId = puzzleId;
  if (sessionId) nextParams.sessionId = sessionId;
  if (excludePuzzleId) nextParams.excludePuzzleId = excludePuzzleId;

  return {
    ok: true,
    href: { pathname: "/game", params: nextParams },
    normalisedPath: "/game",
  };
}

function buildResultsHref(params: URLSearchParams): NotificationNavigationResult {
  const source = firstParam(params, "source");
  if (source && source !== "notifications") return { ok: false, reason: "Unsupported results source." };
  return {
    ok: true,
    href: source ? { pathname: "/results", params: { source } } : "/results",
    normalisedPath: "/results",
  };
}

function buildPlayerHref(pathname: string): NotificationNavigationResult {
  const match = pathname.match(/^\/player\/([^/]+)$/);
  const id = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  if (!isUuidLike(id)) return { ok: false, reason: "Missing or invalid player id." };
  return {
    ok: true,
    href: { pathname: "/player/[id]", params: { id } },
    normalisedPath: "/player/[id]",
  };
}

export function parseNotificationDeepLink(deepLink: string | null | undefined): NotificationNavigationResult {
  if (!deepLink || !deepLink.trim()) return { ok: false, reason: "Missing deep link." };
  if (!isSafeRelativePath(deepLink.trim())) return { ok: false, reason: "External or malformed deep link." };

  let parsed: URL;
  try {
    parsed = new URL(deepLink, INTERNAL_ORIGIN);
  } catch {
    return { ok: false, reason: "Malformed deep link." };
  }

  if (parsed.origin !== INTERNAL_ORIGIN) return { ok: false, reason: "External deep link blocked." };

  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  const params = parsed.searchParams;

  if (pathname === "/settings-notifications") {
    return { ok: true, href: "/settings-notifications", normalisedPath: "/settings-notifications" };
  }

  if (pathname === "/settings") {
    return { ok: true, href: "/settings", normalisedPath: "/settings" };
  }

  if (pathname === "/friends") return buildFriendsHref(params);
  if (pathname === "/friend-h2h") return buildFriendH2HHref(params);
  if (pathname === "/game") return buildGameHref(params);
  if (pathname === "/results") return buildResultsHref(params);
  if (pathname.startsWith("/player/")) return buildPlayerHref(pathname);

  return { ok: false, reason: "Unsupported notification route." };
}

