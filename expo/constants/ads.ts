export type AdPlacement =
  | "after_classic_result"
  | "after_daily_result"
  | "after_daily_duel_result"
  | "after_friend_challenge_result"
  | "after_ranked_result"
  | "during_puzzle"
  | "during_timer"
  | "before_result_save"
  | "ranked_matchmaking"
  | "matched_before_start"
  | "leaderboard"
  | "profile"
  | "settings"
  | "premium_screen";

export interface AdDecisionInput {
  isPremium: boolean;
  placement: AdPlacement;
  isFirstAppSession: boolean;
  completedPuzzleCountToday: number;
  gamesSinceLastInterstitial: number;
  minutesSinceLastInterstitial: number;
  interstitialsShownToday: number;
}

export interface AdDecision {
  shouldShow: boolean;
  reason: string;
}

export const ALLOWED_INTERSTITIAL_AD_PLACEMENTS: AdPlacement[] = [
  "after_classic_result",
  "after_daily_result",
  "after_daily_duel_result",
  "after_friend_challenge_result",
  "after_ranked_result",
];

export const DISALLOWED_AD_PLACEMENTS: AdPlacement[] = [
  "during_puzzle",
  "during_timer",
  "before_result_save",
  "ranked_matchmaking",
  "matched_before_start",
  "leaderboard",
  "profile",
  "settings",
  "premium_screen",
];

export const AD_FREQUENCY_CAPS = {
  minimumGamesBetweenInterstitials: 3,
  minimumMinutesBetweenInterstitials: 10,
  maximumInterstitialsPerDay: 4,
};

export const AD_POLICY_NOTE = "Ads are planned for Free accounts only at natural breaks. No real ad SDK is integrated yet.";

export function shouldShowInterstitialAd(input: AdDecisionInput): AdDecision {
  if (input.isPremium) return { shouldShow: false, reason: "Premium users are ad-free." };
  if (!ALLOWED_INTERSTITIAL_AD_PLACEMENTS.includes(input.placement)) return { shouldShow: false, reason: "Placement is not eligible for interstitial ads." };
  if (input.isFirstAppSession) return { shouldShow: false, reason: "No ads on the first app session." };
  if (input.completedPuzzleCountToday <= 1) return { shouldShow: false, reason: "No ad after the first completed puzzle of the day." };
  if (input.gamesSinceLastInterstitial < AD_FREQUENCY_CAPS.minimumGamesBetweenInterstitials) return { shouldShow: false, reason: "Minimum games between interstitials has not been reached." };
  if (input.minutesSinceLastInterstitial < AD_FREQUENCY_CAPS.minimumMinutesBetweenInterstitials) return { shouldShow: false, reason: "Minimum minutes between interstitials has not been reached." };
  if (input.interstitialsShownToday >= AD_FREQUENCY_CAPS.maximumInterstitialsPerDay) return { shouldShow: false, reason: "Daily interstitial cap reached." };
  return { shouldShow: true, reason: "Eligible natural-break ad placement." };
}
