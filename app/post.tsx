import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { auth, db } from "../firebase";
import { reflection_categories } from "../lib/reflectionCategories";

type CommentUI = {
  id: string;
  uid: string;
  text: string;
  createdAt?: any;
};

function formatPostTime(createdAt: any) {
  if (!createdAt) return "";

  // Firestore Timestamp -> JS Date
  const d: Date =
    typeof createdAt?.toDate === "function"
      ? createdAt.toDate()
      : new Date(createdAt);

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  // long time ago -> show date
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CommentRow({
  id,
  uid,
  text,
  createdAt,
  onPressUser,
  canDelete,
  onDelete,
}: {
  id: string;
  uid: string;
  text: string;
  createdAt?: any;
  onPressUser: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!id || !auth.currentUser || !uid) return;

    const ref = doc(db, "users", uid);
    const unsub = onSnapshot(ref, (snap) => {
      setUser(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, [uid]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f2f2f2",
        gap: 10,
      }}
    >
      <TouchableOpacity activeOpacity={0.7} onPress={onPressUser}>
        <Image
          source={
            user?.photoURL
              ? { uri: user.photoURL }
              : { uri: "https://via.placeholder.com/80" }
          }
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#eee",
          }}
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        {/* Top line: username/time + delete */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "800", flexShrink: 1 }} numberOfLines={1}>
            {user?.username ?? "User"}{" "}
            <Text style={{ fontWeight: "400", color: "#666" }}>
              {createdAt ? `· ${formatPostTime(createdAt)}` : ""}
            </Text>
          </Text>

          {canDelete && (
            <TouchableOpacity onPress={onDelete} hitSlop={10}>
              <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Comment text */}
        <Text style={{ marginTop: 4, lineHeight: 18, color: "#111" }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const { width: SCREEN_W } = Dimensions.get("window");

function CategoryChip({ label }: { label: string }) {
  if (!label) return null;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: "#E7EFE9",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        marginTop: 6,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "900", color: "#111827" }}>
        {label}
      </Text>
    </View>
  );
}

function ImageCarousel({ imageUrls }: { imageUrls?: string[] }) {
  const imgs = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
  const [index, setIndex] = useState(0);

  if (imgs.length === 0) return null;

  return (
    <View style={{ marginTop: 6 }}>
      <FlatList
        data={imgs}
        keyExtractor={(u, i) => `${u}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const i = Math.round(x / (SCREEN_W - 40));
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{
              width: SCREEN_W - 40,
              height: 320,
              borderRadius: 12,
              backgroundColor: "#eee",
            }}
          />
        )}
      />

      {/* Dots */}
      {imgs.length > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            marginTop: 10,
          }}
        >
          {imgs.map((_, i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? "#111" : "#D1D5DB",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [post, setPost] = useState<any>(null);

  // UI-only states (no backend yet)
  const insets = useSafeAreaInsets();

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentUI[]>([]);

  const [replyTo, setReplyTo] = useState<{
    commentId: string;
    username?: string;
  } | null>(null);

  const kb = useState(() => new Animated.Value(0))[0];
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      setKeyboardOpen(true);

      Animated.timing(kb, {
        toValue: h,
        duration: Platform.OS === "ios" ? (e.duration ?? 250) : 120,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(kb, {
        toValue: 0,
        duration: Platform.OS === "ios" ? (e.duration ?? 250) : 120,
        useNativeDriver: true,
      }).start(() => setKeyboardOpen(false));
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [kb]);

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const postRef = doc(db, "posts", String(id));
    const unsub = onSnapshot(postRef, (snap) => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
    });

    return unsub;
  }, [id]);

  const likeCount = Number(post?.likeCount ?? 0);
  const saveCount = Number(post?.saveCount ?? 0);
  const commentCount = Number(post?.commentCount ?? 0);
  const repostCount = Number(post?.repostCount ?? 0);

  //likes+saves
  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const uid = auth.currentUser.uid;

    const likeRef = doc(db, "posts", String(id), "likes", uid);
    const saveRef = doc(db, "posts", String(id), "saves", uid);

    const unsubLike = onSnapshot(likeRef, (snap) => setLiked(snap.exists()));
    const unsubSave = onSnapshot(saveRef, (snap) => setSaved(snap.exists()));

    return () => {
      unsubLike();
      unsubSave();
    };
  }, [id]);

  //subsribe comments
  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const q = query(
      collection(db, "posts", String(id), "comments"),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      const rows: CommentUI[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          uid: data.uid,
          text: data.text ?? "",
          createdAt: data.createdAt,
        };
      });
      setComments(rows);
    });

    return unsub;
  }, [id]);

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

  const categoryId = String(post?.reflectionCategory ?? "");
  const categoryMeta = reflection_categories.find((c) => c.id === categoryId);

  const categoryLabel = categoryMeta
    ? `${categoryMeta.emoji} ${categoryMeta.label}`
    : categoryId
      ? `🌱 ${categoryId}` // fallback if older posts use raw string
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
      { cancelable: true },
    );
  };

  const goToUser = () => {
    if (!post?.uid) return;
    router.push({
      pathname: "/user",
      params: { uid: post.uid, username: post.username || "User" },
    });
  };

  const toggleLike = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    const postRef = doc(db, "posts", String(id));
    const likeRef = doc(db, "posts", String(id), "likes", user.uid);

    try {
      await runTransaction(db, async (tx) => {
        const likeSnap = await tx.get(likeRef);

        if (likeSnap.exists()) {
          tx.delete(likeRef);
          tx.update(postRef, { likeCount: increment(-1) });
        } else {
          tx.set(likeRef, { createdAt: serverTimestamp() });
          tx.update(postRef, { likeCount: increment(1) });
        }
      });
    } catch (e) {
      console.log("toggleLike failed:", e);
    }
  };

  const toggleSave = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    const postRef = doc(db, "posts", String(id));

    // save record under the post (fast "isSaved?" check)
    const postSaveRef = doc(db, "posts", String(id), "saves", user.uid);

    // save record under the user (fast "Saved Posts page" query)
    const userSaveRef = doc(db, "users", user.uid, "savedPosts", String(id));

    try {
      await runTransaction(db, async (tx) => {
        const saveSnap = await tx.get(postSaveRef);

        if (saveSnap.exists()) {
          tx.delete(postSaveRef);
          tx.delete(userSaveRef);
          tx.update(postRef, { saveCount: increment(-1) });
        } else {
          tx.set(postSaveRef, { createdAt: serverTimestamp() });
          tx.set(userSaveRef, {
            postId: String(id),
            savedAt: serverTimestamp(),
          });
          tx.update(postRef, { saveCount: increment(1) });
        }
      });
    } catch (e) {
      console.log("toggleSave failed:", e);
    }
  };

  const toggleShare = async () => {
    try {
      const caption = post?.caption ?? "";
      const link = `peaceecho://post?id=${String(id)}`;

      await Share.share({
        message: `Check out this post on PeaceEcho \n\n"${caption}"\n\n${link}`,
      });
    } catch (e) {
      console.log("share failed:", e);
    }
  };

  const onSubmitComment = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    const text = commentText.trim();
    if (!text) return;

    const postRef = doc(db, "posts", String(id));
    const commentsRef = collection(db, "posts", String(id), "comments");

    setCommentText("");

    try {
      await runTransaction(db, async (tx) => {
        const newCommentRef = doc(commentsRef);
        tx.set(newCommentRef, {
          uid: user.uid,
          text,
          createdAt: serverTimestamp(),
        });

        tx.update(postRef, { commentCount: increment(1) });
      });
    } catch (e) {
      console.log("comment failed:", e);
      Alert.alert("Comment failed", "Please try again.");
      setCommentText(text);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert("Delete comment?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const postRef = doc(db, "posts", String(id));
            const commentRef = doc(
              db,
              "posts",
              String(id),
              "comments",
              commentId,
            );

            await runTransaction(db, async (tx) => {
              const snap = await tx.get(commentRef);
              if (!snap.exists()) return;

              const data = snap.data() as any;
              if (data.uid !== user.uid) throw new Error("Not authorized");

              tx.delete(commentRef);
              tx.update(postRef, { commentCount: increment(-1) });
            });
          } catch (e) {
            console.log("delete comment failed:", e);
            Alert.alert("Delete failed", "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 110 + insets.bottom,
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

                <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {formatPostTime(post?.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Delete button */}
            <View style={{ width: 40, alignItems: "flex-end" }}>
              {isOwner ? (
                <TouchableOpacity onPress={onDeletePost} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={22} color="#768093" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 22 }} />
              )}
            </View>
          </View>

          {/* Reflection Category */}
          <CategoryChip label={categoryLabel} />

          {/* Post images carousel */}
          <ImageCarousel imageUrls={post.imageUrls} />

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
              {comments.map((c) => {
                const canDelete = auth.currentUser?.uid === c.uid;

                return (
                  <CommentRow
                    key={c.id}
                    id={c.id}
                    uid={c.uid}
                    text={c.text}
                    createdAt={c.createdAt}
                    onPressUser={() =>
                      router.push({
                        pathname: "/user",
                        params: { uid: c.uid },
                      })
                    }
                    canDelete={!!canDelete}
                    onDelete={() => onDeleteComment(c.id)}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Sticky Bottom Bar */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY: Animated.multiply(kb, -1) }],
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#eee",
            paddingHorizontal: 12,
            paddingTop: 6,
            paddingBottom: 6 + (keyboardOpen ? 0 : insets.bottom),
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
                placeholder="Share a thoughtful response 🌱..."
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
                onPress={toggleLike}
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
                onPress={toggleSave}
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

              {/* Share */}
              <TouchableOpacity
                onPress={toggleShare}
                style={{ alignItems: "center", minWidth: 44 }}
              >
                <Ionicons name="share-outline" size={22} color="#111" />
                <Text style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                  {repostCount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
