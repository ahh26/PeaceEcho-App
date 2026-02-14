import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
} from "firebase/auth";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../firebase";

export default function SettingsScreen() {
  const [busy, setBusy] = useState(false);

  const email = auth.currentUser?.email ?? "";
  const emailVerified = auth.currentUser?.emailVerified ?? false;

  const canReset = useMemo(() => !!email && !busy, [email, busy]);
  const canLogout = useMemo(() => !busy, [busy]);

  const onResetPassword = async () => {
    if (!email) {
      Alert.alert("No email", "Your account does not have an email.");
      return;
    }

    try {
      setBusy(true);
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Email sent", "Check your inbox to reset your password.");
    } catch (e: any) {
      console.log("reset password failed:", e);
      Alert.alert("Failed", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setBusy(true);
      await sendEmailVerification(user);
      Alert.alert("Email sent", "Check your inbox to verify your email.");
    } catch (e: any) {
      console.log("send verification failed:", e);
      Alert.alert("Failed", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Log out?", "You'll need to log in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);
            await signOut(auth);
            router.replace("/");
          } catch (e: any) {
            console.log("logout failed:", e);
            Alert.alert("Failed", e?.message ?? "Please try again.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value} numberOfLines={1}>
            {email || "-"}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Email verified</Text>
          <Text style={styles.value}>{emailVerified ? "Yes" : "No"}</Text>
        </View>

        {!emailVerified && (
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline, busy && styles.btnDisabled]}
            onPress={onResendVerification}
            disabled={busy}
          >
            <Text style={styles.btnOutlineText}>Resend verification email</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Security</Text>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnOutline,
            !canReset && styles.btnDisabled,
          ]}
          onPress={onResetPassword}
          disabled={!canReset}
        >
          <Text style={styles.btnOutlineText}>Send password reset email</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Session</Text>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnDanger,
            !canLogout && styles.btnDisabled,
          ]}
          onPress={onLogout}
          disabled={!canLogout}
        >
          <Text style={styles.btnDangerText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 18 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 10,
  },
  iconBtn: { padding: 6, width: 40 },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800" },

  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: "800", marginBottom: 10 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  label: { fontSize: 12, color: "#666", fontWeight: "700" },
  value: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: "#111",
    fontWeight: "700",
  },

  btn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  btnOutline: { borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff" },
  btnOutlineText: { fontWeight: "800", color: "#111", fontSize: 13 },

  btnDanger: { backgroundColor: "#111" },
  btnDangerText: { fontWeight: "800", color: "#fff", fontSize: 13 },

  btnDisabled: { opacity: 0.5 },
});
