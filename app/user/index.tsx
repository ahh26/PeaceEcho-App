import ProfileView from "@/components/ProfileView";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase";

type Region = {
  countryCode?: string;
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lng?: number;
  source?: "manual" | "gps";
};

type UserProfile = {
  username?: string;
  email?: string;
  bio?: string;
  photoURL?: string;
  region?: Region;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
};

type PostPreview = {
  id: string;
  imageUrl?: string;
  caption?: string;
  location?: string;
};

type GridItem = { id: string; label: string };

export default function UserScreen() {
  const { uid } = useLocalSearchParams<{ uid?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [posts, setPosts] = useState<PostPreview[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  const me = auth.currentUser;
  const isMe = me?.uid === uid;
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", uid);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as any);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.log("UserScreen user snapshot error:", err);
        setProfile(null);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const me = auth.currentUser;
    if (!me) return;
    if (me.uid === uid) return;

    const followingRef = doc(db, "users", me.uid, "following", uid);

    const unsub = onSnapshot(followingRef, (snap) => {
      setIsFollowing(snap.exists());
    });

    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "posts"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: PostPreview[] = [];
        snap.forEach((d) => {
          const p: any = d.data();
          data.push({
            id: d.id,
            imageUrl: p.imageUrls?.[0] ?? "",
            caption: p.caption ?? "",
            location: p?.postLocation?.country || "",
          });
        });
        setPosts(data);
      },
      (err) => {
        console.log("[UserScreen] posts listener error:", err);
      },
    );

    return () => unsub();
  }, [uid]);

  const toggleFollow = async () => {
    if (!uid) return;
    const me = auth.currentUser;
    if (!me) return;
    if (me.uid === uid) return;

    const myFollowingRef = doc(db, "users", me.uid, "following", uid);
    const theirFollowersRef = doc(db, "users", uid, "followers", me.uid);

    const myUserRef = doc(db, "users", me.uid);
    const theirUserRef = doc(db, "users", uid);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(myFollowingRef);

        if (snap.exists()) {
          // unfollow
          tx.delete(myFollowingRef);
          tx.delete(theirFollowersRef);

          tx.update(myUserRef, { followingCount: increment(-1) });
          tx.update(theirUserRef, { followerCount: increment(-1) });
        } else {
          // follow (ONLY store createdAt)
          tx.set(myFollowingRef, {
            createdAt: serverTimestamp(),
          });

          tx.set(theirFollowersRef, {
            createdAt: serverTimestamp(),
          });

          tx.update(myUserRef, { followingCount: increment(1) });
          tx.update(theirUserRef, { followerCount: increment(1) });
        }
      });
    } catch (e) {
      console.log("toggleFollow failed:", e);
    }
  };

  const photoSource = useMemo(() => {
    const url = profile?.photoURL;
    return url
      ? { uri: url }
      : require("../../assets/images/default-avatar.png");
  }, [profile?.photoURL]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <Text>Loading user…</Text>
      </SafeAreaView>
    );
  }

  if (!uid || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <Text>User not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, paddingHorizontal: 24, backgroundColor: "#fff" }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 12 }}
        >
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>
      </View>

      <ProfileView
        profile={{
          username: profile.username ?? "User",
          email: "", // public: don’t show email
          bio: profile.bio ?? "",
          photoURL: profile.photoURL,
          region: profile?.region,
        }}
        photoSource={photoSource}
        followers={profile.followerCount ?? 0}
        following={profile.followingCount ?? 0}
        postCount={profile.postCount ?? posts.length}
        savedCount={0}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        posts={posts} // posts only
        saved={[]}
        isMe={auth.currentUser?.uid === uid}
        showFollowButton={!isMe}
        isFollowing={isFollowing}
        onPressFollow={toggleFollow}
        onPressPost={(id) => router.push({ pathname: "/post", params: { id } })}
        onPressEdit={() => {}}
        onPressFollowers={() =>
          router.push({
            pathname: "/connections",
            params: {
              uid,
              username: profile.username ?? "User",
              tab: "followers",
            },
          })
        }
        onPressFollowing={() =>
          router.push({
            pathname: "/connections",
            params: {
              uid,
              username: profile.username ?? "User",
              tab: "following",
            },
          })
        }
        showEdit={false}
        showSaved={false}
      />
    </SafeAreaView>
  );
}
