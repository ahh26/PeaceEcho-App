import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { getUserProfile } from "../../../lib/userProfile";

async function uriToBlob(uri: string): Promise<Blob> {
  const manipulated = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const response = await fetch(manipulated.uri);
  return await response.blob();
}

function PhotosStrip({
  images,
  disabled,
  onAdd,
  onRemove,
}: {
  images: string[];
  disabled: boolean;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={ps.row}>
        {images.map((uri, idx) => {
          const canDelete = !disabled && images.length > 1;

          return (
            <View key={`${uri}-${idx}`} style={ps.tile}>
              <Image source={{ uri }} style={ps.img} />

              <TouchableOpacity
                disabled={!canDelete}
                onPress={() => {
                  if (!canDelete) {
                    Alert.alert(
                      "Keep 1 photo",
                      "A post must have at least 1 photo."
                    );
                    return;
                  }
                  onRemove(idx);
                }}
                style={[ps.xBtn, !canDelete && ps.xBtnDisabled]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={ps.xText}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add tile at the end */}
        <TouchableOpacity
          disabled={disabled}
          onPress={onAdd}
          activeOpacity={0.85}
          style={[ps.addTile, disabled && ps.addTileDisabled]}
        >
          <Text style={ps.plus}>＋</Text>
          <Text style={ps.addLabel}>{disabled ? "..." : "Add"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const ps = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  tile: {
    width: 118,
    height: 118,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  img: { width: "100%", height: "100%" },
  xBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  xBtnDisabled: { opacity: 0.25 },
  xText: { color: "white", fontSize: 18, fontWeight: "900", marginTop: -1 },

  addTile: {
    width: 118,
    height: 118,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  addTileDisabled: { opacity: 0.6 },
  plus: { fontSize: 30, fontWeight: "900", color: "#111827" },
  addLabel: { marginTop: 6, fontSize: 12, fontWeight: "900", color: "#374151" },
});

// ---------- Screen ----------
export default function EditPostScreen() {
  const params = useLocalSearchParams();
  const [userProfile, setUserProfile] = useState<any>(null);

  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const busy = posting;

  const [locationEnabled, setLocationEnabled] = useState(false);
  const [postLocation, setPostLocation] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (user) {
        const data = await getUserProfile(user.uid);
        setUserProfile(data);
      }
    };
    load();
  }, []);

  // parse initial images from params (your existing logic but memoized)
  const initialImages = useMemo(() => {
    let out: string[] = [];
    if (!params.images) return out;

    const raw =
      typeof params.images === "string"
        ? params.images
        : Array.isArray(params.images)
          ? params.images[0]
          : "[]";

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out = parsed;
    } catch {
      out = [];
    }
    return out;
  }, [params.images]);

  useEffect(() => {
    // only set once when screen loads
    if (initialImages.length > 0 && images.length === 0) {
      setImages(initialImages);
    }
  }, [initialImages, images.length]);

  const addMorePhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removePhotoAt = (idx: number) => {
    setImages((prev) => {
      if (prev.length <= 1) return prev; // enforce rule
      return prev.filter((_, i) => i !== idx);
    });
  };

  const cancelEditing = () => {
    router.back();
  };

  const handlePost = async () => {
    try {
      if (images.length === 0) {
        Alert.alert("Add a photo", "Please select at least one photo.");
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "You must be logged in.");
        return;
      }

      setPosting(true);

      const uploadedUrls: string[] = [];

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

      const postLocation = userProfile?.region
        ? {
            countryCode: userProfile.region.countryCode ?? "",
            country: userProfile.region.country ?? "",
            stateCode: userProfile.region.stateCode ?? "",
            stateName: userProfile.region.stateName ?? "",
            city: userProfile.region.city ?? "",
            source: "profile",
          }
        : null;

      await addDoc(collection(db, "posts"), {
        uid: user.uid,
        caption: caption.trim(),
        imageUrls: uploadedUrls,
        createdAt: serverTimestamp(),
        username: userProfile?.username || "Anonymous",
        userPhotoURL: userProfile?.photoURL || null,
        postLocation: locationEnabled ? postLocation : null,
      });

      router.replace("/(tabs)/discover");
    } catch (error: any) {
      console.log("FULL STORAGE ERROR >>>", JSON.stringify(error, null, 2));
      if (error?.serverResponse)
        console.log("SERVER RESPONSE >>>", error.serverResponse);
      Alert.alert(
        "Upload failed",
        error?.message ? String(error.message) : "Unknown error"
      );
    } finally {
      setPosting(false);
    }
  };

  const canPost = !busy && images.length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={cancelEditing}
          disabled={busy}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerBtnText, busy && styles.muted]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>New Post</Text>

        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost}
          style={styles.headerBtn}
        >
          <Text
            style={[
              styles.headerBtnText,
              !canPost && styles.muted,
              canPost && styles.primary,
            ]}
          >
            {posting ? "Posting…" : "Post"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Photos card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Photos</Text>
            <Text style={styles.cardHint}>
              {images.length === 0
                ? "Add at least 1"
                : `${images.length} selected`}
            </Text>
          </View>

          <PhotosStrip
            images={images}
            disabled={busy}
            onAdd={addMorePhotos}
            onRemove={removePhotoAt}
          />

          {images.length === 1 && (
            <Text style={styles.minRule}>You must keep at least 1 photo.</Text>
          )}
        </View>

        {/* Caption card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption…"
            placeholderTextColor="#9CA3AF"
            multiline
            value={caption}
            onChangeText={setCaption}
            editable={!busy}
          />
        </View>

        {/*Locaation selector */}
        <View style={styles.card}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={styles.cardTitle}>Location</Text>

            <TouchableOpacity
              onPress={() => {
                if (locationEnabled) {
                  setLocationEnabled(false);
                  setPostLocation(null);
                } else {
                  setLocationEnabled(true);
                  setPostLocation(userProfile?.region ?? null); // default = profile
                }
              }}
            >
              <Text style={{ fontWeight: "800", color: "#2563EB" }}>
                {locationEnabled ? "Remove" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          {locationEnabled && (
            <Text style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
              {postLocation
                ? [
                    postLocation.city,
                    postLocation.stateName,
                    postLocation.country,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : "No location selected"}
            </Text>
          )}
        </View>

        {/* Loading hint */}
        {posting && (
          <View style={styles.postingRow}>
            <ActivityIndicator />
            <Text style={styles.postingText}>Uploading photos…</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6FA" },

  header: {
    height: 56,
    backgroundColor: "#F5F6FA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  headerBtn: { paddingVertical: 8, paddingHorizontal: 8, minWidth: 72 },
  headerBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  muted: { opacity: 0.45 },
  primary: { color: "#2563EB" },

  content: { padding: 16, gap: 12 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  cardHint: { fontSize: 12, fontWeight: "700", color: "#6B7280" },

  minRule: { marginTop: 8, fontSize: 12, color: "#6B7280", fontWeight: "600" },

  captionInput: {
    marginTop: 10,
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
  },
  counter: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
    fontWeight: "600",
  },

  postingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  postingText: { color: "#374151", fontWeight: "700" },
});
