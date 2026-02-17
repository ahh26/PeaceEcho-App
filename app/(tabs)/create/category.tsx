import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { reflection_categories } from "../../../lib/reflectionCategories";

export default function CreateCategory() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        What kind of story / reflection are you sharing?
      </Text>

      <View style={styles.list}>
        {reflection_categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.item}
            onPress={() => {
              router.push({
                pathname: "/(tabs)/create/pick",
                params: { reflectionCategory: c.id },
              });
            }}
          >
            <Text style={styles.emoji}>{c.emoji}</Text>
            <Text style={styles.label}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.cancel}>Cancel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
  list: {
    marginTop: 16,
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    gap: 10,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  cancel: {
    marginTop: 20,
    textAlign: "center",
    color: "#6B7280",
  },
});
