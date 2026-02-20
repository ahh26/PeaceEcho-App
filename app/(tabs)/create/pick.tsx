import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";

export default function PickPhotos() {
  const params = useLocalSearchParams();

  const reflectionCategory =
    typeof params.reflectionCategory === "string"
      ? params.reflectionCategory
      : Array.isArray(params.reflectionCategory)
        ? params.reflectionCategory[0]
        : "";

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
            pathname: "/create/edit",
            params: { images: JSON.stringify(uris), reflectionCategory },
          });
        } else {
          router.replace("/discover");
        }
      })();
    }, [reflectionCategory]),
  );

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
