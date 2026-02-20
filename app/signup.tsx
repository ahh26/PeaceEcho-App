import { PALETTES } from "@/constants/palettes";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebase";

const THEME = PALETTES.sage;

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const signUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;
      const uid = user.uid;

      await sendEmailVerification(user);

      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        username,
        createdAt: serverTimestamp(),
        bio: "",
        photoUrl: "",
        region: "",
        gender: "",
        age: null,
        followers: [],
        following: [],
        emailVerified: false,
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
      });

      alert("Account created! Please verify your email.");
      router.replace("/(tabs)/discover");
    } catch (error: any) {
      alert("Sign up failed: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.textInput}
        placeholder="Email"
        placeholderTextColor={THEME.subtle}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.textInput}
        placeholder="Username"
        placeholderTextColor={THEME.subtle}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
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
          onSubmitEditing={signUp}
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

      <TouchableOpacity style={styles.button} onPress={signUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: THEME.bg,
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 40, // same as Login
    color: THEME.text,
  },

  textInput: {
    height: 50,
    width: "90%",
    backgroundColor: THEME.card,
    borderColor: THEME.border,
    borderWidth: 2,
    borderRadius: 15,
    marginVertical: 15,
    paddingHorizontal: 25,
    fontSize: 16,
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
    padding: 12,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.accent,
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
