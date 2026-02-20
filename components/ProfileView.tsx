import { PALETTES } from "@/constants/palettes";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const THEME = PALETTES.sandProfile;

export type ProfileViewProfile = {
  username?: string;
  displayName?: string;
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

export type PostPreview = {
  id: string;
  imageUrl?: string; // first image
  caption?: string;
  location?: string;
};

type Props = {
  profile: ProfileViewProfile;
  photoSource: any;

  followers: number;
  following: number;
  postCount: number;
  savedCount: number;

  activeTab: "posts" | "saved";
  setActiveTab: (t: "posts" | "saved") => void;

  posts: PostPreview[];
  saved: PostPreview[];

  showEdit?: boolean;
  showSaved?: boolean;

  isMe?: boolean;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onPressFollow?: () => void;

  onPressEdit: () => void;
  onPressFollowers: () => void;
  onPressFollowing: () => void;
  onPressSettings?: () => void;
  onPressBack?: () => void;

  onPressPost?: (postId: string) => void;
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
  posts,
  saved,
  showEdit = true,
  showSaved = true,
  isMe = false,
  showFollowButton = false,
  isFollowing = false,
  onPressFollow,
  onPressEdit,
  onPressFollowers,
  onPressFollowing,
  onPressBack,
  onPressSettings,
  onPressPost,
}: Props) {
  const username = profile.username ?? "Unnamed";
  const displayName = profile.displayName || profile.username || "User";
  const bio = profile.bio ?? "";

  const regionText = [
    profile.region?.city,
    profile.region?.region,
    profile.region?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const gridData = activeTab === "posts" ? (posts ?? []) : (saved ?? []);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  };

  const postNumber = postCount;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        {/* Left: Back (optional) */}
        {onPressBack ? (
          <TouchableOpacity
            onPress={onPressBack}
            style={styles.topIconBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={THEME.accent} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topSlot} />
        )}

        {/* Middle: handle */}
        <Text style={styles.handleText} numberOfLines={1}>
          @{username}
        </Text>

        {/* Right: Settings (optional) */}
        {onPressSettings ? (
          <TouchableOpacity
            onPress={onPressSettings}
            style={styles.topIconBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="settings-outline" size={20} color={THEME.accent} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topSlot} />
        )}
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatarRing}>
          <Image source={photoSource} style={styles.avatar} />
        </View>
      </View>

      {/* Name  */}
      <Text style={styles.displayName} numberOfLines={1}>
        {displayName}
      </Text>

      {/* Location */}
      {!!regionText && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={THEME.accent} />
          <Text style={styles.locationText} numberOfLines={1}>
            {regionText}
          </Text>
        </View>
      )}

      {/* Bio */}
      <Text style={styles.bioText} numberOfLines={3}>
        {bio || "No bio yet."}
      </Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{fmt(postNumber)}</Text>
          <Text style={styles.statLabel}>POSTS</Text>
        </View>

        <TouchableOpacity style={styles.statItem} onPress={onPressFollowers}>
          <Text style={styles.statNumber}>{fmt(followers)}</Text>
          <Text style={styles.statLabel}>FOLLOWERS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={onPressFollowing}>
          <Text style={styles.statNumber}>{fmt(following)}</Text>
          <Text style={styles.statLabel}>FOLLOWING</Text>
        </TouchableOpacity>
      </View>

      {/* Primary action row */}
      <View style={styles.actionRow}>
        {showEdit && isMe ? (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onPressEdit}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        ) : showFollowButton && !isMe ? (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              isFollowing ? styles.primaryBtnGhost : null,
            ]}
            onPress={onPressFollow}
            activeOpacity={0.9}
          >
            <Text
              style={[
                styles.primaryBtnText,
                isFollowing ? styles.primaryBtnGhostText : null,
              ]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tabs (pills) */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tabPill,
            activeTab === "posts" && styles.tabPillActive,
          ]}
          onPress={() => setActiveTab("posts")}
          activeOpacity={0.9}
        >
          <Ionicons
            name="grid-outline"
            size={16}
            color={activeTab === "posts" ? THEME.accent : THEME.subtle}
          />
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
              styles.tabPill,
              activeTab === "saved" && styles.tabPillActive,
            ]}
            onPress={() => setActiveTab("saved")}
            activeOpacity={0.9}
          >
            <Ionicons
              name="bookmark-outline"
              size={16}
              color={activeTab === "saved" ? THEME.accent : THEME.subtle}
            />
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
      <View style={styles.grid}>
        {gridData.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.tile}
            activeOpacity={0.92}
            onPress={() => onPressPost?.(item.id)}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.tileImg} />
            ) : (
              <View style={[styles.tileImg, styles.tilePlaceholder]}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {gridData.length === 0 && (
          <View style={{ paddingVertical: 24 }}>
            <Text style={styles.emptyText}>
              {activeTab === "posts" ? "No posts yet." : "No saved posts yet."}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: THEME.bg },
  content: { paddingHorizontal: 18, paddingBottom: 28 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  topSlot: { width: 36, height: 36 },

  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.glass,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  handleText: {
    flex: 1,
    textAlign: "center",
    color: THEME.accent,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  avatarWrap: { alignItems: "center", marginTop: 10 },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: THEME.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#eee",
  },

  displayName: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    color: THEME.accent,
    marginTop: 12,
  },

  locationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
  },
  locationText: {
    color: THEME.accent,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 11,
    textTransform: "uppercase",
  },

  bioText: {
    textAlign: "center",
    marginTop: 10,
    color: THEME.subtext,
    fontWeight: "600",
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingVertical: 10,
  },
  statItem: { alignItems: "center", minWidth: 90 },
  statNumber: { fontSize: 18, fontWeight: "900", color: THEME.accent },
  statLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "800",
    color: THEME.subtext,
    opacity: 0.85,
    letterSpacing: 1.2,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 14,
    paddingHorizontal: 20,
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: THEME.accentSoft,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryBtnText: { color: THEME.accent, fontWeight: "900", fontSize: 14 },

  primaryBtnGhost: {
    backgroundColor: THEME.glass,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  primaryBtnGhostText: { color: THEME.accent },

  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: THEME.glass,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  tabs: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    backgroundColor: THEME.glass,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tabPill: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillActive: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tabText: { fontSize: 13, fontWeight: "800", color: THEME.subtle },
  tabTextActive: { color: THEME.accent },

  grid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: THEME.accentSoft,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tileImg: { width: "100%", height: "100%" },

  tilePlaceholder: {
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 12,
    color: THEME.subtext,
    fontWeight: "700",
  },

  emptyText: {
    textAlign: "center",
    color: THEME.subtle,
    fontWeight: "700",
  },
});
