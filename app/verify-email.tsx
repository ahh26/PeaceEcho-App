import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { reload, sendEmailVerification } from "firebase/auth";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "../firebase";

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await sendEmailVerification(user);
    Alert.alert("Sent", "Verification email sent again.");
  };

  const iVerified = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        router.replace("/(tabs)/discover");
      } else {
        Alert.alert(
          "Not verified yet",
          "Please check your inbox and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={router.back}>
        <Ionicons name="chevron-back"></Ionicons>
      </TouchableOpacity>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.text}>
        We sent a verification link to your email. Click it, then come back and
        tap “I verified”.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={iVerified}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Checking..." : "I verified"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={resend}>
        <Text style={styles.link}>Resend email</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 10 },
  text: { color: "#555", marginBottom: 18, lineHeight: 20 },
  button: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  link: {
    marginTop: 14,
    color: "#5C6BC0",
    textAlign: "center",
    fontWeight: "700",
  },
});
