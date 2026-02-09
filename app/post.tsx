import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { db } from "../firebase";

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
          {/* Top header (connections-style) */}
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
                <Text style={{ fontSize: 12, color: "#666" }}>
                  @{String(post.uid ?? "user").slice(0, 6)}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Right spacer to keep header centered feel (same trick as connections) */}
            <View style={{ width: 40 }} />
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

        {/* ✅ Sticky Bottom Bar */}
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
