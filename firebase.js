import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";



// Your fixed config
const firebaseConfig = {
  apiKey: "AIzaSyCjyRrdeniKQ3KEamG2YML-mszQ67b1k78",
  authDomain: "peaceecho-96eaa.firebaseapp.com",
  projectId: "peaceecho-96eaa",
  storageBucket: "peaceecho-96eaa.firebasestorage.app",
  messagingSenderId: "834292648974",
  appId: "1:834292648974:web:e63b840eb7e38cb6e4405f",
};

// Initialize app ONLY if not already created
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth safely
let _auth;
if (!getApps().length) {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  _auth = getAuth(app);
}

export const auth = _auth;

// Firestore + Storage
export const db = getFirestore(app);
export const storage = getStorage(app, "gs://peaceecho-96eaa.firebasestorage.app");
