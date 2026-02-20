import { Stack } from "expo-router";

export default function CreateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="category" />
      <Stack.Screen name="pick" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
