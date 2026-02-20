import ProfileView from "@/components/ProfileView";
import { PALETTES } from "@/constants/palettes";
import { getUserProfile } from "@/lib/userProfile";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  collection,
  documentId,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase";

const THEME = PALETTES.sandProfile;

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
  displayName?: string;
  email?: string;
  bio?: string;
  photoURL?: string;
  region?: Region;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  savedCount?: number;
};

type PostPreview = {
  id: string;
  imageUrl?: string;
  caption?: string;
  location?: string;
};

export default function ProfileScreen() {
  const user = auth.currentUser;
  const admin_uid = "e0li8PdRZYO9ZUtmBmJLcSRi4WE2"; //can change the uid for admin later here
  const isAdmin = user?.uid === admin_uid;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  const [posts, setPosts] = useState<PostPreview[]>([]);
  const [saved, setSaved] = useState<PostPreview[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      const run = async () => {
        if (!user) return;
        try {
          const data = await getUserProfile(user.uid);
          if (!cancelled) setProfile((data ?? null) as UserProfile | null);
        } catch (e) {
          console.log("Focus reload profile failed:", e);
        }
      };

      run();
      return () => {
        cancelled = true;
      };
    }, [user?.uid]),
  );

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getUserProfile(user.uid);
        if (!cancelled) setProfile((data ?? null) as UserProfile | null);
      } catch (err) {
        console.log("Failed to load profile: ", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !auth.currentUser) return;

    const q = query(
      collection(db, "posts"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: PostPreview[] = [];
      snap.forEach((d) => {
        const p: any = d.data();

        const locationText = p?.postLocation?.country || "";

        data.push({
          id: d.id,
          imageUrl: p.imageUrls?.[0] ?? "",
          caption: p.caption ?? "",
          location: locationText,
        });
      });
      setPosts(data);
    });
    return () => unsub();
  }, [user?.uid]);

  // helper
  function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  useEffect(() => {
    if (!user?.uid || !auth.currentUser) return;
    if (activeTab !== "saved") return;

    const savedRef = collection(db, "users", user.uid, "savedPosts");
    const savedQ = query(savedRef, orderBy("savedAt", "desc"));

    const unsub = onSnapshot(savedQ, async (snap) => {
      const postIds = snap.docs.map((d) => d.id);

      if (postIds.length === 0) {
        setSaved([]);
        return;
      }

      const chunks = chunk(postIds, 10);
      const allPosts: any[] = [];

      for (const ids of chunks) {
        const postsQ = query(
          collection(db, "posts"),
          where(documentId(), "in", ids),
        );
        const postsSnap = await getDocs(postsQ);
        postsSnap.forEach((p) => allPosts.push({ id: p.id, ...p.data() }));
      }

      const byId = new Map(allPosts.map((p) => [p.id, p]));
      const ordered: PostPreview[] = postIds
        .map((pid) => byId.get(pid))
        .filter(Boolean)
        .map((p: any) => ({
          id: p.id,
          imageUrl: p.imageUrls?.[0] ?? "",
          caption: p.caption ?? "",
          location: p?.postLocation?.country || "",
        }));

      setSaved(ordered);
    });

    return () => unsub();
  }, [user?.uid, activeTab]);

  const photoSource = useMemo(() => {
    const url = profile?.photoURL;
    return url
      ? { uri: url }
      : require("../../../assets/images/default-avatar.png");
  }, [profile?.photoURL]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ marginBottom: 12 }}>You’re not logged in.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const followers = profile?.followerCount ?? 0;
  const following = profile?.followingCount ?? 0;
  const postCount = profile?.postCount ?? posts.length;
  const savedCount = profile?.savedCount ?? saved.length;

  const openConnections = (tab: "followers" | "following") => {
    router.push({
      pathname: "/connections",
      params: {
        uid: user.uid,
        username: profile?.username ?? "Me",
        tab,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "top"]}>
      <ProfileView
        profile={{
          username: profile?.username ?? "Unnamed",
          displayName: profile?.displayName || profile?.username || "User",
          email: profile?.email ?? user.email ?? "",
          bio: profile?.bio ?? "",
          photoURL: profile?.photoURL,
          region: profile?.region,
        }}
        photoSource={photoSource}
        followers={followers}
        following={following}
        postCount={postCount}
        savedCount={savedCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        posts={posts}
        saved={saved}
        isMe
        showFollowButton={false}
        onPressPost={(id) => router.push({ pathname: "/post", params: { id } })}
        onPressEdit={() => router.push("/(tabs)/profile/edit")}
        onPressFollowers={() => openConnections("followers")}
        onPressFollowing={() => openConnections("following")}
        onPressSettings={() => router.push("/settings")}
      />
      {isAdmin && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push("/admin/upload-audiobook")}
        >
          <Text style={styles.adminButtonText}>Upload Audiobook (Admin)</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: THEME.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: THEME.bg,
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  adminButton: {
    marginTop: 12,
    backgroundColor: "black",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
    alignItems: "center",
  },

  adminButtonText: {
    color: "white",
    fontWeight: "700",
  },
});
