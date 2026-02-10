import ProfileView from "@/components/ProfileView";
import { getUserProfile } from "@/lib/userProfile";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase";

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
    }, [user?.uid])
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
    if (!user?.uid) return;

    const q = query(
      collection(db, "posts"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
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
    <SafeAreaView style={styles.container}>
      <ProfileView
        profile={{
          username: profile?.username ?? "Unnamed",
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
        onPressPost={(id) => router.push({ pathname: "/post", params: { id } })}
        onPressEdit={() => router.push("/(tabs)/profile/edit")}
        onPressFollowers={() => openConnections("followers")}
        onPressFollowing={() => openConnections("following")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
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
});
