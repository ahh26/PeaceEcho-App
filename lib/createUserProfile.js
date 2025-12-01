import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const createUserProfile = async (uid, userData) => {
    await setDoc(doc(db, "users", uid),{
        username: userData.username,
        email: userData.email,
        profilePic: "",
        age: null,
        gender: null,
        country: null,
        followers: [],
        following: [],
        savedPosts: [],
        createdAt: serverTimestamp(),
    });
};