import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
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
import { auth, db } from "../../firebase";

type ConnectionItem = {
  id: string;
  createdAt?: any;
  username?: string;
  photoURL?: string;
  region?: string;
};

async function fetchUser(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  const u: any = snap.data();
  return {
    username: u.username ?? "User",
    photoURL: u.photoURL ?? u.profilePic ?? "", // keep both to be safe
    region: u.region?.country ?? u.country ?? "",
  };
}

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
    initialTab,
  );
  const [search, setSearch] = useState("");

  const [followers, setFollowers] = useState<ConnectionItem[]>([]);
  const [following, setFollowing] = useState<ConnectionItem[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [followersUsers, setFollowersUsers] = useState<Record<string, any>>({});
  const [followingUsers, setFollowingUsers] = useState<Record<string, any>>({});

  useEffect(() => setActiveTab(initialTab), [initialTab]);
  useEffect(() => setSearch(""), [activeTab]);

  useEffect(() => {
    setFollowersUsers({});
    setFollowingUsers({});
  }, [targetUid]);

  // Followers
  useEffect(() => {
    if (!targetUid || !auth.currentUser) return;

    setLoadingFollowers(true);
    const ref = collection(db, "users", targetUid, "followers");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: ConnectionItem[] = snap.docs.map((d) => ({
          id: d.id,
          createdAt: (d.data() as any)?.createdAt,
        }));
        setFollowers(data);
        setLoadingFollowers(false);
      },
      (err) => {
        console.log("Followers snapshot error:", err);
        setFollowers([]);
        setLoadingFollowers(false);
      },
    );

    return () => unsub();
  }, [targetUid]);

  useEffect(() => {
    if (activeTab !== "followers") return;
    if (!auth.currentUser) return;

    const unsubs: (() => void)[] = [];
    followers.forEach((f) => {
      const uref = doc(db, "users", f.id);
      const unsub = onSnapshot(uref, (snap) => {
        if (!snap.exists()) return;
        setFollowersUsers((prev) => ({ ...prev, [f.id]: snap.data() }));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((fn) => fn());
  }, [activeTab, followers.map((x) => x.id).join("|")]);

  // Following
  useEffect(() => {
    if (!targetUid || !auth.currentUser) return;

    setLoadingFollowing(true);
    const ref = collection(db, "users", targetUid, "following");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: ConnectionItem[] = snap.docs.map((d) => ({
          id: d.id,
          createdAt: (d.data() as any)?.createdAt,
        }));
        setFollowing(data);
        setLoadingFollowing(false);
      },
      (err) => {
        console.log("Following snapshot error:", err);
        setFollowing([]);
        setLoadingFollowing(false);
      },
    );

    return () => unsub();
  }, [targetUid]);

  useEffect(() => {
    if (activeTab !== "following") return;
    if (!auth.currentUser) return;

    const unsubs: (() => void)[] = [];
    following.forEach((f) => {
      const uref = doc(db, "users", f.id);
      const unsub = onSnapshot(uref, (snap) => {
        if (!snap.exists()) return;
        setFollowingUsers((prev) => ({ ...prev, [f.id]: snap.data() }));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((fn) => fn());
  }, [activeTab, following.map((x) => x.id).join("|")]);

  const rawData = (activeTab === "followers" ? followers : following).map(
    (item) => {
      const u =
        activeTab === "followers"
          ? followersUsers[item.id]
          : followingUsers[item.id];

      return {
        ...item,
        username: u?.username ?? "User",
        photoURL: u?.photoURL ?? u?.profilePic ?? "",
        region: u?.region?.country ?? u?.country ?? "",
      };
    },
  );
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
            {/* View their profile */}
            <TouchableOpacity
              style={styles.profileTouch}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/user",
                  params: { uid: item.id, username: item.username ?? "User" },
                })
              }
            >
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
  profileTouch: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
});
