// app/(tabs)/create/edit-post.tsx
import { router, useLocalSearchParams } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useState } from "react";
import { Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "../../../context/UserContext";
import { db, storage } from "../../../firebase";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function EditPost() {
  const { images } = useLocalSearchParams<{ images: string }>();
  const imageList = JSON.parse(images);
  const { user } = useUser();

  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const uploadImages = async () => {
    const urls = [];

    for (let i = 0; i < imageList.length; i++) {
      const response = await fetch(imageList[i]);
      const blob = await response.blob();

      const imgRef = ref(storage, `posts/${user.uid}_${Date.now()}_${i}.jpg`);
      await uploadBytes(imgRef, blob);

      const url = await getDownloadURL(imgRef);
      urls.push(url);
    }
    return urls;
  };

  const publishPost = async () => {
    setUploading(true);

    try {
        const urls = await uploadImages();

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        caption,
        imageUrls: urls,
        createdAt: serverTimestamp(),
      });

        alert("Posted!");
        router.replace("../Discover");
    } catch (e: any) {
        alert("Failed to upload: " + e.message);
    }

    setUploading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={{ fontSize: 18 }}>← Back</Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={true}
      >
        {imageList.map((uri: string, index:number) => (
          <Image
            key={index}
            source={{ uri }}
            style={{ width: SCREEN_WIDTH, height: 350 }}
          />
        ))}
      </ScrollView>

      <TextInput
        style={styles.captionInput}
        placeholder="Write a caption…"
        multiline
        value={caption}
        onChangeText={setCaption}
      />

      <TouchableOpacity style={styles.postBtn} onPress={publishPost}>
        <Text style={styles.postBtnText}>{uploading ? "Posting..." : "Post"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: { padding: 10 },
  captionInput: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
    margin: 15,
    backgroundColor: "white",
    minHeight: 120,
  },
  postBtn: {
    backgroundColor: "#3949AB",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
  },
  postBtnText: { color: "white", textAlign: "center", fontSize: 18 },
});
