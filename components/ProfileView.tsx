import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export type ProfileViewProfile = {
  username?: string;
  email?: string;
  bio?: string;
  photoURL?: string;
  region?: {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    source?: "manual" | "gps";
  };
};

type GridItem = { id: string; label: string };

type Props = {
  profile: ProfileViewProfile;
  photoSource: any;

  followers: number;
  following: number;
  postCount: number;
  savedCount: number;

  activeTab: "posts" | "saved";
  setActiveTab: (t: "posts" | "saved") => void;

  gridData: GridItem[];

  showEdit?: boolean;
  showSaved?: boolean;

  onPressEdit: () => void;
  onPressFollowers: () => void;
  onPressFollowing: () => void;
};

export default function ProfileView({
  profile,
  photoSource,
  followers,
  following,
  postCount,
  savedCount,
  activeTab,
  setActiveTab,
  gridData,
  showEdit = true,
  showSaved = true,
  onPressEdit,
  onPressFollowers,
  onPressFollowing,
}: Props) {
  const username = profile.username ?? "Unnamed";
  const email = profile.email ?? "";
  const bio = profile.bio ?? "";
  const regionText = [
    profile.region?.city,
    profile.region?.region,
    profile.region?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Image source={photoSource} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{username}</Text>
          {/* {!!email && <Text style={styles.subtext}>{email}</Text>} */}
          {!!regionText && (
            <View style={styles.regionRow}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.regionText}>{regionText}</Text>
            </View>
          )}

          {showEdit && (
            <TouchableOpacity style={styles.editButton} onPress={onPressEdit}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.bodyText}>{bio || "No bio yet."}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{postCount}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>

        <TouchableOpacity style={styles.statItem} onPress={onPressFollowers}>
          <Text style={styles.statNumber}>{followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={onPressFollowing}>
          <Text style={styles.statNumber}>{following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "posts" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("posts")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "posts" && styles.tabTextActive,
            ]}
          >
            Posts
          </Text>
        </TouchableOpacity>

        {showSaved && (
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === "saved" && styles.tabItemActive,
            ]}
            onPress={() => setActiveTab("saved")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "saved" && styles.tabTextActive,
              ]}
            >
              Saved
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Grid */}
      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <Text style={styles.gridItemText}>{item.label}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: 24 }}>
            <Text style={styles.subtext}>
              {activeTab === "posts" ? "No posts yet." : "No saved posts yet."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#eee",
  },

  username: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  subtext: { fontSize: 12, color: "#666" },

  editButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  editButtonText: { fontSize: 13, fontWeight: "600" },

  section: { marginTop: 12, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  bodyText: { fontSize: 14, lineHeight: 20, color: "#111" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
  },
  statItem: { alignItems: "center", minWidth: 60 },
  statNumber: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 2 },

  tabBar: {
    flexDirection: "row",
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: "#111" },
  tabText: { fontSize: 13, color: "#666", fontWeight: "600" },
  tabTextActive: { color: "#111" },

  gridItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  gridItemText: { fontSize: 12, color: "#444", textAlign: "center" },
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  regionText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
});
