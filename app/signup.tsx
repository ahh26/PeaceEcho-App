import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../firebase";
import { createUserProfile } from "../lib/createUserProfile";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const signUp = async () => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        await createUserProfile(uid, {username, email });
    
        router.replace("../(tabs)");
    } catch (error: any) {
        alert("Sign up failed: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
            style={styles.textInput}
            placeholder="email"
            value={email}
            onChangeText={setEmail}
        />

        <TextInput
            style={styles.textInput}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
        />

        <TextInput
            style={styles.textInput}
            placeholder="password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
        />

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
  container: { padding: 20 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 20 },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#5C6BC0",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 18 },
  link: {
    color: "#5C6BC0",
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
  },
});
