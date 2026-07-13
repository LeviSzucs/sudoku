import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { Platform, Share } from "react-native";
import type ViewShot from "react-native-view-shot";

export type PuzzleResultShareCardData = {
  kind: "puzzle";
  modeLabel: string;
  difficulty: string;
  timeSeconds: number;
  mistakes: number;
  completedAt?: string | null;
  resultLabel?: string | null;
  score?: number | null;
  xpEarned?: number | null;
};

export type DailyResultShareCardData = {
  kind: "daily";
  difficulty: string;
  timeSeconds: number;
  mistakes: number;
  completedAt?: string | null;
  resultLabel?: string | null;
  streak?: number | null;
};

export type RankedResultShareCardData = {
  kind: "ranked";
  difficulty: string;
  timeSeconds: number;
  mistakes: number;
  completedAt?: string | null;
  outcomeLabel: string;
  rpChange?: number | null;
  currentTierLabel?: string | null;
  currentRp?: number | null;
};

export type SeasonRecapShareCardData = {
  kind: "season";
  seasonName: string;
  seasonNumber: number | null;
  finalTier: string | null;
  finalRp: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  topPercent?: number | null;
  finalRankPosition?: number | null;
  finalisedAt?: string | null;
};

export type SudoDuelShareCardPayload =
  | PuzzleResultShareCardData
  | DailyResultShareCardData
  | RankedResultShareCardData
  | SeasonRecapShareCardData;

function formatSigned(value: number | null | undefined, suffix = ""): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const base = value > 0 ? `+${value}` : `${value}`;
  return suffix ? `${base}${suffix}` : base;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function buildShareText(payload: SudoDuelShareCardPayload): string {
  switch (payload.kind) {
    case "daily": {
      const streak = typeof payload.streak === "number" && payload.streak > 0 ? `, streak ${payload.streak}` : "";
      return `Daily Sudoku ${payload.difficulty}: ${formatDuration(payload.timeSeconds)}, ${payload.mistakes} mistakes${streak}. Play SudoDuel.`;
    }
    case "ranked": {
      const rp = formatSigned(payload.rpChange, " RP");
      const tier = payload.currentTierLabel ? `, now ${payload.currentTierLabel}` : "";
      const currentRp = typeof payload.currentRp === "number" ? ` (${payload.currentRp.toLocaleString()} RP)` : "";
      return `${payload.outcomeLabel} in Ranked Duel ${payload.difficulty}: ${formatDuration(payload.timeSeconds)}, ${payload.mistakes} mistakes${rp ? `, ${rp}` : ""}${tier}${currentRp}. Play SudoDuel.`;
    }
    case "season": {
      const winRate = payload.matchesPlayed > 0 ? Math.round((payload.wins / payload.matchesPlayed) * 100) : 0;
      const finish = payload.finalRankPosition ? `, finished #${payload.finalRankPosition}` : "";
      return `I wrapped up ${payload.seasonName} in SudoDuel at ${payload.finalTier ?? "Unranked"} with ${payload.finalRp.toLocaleString()} RP, a ${payload.wins}-${payload.losses}-${payload.draws} record, and a ${winRate}% win rate${finish}.`;
    }
    case "puzzle":
    default: {
      const score = typeof payload.score === "number" ? `, ${payload.score.toLocaleString()} score` : "";
      const xp = typeof payload.xpEarned === "number" && payload.xpEarned > 0 ? `, +${payload.xpEarned} XP` : "";
      return `${payload.modeLabel} ${payload.difficulty}: ${formatDuration(payload.timeSeconds)}, ${payload.mistakes} mistakes${score}${xp}. Play SudoDuel.`;
    }
  }
}

export async function shareSudoDuelCard(options: {
  captureRef: RefObject<ViewShot | null>;
  payload: SudoDuelShareCardPayload;
  dialogTitle: string;
}): Promise<"image" | "text"> {
  const { captureRef, payload, dialogTitle } = options;
  const fallbackText = buildShareText(payload);

  if (Platform.OS !== "web") {
    try {
      const shareAvailable = await Sharing.isAvailableAsync();
      const uri = await captureRef.current?.capture?.();
      if (shareAvailable && uri) {
        await Sharing.shareAsync(uri, {
          dialogTitle,
          mimeType: "image/png",
          UTI: "public.png",
        });
        return "image";
      }
    } catch (error) {
      console.info("[ShareCards] Falling back to text share.", {
        kind: payload.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await Share.share({
    title: dialogTitle,
    message: fallbackText,
  });
  return "text";
}

export function shareCardDateLabel(payload: SudoDuelShareCardPayload): string {
  switch (payload.kind) {
    case "season":
      return formatDate(payload.finalisedAt);
    default:
      return formatDate(payload.completedAt);
  }
}

export function shareCardTimeLabel(seconds: number): string {
  return formatDuration(seconds);
}
