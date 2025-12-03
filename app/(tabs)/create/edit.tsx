import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
import { auth, db, storage } from "../../../firebase";


function normalizeUri(uri: string) {
  if (uri.startsWith("ph://")) {
    return uri.replace("ph://", "assets-library://");
  }
  return uri;
}

async function uriToBlob(uri: string): Promise<Blob> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  return blob;
}


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

  const deleteSelectedPhoto = () => {
    if (images.length === 0) return;

    if (images.length === 1) {
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
    console.log("CANCEL BUTTON PRESSED");
    router.replace("/(tabs)/discover");
  };

  const handlePost = async () => {
    try {
        if (images.length === 0) {
            alert("Please select at least one photo");
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in");
            return;
        }

        const uploadedUrls: string[] = [];

        // Upload each image
        for (const uri of images) {
            const blob = await uriToBlob(uri); 
            const imageRef = ref(
                storage,
                `posts/${user.uid}/${Date.now()}-${Math.random()}.jpg`
            );
            await uploadBytes(imageRef, blob);
            const downloadUrl = await getDownloadURL(imageRef);

            uploadedUrls.push(downloadUrl);
        }

        // Create the Firestore document
        await addDoc(collection(db, "posts"), {
            uid: user.uid,
            caption,
            imageUrls: uploadedUrls,
            createdAt: serverTimestamp(),
        });

        alert("Posted!");
        router.replace("/(tabs)/discover");

    } catch (error: any) {
        console.log("FULL STORAGE ERROR >>>", JSON.stringify(error, null, 2));

        if(error?.serverResponse){
            console.log("🔥 SERVER RESPONSE >>>", error.serverResponse);
        }

        alert("Upload failed: " + error.message);
    }
};





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

        {/* Post button */}
        <TouchableOpacity style={styles.postButton} onPress={handlePost}>
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
