import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { db } from "../firebase";

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<any>(null);

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

  if(!post){
    return(
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return(
    <ScrollView style={{ padding: 20 }}>
      <Image
        source={{ uri: post.imageUrls?.[0] }}
        style={{ width: "100%", height: 300, borderRadius: 12 }}
      />

      <Text style={{ fontSize: 18, marginTop: 15 }}>{post.caption}</Text>
      <Text style={{ color: "gray", marginTop: 5 }}>
        @{post.uid.slice(0, 6)}
      </Text>
    </ScrollView>
  );
}
