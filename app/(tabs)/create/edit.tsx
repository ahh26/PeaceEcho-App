import { State } from "country-state-city";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CountryPicker from "react-native-country-picker-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db, storage } from "../../../firebase";
import { reflection_categories } from "../../../lib/reflectionCategories";
import { getUserProfile } from "../../../lib/userProfile";

async function uriToBlob(uri: string): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
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
                      "A post must have at least 1 photo.",
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
  const initialCategory =
    typeof params.reflectionCategory === "string"
      ? params.reflectionCategory
      : Array.isArray(params.reflectionCategory)
        ? params.reflectionCategory[0]
        : "";

  const [reflectionCategory, setReflectionCategory] = useState(
    initialCategory || (reflection_categories[0]?.id ?? "growth"),
  );

  const categoryMeta =
    reflection_categories.find((c) => c.id === reflectionCategory) ||
    reflection_categories[0];

  const [userProfile, setUserProfile] = useState<any>(null);

  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const busy = posting;

  const [locationEnabled, setLocationEnabled] = useState(false);
  const [postLocation, setPostLocation] = useState<any>(null);
  const [countryVisible, setCountryVisible] = useState(false);
  const [stateVisible, setStateVisible] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [categoryVisible, setCategoryVisible] = useState(false);

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

  //state list
  const states = useMemo(() => {
    const cc = postLocation?.countryCode;
    if (!cc) return [];
    return State.getStatesOfCountry(cc) || [];
  }, [postLocation?.countryCode]);

  const filteredStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    if (!q) return states;
    return states.filter((s) => s.name.toLowerCase().includes(q));
  }, [states, stateSearch]);

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
          `posts/${user.uid}/${Date.now()}-${Math.random()}.jpg`,
        );
        await uploadBytes(imageRef, blob);
        const downloadUrl = await getDownloadURL(imageRef);
        uploadedUrls.push(downloadUrl);
      }

      const hasPostLocation =
        locationEnabled &&
        !!(
          postLocation?.countryCode ||
          postLocation?.country ||
          postLocation?.stateName ||
          postLocation?.city
        );

      const batch = writeBatch(db);
      const postRef = doc(collection(db, "posts"));
      batch.set(postRef, {
        uid: user.uid,
        caption: caption.trim(),
        imageUrls: uploadedUrls,
        createdAt: serverTimestamp(),
        username: userProfile?.username || "Anonymous",
        displayName: userProfile?.displayName,
        userPhotoURL: userProfile?.photoURL || null,
        reflectionCategory: reflectionCategory || "growth",
        ...(hasPostLocation ? { postLocation } : {}),
      });

      const userRef = doc(db, "users", user.uid);
      batch.update(userRef, { postCount: increment(1) });

      await batch.commit();

      router.replace("/(tabs)/discover");
    } catch (error: any) {
      console.log("FULL STORAGE ERROR >>>", JSON.stringify(error, null, 2));
      if (error?.serverResponse)
        console.log("SERVER RESPONSE >>>", error.serverResponse);
      Alert.alert(
        "Upload failed",
        error?.message ? String(error.message) : "Unknown error",
      );
    } finally {
      setPosting(false);
    }
  };

  const canPost = !busy && images.length > 0;

  {
    /*-----UI------*/
  }
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

        <Text style={styles.headerTitle}>{reflectionCategory}</Text>

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
        {/* Reflection Category card */}
        <View style={styles.card}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.cardTitle}>Reflection Category</Text>

            <TouchableOpacity
              disabled={busy}
              onPress={() => setCategoryVisible(true)}
            >
              <Text
                style={{
                  fontWeight: "900",
                  color: "#2563EB",
                  opacity: busy ? 0.5 : 1,
                }}
              >
                Change
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>
              {categoryMeta?.emoji} {categoryMeta?.label}
            </Text>
          </View>

          <Text style={styles.categoryHint}>
            This helps people discover peace-related stories.
          </Text>
        </View>

        {/* Category Modal */}
        <Modal visible={categoryVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose a category</Text>
                <TouchableOpacity onPress={() => setCategoryVisible(false)}>
                  <Text style={styles.modalClose}>Close</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {reflection_categories.map((c) => {
                  const selected = c.id === reflectionCategory;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.categoryItem,
                        selected && styles.categoryItemSelected,
                      ]}
                      onPress={() => {
                        setReflectionCategory(c.id);
                        setCategoryVisible(false);
                      }}
                      disabled={busy}
                    >
                      <Text style={styles.categoryItemText}>
                        {c.emoji} {c.label}
                      </Text>
                      {selected && <Text style={styles.categoryCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

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
            placeholder="Share a story / reflection that builds understanding..."
            placeholderTextColor="#9CA3AF"
            multiline
            value={caption}
            onChangeText={setCaption}
            editable={!busy}
          />
        </View>

        {/*Location selector */}
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
                  return;
                }

                setLocationEnabled(true);

                const r = userProfile?.region;
                const hasAnything = !!(
                  r?.countryCode ||
                  r?.country ||
                  r?.stateName ||
                  r?.city
                );

                setPostLocation(
                  hasAnything
                    ? {
                        countryCode: r.countryCode ?? "",
                        country: r.country ?? "",
                        stateCode: r.stateCode ?? "",
                        stateName: r.stateName ?? "",
                        city: r.city ?? "",
                        source: "profile",
                      }
                    : {
                        countryCode: "",
                        country: "",
                        stateCode: "",
                        stateName: "",
                        city: "",
                        source: "manual",
                      },
                );
              }}
            >
              <Text style={{ fontWeight: "800", color: "#2563EB" }}>
                {locationEnabled ? "Remove" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          {locationEnabled && (
            <>
              {/* Preview text */}
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

              {/* Manual controls */}
              <View style={{ marginTop: 12 }}>
                {/* Country */}
                <Text style={styles.smallLabel}>Country</Text>
                <TouchableOpacity
                  style={styles.countryInput}
                  onPress={() => setCountryVisible(true)}
                  disabled={busy}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CountryPicker
                      withFlag
                      withFilter
                      withCountryNameButton={false}
                      withCallingCode={false}
                      visible={countryVisible}
                      countryCode={
                        (postLocation?.countryCode as any) || undefined
                      }
                      onClose={() => setCountryVisible(false)}
                      onSelect={(c) => {
                        const name =
                          typeof c.name === "string" ? c.name : c.name.common;

                        setPostLocation((prev: any) => ({
                          ...(prev || {}),
                          countryCode: c.cca2,
                          country: name,
                          stateCode: "",
                          stateName: "",
                          city: "",
                          source: "manual",
                        }));
                        setStateSearch("");
                        setCountryVisible(false);
                      }}
                    />
                    <Text style={styles.countryText}>
                      {postLocation?.country || "Select country"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* State / Province */}
                <Text style={styles.smallLabel}>State / Province</Text>
                <TouchableOpacity
                  style={[
                    styles.countryInput,
                    !postLocation?.countryCode && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (!postLocation?.countryCode) {
                      Alert.alert("Choose a country first");
                      return;
                    }
                    setStateVisible(true);
                  }}
                  disabled={!postLocation?.countryCode || busy}
                >
                  <Text style={styles.countryText}>
                    {postLocation?.stateName || "Select state/province"}
                  </Text>
                </TouchableOpacity>

                {/* City */}
                <Text style={styles.smallLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={postLocation?.city ?? ""}
                  onChangeText={(t) =>
                    setPostLocation((prev: any) => ({
                      ...(prev || {}),
                      city: t,
                      source: "manual",
                    }))
                  }
                  editable={!busy}
                />
              </View>
            </>
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

      <Modal visible={stateVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select state / province</Text>
              <TouchableOpacity onPress={() => setStateVisible(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="Search…"
              value={stateSearch}
              onChangeText={setStateSearch}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredStates.map((s) => (
                <TouchableOpacity
                  key={`${s.countryCode}-${s.isoCode}`}
                  style={styles.stateItem}
                  onPress={() => {
                    setPostLocation((prev: any) => ({
                      ...(prev || {}),
                      stateCode: s.isoCode,
                      stateName: s.name,
                      source: "manual",
                    }));
                    setStateVisible(false);
                  }}
                >
                  <Text style={styles.stateItemText}>{s.name}</Text>
                  <Text style={styles.stateItemSub}>{s.isoCode}</Text>
                </TouchableOpacity>
              ))}

              {filteredStates.length === 0 && (
                <Text style={styles.emptyText}>No matches.</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalClearState}
              onPress={() => {
                setPostLocation((prev: any) => ({
                  ...(prev || {}),
                  stateCode: "",
                  stateName: "",
                  source: "manual",
                }));
                setStateVisible(false);
              }}
            >
              <Text style={styles.modalClearStateText}>
                Clear state/province
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  smallLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "900",
    color: "#374151",
  },
  countryInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
  },
  countryText: { fontSize: 14, fontWeight: "800", color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: "#FFF",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900" },
  modalClose: { fontSize: 14, fontWeight: "900", color: "#111827" },
  modalSearch: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },

  stateItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stateItemText: { fontSize: 14, fontWeight: "900", color: "#111827" },
  stateItemSub: { fontSize: 12, color: "#6B7280", fontWeight: "800" },
  emptyText: { paddingVertical: 18, textAlign: "center", color: "#6B7280" },

  modalClearState: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  modalClearStateText: { fontWeight: "900", color: "#111827" },
  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 10,
  },
  categoryPillText: { fontSize: 13, fontWeight: "900", color: "#111827" },
  categoryHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryItemSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  categoryItemText: { fontSize: 14, fontWeight: "900", color: "#111827" },
  categoryCheck: { fontSize: 16, fontWeight: "900", color: "#2563EB" },
});
