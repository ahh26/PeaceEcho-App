import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebase";

type ConnectionItem = {
  id: string;
  username?: string;
  photoURL?: string;
  region?: string;
  createdAt?: any;
};

export default function UserConnectionsScreen() {
  const params = useLocalSearchParams<{
    uid?: string;
    tab?: string;
    username?: string;
  }>();

  const targetUid = typeof params.uid === "string" ? params.uid : undefined;

  const initialTab = useMemo<"followers" | "following">(() => {
    return params.tab === "following" ? "following" : "followers";
  }, [params.tab]);

  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    initialTab
  );
  const [search, setSearch] = useState("");

  const [followers, setFollowers] = useState<ConnectionItem[]>([]);
  const [following, setFollowing] = useState<ConnectionItem[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(true);

  useEffect(() => setActiveTab(initialTab), [initialTab]);
  useEffect(() => setSearch(""), [activeTab]);

  // Followers
  useEffect(() => {
    if (!targetUid) return;

    setLoadingFollowers(true);
    const ref = collection(db, "users", targetUid, "followers");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: ConnectionItem[] = [];
        snap.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
        setFollowers(data);
        setLoadingFollowers(false);
      },
      (err) => {
        console.log("Followers snapshot error:", err);
        setFollowers([]);
        setLoadingFollowers(false);
      }
    );

    return () => unsub();
  }, [targetUid]);

  // Following
  useEffect(() => {
    if (!targetUid) return;

    setLoadingFollowing(true);
    const ref = collection(db, "users", targetUid, "following");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: ConnectionItem[] = [];
        snap.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
        setFollowing(data);
        setLoadingFollowing(false);
      },
      (err) => {
        console.log("Following snapshot error:", err);
        setFollowing([]);
        setLoadingFollowing(false);
      }
    );

    return () => unsub();
  }, [targetUid]);

  const rawData = activeTab === "followers" ? followers : following;
  const loading =
    activeTab === "followers" ? loadingFollowers : loadingFollowing;

  const filteredData = rawData.filter((item) => {
    const name = (item.username ?? "").toLowerCase();
    return name.includes(search.trim().toLowerCase());
  });

  const headerTitle =
    typeof params.username === "string" && params.username
      ? params.username
      : "Connections";

  if (!targetUid) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Missing uid.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 12 }}
        >
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>

        <View style={styles.headerBtn} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "followers" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("followers")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "followers" && styles.tabTextActive,
            ]}
          >
            Followers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "following" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("following")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "following" && styles.tabTextActive,
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          loading ? <Text style={styles.loadingText}>Loading...</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image
              source={
                item.photoURL
                  ? { uri: item.photoURL }
                  : { uri: "https://via.placeholder.com/80" }
              }
              style={styles.avatar}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.username || "User"}</Text>
            </View>

            {/* View their profile */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                router.push({
                  pathname: "/user",
                  params: { uid: item.id },
                })
              }
            >
              <Text style={styles.actionText}>View</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: 24 }}>
            <Text style={styles.emptyText}>
              {loading
                ? " "
                : search
                  ? "No matches."
                  : activeTab === "followers"
                    ? "No followers yet."
                    : "Not following anyone yet."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  headerBtn: { width: 40, alignItems: "center" },
  headerIcon: { fontSize: 18, fontWeight: "700" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },

  tabRow: {
    flexDirection: "row",
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#111" },
  tabText: { fontSize: 13, color: "#666", fontWeight: "600" },
  tabTextActive: { color: "#111" },

  searchContainer: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  searchInput: { fontSize: 14 },

  loadingText: { fontSize: 12, color: "#666", paddingVertical: 8 },
  sep: { height: 1, backgroundColor: "#f0f0f0" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eee" },
  rowTitle: { fontSize: 14, fontWeight: "700" },

  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  actionText: { fontSize: 12, fontWeight: "600" },

  emptyText: { fontSize: 12, color: "#666" },
});
