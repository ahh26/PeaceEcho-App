import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { db } from "../../firebase";

export default function DiscoverScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data: any[] = [];
      snap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      setPosts(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  //simple "search by caption"->improve the algorithm later
  const filteredPosts = posts.filter((post) =>
    (post.caption || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Fixed Search Bar */}
      <View style={[styles.searchWrapper, { paddingTop: insets.top }]}>
        <TextInput
          placeholder="Search..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 30,
          paddingTop: insets.top + 5, // << move content under search bar
        }}
      >
        {/* Post grid */}
        <View style={styles.grid}>
          {filteredPosts.map((post, index) => {
            // const locationText = post?.postLocation
            //   ? [
            //       post.postLocation.city,
            //       post.postLocation.stateName,
            //       post.postLocation.country,
            //     ]
            //       .filter(Boolean)
            //       .join(", ")
            //   : "";

            const locationText = post?.postLocation?.country || "";

            const isStaggered = index >= 2 && index % 2 === 1;
            return (
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: "/post", params: { id: post.id } })
                }
              >
                {/* Image */}
                <View style={styles.imageWrap}>
                  {post.imageUrls?.[0] ? (
                    <Image
                      source={{ uri: post.imageUrls[0] }}
                      style={styles.image}
                    />
                  ) : (
                    <View style={[styles.image, styles.placeholder]}>
                      <Text>No Image</Text>
                    </View>
                  )}

                  {!!locationText && (
                    <View style={styles.locationPill}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#fff"
                      />
                      <Text style={styles.locationPillText} numberOfLines={1}>
                        {locationText}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Caption Preview */}
                <Text style={styles.caption} numberOfLines={3}>
                  {post.caption || ""}
                </Text>

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
                    <Ionicons
                      name={post.isLiked ? "heart" : "heart-outline"}
                      size={16}
                      color="#6B7280"
                    />
                    <Text style={styles.likesText}>{post.likeCount ?? 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  grid: {
    padding: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 140,
  },
  placeholder: {
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  caption: {
    padding: 10,
    fontSize: 14,
    color: "#444",
    fontWeight: "700",
  },
  user: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    color: "#888",
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ddd",
  },

  usernameMini: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    maxWidth: 90,
  },

  userMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 6,
  },

  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  likesText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 10,
  },

  locationText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  imageWrap: { position: "relative" },

  locationPill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "75%", // prevents covering the card
  },

  locationPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
});
