import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../firebase";
import { getUserProfile, updateUserProfile, uploadProfileImage } from "../../lib/userProfile";

type UserProfile = {
  username?: string;
  email?: string;
  bio?: string;
  photoURL?: string;
};

export default function ProfileScreen() {
  const user = auth.currentUser;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const loadProfile = async() => {
      if(!user){
        setLoading(false);
        return;
      }
      try{
        const data = await getUserProfile(user.uid);
        if(data){
          const typed = data as UserProfile;
          setProfile(typed);
          setUsername(typed.username ?? "");
          setBio(typed.bio ?? "");
        }
      }catch(err){
        console.log("Failed to load profile: ", err);
      }finally{
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if(!user)return;
    setSaving(true);
    try{
      await updateUserProfile(user.uid, {username, bio});
      setProfile((prev) => ({
        ...(prev || {}),
        username,
        bio,
        email: (prev && prev.email) || user.email || "",
      }));
    }catch(err){
      alert("Failed to save profile");
    }finally{
      setSaving(false);
    }

  }

  const handlePickImage = async () =>{
    if(!user) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(status!=="granted"){
      alert("We need access to your photos")
      return;
    }

    try{
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.7,
      });

      if(result.canceled) return;

      const asset = result.assets[0];
      if(!asset?.uri)return;

      setUploading(true);
      const downloadUrl = await uploadProfileImage(user.uid, asset.uri);

      setProfile(prev => ({
        ...(prev || {}),
        photoURL:downloadUrl,
        username: (prev && prev.username) || username,
        bio: (prev && prev.bio) || bio,
        email: (prev && prev.email) || user.email || "",
      }));
    }catch(err){
      alert("Failed to upload profile picture");
    }finally{
      setUploading(false);
    }
  };

  if(!user){
    return(
      <SafeAreaView style={styles.center}>
        <Text>You need to be logged in to view your profile</Text>
      </SafeAreaView>
    );
  }

  if(loading){
    return(
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  const photoURL = profile?.photoURL;

  return(
    <SafeAreaView style={styles.container}>
      {/* Profile pic */}
      <View style={styles.avatarContainer}>
        <Image
          source={
            photoURL?{uri:photoURL}:require("../../assets/images/default-avatar.png")
          }
          style={styles.avatar}
        />
        <TouchableOpacity
          style={styles.changePhotoButton}
          onPress={handlePickImage}
          disabled={uploading}
        >
          <Text style={styles.changePhotoText}>
            {uploading?"Uploading...":"Change Photo"}
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
        placeholder="Enter username"
      />

      {/* Bio */}
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell people a little about you"
        multiline
      />

      {/* Save */}
      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving? "Saving...":"Save"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  center:{
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container:{
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  avatarContainer:{
    alignItems: "center",
    marginBottom: 24,
  },
  avatar:{
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eee",
  },
  changePhotoButton:{
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
  label:{
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,   
  },
  readOnlyField:{
    paddingVertical: 10,
    marginBottom: 8,
    color: "#555",
  },
  input:{
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  bioInput:{
    height: 80,
    textAlignVertical: "top",
  },
  saveButton:{
    marginTop: 16,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  saveButtonDisabled:{
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  }
});