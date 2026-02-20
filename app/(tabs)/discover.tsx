import { PALETTES } from "@/constants/palettes";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { auth, db } from "../../firebase";
import { reflection_categories } from "../../lib/reflectionCategories";

type CategoryId = string;

const THEME = PALETTES.beige;

// const THEME = {
//   bg: "#F6F7F3",
//   card: "#FFFFFF",
//   border: "#E6E9E3",
//   text: "#1F2A24",
//   muted: "#7C877F",
//   subtle: "#9CA3AF",
//   sage: "#6F8B77", // selected chip + accents
//   sageSoft: "#E7EFE9", // light sage backgrounds
//   shadow: "rgba(17, 24, 39, 0.08)",
// };

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");

  const [headerH, setHeaderH] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredPosts = useMemo(() => {
    const s = search.trim().toLowerCase();

    return posts.filter((p) => {
      const okSearch =
        !s ||
        String(p.caption ?? "")
          .toLowerCase()
          .includes(s);
      const okCategory =
        selectedCategory === "all" ||
        String(p.reflectionCategory ?? "") === selectedCategory;

      return okSearch && okCategory;
    });
  }, [posts, search, selectedCategory]);

  const renderItem = ({ item: post }: { item: any }) => {
    const locationText = post?.postLocation?.country || "";

    const categoryId = String(post?.reflectionCategory ?? "");
    const categoryMeta = reflection_categories.find((c) => c.id === categoryId);
    const categoryLabel = categoryMeta
      ? `${categoryMeta.emoji} ${categoryMeta.label}`
      : categoryId
        ? `🌱 ${categoryId}`
        : "";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          router.push({ pathname: "/post", params: { id: post.id } })
        }
      >
        {/* Image */}
        <View style={styles.imageWrap}>
          {post.imageUrls?.[0] ? (
            <Image source={{ uri: post.imageUrls[0] }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text>No Image</Text>
            </View>
          )}

          {!!locationText && (
            <View style={styles.locationPill}>
              <Ionicons name="location-outline" size={12} color="#fff" />
              <Text style={styles.locationPillText} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
          )}
        </View>

        {/* Category Chip */}
        {!!categoryLabel && (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {categoryLabel}
            </Text>
          </View>
        )}

        {/* Caption Preview */}
        <Text style={styles.caption} numberOfLines={3}>
          {post.caption || ""}
        </Text>

        {/* pushes footer to bottom */}
        <View style={{ flex: 1 }} />

        {/* User + Likes Row */}
        <View style={styles.infoRow}>
          <View style={styles.userMini}>
            <Image
              source={
                post.userPhotoURL
                  ? { uri: post.userPhotoURL }
                  : { uri: "https://via.placeholder.com/30" }
              }
              style={styles.avatarMini}
            />
            <Text style={styles.usernameMini} numberOfLines={1}>
              {post.username || "Anonymous"}
            </Text>
          </View>

          <View style={styles.likesRow}>
            <Ionicons name="heart-outline" size={16} color="#6B7280" />
            <Text style={styles.likesText}>{post.likeCount ?? 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const headerTopPad = insets.top;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: THEME.bg }}
    >
      {/* Fixed header (search + category row) */}
      <View
        style={[styles.header, { paddingTop: insets.top }]}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={THEME.subtle} />
          <TextInput
            placeholder="Search by key words..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            placeholderTextColor={THEME.subtle}
          />

          {!!search && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color={THEME.subtle} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 6 }} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <CategoryChip
            label="All"
            selected={selectedCategory === "all"}
            onPress={() => setSelectedCategory("all")}
          />

          {reflection_categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={`${c.emoji} ${c.label}`}
              selected={selectedCategory === c.id}
              onPress={() => setSelectedCategory(c.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPosts}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerH + 8,
          paddingHorizontal: 15,
          paddingBottom: 20 + insets.bottom,
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No posts match your search/filter.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    backgroundColor: THEME.bg,
    borderBottomWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  searchBar: {
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
    fontWeight: "700",
    paddingRight: 28,
  },
  clearBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -9,
  },

  filterRow: {
    alignItems: "center",
    gap: 8,
    paddingRight: 16,
    height: 40,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipSelected: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accent,
  },
  chipUnselected: {
    backgroundColor: THEME.card,
    borderColor: THEME.border,
  },
  chipText: { fontSize: 12, fontWeight: "800" },
  chipTextSelected: { color: "#FFFFFF" },
  chipTextUnselected: { color: THEME.subtext },

  // grid cards
  card: {
    width: "48%",
    backgroundColor: THEME.card,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  imageWrap: { position: "relative" },
  image: { width: "100%", height: 150, backgroundColor: "#EEE" },
  placeholder: {
    backgroundColor: "#EEE",
    justifyContent: "center",
    alignItems: "center",
  },

  locationPill: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(31, 42, 36, 0.55)", // dark sage-ish overlay
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "78%",
  },
  locationPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },

  categoryPill: {
    alignSelf: "flex-start",
    marginLeft: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: THEME.accentSoft,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  categoryText: { fontSize: 11, fontWeight: "900", color: THEME.text },

  caption: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    fontSize: 13,
    color: THEME.text,
    fontWeight: "800",
    lineHeight: 18,
    height: 54, //3 lines exactly
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },

  userMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ddd",
  },
  usernameMini: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.subtext,
    flexShrink: 1,
  },

  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  likesText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.subtext,
  },

  emptyText: {
    marginTop: 24,
    textAlign: "center",
    color: THEME.subtext,
    fontWeight: "800",
  },
});
