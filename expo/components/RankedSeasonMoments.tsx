import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import React from "react";

import Card from "@/components/Card";
import { C } from "@/constants/colors";
import { getCenteredContentMaxWidth, isTabletWidth } from "@/constants/layout";
import type { RankedSeasonInfo, RankedSeasonRecap } from "@/hooks/usePlayerProfile";

type Phase = "recap" | "intro";

interface Props {
  visible: boolean;
  phase: Phase;
  recap: RankedSeasonRecap | null;
  currentSeason: RankedSeasonInfo | null;
  onContinue: () => void;
  onPlayRanked: () => void;
  onShare?: () => void;
  onClose: () => void;
  introPrimaryLabel?: string;
}

function formatTier(value: string | null | undefined): string {
  return value?.trim() || "Unranked";
}

function formatCountdown(endsAt: string | null | undefined): string {
  if (!endsAt) return "Season schedule unavailable";
  const timestamp = new Date(endsAt).getTime();
  if (!Number.isFinite(timestamp)) return "Season schedule unavailable";
  const diffMs = timestamp - Date.now();
  if (diffMs <= 0) return "Season ends today";
  const days = Math.ceil(diffMs / 86400000);
  if (days <= 1) return "Season ends today";
  return `${days} days remaining`;
}

function formatTopPercent(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `Top ${value.toFixed(1)}%`;
}

function formatWinRate(wins: number, matchesPlayed: number): string {
  if (matchesPlayed <= 0) return "0%";
  return `${Math.round((wins / matchesPlayed) * 100)}%`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function RankedSeasonMoments({
  visible,
  phase,
  recap,
  currentSeason,
  onContinue,
  onPlayRanked,
  onShare,
  onClose,
  introPrimaryLabel,
}: Props) {
  const { width } = useWindowDimensions();
  const isTablet = isTabletWidth(width);
  const shellMaxWidth = getCenteredContentMaxWidth(width, isTablet ? 620 : 460);
  const isRecap = phase === "recap";
  const seasonName = isRecap ? recap?.season_name ?? "Season" : currentSeason?.season_name ?? "Season";
  const seasonNumber = isRecap ? recap?.season_number ?? null : currentSeason?.season_number ?? null;
  const finalRp = recap?.final_rp ?? 0;
  const matchesPlayed = recap?.matches_played ?? 0;
  const wins = recap?.wins ?? 0;
  const losses = recap?.losses ?? 0;
  const draws = recap?.draws ?? 0;
  const topPercent = formatTopPercent(recap?.top_percent);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={[styles.shell, { maxWidth: shellMaxWidth, padding: isTablet ? 28 : 22 }]}>
          {isRecap ? (
            <>
              <Text style={styles.kicker}>SEASON COMPLETE</Text>
              <Text style={styles.title}>{seasonName}</Text>
              <Text style={styles.subtitle}>
                {seasonNumber ? `You closed out Season ${seasonNumber}.` : "Your ranked season has wrapped."}
              </Text>

              <View style={styles.heroPanel}>
                <View style={styles.heroRow}>
                  <View>
                    <Text style={styles.heroLabel}>Final tier</Text>
                    <Text style={styles.heroValue}>{formatTier(recap?.final_tier)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.heroLabel}>Final RP</Text>
                    <Text style={styles.heroValue}>{finalRp.toLocaleString()}</Text>
                  </View>
                </View>
                {recap?.peak_rp !== null || recap?.peak_tier ? (
                  <Text style={styles.heroMeta}>
                    Peak {formatTier(recap?.peak_tier)}{typeof recap?.peak_rp === "number" ? ` · ${recap.peak_rp.toLocaleString()} RP` : ""}
                  </Text>
                ) : null}
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCell, isTablet && styles.statCellTablet]}>
                  <Stat label="Matches" value={`${matchesPlayed}`} />
                </View>
                <View style={[styles.statCell, isTablet && styles.statCellTablet]}>
                  <Stat label="Record" value={`${wins}-${losses}-${draws}`} />
                </View>
                <View style={[styles.statCell, isTablet && styles.statCellTablet]}>
                  <Stat label="Win rate" value={formatWinRate(wins, matchesPlayed)} />
                </View>
                <View style={[styles.statCell, isTablet && styles.statCellTablet]}>
                  <Stat label="Best streak" value={`${recap?.best_win_streak ?? 0}`} />
                </View>
                <View style={[styles.statCell, isTablet && styles.statCellTablet]}>
                  <Stat label="Finish" value={recap?.final_rank_position ? `#${recap.final_rank_position}` : "Unplaced"} />
                </View>
                <View style={[styles.statCell, isTablet && styles.statCellTablet]}>
                  <Stat label="Standing" value={topPercent ?? (recap?.total_ranked_players ? `${recap.total_ranked_players} players` : "Season complete")} />
                </View>
              </View>

              <View style={styles.buttonRow}>
                {onShare ? (
                  <Pressable style={[styles.button, styles.secondaryButton]} onPress={onShare}>
                    <Text style={styles.secondaryButtonText}>Share</Text>
                  </Pressable>
                ) : null}
                <Pressable style={[styles.button, styles.primaryButton]} onPress={onContinue}>
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.kicker}>NEW SEASON</Text>
              <Text style={styles.title}>{seasonName} Begins</Text>
              <Text style={styles.subtitle}>
                {seasonNumber ? `Season ${seasonNumber} is live now.` : "A new ranked season is live now."}
              </Text>

              <View style={styles.heroPanel}>
                <Text style={styles.heroLabel}>Ends</Text>
                <Text style={styles.heroValue}>
                  {formatCountdown(currentSeason?.ends_at)}
                </Text>
                {currentSeason?.ends_at ? (
                  <Text style={styles.heroMeta}>
                    {new Date(currentSeason.ends_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                ) : null}
              </View>

              <View style={styles.introCopy}>
                <Text style={styles.introText}>
                  Fresh RP, fresh leaderboard, and a new climb waiting on the Ranked Duel board.
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <Pressable style={[styles.button, styles.secondaryButton]} onPress={onClose}>
                  <Text style={styles.secondaryButtonText}>Later</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.primaryButton]} onPress={onPlayRanked}>
                  <Text style={styles.primaryButtonText}>{introPrimaryLabel ?? "Play Ranked"}</Text>
                </Pressable>
              </View>
            </>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(21,23,28,0.54)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  shell: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 28,
    padding: 22,
  },
  kicker: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 8,
    color: C.ink,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 8,
    color: C.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  heroPanel: {
    marginTop: 18,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  heroLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroValue: {
    marginTop: 5,
    color: C.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroMeta: {
    color: C.inkSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  statCell: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  statCellTablet: {
    flexBasis: "31%",
  },
  stat: {
    backgroundColor: C.bgElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  statValue: {
    color: C.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 4,
    color: C.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  introCopy: {
    marginTop: 16,
    paddingHorizontal: 2,
  },
  introText: {
    color: C.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: C.accent,
  },
  primaryButtonText: {
    color: C.bgElevated,
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  secondaryButtonText: {
    color: C.ink,
    fontSize: 15,
    fontWeight: "800",
  },
});
