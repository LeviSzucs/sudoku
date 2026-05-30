/**
 * Mock data for the Sudoku app. Shapes are designed to map cleanly to a
 * future Supabase backend (tables: users, puzzles, matches, leaderboard_entries).
 */

import { DEFAULT_AVATAR_COLOR, DEFAULT_INITIALS, DEFAULT_USERNAME } from "@/constants/branding";

export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert" | "Master";

export interface User {
  id: string;
  username: string;
  rank: string;
  rankTier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";
  rating: number;
  avatarColor: string;
  initials: string;
  isPremium: boolean;
}

export interface LeaderboardEntry {
  id: string;
  user: Pick<User, "id" | "username" | "initials" | "avatarColor">;
  score: number;
  time: string;
  rank: number;
  mistakes?: number;
  hints?: number;
  undos?: number;
  weeklyPoints?: number;
  rp?: number;
  tier?: string;
  isFriend?: boolean;
}

export interface MatchResult {
  id: string;
  opponent: Pick<User, "username" | "initials" | "avatarColor" | "rank">;
  result: "win" | "loss" | "draw";
  yourTime: string;
  opponentTime: string;
  yourMistakes: number;
  opponentMistakes: number;
  yourScore: number;
  opponentScore: number;
  mode: "Daily Duel" | "Ranked" | "Friend";
  playedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  emoji: string;
}

export const currentUser: User = {
  id: "u_self",
  username: DEFAULT_USERNAME,
  rank: "Gold II",
  rankTier: "Gold",
  rating: 1842,
  avatarColor: DEFAULT_AVATAR_COLOR,
  initials: DEFAULT_INITIALS,
  isPremium: false,
};

export const stats = {
  puzzlesCompleted: 142,
  winRate: 0.68,
  bestTime: "3:42",
  currentStreak: 12,
  longestStreak: 28,
  averageTime: "7:18",
  hintsUsed: 34,
};

export const dailyPuzzle = {
  date: "Tuesday, May 19",
  difficulty: "Medium" as Difficulty,
  playersCompleted: 12483,
  yourBestToday: null as string | null,
};

export const continuePuzzle = {
  difficulty: "Hard" as Difficulty,
  progress: 0.62,
  elapsed: "5:21",
};

export const dailyDuel = {
  opponent: {
    username: "Alex",
    initials: "AL",
    avatarColor: "#3F7D58",
    rank: "Gold I",
  },
  endsIn: "6h 12m",
  status: "Your turn" as "Your turn" | "Waiting",
};

export const todaysLeaderboard: LeaderboardEntry[] = [
  { id: "1", rank: 1, user: { id: "1", username: "Sam", initials: "SA", avatarColor: "#B7912F" }, score: 2840, time: "2:14", mistakes: 0, hints: 0, undos: 0 },
  { id: "2", rank: 2, user: { id: "2", username: "Jordan", initials: "JO", avatarColor: "#1E1B4B" }, score: 2710, time: "2:31", mistakes: 0, hints: 0, undos: 1 },
  { id: "3", rank: 3, user: { id: "3", username: "Casey", initials: "CA", avatarColor: "#C5483E" }, score: 2655, time: "2:48", mistakes: 1, hints: 0, undos: 0 },
  { id: "4", rank: 4, user: { id: "4", username: "Taylor", initials: "TA", avatarColor: "#E89B2A" }, score: 2598, time: "3:02", mistakes: 0, hints: 1, undos: 0 },
  { id: "5", rank: 5, user: { id: "5", username: "Morgan", initials: "MO", avatarColor: "#3F7D58" }, score: 2510, time: "3:19", mistakes: 1, hints: 0, undos: 2 },
];

export const weeklyLeaderboard: LeaderboardEntry[] = [
  { id: "w1", rank: 1, user: { id: "1", username: "Sam", initials: "SA", avatarColor: "#B7912F" }, score: 18420, weeklyPoints: 18420, time: "—" },
  { id: "w2", rank: 2, user: { id: "21", username: "Alex", initials: "AL", avatarColor: "#F26B1F" }, score: 17830, weeklyPoints: 17830, time: "—" },
  { id: "w3", rank: 3, user: { id: "2", username: "Jordan", initials: "JO", avatarColor: "#1E1B4B" }, score: 17110, weeklyPoints: 17110, time: "—" },
  { id: "w4", rank: 4, user: { id: "22", username: "Morgan", initials: "MO", avatarColor: "#5B7BA0" }, score: 16940, weeklyPoints: 16940, time: "—" },
  { id: "w5", rank: 5, user: { id: "3", username: "Casey", initials: "CA", avatarColor: "#C5483E" }, score: 16555, weeklyPoints: 16555, time: "—" },
];

export const friendsLeaderboard: LeaderboardEntry[] = [
  { id: "f1", rank: 1, user: { id: "f1", username: "Alex", initials: "AL", avatarColor: "#3F7D58" }, score: 9420, weeklyPoints: 9420, time: "—", isFriend: true },
  { id: "f2", rank: 2, user: { id: "f2", username: DEFAULT_USERNAME, initials: DEFAULT_INITIALS, avatarColor: DEFAULT_AVATAR_COLOR }, score: 8810, weeklyPoints: 8810, time: "—", isFriend: true },
  { id: "f3", rank: 3, user: { id: "f3", username: "Taylor", initials: "TA", avatarColor: "#B7912F" }, score: 8205, weeklyPoints: 8205, time: "—", isFriend: true },
  { id: "f4", rank: 4, user: { id: "f4", username: "Morgan", initials: "MO", avatarColor: "#F26B1F" }, score: 7640, weeklyPoints: 7640, time: "—", isFriend: true },
];

export const rankedLeaderboard: LeaderboardEntry[] = [
  { id: "r1", rank: 1, user: { id: "1", username: "Sam", initials: "SA", avatarColor: "#B7912F" }, score: 2480, rp: 2480, tier: "Platinum I", time: "Platinum I" },
  { id: "r2", rank: 2, user: { id: "2", username: "Jordan", initials: "JO", avatarColor: "#1E1B4B" }, score: 2415, rp: 2415, tier: "Platinum I", time: "Platinum I" },
  { id: "r3", rank: 3, user: { id: "3", username: "Casey", initials: "CA", avatarColor: "#C5483E" }, score: 2380, rp: 2380, tier: "Platinum I", time: "Platinum I" },
  { id: "r4", rank: 4, user: { id: "4", username: "Taylor", initials: "TA", avatarColor: "#E89B2A" }, score: 2310, rp: 2310, tier: "Platinum I", time: "Platinum I" },
];

export const yourLeaderboardPosition: LeaderboardEntry = {
  id: "self",
  rank: 247,
  user: { id: currentUser.id, username: currentUser.username, initials: currentUser.initials, avatarColor: currentUser.avatarColor },
  score: 1842,
  time: "5:42",
};

export const recentMatches: MatchResult[] = [
  {
    id: "m1",
    opponent: { username: "Alex", initials: "AL", avatarColor: "#3F7D58", rank: "Gold I" },
    result: "win",
    yourTime: "4:12",
    opponentTime: "4:58",
    yourMistakes: 1,
    opponentMistakes: 3,
    yourScore: 2180,
    opponentScore: 1840,
    mode: "Ranked",
    playedAt: "2h ago",
  },
  {
    id: "m2",
    opponent: { username: "Taylor", initials: "TA", avatarColor: "#B7912F", rank: "Gold III" },
    result: "loss",
    yourTime: "6:31",
    opponentTime: "5:48",
    yourMistakes: 2,
    opponentMistakes: 0,
    yourScore: 1640,
    opponentScore: 2090,
    mode: "Daily Duel",
    playedAt: "Yesterday",
  },
  {
    id: "m3",
    opponent: { username: "Morgan", initials: "MO", avatarColor: "#F26B1F", rank: "Silver I" },
    result: "win",
    yourTime: "3:48",
    opponentTime: "5:12",
    yourMistakes: 0,
    opponentMistakes: 2,
    yourScore: 2410,
    opponentScore: 1720,
    mode: "Friend",
    playedAt: "2d ago",
  },
];

export const badges: Badge[] = [
  { id: "b1", name: "First Win", description: "Complete your first puzzle", earned: true, emoji: "★" },
  { id: "b2", name: "Streak 7", description: "7-day play streak", earned: true, emoji: "♦" },
  { id: "b3", name: "Streak 30", description: "30-day play streak", earned: false, emoji: "♦" },
  { id: "b4", name: "Flawless", description: "Win a puzzle with zero mistakes", earned: true, emoji: "◆" },
  { id: "b5", name: "Speedrunner", description: "Complete in under 3 minutes", earned: true, emoji: "◇" },
  { id: "b6", name: "Duelist", description: "Win 10 ranked duels", earned: true, emoji: "♠" },
  { id: "b7", name: "Master", description: "Reach Master rank", earned: false, emoji: "♚" },
  { id: "b8", name: "Expert", description: "Complete an Expert puzzle", earned: false, emoji: "♛" },
];
