import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";

export default function PickPhotos() {
  useFocusEffect(
    useCallback(() => {
      (async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10,
          quality: 0.8,
        });

        if (!result.canceled) {
          const uris = result.assets.map((a) => a.uri);
          router.push({
            pathname: "/(tabs)/create/edit",
            params: { images: JSON.stringify(uris) },
          });
        } else {
          router.replace("/(tabs)/discover");
        }
      })();
    }, [])
  );

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
