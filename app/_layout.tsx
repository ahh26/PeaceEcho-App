import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { PlayerProvider } from "../context/PlayerContext";
import { UserProvider } from "../context/UserContext";

import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <UserProvider>
      <PlayerProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack screenOptions={{ headerShown: false }}>
            {/* This lets index.tsx be the FIRST screen */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ title: "Sign Up" }} />

            {/* Tabs come AFTER login */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="post"
              options={{
                title: "",
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="modal"
              options={{
                presentation: "modal",
                title: "Modal",
                headerShown: false,
              }}
            />
          </Stack>

          <StatusBar style="auto" />
        </ThemeProvider>
      </PlayerProvider>
    </UserProvider>
  );
}
