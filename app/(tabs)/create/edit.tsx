// app/(tabs)/create/edit.tsx

import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditPostScreen() {
  const params = useLocalSearchParams();

  // --- safely get images from params ---
  let initialImages: string[] = [];
  if (params.images) {
    const raw =
      typeof params.images === "string"
        ? params.images
        : Array.isArray(params.images)
        ? params.images[0]
        : "[]";

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        initialImages = parsed;
      }
    } catch {
      initialImages = [];
    }
  }

  const [images, setImages] = useState<string[]>(initialImages);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caption, setCaption] = useState("");

  const hasImages = images.length > 0;
  const selectedImage = hasImages ? images[selectedIndex] : undefined;

  // --- add more photos ---
  const addMorePhotos = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  // --- delete selected photo ---
  const deleteSelectedPhoto = () => {
    if (images.length === 0) return;

    if (images.length === 1) {
      // if you delete last one, just go back out
      Alert.alert("No photos left", "Returning to previous screen.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
      return;
    }

    const updated = images.filter((_, idx) => idx !== selectedIndex);
    setImages(updated);

    // adjust selection
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };


  const cancelEditing = () => {
    router.replace("/(tabs)/discover");
  };

  //if no images at all, show a simple screen instead of crashing
  if (!hasImages) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>
          No photos to edit.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "#4A6CF7",
            padding: 12,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
      >
        {/* Cancel */}
        <TouchableOpacity onPress={cancelEditing}>
          <Text style={styles.back}>← Cancel</Text>
        </TouchableOpacity>

        {/* Big Preview */}
        {selectedImage && (
          <Image source={{ uri: selectedImage }} style={styles.mainImage} />
        )}

        {/* Thumbnails */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
        >
          {images.map((uri, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setSelectedIndex(idx)}
              style={[
                styles.thumbWrapper,
                selectedIndex === idx && styles.thumbSelected,
              ]}
            >
              <Image source={{ uri }} style={styles.thumb} />
              <Text style={styles.thumbNumber}>{idx + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add / Delete row */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.addButton} onPress={addMorePhotos}>
            <Text style={styles.addButtonText}>Add More</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={deleteSelectedPhoto}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        <TextInput
          style={styles.captionInput}
          placeholder="Write a caption..."
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        {/* Post button (just placeholder for now) */}
        <TouchableOpacity
          style={[styles.postButton, { opacity: 0.5 }]}
          disabled
        >
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: {
    fontSize: 18,
    marginBottom: 10,
  },
  mainImage: {
    width: "100%",
    height: 350,
    borderRadius: 12,
  },
  thumbWrapper: {
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    position: "relative",
  },
  thumbSelected: {
    borderColor: "#4A6CF7",
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  thumbNumber: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "white",
    paddingHorizontal: 5,
    borderRadius: 6,
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    marginVertical: 15,
    justifyContent: "space-between",
  },
  addButton: {
    backgroundColor: "#4A6CF7",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: "#FF4D4D",
    padding: 12,
    borderRadius: 10,
    width: 100,
    alignItems: "center",
  },
  deleteText: {
    color: "#fff",
    fontSize: 16,
  },
  captionInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
  },
  postButton: {
    backgroundColor: "#222",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 40,
  },
  postButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
