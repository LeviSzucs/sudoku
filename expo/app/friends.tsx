import { router } from "expo-router";
import { ArrowLeft, Check, Search, UserPlus, Users, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import SectionHeader from "@/components/SectionHeader";
import { C } from "@/constants/colors";
import { usePlayerProfile, type FriendRequestEntry, type FriendUser } from "@/hooks/usePlayerProfile";

function normalizeSearch(value: string): string {
  return value.replace(/\s/g, "").toLowerCase();
}

function statusText(status?: FriendUser["relationship_status"]): string | null {
  if (status === "friends") return "Friends";
  if (status === "request_sent") return "Requested";
  if (status === "request_received") return "Pending response";
  return null;
}

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { fetchFriends, fetchPendingFriendRequests, searchUsersByUsername, sendFriendRequest, respondFriendRequest } = usePlayerProfile();
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequestEntry[]>([]);
  const [results, setResults] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextFriends, nextRequests] = await Promise.all([fetchFriends(), fetchPendingFriendRequests()]);
    setFriends(nextFriends);
    setRequests(nextRequests);
    setLoading(false);
  }, [fetchFriends, fetchPendingFriendRequests]);

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconButton}>
            <ArrowLeft size={20} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>FRIENDS</Text>
            <Text style={styles.title}>Find players</Text>
          </View>
        </View>

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

        {results.length > 0 ? (
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
        ) : query.length >= 2 && !searching ? (
          <Text style={styles.emptyText}>No players found.</Text>
        ) : null}

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

        <View style={styles.section}>
          <SectionHeader title="Friends" action={`${friends.length}`} />
          <Card padded={false}>
            {loading ? <LoadingRow /> : friends.length === 0 ? <EmptyRow text="Search for a username to add your first friend." /> : friends.map((friend, index) => (
              <UserRow key={friend.user_id} user={friend} last={index === friends.length - 1} action="Friends" />
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingRow() {
  return <View style={styles.row}><ActivityIndicator color={C.accent} /><Text style={styles.rowSub}>Loading...</Text></View>;
}

function EmptyRow({ text }: { text: string }) {
  return <View style={styles.emptyRow}><Users size={24} color={C.mutedSoft} /><Text style={styles.emptyText}>{text}</Text></View>;
}

function UserRow({ user, last, action, working, onPress }: { user: FriendUser; last: boolean; action?: string | null; working?: boolean; onPress?: () => void }) {
  return (
    <View style={[styles.userRow, !last && styles.rowBorder]}>
      <Avatar initials={user.initials} color={user.avatar_color} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{user.display_name}</Text>
        <Text style={styles.rowSub}>@{user.username_handle}</Text>
      </View>
      {onPress ? (
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
  addButton: { minHeight: 38, borderRadius: 999, backgroundColor: C.accent, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13 },
  addButtonText: { color: "#FBF8F2", fontWeight: "900" },
  statusPill: { color: C.accent, fontWeight: "900", fontSize: 12 },
  requestActions: { flexDirection: "row", gap: 8 },
  acceptButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: C.success },
  declineButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
});
