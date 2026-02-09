import { State } from "country-state-city";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
  countryCode?: string;
  country?: string;
  region?: string; // state/province text
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
    region: "",
    city: "",
    source: "manual",
  });

  const [locating, setLocating] = useState(false);
  const [countryVisible, setCountryVisible] = useState(false);

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
        }
      } catch (err) {
        console.log("Failed to load profile: ", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  //remove undefined keys
  function cleanObject<T extends Record<string, any>>(obj: T) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    ) as Partial<T>;
  }

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const finaPhotoURL = profile?.photoURL;
      const cleanRegion = cleanObject(region);
      await updateProfileAndBackfillPosts({
        uid: user.uid,
        newUsername: username.trim(),
        newPhotoURL: finaPhotoURL,
        newBio: bio,
        newRegion: cleanRegion,
      });
      setProfile((prev) => ({
        ...(prev || {}),
        username: username.trim(),
        bio: bio,
        photoURL: finaPhotoURL,
        region: cleanRegion as Region,
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

  const handlePickImage = async () => {
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("We need access to your photos");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) return;

      setUploading(true);
      const downloadUrl = await uploadProfileImage(user.uid, asset.uri);

      await updateProfileAndBackfillPosts({
        uid: user.uid,
        newUsername: username.trim(),
        newPhotoURL: downloadUrl,
        newBio: bio,
        newRegion: cleanObject(region),
      });

      setProfile((prev) => ({
        ...(prev || {}),
        photoURL: downloadUrl,
        username: (prev && prev.username) || username,
        bio: (prev && prev.bio) || bio,
        email: (prev && prev.email) || user.email || "",
      }));
    } catch (err) {
      alert("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

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

      // Try to match the dataset state by name (best-effort)
      const stateName = place?.region ?? ""; // province/state name
      const stateList = iso ? State.getStatesOfCountry(iso) : [];
      const matchedState = stateList.find(
        (s) => s.name.toLowerCase() === stateName.toLowerCase()
      );

      setRegion({
        countryCode: iso,
        country: countryName,
        region: matchedState?.name ?? stateName,
        city: place?.city ?? place?.subregion ?? "",
        lat,
        lng,
        source: "gps",
      });
    } catch (e) {
      console.log("location error:", e);
      Alert.alert("Couldn’t fetch location", "Use manual selection instead.");
    } finally {
      setLocating(false);
    }
  };

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

          {/* */}
          <Text style={styles.label}>Location</Text>

          <View style={styles.regionCard}>
            {/* Use current location */}
            <TouchableOpacity
              style={[styles.locationBtn, locating && { opacity: 0.6 }]}
              onPress={handleUseCurrentLocation}
              disabled={locating}
            >
              <Text style={styles.locationBtnText}>
                {locating ? "Finding location…" : "Use current location"}
              </Text>
            </TouchableOpacity>

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
                  source: "manual",
                  lat: undefined,
                  lng: undefined,
                }));
                setCountryVisible(false);
              }}
            />

            {/* State / Province */}
            <Text style={styles.smallLabel}>State / Province</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ontario / California"
              value={region.region}
              onChangeText={(text) =>
                setRegion((prev) => ({
                  ...prev,
                  region: text,
                  source: "manual",
                }))
              }
            />

            {/* City */}
            <Text style={styles.smallLabel}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              value={region.city}
              onChangeText={(text) =>
                setRegion((prev) => ({ ...prev, city: text, source: "manual" }))
              }
            />

            <Text style={styles.regionPreview}>
              {(region.city ? `${region.city}, ` : "") +
                (region.region ? `${region.region}, ` : "") +
                (region.country || "")}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
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
  changePhotoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  readOnlyField: {
    paddingVertical: 10,
    marginBottom: 8,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  bioInput: {
    height: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  countryInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
  },
  countryText: {
    fontSize: 14,
    color: "#111827",
  },
  smallLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  regionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },
  regionPreview: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  locationBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 12,
  },
  locationBtnText: {
    color: "white",
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
