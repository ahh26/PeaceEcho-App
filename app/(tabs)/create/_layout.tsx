import { Stack } from "expo-router";

export default function CreateStack() {
  return (
    <Stack 
        screenOptions={{ 
            headerShown: false,
            animation: "fade_from_bottom",
            presentation: "modal"
        }}
    >
      <Stack.Screen name="pick" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
