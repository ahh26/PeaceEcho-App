// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCjyRrdeniKQ3KEamG2YML-mszQ67b1k78",
  authDomain: "peaceecho-96eaa.firebaseapp.com",
  projectId: "peaceecho-96eaa",
  storageBucket: "peaceecho-96eaa.appspot.com", // FIXED
  messagingSenderId: "834292648974",
  appId: "1:834292648974:web:e63b840eb7e38cb6e4405f",
};

export const app = initializeApp(firebaseConfig);

// ⭐ This is all you need for persistent login in Expo
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
