import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { auth, db } from "../firebase";

type CommentUI = {
  id: string;
  username: string;
  text: string;
  createdAtLabel?: string;
};

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [post, setPost] = useState<any>(null);

  // UI-only states (no backend yet)
  const insets = useSafeAreaInsets();

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentUI[]>([]);

  useEffect(() => {
    try {
      console.log("AUTH app name:", auth.app.name);
      console.log("AUTH app options projectId:", auth.app.options.projectId);

      // Firestore internal fields (not official API, but useful for debugging)
      console.log("DB projectId:", (db as any)?._databaseId?.projectId);
      console.log("DB firestore app name:", (db as any)?._app?.name);
    } catch (e) {
      console.log("debug logs failed:", e);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    (async () => {
      const ref = doc(db, "posts", String(id));
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setPost(snap.data());
      }
    })();
  }, [id]);

  const likeCount = useMemo(() => {
    const base = Number(post?.likeCount ?? 0);
    return liked ? base + 1 : base;
  }, [post?.likeCount, liked]);

  const commentCount = useMemo(() => {
    const base = Number(post?.commentCount ?? 0);
    return base + comments.length;
  }, [post?.commentCount, comments.length]);

  const saveCount = useMemo(() => {
    const base = Number(post?.saveCount ?? 0);
    return saved ? base + 1 : base;
  }, [post?.saveCount, saved]);

  const repostCount = useMemo(
    () => Number(post?.repostCount ?? 0),
    [post?.repostCount]
  );

  if (!post) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const locationText = post?.postLocation
    ? [
        post.postLocation.city,
        post.postLocation.stateName,
        post.postLocation.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  //delete option if it's account owner's post
  const isOwner = auth.currentUser?.uid && post?.uid === auth.currentUser.uid;

  const onDeletePost = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      "Delete post?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await runTransaction(db, async (tx) => {
                const postRef = doc(db, "posts", String(id));
                const userRef = doc(db, "users", user.uid);

                const postSnap = await tx.get(postRef);
                if (!postSnap.exists()) {
                  throw new Error("Post does not exist");
                }

                const postData = postSnap.data();
                if (postData.uid !== user.uid) {
                  throw new Error("Not authorized");
                }

                const userSnap = await tx.get(userRef);
                const currentCount = userSnap.data()?.postCount ?? 0;

                tx.delete(postRef);
                tx.update(userRef, {
                  postCount: Math.max(currentCount - 1, 0),
                });
              });

              router.back();
            } catch (e) {
              console.log("Delete failed:", e);
              Alert.alert("Delete failed", "Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const goToUser = () => {
    if (!post?.uid) return;
    router.push({
      pathname: "/user",
      params: { uid: post.uid, username: post.username || "User" },
    });
  };

  const onPressShare = () => {
    // UI-only for now
    console.log("Share pressed:", post?.id);
  };

  const onSubmitComment = () => {
    const text = commentText.trim();
    if (!text) return;

    const newComment: CommentUI = {
      id: `${Date.now()}`,
      username: "You",
      text,
      createdAtLabel: "now",
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 110 + insets.bottom, // leave room for sticky bar
          }}
        >
          {/* Top header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingTop: 6,
              paddingBottom: 10,
            }}
          >
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingRight: 12 }}
            >
              <Ionicons name="chevron-back" size={28} color="#111" />
            </TouchableOpacity>
            {/* Tappable user area */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={goToUser}
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                gap: 10,
              }}
            >
              <Image
                source={
                  post.userPhotoURL
                    ? { uri: post.userPhotoURL }
                    : { uri: "https://via.placeholder.com/80" }
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#ddd",
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 15, fontWeight: "700" }}
                  numberOfLines={1}
                >
                  {post.username || "Anonymous"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Delete button */}
            <View style={{ width: 40, alignItems: "flex-end" }}>
              {isOwner ? (
                <TouchableOpacity onPress={onDeletePost} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={22} color="#E53935" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 22 }} />
              )}
            </View>
          </View>

          {/* Post image */}
          <Image
            source={{ uri: post.imageUrls?.[0] }}
            style={{
              width: "100%",
              height: 320,
              borderRadius: 12,
              backgroundColor: "#eee",
            }}
          />

          {/* Caption */}
          {!!post.caption && (
            <Text style={{ fontSize: 16, marginTop: 12, lineHeight: 20 }}>
              {post.caption}
            </Text>
          )}

          {/* Location */}
          {!!locationText && (
            <View
              style={{
                marginTop: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text
                style={{ fontSize: 13, color: "#6B7280", fontWeight: "600" }}
              >
                {locationText}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "#eee",
              marginTop: 16,
              marginBottom: 12,
            }}
          />

          {/* Comments header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "800" }}>Comments</Text>
            <Text style={{ fontSize: 12, color: "#666" }}>{commentCount}</Text>
          </View>

          {/* Comment list */}
          {comments.length === 0 ? (
            <Text style={{ color: "#777", marginTop: 12, fontSize: 13 }}>
              No comments yet. Be the first!
            </Text>
          ) : (
            <View style={{ marginTop: 12 }}>
              {comments.map((c) => (
                <View
                  key={c.id}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f2f2f2",
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>
                    {c.username}{" "}
                    <Text style={{ fontWeight: "400", color: "#666" }}>
                      {c.createdAtLabel ? `· ${c.createdAtLabel}` : ""}
                    </Text>
                  </Text>
                  <Text style={{ marginTop: 4, lineHeight: 18 }}>{c.text}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Sticky Bottom Bar */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#eee",
            paddingHorizontal: 12,
            paddingTop: 6,
            paddingBottom: 6 + insets.bottom,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* Comment input (left) */}
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <TextInput
                placeholder="Write a comment..."
                value={commentText}
                onChangeText={setCommentText}
                style={{ flex: 1, fontSize: 14 }}
                autoCapitalize="sentences"
              />
              <TouchableOpacity
                onPress={onSubmitComment}
                style={{ paddingHorizontal: 6, paddingVertical: 4 }}
              >
                <Text style={{ fontWeight: "800" }}>Post</Text>
              </TouchableOpacity>
            </View>

            {/* Actions (right) */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {/* Like */}
              <TouchableOpacity
                onPress={() => setLiked((v) => !v)}
                style={{ alignItems: "center", minWidth: 44 }}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={22}
                  color={liked ? "#E53935" : "#111"}
                />
                <Text style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                  {likeCount}
                </Text>
              </TouchableOpacity>

              {/* Save */}
              <TouchableOpacity
                onPress={() => setSaved((v) => !v)}
                style={{ alignItems: "center", minWidth: 44 }}
              >
                <Ionicons
                  name={saved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color="#111"
                />
                <Text style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                  {saveCount}
                </Text>
              </TouchableOpacity>

              {/* Repost */}
              <TouchableOpacity
                onPress={() => console.log("repost pressed")}
                style={{ alignItems: "center", minWidth: 44 }}
              >
                <Ionicons name="repeat-outline" size={22} color="#111" />
                <Text style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                  {repostCount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
