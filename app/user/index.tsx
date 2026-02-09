import ProfileView from "@/components/ProfileView";
import { getUserProfile } from "@/lib/userProfile";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type UserProfile = {
  username?: string;
  email?: string;
  bio?: string;
  photoURL?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
};

type GridItem = { id: string; label: string };

export default function UserScreen() {
  const { uid } = useLocalSearchParams<{ uid?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Posts only (placeholder for now)
  const [posts, setPosts] = useState<GridItem[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const data = await getUserProfile(uid);
        setProfile((data ?? null) as UserProfile | null);
      } catch (e) {
        console.log("Failed to load public user:", e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [uid]);

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
        }}
        photoSource={photoSource}
        followers={profile.followerCount ?? 0}
        following={profile.followingCount ?? 0}
        postCount={profile.postCount ?? posts.length}
        savedCount={0}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gridData={posts} // posts only
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
