// ProfileEdit.tsx
import { State } from "country-state-city";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CountryPicker from "react-native-country-picker-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../../firebase";
import {
  getUserProfile,
  updateProfileAndBackfillPosts,
  uploadProfileImage,
} from "../../../lib/userProfile";

type Region = {
  countryCode?: string; // "CA"
  country?: string; // "Canada"
  stateCode?: string; // "ON"
  stateName?: string; // "Ontario"
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
  region?: Region & { region?: string }; // backward compat: old field "region" (string)
};

export default function ProfileEdit() {
  const user = auth.currentUser;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [region, setRegion] = useState<Region>({
    countryCode: "",
    country: "",
    stateCode: "",
    stateName: "",
    city: "",
    source: "manual",
  });

  const [locating, setLocating] = useState(false);
  const [countryVisible, setCountryVisible] = useState(false);
  const [stateVisible, setStateVisible] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  // -------- helpers --------
  function cleanObject<T extends Record<string, any>>(obj: T) {
    // keep empty strings if you want to intentionally clear fields;
    // only remove undefined
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    ) as Partial<T>;
  }

  const clearLocation = () => {
    setRegion({
      countryCode: "",
      country: "",
      stateCode: "",
      stateName: "",
      city: "",
      lat: undefined,
      lng: undefined,
      source: "manual",
    });
    setStateSearch("");
  };

  const states = useMemo(() => {
    if (!region.countryCode) return [];
    try {
      return State.getStatesOfCountry(region.countryCode) || [];
    } catch {
      return [];
    }
  }, [region.countryCode]);

  const filteredStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    if (!q) return states;
    return states.filter((s) => s.name.toLowerCase().includes(q));
  }, [states, stateSearch]);

  const hasStates = states.length > 0;

  // -------- load profile --------
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getUserProfile(user.uid);
        if (data) {
          const typed = data as UserProfile;
          setProfile(typed);
          setUsername(typed.username ?? "");
          setBio(typed.bio ?? "");

          // Backward compat:
          // old: region.region (string)
          // new: region.stateName / region.stateCode
          const oldRegionText = (typed.region as any)?.region as
            | string
            | undefined;

          setRegion({
            countryCode: typed.region?.countryCode ?? "",
            country: typed.region?.country ?? "",
            stateCode: typed.region?.stateCode ?? "",
            stateName: typed.region?.stateName ?? oldRegionText ?? "",
            city: typed.region?.city ?? "",
            lat: typed.region?.lat,
            lng: typed.region?.lng,
            source: typed.region?.source ?? "manual",
          });
        }
      } catch (err) {
        console.log("Failed to load profile: ", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user?.uid]);

  // -------- save --------
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const finalPhotoURL = profile?.photoURL ?? "";
      const usernameChanged = username.trim() !== (profile?.username ?? "");
      const bioChanged = bio !== (profile?.bio ?? "");

      // If user cleared everything, store an empty object (works with your ProfileView logic)
      // You can switch to deleting the field later if you want.
      const cleanRegion = cleanObject(region);
      const isEmptyRegion =
        !cleanRegion.countryCode &&
        !cleanRegion.country &&
        !cleanRegion.stateCode &&
        !cleanRegion.stateName &&
        !cleanRegion.city;

      // IMPORTANT: keep backward compat by also writing "region" text
      // (optional, but helpful if any old screens still read profile.region.region)
      const regionPayload: any = isEmptyRegion
        ? {}
        : {
            ...cleanRegion,
            region: cleanRegion.stateName || "", // legacy alias
          };

      await updateProfileAndBackfillPosts({
        uid: user.uid,
        newUsername: usernameChanged ? username.trim() : undefined,
        newPhotoURL: undefined, // Save button shouldn't backfill photo unless it changed via upload
        newBio: bioChanged ? bio : undefined,
        newRegion: regionPayload,
      });

      setProfile((prev) => ({
        ...(prev || {}),
        username: username.trim(),
        bio,
        photoURL: finalPhotoURL,
        region: isEmptyRegion ? undefined : (regionPayload as Region),
        email: (prev && prev.email) || user.email || "",
      }));

      router.push("/(tabs)/profile");
    } catch (err) {
      console.log("SAVE ERROR:", err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // -------- upload photo --------
  const handlePickImage = async () => {
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("We need access to your photos");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) return;

      setUploading(true);
      const downloadUrl = await uploadProfileImage(user.uid, asset.uri);

      // region payload (same as save)
      const cleanRegion = cleanObject(region);
      const isEmptyRegion =
        !cleanRegion.countryCode &&
        !cleanRegion.country &&
        !cleanRegion.stateCode &&
        !cleanRegion.stateName &&
        !cleanRegion.city;

      const regionPayload: any = isEmptyRegion
        ? {}
        : {
            ...cleanRegion,
            region: cleanRegion.stateName || "",
          };

      await updateProfileAndBackfillPosts({
        uid: user.uid,
        newUsername: username.trim(), // ok to backfill username on photo upload
        newPhotoURL: downloadUrl, // ✅ backfill posts photo here
        newBio: bio,
        newRegion: regionPayload, // user doc update
      });

      setProfile((prev) => ({
        ...(prev || {}),
        photoURL: downloadUrl,
        username: (prev && prev.username) || username,
        bio: (prev && prev.bio) || bio,
        region: isEmptyRegion ? undefined : (regionPayload as Region),
        email: (prev && prev.email) || user.email || "",
      }));
    } catch (err) {
      alert("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  // -------- GPS --------
  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow location access to autofill your region."
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      const place = results?.[0];

      const iso = place?.isoCountryCode ?? "";
      const countryName = place?.country ?? "";

      const stateNameFromGPS = place?.region ?? "";
      const stateList = iso ? State.getStatesOfCountry(iso) : [];
      const matchedState = stateList.find(
        (s) => s.name.toLowerCase() === stateNameFromGPS.toLowerCase()
      );

      setRegion({
        countryCode: iso,
        country: countryName,
        stateCode: matchedState?.isoCode ?? "",
        stateName: matchedState?.name ?? stateNameFromGPS,
        city: place?.city ?? place?.subregion ?? "",
        lat,
        lng,
        source: "gps",
      });

      setStateSearch("");
    } catch (e) {
      console.log("location error:", e);
      Alert.alert("Couldn’t fetch location", "Use manual selection instead.");
    } finally {
      setLocating(false);
    }
  };

  // -------- UI states --------
  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>You need to be logged in to view your profile</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const photoURL = profile?.photoURL;

  const previewText = [region.city, region.stateName, region.country]
    .filter(Boolean)
    .join(", ");

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Profile pic */}
          <View style={styles.avatarContainer}>
            <Image
              source={
                photoURL
                  ? { uri: photoURL }
                  : require("../../../assets/images/default-avatar.png")
              }
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.changePhotoButton}
              onPress={handlePickImage}
              disabled={uploading}
            >
              <Text style={styles.changePhotoText}>
                {uploading ? "Uploading..." : "Change Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <Text style={styles.readOnlyField}>
            {profile?.email || user.email || ""}
          </Text>

          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Enter username"
          />

          {/* Bio */}
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            autoCapitalize="none"
            placeholder="Tell people a little about you"
            multiline
          />

          {/* Location */}
          <Text style={styles.label}>Location</Text>

          <View style={styles.regionCard}>
            <View style={styles.locationRow}>
              <TouchableOpacity
                style={[styles.locationBtn, locating && { opacity: 0.6 }]}
                onPress={handleUseCurrentLocation}
                disabled={locating}
              >
                <Text style={styles.locationBtnText}>
                  {locating ? "Finding location…" : "Use current location"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.clearBtn, locating && { opacity: 0.6 }]}
                onPress={clearLocation}
                disabled={locating}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {/* Country */}
            <Text style={styles.smallLabel}>Country</Text>
            <TouchableOpacity
              style={styles.countryInput}
              onPress={() => setCountryVisible(true)}
            >
              <Text style={styles.countryText}>
                {region.country || "Select country"}
              </Text>
            </TouchableOpacity>

            <CountryPicker
              withFilter
              withFlag
              withCountryNameButton={false}
              withCallingCode={false}
              visible={countryVisible}
              countryCode={(region.countryCode as any) || undefined}
              onClose={() => setCountryVisible(false)}
              onSelect={(c) => {
                const name =
                  typeof c.name === "string" ? c.name : c.name.common;

                setRegion((prev) => ({
                  ...prev,
                  countryCode: c.cca2,
                  country: name,

                  // reset dependent fields
                  stateCode: "",
                  stateName: "",
                  city: "",
                  source: "manual",
                  lat: undefined,
                  lng: undefined,
                }));

                setStateSearch("");
                setCountryVisible(false);
              }}
              containerButtonStyle={{ display: "none" }}
            />

            {/* State / Province */}
            <Text style={styles.smallLabel}>State / Province</Text>

            <TouchableOpacity
              style={[
                styles.countryInput,
                !region.countryCode && { opacity: 0.5 },
              ]}
              onPress={() => {
                if (!region.countryCode) {
                  Alert.alert("Choose a country first");
                  return;
                }
                if (!hasStates) {
                  Alert.alert(
                    "No states found",
                    "This country may not have states/provinces in the dataset. You can leave it blank."
                  );
                  return;
                }
                setStateVisible(true);
              }}
              disabled={!region.countryCode}
            >
              <Text style={styles.countryText}>
                {region.stateName ||
                  (region.countryCode
                    ? "Select state/province"
                    : "Select country first")}
              </Text>
            </TouchableOpacity>

            {/* City */}
            <Text style={styles.smallLabel}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              value={region.city ?? ""}
              onChangeText={(text) =>
                setRegion((prev) => ({
                  ...prev,
                  city: text,
                  source: "manual",
                  lat: undefined,
                  lng: undefined,
                }))
              }
            />

            <Text style={styles.regionPreview}>
              {previewText || "No location set"}
              {region.source === "gps" ? " · GPS" : ""}
            </Text>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* State picker modal */}
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
              autoCapitalize="none"
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredStates.map((s) => {
                const selected = region.stateCode === s.isoCode;
                return (
                  <TouchableOpacity
                    key={`${s.countryCode}-${s.isoCode}`}
                    style={[
                      styles.stateItem,
                      selected && styles.stateItemSelected,
                    ]}
                    onPress={() => {
                      setRegion((prev) => ({
                        ...prev,
                        stateCode: s.isoCode,
                        stateName: s.name,
                        source: "manual",
                        lat: undefined,
                        lng: undefined,
                      }));
                      setStateVisible(false);
                    }}
                  >
                    <Text style={styles.stateItemText}>{s.name}</Text>
                    <Text style={styles.stateItemSub}>{s.isoCode}</Text>
                  </TouchableOpacity>
                );
              })}
              {filteredStates.length === 0 && (
                <Text style={styles.emptyText}>No matches.</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalClearState}
              onPress={() => {
                setRegion((prev) => ({
                  ...prev,
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 40 },

  avatarContainer: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eee",
  },
  changePhotoButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#888",
  },
  changePhotoText: { fontSize: 14, fontWeight: "500" },

  label: { fontSize: 14, fontWeight: "600", marginTop: 8, marginBottom: 4 },
  smallLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  readOnlyField: { paddingVertical: 10, marginBottom: 8, color: "#555" },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  bioInput: { height: 80, textAlignVertical: "top" },

  regionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },

  locationRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  locationBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  locationBtnText: { color: "white", fontWeight: "800" },

  clearBtn: {
    backgroundColor: "#6B7280",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  clearBtnText: { color: "white", fontWeight: "800" },

  countryInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    marginBottom: 8,
  },
  countryText: { fontSize: 14, color: "#111827" },

  regionPreview: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  saveButton: {
    marginTop: 16,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "white", fontWeight: "600", fontSize: 16 },

  // modal
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
  modalTitle: { fontSize: 16, fontWeight: "800" },
  modalClose: { fontSize: 14, fontWeight: "700", color: "#111827" },

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
  stateItemSelected: {
    borderColor: "#111827",
  },
  stateItemText: { fontSize: 14, fontWeight: "700", color: "#111827" },
  stateItemSub: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  emptyText: { paddingVertical: 18, textAlign: "center", color: "#6B7280" },

  modalClearState: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  modalClearStateText: { fontWeight: "800", color: "#111827" },
});
