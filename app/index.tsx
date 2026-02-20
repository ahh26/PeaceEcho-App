import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PALETTES } from "../constants/palettes";
import { auth } from "../firebase";

const THEME = PALETTES.sage;

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const signIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/(tabs)/discover");
    } catch (error: any) {
      alert("Sign in failed: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.textInput}
        placeholder="Email"
        placeholderTextColor={THEME.subtle}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <View style={styles.passwordRow}>
        <TextInput
          ref={passwordRef}
          placeholder="Password"
          placeholderTextColor={THEME.subtle}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={styles.passwordInput}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={signIn}
        />

        <TouchableOpacity
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={10}
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={THEME.subtle}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={signIn}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/signup")}>
        <Text style={styles.link}>New user? Create an account</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: THEME.bg,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 40,
    color: THEME.text,
    alignSelf: "flex-start", // keeps title aligned to left
  },
  textInput: {
    height: 50,
    width: "90%",
    borderWidth: 2,
    borderRadius: 15,
    marginVertical: 15,
    paddingHorizontal: 25,
    fontSize: 16,
    backgroundColor: THEME.card,
    borderColor: THEME.border,
    color: THEME.text,

    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    width: "90%",
    borderWidth: 2,
    borderRadius: 15,
    marginVertical: 15,
    paddingHorizontal: 25,
    backgroundColor: THEME.card,
    borderColor: THEME.border,

    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.text,
  },
  button: {
    width: "90%",
    marginVertical: 15,
    backgroundColor: THEME.accent,
    shadowColor: THEME.accent,
    padding: 12,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: THEME.card,
    fontSize: 18,
    fontWeight: "600",
  },
  link: {
    color: THEME.accent,
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
  },
});
