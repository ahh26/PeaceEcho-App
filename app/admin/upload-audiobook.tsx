import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useMemo, useRef, useState } from "react";
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

import { Audio, type AVPlaybackStatus } from "expo-av";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "../../context/UserContext";
import { db, storage } from "../../firebase";

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}

function safeExtFromName(name?: string) {
  if (!name) return "";
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx).toLowerCase();
}

export default function UploadAudiobookAdmin() {
  const { user, loading } = useUser();

  // paste admin UID here
  const admin_uids = useMemo(
    () => new Set<string>(["e0li8PdRZYO9ZUtmBmJLcSRi4WE2"]),
    [],
  );

  const isAdmin = !!user?.uid && admin_uids.has(user.uid);

  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [category, setCategory] = useState("conflict");
  const [transcriptText, setTranscriptText] = useState("");

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [audio, setAudio] = useState<{
    uri: string;
    name?: string;
    mimeType?: string;
  } | null>(null);

  const previewRef = useRef<Audio.Sound | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewPos, setPreviewPos] = useState(0);
  const [previewDur, setPreviewDur] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch {}
    })();
  }, []);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const file = result.assets?.[0];
    if (!file?.uri) return;

    setAudio({
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
    });
  };

  useEffect(() => {
    // when audio changes, unload old preview sound
    (async () => {
      try {
        if (previewRef.current) {
          await previewRef.current.unloadAsync();
          previewRef.current = null;
        }
      } catch {}
      setPreviewPlaying(false);
      setPreviewPos(0);
      setPreviewDur(0);
    })();
  }, [audio?.uri]);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      (async () => {
        try {
          if (previewRef.current) {
            await previewRef.current.unloadAsync();
            previewRef.current = null;
          }
        } catch {}
      })();
    };
  }, []);

  const togglePreview = async () => {
    if (!audio?.uri) return;

    try {
      if (!previewRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audio.uri },
          { shouldPlay: true },
        );

        previewRef.current = sound;

        sound.setOnPlaybackStatusUpdate((st: AVPlaybackStatus) => {
          if (!st.isLoaded) return;
          setPreviewPlaying(st.isPlaying);
          setPreviewPos(st.positionMillis ?? 0);
          setPreviewDur(st.durationMillis ?? 0);

          if (st.didJustFinish) {
            setPreviewPlaying(false);
            setPreviewPos(0);
            sound.setPositionAsync(0).catch(() => {});
          }
        });

        return;
      }

      const st = await previewRef.current.getStatusAsync();
      if (!st.isLoaded) return;

      if (st.isPlaying) {
        await previewRef.current.pauseAsync();
      } else {
        // if at end, restart
        const nearEnd =
          st.durationMillis != null &&
          st.positionMillis != null &&
          st.positionMillis >= st.durationMillis - 250;
        if (nearEnd) await previewRef.current.setPositionAsync(0);
        await previewRef.current.playAsync();
      }
    } catch (e) {
      console.log("Preview audio error:", e);
      Alert.alert("Preview failed", "Could not play this audio file.");
    }
  };

  const validate = () => {
    if (!title.trim()) return "Please enter a title.";
    if (!intro.trim()) return "Please enter an intro.";
    if (!coverUri) return "Please pick a cover image.";
    if (!audio?.uri) return "Please pick an audio file.";
    return null;
  };

  const upload = async () => {
    const msg = validate();
    if (msg) {
      Alert.alert("Missing info", msg);
      return;
    }

    try {
      setSubmitting(true);

      //1. Create Firestore doc
      const docRef = await addDoc(collection(db, "audiobooks"), {
        title: title.trim(),
        intro: intro.trim(),
        category: category.trim() || "conflict",
        transcriptText: transcriptText.trim() || "",
        status: "published",
        uploaderId: user?.uid ?? null,
        createdAt: serverTimestamp(),
        coverUrl: "",
        audioUrl: "",
      });

      const audiobookId = docRef.id;

      //2. Upload cover to Storage
      const coverBlob = await uriToBlob(coverUri!);
      const coverRef = ref(storage, `audiobooks/${audiobookId}/cover.jpg`);
      await uploadBytes(coverRef, coverBlob);
      const coverUrl = await getDownloadURL(coverRef);

      //3. Upload audio to Storage
      const ext = safeExtFromName(audio?.name) || ".mp3";
      const audioBlob = await uriToBlob(audio!.uri);
      const audioRef = ref(storage, `audiobooks/${audiobookId}/audio${ext}`);
      await uploadBytes(audioRef, audioBlob);
      const audioUrl = await getDownloadURL(audioRef);

      //4. Patch firestore doc with URLs
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "audiobooks", audiobookId), {
        coverUrl,
        audioUrl,
      });

      Alert.alert("Success", "Audiobook uploaded!", [
        { text: "OK", onPress: () => router.replace("/audiobook") },
      ]);

      //reset form
      setTitle("");
      setIntro("");
      setCategory("conflict");
      setTranscriptText("");
      setCoverUri(null);
      setAudio(null);
    } catch (e: any) {
      console.log("Upload audiobook error:", e);
      Alert.alert("Upload failed", e?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Text style={styles.loading}>Loading...</Text>;

  if (!user) {
    return <Text style={styles.loading}>Please log in first</Text>;
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Admin only</Text>
        <Text style={styles.deniedText}>This page is restricted.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={26} color="black" />
          </TouchableOpacity>

          <Text style={styles.header}>Upload Audiobook (Admin)</Text>

          {/* spacer so title stays centered */}
          <View style={{ width: 32 }} />
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Audiobook title"
          style={styles.input}
        />

        <Text style={styles.label}>Intro</Text>
        <TextInput
          value={intro}
          onChangeText={setIntro}
          placeholder="Short description"
          style={[styles.input, styles.multiline]}
          multiline
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="conflict"
          style={styles.input}
        />

        <Text style={styles.label}>Transcript (optional)</Text>
        <TextInput
          value={transcriptText}
          onChangeText={setTranscriptText}
          placeholder="Paste transcript text here (optional)"
          style={[styles.input, styles.transcript]}
          multiline
        />

        <View style={styles.row}>
          <TouchableOpacity style={styles.actionBtn} onPress={pickCover}>
            <Text style={styles.actionText}>
              {coverUri ? "Change Cover" : "Pick Cover"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={pickAudio}>
            <Text style={styles.actionText}>
              {audio ? "Change Audio" : "Pick Audio"}
            </Text>
          </TouchableOpacity>
        </View>

        {!!coverUri && (
          <Image source={{ uri: coverUri }} style={styles.preview} />
        )}

        {!!audio?.name && (
          <Text style={styles.fileName}>Audio: {audio.name}</Text>
        )}

        {!!audio?.uri && (
          <View style={styles.previewRow}>
            <TouchableOpacity style={styles.previewBtn} onPress={togglePreview}>
              <Text style={styles.previewBtnText}>
                {previewPlaying ? "Pause Preview" : "Play Preview"}
              </Text>
            </TouchableOpacity>

            {!!previewDur && (
              <Text style={styles.previewMeta}>
                {Math.floor(previewPos / 1000)}s /{" "}
                {Math.floor(previewDur / 1000)}s
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.uploadBtn, submitting && styles.uploadBtnDisabled]}
          onPress={upload}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.uploadRow}>
              <ActivityIndicator />
              <Text style={styles.uploadText}>Uploading…</Text>
            </View>
          ) : (
            <Text style={styles.uploadText}>Upload</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  loading: {
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  deniedText: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: "center",
  },

  label: { fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  transcript: { minHeight: 140, textAlignVertical: "top" },

  row: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionText: { fontWeight: "600" },

  preview: { width: "100%", height: 220, borderRadius: 16, marginTop: 12 },
  fileName: { marginTop: 10, opacity: 0.7 },

  uploadBtn: {
    marginTop: 18,
    backgroundColor: "black",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadText: { color: "white", fontWeight: "700" },
  uploadRow: { flexDirection: "row", gap: 10, alignItems: "center" },

  note: { marginTop: 14, opacity: 0.6, fontSize: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  header: {
    fontSize: 20,
    fontWeight: "800",
  },

  closeBtn: {
    padding: 4,
    width: 32, // same width as spacer for perfect centering
    alignItems: "flex-start",
  },
  previewRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewBtn: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  previewBtnText: {
    fontWeight: "700",
  },
  previewMeta: {
    opacity: 0.6,
    fontWeight: "600",
  },
});
