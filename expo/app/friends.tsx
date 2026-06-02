import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, History, Play, Search, Swords, UserPlus, Users, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import SectionHeader from "@/components/SectionHeader";
import { C } from "@/constants/colors";
import type { Difficulty } from "@/constants/mockData";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile, type FriendChallengeEntry, type FriendRequestEntry, type FriendUser } from "@/hooks/usePlayerProfile";
import { formatTime } from "@/lib/sudoku";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert", "Master"];

function normalizeSearch(value: string): string {
  return value.replace(/\s/g, "").toLowerCase();
}

function statusText(status?: FriendUser["relationship_status"]): string | null {
  if (status === "friends") return "Friends";
  if (status === "request_sent") return "Requested";
  if (status === "request_received") return "Pending response";
  return null;
}

function isActiveChallenge(status: FriendChallengeEntry["status"]): boolean {
  return ["pending", "accepted", "challenger_completed", "challenged_completed"].includes(status);
}

function needsIncomingResponse(challenge: FriendChallengeEntry): boolean {
  return challenge.direction === "incoming" && !challenge.challenged_session_id && ["pending", "challenger_completed"].includes(challenge.status);
}

function currentUserCompletedChallenge(challenge: FriendChallengeEntry, currentUserId: string | null): boolean {
  const currentIsChallenger = currentUserId === challenge.challenger_id;
  return Boolean(currentIsChallenger ? challenge.challenger_result_id : challenge.challenged_result_id);
}

export default function FriendsScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const screenMode = params.mode === "challenge" ? "challenge" : "manage";
  const isChallengeMode = screenMode === "challenge";
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const {
    fetchFriends,
    fetchPendingFriendRequests,
    searchUsersByUsername,
    sendFriendRequest,
    respondFriendRequest,
    fetchFriendChallenges,
    createFriendChallenge,
    acceptFriendChallenge,
    declineFriendChallenge,
    cancelFriendChallenge,
  } = usePlayerProfile();
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequestEntry[]>([]);
  const [challenges, setChallenges] = useState<FriendChallengeEntry[]>([]);
  const [results, setResults] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<FriendUser | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Medium");

  const incomingChallenges = useMemo(() => challenges.filter(needsIncomingResponse), [challenges]);
  const activeChallenges = useMemo(() => challenges.filter((challenge) => isActiveChallenge(challenge.status) && !needsIncomingResponse(challenge) && challenge.status !== "pending"), [challenges]);
  const outgoingPendingChallenges = useMemo(() => challenges.filter((challenge) => challenge.direction === "outgoing" && challenge.status === "pending"), [challenges]);
  const completedChallenges = useMemo(() => challenges.filter((challenge) => challenge.status === "completed"), [challenges]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextFriends, nextRequests, nextChallenges] = await Promise.all([
      fetchFriends(),
      isChallengeMode ? Promise.resolve([]) : fetchPendingFriendRequests(),
      isChallengeMode ? fetchFriendChallenges() : Promise.resolve([]),
    ]);
    setFriends(nextFriends);
    setRequests(nextRequests);
    setChallenges(nextChallenges);
    setLoading(false);
  }, [fetchFriendChallenges, fetchFriends, fetchPendingFriendRequests, isChallengeMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runSearch = useCallback(async () => {
    const normalized = normalizeSearch(query).replace(/^@+/, "");
    setQuery(normalized);
    if (normalized.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const rows = await searchUsersByUsername(normalized);
    setResults(rows);
    setSearching(false);
  }, [query, searchUsersByUsername]);

  const addFriend = useCallback(async (user: FriendUser) => {
    setWorkingId(user.user_id);
    const result = await sendFriendRequest(user.username_handle);
    setWorkingId(null);
    if (!result.ok) {
      Alert.alert("Friend request", result.error ?? "Could not send request.");
      return;
    }
    setResults((current) => current.map((row) => row.user_id === user.user_id ? { ...row, relationship_status: "request_sent" } : row));
    Alert.alert("Friend request sent", `Request sent to @${user.username_handle}.`);
  }, [sendFriendRequest]);

  const respond = useCallback(async (request: FriendRequestEntry, response: "accepted" | "declined") => {
    setWorkingId(request.request_id);
    const result = await respondFriendRequest(request.request_id, response);
    setWorkingId(null);
    if (!result.ok) {
      Alert.alert("Friend request", result.error ?? "Could not update request.");
      return;
    }
    await refresh();
  }, [refresh, respondFriendRequest]);

  const openChallengeGame = useCallback((challenge: { session_id: string; puzzle_id: string; difficulty: Difficulty }) => {
    router.push({
      pathname: "/game",
      params: {
        mode: "friend_challenge",
        difficulty: challenge.difficulty,
        sessionId: challenge.session_id,
        session_id: challenge.session_id,
        puzzleId: challenge.puzzle_id,
        puzzle_id: challenge.puzzle_id,
      },
    });
  }, []);

  const sendChallenge = useCallback(async () => {
    if (!challengeTarget) return;
    setWorkingId(`challenge:${challengeTarget.user_id}`);
    const result = await createFriendChallenge(challengeTarget.username_handle, selectedDifficulty);
    setWorkingId(null);
    setChallengeTarget(null);
    if (!result.ok || !result.challenge) {
      Alert.alert("Friend Challenge", result.error ?? "Could not send challenge.");
      return;
    }
    await refresh();
    openChallengeGame(result.challenge);
  }, [challengeTarget, createFriendChallenge, openChallengeGame, refresh, selectedDifficulty]);

  const acceptChallenge = useCallback(async (challenge: FriendChallengeEntry) => {
    setWorkingId(challenge.challenge_id);
    const result = await acceptFriendChallenge(challenge.challenge_id);
    setWorkingId(null);
    if (!result.ok || !result.challenge) {
      Alert.alert("Friend Challenge", result.error ?? "Could not accept challenge.");
      return;
    }
    await refresh();
    openChallengeGame(result.challenge);
  }, [acceptFriendChallenge, openChallengeGame, refresh]);

  const declineChallenge = useCallback(async (challenge: FriendChallengeEntry) => {
    setWorkingId(challenge.challenge_id);
    const result = await declineFriendChallenge(challenge.challenge_id);
    setWorkingId(null);
    if (!result.ok) {
      Alert.alert("Friend Challenge", result.error ?? "Could not decline challenge.");
      return;
    }
    await refresh();
  }, [declineFriendChallenge, refresh]);

  const cancelChallenge = useCallback(async (challenge: FriendChallengeEntry) => {
    setWorkingId(challenge.challenge_id);
    const result = await cancelFriendChallenge(challenge.challenge_id);
    setWorkingId(null);
    if (!result.ok) {
      Alert.alert("Friend Challenge", result.error ?? "Could not cancel challenge.");
      return;
    }
    await refresh();
  }, [cancelFriendChallenge, refresh]);

  const playChallenge = useCallback((challenge: FriendChallengeEntry) => {
    if (!challenge.current_user_session_id) {
      Alert.alert("Friend Challenge", "This challenge is waiting for the other player.");
      return;
    }
    openChallengeGame({
      session_id: challenge.current_user_session_id,
      puzzle_id: challenge.puzzle_id,
      difficulty: challenge.difficulty,
    });
  }, [openChallengeGame]);

  const openHistory = useCallback((friend: FriendUser) => {
    router.push({
      pathname: "/friend-h2h",
      params: { friendId: friend.user_id },
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconButton}>
            <ArrowLeft size={20} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{isChallengeMode ? "VERSUS" : "FRIENDS"}</Text>
            <Text style={styles.title}>{isChallengeMode ? "Friend Challenge" : "Find players"}</Text>
          </View>
        </View>

        {!isChallengeMode ? (
        <Card>
          <Text style={styles.sectionTitle}>Search by username</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Search size={18} color={C.muted} />
              <TextInput
                value={query}
                onChangeText={(value) => setQuery(normalizeSearch(value))}
                onSubmitEditing={runSearch}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="@username"
                placeholderTextColor={C.mutedSoft}
                style={styles.searchInput}
              />
            </View>
            <Pressable style={styles.searchButton} onPress={runSearch} disabled={searching}>
              {searching ? <ActivityIndicator color="#FBF8F2" /> : <Text style={styles.searchButtonText}>Search</Text>}
            </Pressable>
          </View>
          <Text style={styles.helper}>Search uses unique lowercase usernames.</Text>
        </Card>
        ) : null}

        {!isChallengeMode && results.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Search results" />
            <Card padded={false}>
              {results.map((user, index) => (
                <UserRow
                  key={user.user_id}
                  user={user}
                  last={index === results.length - 1}
                  action={statusText(user.relationship_status)}
                  working={workingId === user.user_id}
                  onPress={user.relationship_status === "none" ? () => addFriend(user) : undefined}
                />
              ))}
            </Card>
          </View>
        ) : !isChallengeMode && query.length >= 2 && !searching ? (
          <Text style={styles.emptyText}>No players found.</Text>
        ) : null}

        {!isChallengeMode ? (
        <View style={styles.section}>
          <SectionHeader title="Incoming requests" />
          <Card padded={false}>
            {loading ? <LoadingRow /> : requests.length === 0 ? <EmptyRow text="No pending friend requests." /> : requests.map((request, index) => (
              <RequestRow
                key={request.request_id}
                request={request}
                last={index === requests.length - 1}
                working={workingId === request.request_id}
                onAccept={() => respond(request, "accepted")}
                onDecline={() => respond(request, "declined")}
              />
            ))}
          </Card>
        </View>
        ) : null}

        {isChallengeMode ? (
        <View style={styles.section}>
          <SectionHeader title="Friends" action={`${friends.length}`} />
          <Card padded={false}>
            {loading ? <LoadingRow /> : friends.length === 0 ? <EmptyRow text="Add friends from Profile to start challenges." /> : friends.map((friend, index) => (
              <UserRow
                key={friend.user_id}
                user={friend}
                last={index === friends.length - 1}
                action="Friends"
                challengeWorking={workingId === `challenge:${friend.user_id}`}
                onChallenge={() => setChallengeTarget(friend)}
                onHistory={() => openHistory(friend)}
              />
            ))}
          </Card>
        </View>
        ) : null}

        {isChallengeMode ? (
        <View style={styles.section}>
          <SectionHeader title="Incoming challenges" />
          <Card padded={false}>
            {loading ? <LoadingRow /> : incomingChallenges.length === 0 ? <EmptyRow text="No incoming challenges." /> : incomingChallenges.map((challenge, index) => (
              <ChallengeRow
                key={challenge.challenge_id}
                challenge={challenge}
                currentUserId={auth.user?.id ?? null}
                last={index === incomingChallenges.length - 1}
                working={workingId === challenge.challenge_id}
                onAccept={() => acceptChallenge(challenge)}
                onDecline={() => declineChallenge(challenge)}
              />
            ))}
          </Card>
        </View>
        ) : null}

        {isChallengeMode ? (
        <View style={styles.section}>
          <SectionHeader title="Active challenges" action={`${activeChallenges.length + outgoingPendingChallenges.length}`} />
          <Card padded={false}>
            {loading ? <LoadingRow /> : activeChallenges.length + outgoingPendingChallenges.length === 0 ? <EmptyRow text="No active challenges." /> : [...outgoingPendingChallenges, ...activeChallenges].map((challenge, index, all) => (
              <ChallengeRow
                key={challenge.challenge_id}
                challenge={challenge}
                currentUserId={auth.user?.id ?? null}
                last={index === all.length - 1}
                working={workingId === challenge.challenge_id}
                onPlay={challenge.current_user_session_id && challenge.status !== "pending" && !currentUserCompletedChallenge(challenge, auth.user?.id ?? null) ? () => playChallenge(challenge) : undefined}
                onCancel={challenge.direction === "outgoing" && ["pending", "accepted"].includes(challenge.status) ? () => cancelChallenge(challenge) : undefined}
              />
            ))}
          </Card>
        </View>
        ) : null}

        {!isChallengeMode ? (
        <View style={styles.section}>
          <SectionHeader title="Friends" action={`${friends.length}`} />
          <Card padded={false}>
            {loading ? <LoadingRow /> : friends.length === 0 ? <EmptyRow text="Search by username to add friends." /> : friends.map((friend, index) => (
              <UserRow
                key={friend.user_id}
                user={friend}
                last={index === friends.length - 1}
                action="Friends"
                onHistory={() => openHistory(friend)}
              />
            ))}
          </Card>
        </View>
        ) : null}

        {isChallengeMode ? (
        <View style={styles.section}>
          <SectionHeader title="Completed challenges" />
          <Card padded={false}>
            {loading ? <LoadingRow /> : completedChallenges.length === 0 ? <EmptyRow text="No completed challenges." /> : completedChallenges.map((challenge, index) => (
              <ChallengeRow
                key={challenge.challenge_id}
                challenge={challenge}
                currentUserId={auth.user?.id ?? null}
                last={index === completedChallenges.length - 1}
              />
            ))}
          </Card>
        </View>
        ) : null}
      </ScrollView>

      <Modal visible={isChallengeMode && Boolean(challengeTarget)} transparent animationType="fade" onRequestClose={() => setChallengeTarget(null)}>
        <View style={styles.backdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Friend Challenge</Text>
            <Text style={styles.modalSub}>Choose a difficulty for @{challengeTarget?.username_handle}.</Text>
            <View style={styles.difficultyWrap}>
              {DIFFICULTIES.map((difficulty) => (
                <Pressable
                  key={difficulty}
                  style={[styles.difficultyButton, selectedDifficulty === difficulty && styles.difficultyButtonActive]}
                  onPress={() => setSelectedDifficulty(difficulty)}
                >
                  <Text style={[styles.difficultyText, selectedDifficulty === difficulty && styles.difficultyTextActive]}>{difficulty}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setChallengeTarget(null)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={sendChallenge} disabled={Boolean(workingId?.startsWith("challenge:"))}>
                {workingId?.startsWith("challenge:") ? <ActivityIndicator color="#FBF8F2" /> : <Text style={styles.primaryButtonText}>Send challenge</Text>}
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LoadingRow() {
  return <View style={styles.row}><ActivityIndicator color={C.accent} /><Text style={styles.rowSub}>Loading...</Text></View>;
}

function EmptyRow({ text }: { text: string }) {
  return <View style={styles.emptyRow}><Users size={24} color={C.mutedSoft} /><Text style={styles.emptyText}>{text}</Text></View>;
}

function UserRow({ user, last, action, working, challengeWorking, onPress, onChallenge, onHistory }: { user: FriendUser; last: boolean; action?: string | null; working?: boolean; challengeWorking?: boolean; onPress?: () => void; onChallenge?: () => void; onHistory?: () => void }) {
  return (
    <View style={[styles.userRow, !last && styles.rowBorder]}>
      <Avatar initials={user.initials} color={user.avatar_color} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{user.display_name}</Text>
        <Text style={styles.rowSub}>@{user.username_handle}</Text>
      </View>
      {onChallenge || onHistory ? (
        <View style={styles.friendActions}>
          {onHistory ? (
            <Pressable style={styles.historyButton} onPress={onHistory}>
              <History size={15} color={C.ink} />
              <Text style={styles.historyButtonText}>H2H</Text>
            </Pressable>
          ) : null}
          {onChallenge ? (
            <Pressable style={styles.challengeButton} onPress={onChallenge} disabled={challengeWorking}>
              {challengeWorking ? <ActivityIndicator color="#FBF8F2" /> : <><Swords size={15} color="#FBF8F2" /><Text style={styles.addButtonText}>Challenge</Text></>}
            </Pressable>
          ) : null}
        </View>
      ) : onPress ? (
        <Pressable style={styles.addButton} onPress={onPress} disabled={working}>
          {working ? <ActivityIndicator color="#FBF8F2" /> : <><UserPlus size={15} color="#FBF8F2" /><Text style={styles.addButtonText}>Add</Text></>}
        </Pressable>
      ) : action ? <Text style={styles.statusPill}>{action}</Text> : null}
    </View>
  );
}

function RequestRow({ request, last, working, onAccept, onDecline }: { request: FriendRequestEntry; last: boolean; working: boolean; onAccept: () => void; onDecline: () => void }) {
  return (
    <View style={[styles.userRow, !last && styles.rowBorder]}>
      <Avatar initials={request.initials} color={request.avatar_color} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{request.display_name}</Text>
        <Text style={styles.rowSub}>@{request.username_handle}</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable style={styles.acceptButton} onPress={onAccept} disabled={working}>
          <Check size={17} color="#FBF8F2" />
        </Pressable>
        <Pressable style={styles.declineButton} onPress={onDecline} disabled={working}>
          <X size={17} color={C.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function ChallengeRow({ challenge, currentUserId, last, working, onAccept, onDecline, onCancel, onPlay }: { challenge: FriendChallengeEntry; currentUserId: string | null; last: boolean; working?: boolean; onAccept?: () => void; onDecline?: () => void; onCancel?: () => void; onPlay?: () => void }) {
  const currentIsChallenger = currentUserId === challenge.challenger_id;
  const yourScore = currentIsChallenger ? challenge.challenger_score : challenge.challenged_score;
  const friendScore = currentIsChallenger ? challenge.challenged_score : challenge.challenger_score;
  const yourTime = currentIsChallenger ? challenge.challenger_elapsed_seconds : challenge.challenged_elapsed_seconds;
  const friendTime = currentIsChallenger ? challenge.challenged_elapsed_seconds : challenge.challenger_elapsed_seconds;
  const yourMistakes = currentIsChallenger ? challenge.challenger_mistakes : challenge.challenged_mistakes;
  const friendMistakes = currentIsChallenger ? challenge.challenged_mistakes : challenge.challenger_mistakes;
  const yourHints = currentIsChallenger ? challenge.challenger_hints_used : challenge.challenged_hints_used;
  const friendHints = currentIsChallenger ? challenge.challenged_hints_used : challenge.challenger_hints_used;
  const yourUndos = currentIsChallenger ? challenge.challenger_undo_count : challenge.challenged_undo_count;
  const friendUndos = currentIsChallenger ? challenge.challenged_undo_count : challenge.challenger_undo_count;
  const yourCompleted = Boolean(currentIsChallenger ? challenge.challenger_result_id : challenge.challenged_result_id);
  const friendCompleted = Boolean(currentIsChallenger ? challenge.challenged_result_id : challenge.challenger_result_id);
  const showWaitingButton = yourCompleted && !friendCompleted;
  const displayStatus = challenge.status === "completed"
    ? {
      label: challenge.winner_user_id === null
        ? "Draw"
        : challenge.winner_user_id === currentUserId
        ? "You won"
        : `${challenge.friend_display_name} won`,
      sub: "Challenge complete",
    }
    : onAccept
    ? {
      label: friendCompleted ? `${challenge.friend_display_name} finished` : "Challenge received",
      sub: friendCompleted ? "Play your turn" : "Accept to start your run",
    }
    : yourCompleted && !friendCompleted
    ? { label: "You finished", sub: `Waiting for ${challenge.friend_display_name}` }
    : friendCompleted && !yourCompleted
    ? { label: `${challenge.friend_display_name} finished`, sub: "Play your turn" }
    : challenge.direction === "outgoing" && challenge.status === "pending"
    ? { label: "Awaiting acceptance", sub: `Waiting for ${challenge.friend_display_name}` }
    : challenge.status === "accepted"
    ? { label: "Ready to play", sub: "Both players have the puzzle" }
    : { label: "In progress", sub: "Challenge active" };
  return (
    <View style={[styles.challengeRow, !last && styles.rowBorder]}>
      <View style={styles.challengeHeader}>
        <Avatar initials={challenge.friend_initials} color={challenge.friend_avatar_color} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{challenge.friend_display_name}</Text>
          <Text style={styles.rowSub}>@{challenge.friend_username_handle} / {challenge.difficulty}</Text>
          <Text style={styles.challengeSubstatus}>{displayStatus.sub}</Text>
        </View>
        <Text style={styles.statusPill}>{displayStatus.label}</Text>
      </View>
      {challenge.status === "completed" ? (
        <View style={styles.resultCompare}>
          <ResultMini label="You" score={yourScore} seconds={yourTime} mistakes={yourMistakes} hints={yourHints} undos={yourUndos} />
          <ResultMini label={challenge.friend_display_name} score={friendScore} seconds={friendTime} mistakes={friendMistakes} hints={friendHints} undos={friendUndos} />
        </View>
      ) : null}
      <View style={styles.challengeActions}>
        {onAccept ? <Pressable style={styles.acceptTextButton} onPress={onAccept} disabled={working}><Text style={styles.acceptText}>Accept</Text></Pressable> : null}
        {onDecline ? <Pressable style={styles.secondarySmallButton} onPress={onDecline} disabled={working}><Text style={styles.secondarySmallText}>Decline</Text></Pressable> : null}
        {onPlay ? <Pressable style={styles.acceptTextButton} onPress={onPlay} disabled={working}><Play size={14} color="#FBF8F2" /><Text style={styles.acceptText}>Play</Text></Pressable> : null}
        {showWaitingButton ? <View style={styles.disabledSmallButton}><Text style={styles.disabledSmallText}>Waiting</Text></View> : null}
        {onCancel ? <Pressable style={styles.secondarySmallButton} onPress={onCancel} disabled={working}><Text style={styles.secondarySmallText}>Cancel</Text></Pressable> : null}
      </View>
    </View>
  );
}

function ResultMini({ label, score, seconds, mistakes, hints, undos }: { label: string; score: number | null; seconds: number | null; mistakes: number | null; hints: number | null; undos: number | null }) {
  return (
    <View style={styles.resultMini}>
      <Text style={styles.resultMiniLabel}>{label}</Text>
      <Text style={styles.resultMiniScore}>{score === null ? "-" : score.toLocaleString()}</Text>
      <Text style={styles.resultMiniSub}>{seconds === null ? "Not finished" : formatTime(seconds)}</Text>
      <Text style={styles.resultMiniSub}>{mistakes ?? 0}M / {hints ?? 0}H / {undos ?? 0}U</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18, paddingTop: 12 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  kicker: { fontSize: 11, color: C.muted, fontWeight: "700", letterSpacing: 1.6 },
  title: { color: C.ink, fontSize: 28, fontWeight: "900", marginTop: 2 },
  section: { marginTop: 22 },
  sectionTitle: { color: C.ink, fontWeight: "900", fontSize: 16 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  searchInputWrap: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, color: C.ink, fontWeight: "800", fontSize: 15, paddingVertical: 10 },
  searchButton: { minHeight: 46, minWidth: 86, borderRadius: 14, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  searchButtonText: { color: "#FBF8F2", fontWeight: "900" },
  helper: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 9 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowTitle: { color: C.ink, fontWeight: "900", fontSize: 15 },
  rowSub: { color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 2 },
  emptyRow: { alignItems: "center", justifyContent: "center", padding: 22, gap: 8 },
  emptyText: { color: C.muted, fontWeight: "700", textAlign: "center", marginTop: 10 },
  friendActions: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 190 },
  addButton: { minHeight: 38, borderRadius: 999, backgroundColor: C.accent, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13 },
  challengeButton: { minHeight: 38, borderRadius: 999, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13 },
  historyButton: { minHeight: 38, borderRadius: 999, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 },
  historyButtonText: { color: C.ink, fontWeight: "900", fontSize: 12 },
  addButtonText: { color: "#FBF8F2", fontWeight: "900", fontSize: 12 },
  statusPill: { color: C.accent, fontWeight: "900", fontSize: 12, maxWidth: 136, textAlign: "right" },
  requestActions: { flexDirection: "row", gap: 8 },
  acceptButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: C.success },
  declineButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
  challengeRow: { padding: 14, gap: 12 },
  challengeHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  challengeSubstatus: { color: C.muted, fontSize: 12, fontWeight: "800", marginTop: 5 },
  challengeActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  acceptTextButton: { minHeight: 36, borderRadius: 999, backgroundColor: C.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14 },
  acceptText: { color: "#FBF8F2", fontWeight: "900", fontSize: 12 },
  secondarySmallButton: { minHeight: 36, borderRadius: 999, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  secondarySmallText: { color: C.ink, fontWeight: "900", fontSize: 12 },
  disabledSmallButton: { minHeight: 36, borderRadius: 999, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, opacity: 0.65 },
  disabledSmallText: { color: C.muted, fontWeight: "900", fontSize: 12 },
  resultCompare: { flexDirection: "row", gap: 10 },
  resultMini: { flex: 1, borderRadius: 12, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, padding: 10 },
  resultMiniLabel: { color: C.muted, fontSize: 11, fontWeight: "800" },
  resultMiniScore: { color: C.ink, fontSize: 16, fontWeight: "900", marginTop: 2 },
  resultMiniSub: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: "#00000055", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 420 },
  modalTitle: { color: C.ink, fontSize: 20, fontWeight: "900" },
  modalSub: { color: C.muted, fontWeight: "700", marginTop: 6 },
  difficultyWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  difficultyButton: { borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, paddingHorizontal: 13, paddingVertical: 9 },
  difficultyButtonActive: { backgroundColor: C.accent, borderColor: C.accent },
  difficultyText: { color: C.ink, fontWeight: "900", fontSize: 12 },
  difficultyTextActive: { color: "#FBF8F2" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  secondaryButton: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: C.ink, fontWeight: "900" },
  primaryButton: { flex: 1.3, minHeight: 44, borderRadius: 14, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FBF8F2", fontWeight: "900" },
});
