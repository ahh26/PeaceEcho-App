import ProfileView from "@/components/ProfileView";
import { getUserProfile } from "@/lib/userProfile";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../../firebase";

type UserProfile = {
  username?: string;
  email?: string;
  bio?: string;
  photoURL?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  savedCount?: number;
};

type GridItem = { id: string; label: string };

export default function ProfileScreen() {
  const user = auth.currentUser;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  const [posts, setPosts] = useState<GridItem[]>([]);
  const [saved, setSaved] = useState<GridItem[]>([]);

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
      pathname: "/(tabs)/profile/connections",
      params: { tab },
    });
  };

  const gridData = activeTab === "posts" ? posts : saved;

  return (
    <SafeAreaView style={styles.container}>
      <ProfileView
        profile={{
          username: profile?.username ?? "Unnamed",
          email: profile?.email ?? user.email ?? "",
          bio: profile?.bio ?? "",
          photoURL: profile?.photoURL,
        }}
        photoSource={photoSource}
        followers={followers}
        following={following}
        postCount={postCount}
        savedCount={savedCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gridData={gridData}
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
