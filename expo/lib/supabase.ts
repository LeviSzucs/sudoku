import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const supabaseAnonKey = rawSupabaseAnonKey.trim();
const sanitizedSupabaseUrl = rawSupabaseUrl.trim().replace(/\/+$/, "");
const rootUrlError = "Supabase URL should be the project root only, e.g. https://project-ref.supabase.co";

function parseSupabaseUrl(url: string): { host: string; path: string; isValid: boolean; error: string | null } {
  if (url.length === 0) return { host: "", path: "", isValid: false, error: null };

  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const hasSearchOrHash = parsed.search.length > 0 || parsed.hash.length > 0;
    const isValid = parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co") && path.length === 0 && !hasSearchOrHash;
    return {
      host: parsed.hostname,
      path: path || "none",
      isValid,
      error: isValid ? null : rootUrlError,
    };
  } catch {
    return { host: "Invalid URL", path: "Invalid URL", isValid: false, error: rootUrlError };
  }
}

const parsedSupabaseUrl = parseSupabaseUrl(sanitizedSupabaseUrl);

export const supabaseConfigDiagnostics = {
  urlConfigured: sanitizedSupabaseUrl.length > 0,
  anonKeyConfigured: supabaseAnonKey.length > 0,
  urlPreview: sanitizedSupabaseUrl.slice(0, 25),
  urlHost: parsedSupabaseUrl.host,
  urlPath: parsedSupabaseUrl.path,
  urlValid: parsedSupabaseUrl.isValid,
  error: parsedSupabaseUrl.error,
};

export const isSupabaseConfigured = supabaseConfigDiagnostics.urlConfigured && supabaseConfigDiagnostics.anonKeyConfigured && supabaseConfigDiagnostics.urlValid;
export const supabaseConfigurationError = supabaseConfigDiagnostics.urlConfigured && !supabaseConfigDiagnostics.urlValid ? rootUrlError : null;

export const supabase = createClient(isSupabaseConfigured ? sanitizedSupabaseUrl : "https://example.supabase.co", supabaseAnonKey || "anon-key", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface ProfileRow {
  id: string;
  username: string;
  initials: string;
  avatar_color: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlayerStatsRow {
  user_id: string;
  total_mastery_xp: number;
  account_level: number;
  rank_points: number;
  rank_tier: string;
  current_streak: number;
  longest_streak: number;
  puzzles_completed: number;
  flawless_puzzles: number;
  total_mistakes: number;
  total_hints_used: number;
  total_undos_used: number;
  duels_played: number;
  duels_won: number;
  ranked_played: number;
  ranked_won: number;
  best_easy_time: number | null;
  best_medium_time: number | null;
  best_hard_time: number | null;
  best_expert_time: number | null;
  best_master_time?: number | null;
  updated_at?: string;
}

export interface UserSettingsRow {
  user_id: string;
  daily_reminder: boolean;
  streak_reminder: boolean;
  duel_results: boolean;
  ranked_updates: boolean;
  public_profile: boolean;
  show_stats_publicly: boolean;
  show_recent_results_publicly: boolean;
  allow_friend_challenges: boolean;
  updated_at?: string;
}

export interface GameResultRow {
  result_id: string;
  user_id: string;
  session_id?: string | null;
  puzzle_id: string | null;
  mode: string;
  difficulty: string;
  completed: boolean;
  won: boolean | null;
  elapsed_seconds: number;
  mistakes: number;
  hints_used: number;
  undo_count: number;
  final_score: number;
  xp_earned: number;
  rp_change: number;
  eligible_for_leaderboard: boolean;
  eligible_for_ranked: boolean;
  completed_at: string;
}

export interface UserAchievementRow {
  user_id: string;
  badge_id: string;
  unlocked: boolean;
  progress_current: number;
  unlocked_at: string | null;
  updated_at?: string;
  achievements?: {
    name: string;
    description: string;
    category: string;
    icon: string;
    progress_target: number;
  } | null;
}

export interface PuzzleSessionRow {
  session_id: string;
  user_id: string;
  puzzle_id: string | null;
  mode: string;
  difficulty: string;
  board_state: unknown;
  notes_state: unknown;
  elapsed_seconds: number;
  mistakes: number;
  hints_used: number;
  undo_count: number;
  move_history: unknown;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface PuzzleRow {
  puzzle_id: string;
  difficulty: string;
  givens: string;
  solution: string;
  rating_score: number;
  source: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DailyPuzzleRow {
  id: number;
  date: string;
  mode: string;
  puzzle_id: string;
  difficulty: string;
  created_at?: string;
}
