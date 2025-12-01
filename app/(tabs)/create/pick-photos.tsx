// app/(tabs)/create/pick-photos.tsx
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PickPhotos() {
  const [images, setImages] = useState<string[]>([]);

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      setImages(result.assets.map(a => a.uri));
    }
  };

  const goNext = () => {
    router.push({
      pathname: "/(tabs)/create/edit-post",
      params: { images: JSON.stringify(images) },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Choose Photos</Text>

      <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
        <Text style={styles.pickButtonText}>
          {images.length > 0 ? "Pick More Photos" : "Select Photos"}
        </Text>
      </TouchableOpacity>

      {images.length > 0 && (
        <>
          <FlatList
            data={images}
            keyExtractor={(item, index) => index.toString()}
            numColumns={3}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.thumbnail} />
            )}
          />

          <TouchableOpacity style={styles.nextButton} onPress={goNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  pickButton: {
    backgroundColor: "#3949AB",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  pickButtonText: { color: "#fff", textAlign: "center", fontSize: 16 },
  thumbnail: {
    width: "31%",
    height: 120,
    margin: "1%",
    borderRadius: 10,
  },
  nextButton: {
    backgroundColor: "#5C6BC0",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  nextButtonText: { color: "white", textAlign: "center", fontSize: 18 },
});
