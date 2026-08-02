import type { Difficulty } from "@/constants/mockData";

export type ResultContinuationOutcome =
  | "completed"
  | "win"
  | "loss"
  | "draw"
  | "unresolved"
  | "failed"
  | "abandoned"
  | "error";

export type ResultContinuationActionKind =
  | "start_classic"
  | "open_classic"
  | "open_daily_duel"
  | "open_ranked_duel"
  | "open_friends"
  | "challenge_again";

export type ResultContinuationTone = "difficulty" | "daily_duel" | "ranked" | "neutral";

export interface ResultContinuation {
  key: string;
  label: string;
  accessibleLabel: string;
  actionKind: ResultContinuationActionKind;
  targetDifficulty?: Difficulty;
  tone: ResultContinuationTone;
  supportingText?: string;
}

export interface ResultContinuationInput {
  mode: string;
  difficulty?: Difficulty | null;
  outcome: ResultContinuationOutcome;
  resultRecorded: boolean;
  rankedAvailable?: boolean;
  friendRematchSupported?: boolean;
}

const CLASSIC_PROGRESSION: Readonly<Record<Difficulty, Difficulty>> = {
  Easy: "Medium",
  Medium: "Hard",
  Hard: "Expert",
  Expert: "Master",
  Master: "Master",
};

const COMPLETED_OUTCOMES = new Set<ResultContinuationOutcome>(["completed", "win", "loss", "draw"]);

export function getResultContinuation(input: ResultContinuationInput): ResultContinuation | null {
  if (!input.resultRecorded || !COMPLETED_OUTCOMES.has(input.outcome)) return null;

  const mode = input.mode.trim().toLowerCase();

  if (mode === "classic") {
    if (!input.difficulty) return null;
    const targetDifficulty = CLASSIC_PROGRESSION[input.difficulty];
    const isMaster = input.difficulty === "Master";
    return {
      key: `classic:${targetDifficulty}`,
      label: isMaster ? "Play another Master" : `Try ${targetDifficulty}`,
      accessibleLabel: isMaster ? "Start another Master difficulty puzzle" : `Try ${targetDifficulty} difficulty`,
      actionKind: "start_classic",
      targetDifficulty,
      tone: "difficulty",
      supportingText: isMaster ? "Ready for another challenge?" : "Ready for the next level?",
    };
  }

  if (mode === "daily") {
    return {
      key: "daily:daily_duel",
      label: "Play Daily Duel",
      accessibleLabel: "Open Daily Duel",
      actionKind: "open_daily_duel",
      tone: "daily_duel",
      supportingText: "Take today's puzzle into competition.",
    };
  }

  if (mode === "daily_duel" || mode === "duel") {
    if (input.rankedAvailable) {
      return {
        key: "daily_duel:ranked",
        label: "Play Ranked Duel",
        accessibleLabel: "Open Ranked Duel matchmaking",
        actionKind: "open_ranked_duel",
        tone: "ranked",
        supportingText: "Keep climbing.",
      };
    }
    return {
      key: "daily_duel:classic",
      label: "Play a Classic puzzle",
      accessibleLabel: "Open Classic puzzle selection",
      actionKind: "open_classic",
      tone: "neutral",
    };
  }

  if (mode === "ranked" || mode === "ranked_duel") {
    return {
      key: "ranked:ranked",
      label: "Play another Ranked Duel",
      accessibleLabel: "Open Ranked Duel matchmaking",
      actionKind: "open_ranked_duel",
      tone: "ranked",
      supportingText: "Keep climbing.",
    };
  }

  if (mode === "friend_challenge") {
    if (input.friendRematchSupported) {
      return {
        key: "friend_challenge:rematch",
        label: "Challenge again",
        accessibleLabel: "Challenge this friend again",
        actionKind: "challenge_again",
        tone: "neutral",
      };
    }
    return {
      key: "friend_challenge:friends",
      label: "Back to friends",
      accessibleLabel: "Open Friends and challenges",
      actionKind: "open_friends",
      tone: "neutral",
    };
  }

  return null;
}

export interface ResultContinuationTapGuard {
  tryStart: () => boolean;
  reset: () => void;
  isPending: () => boolean;
}

export function createResultContinuationTapGuard(): ResultContinuationTapGuard {
  let pending = false;
  return {
    tryStart: () => {
      if (pending) return false;
      pending = true;
      return true;
    },
    reset: () => {
      pending = false;
    },
    isPending: () => pending,
  };
}
