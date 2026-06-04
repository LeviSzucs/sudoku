export type ActionAuditStatus = "works" | "coming soon" | "missing";

export interface ActionAuditEntry {
  route: string;
  action: string;
  status: ActionAuditStatus;
}

export const ACTION_AUDIT: ActionAuditEntry[] = [
  { route: "Home", action: "Daily Sudoku", status: "works" },
  { route: "Home", action: "Daily Duel", status: "works" },
  { route: "Home", action: "Continue puzzle", status: "works" },
  { route: "Home", action: "Create account prompt", status: "works" },
  { route: "Home", action: "Premium card", status: "coming soon" },
  { route: "Play", action: "Continue puzzle", status: "works" },
  { route: "Play", action: "Daily Sudoku", status: "works" },
  { route: "Play", action: "Classic difficulty cards", status: "works" },
  { route: "Play", action: "Daily Duel", status: "works" },
  { route: "Play", action: "Ranked match", status: "coming soon" },
  { route: "Play", action: "Premium hint", status: "coming soon" },
  { route: "Game", action: "Pause/resume/back/leave", status: "works" },
  { route: "Game", action: "Completion: next/share/home/close", status: "works" },
  { route: "Profile", action: "Stats cards", status: "works" },
  { route: "Profile", action: "Badges/results/settings links", status: "works" },
  { route: "Profile", action: "Premium card", status: "coming soon" },
  { route: "Achievements", action: "Category tabs and badge details", status: "works" },
  { route: "Results", action: "Result filter tabs", status: "works" },
  { route: "Stats", action: "Back buttons and filters", status: "works" },
  { route: "Settings", action: "Notifications/display/privacy/log out/reset/dev tools", status: "works" },
  { route: "Settings", action: "Premium", status: "coming soon" },
  { route: "Versus", action: "Daily Duel", status: "works" },
  { route: "Versus", action: "Ranked Duel", status: "works" },
  { route: "Versus", action: "Friend Challenge", status: "coming soon" },
  { route: "Versus", action: "Recent match history", status: "works" },
  { route: "Leaderboards", action: "Daily/Weekly/Friends/Ranked tabs", status: "works" },
  { route: "Auth", action: "Create account/login/username setup/back", status: "works" },
];

export function printActionAuditReport(): string {
  const lines = ACTION_AUDIT.map((entry) => `${entry.route} - ${entry.action}: ${entry.status}`);
  const report = lines.join("\n");
  console.log(`[Action audit]\n${report}`);
  return report;
}
