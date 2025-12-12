import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";

export async function getUserProfile(uid) {
    const refDoc = doc(db, "users", uid);
    const snap = await getDoc(refDoc);

    if(!snap.exists())return null;
    return snap.data();
}

export async function updateUserProfile(uid,data){
    const refDoc = doc(db, "users", uid);
    await getDoc(refDoc,data,{merge:true});
    // await setDoc(refDoc,data,{merge:true});
}

export async function uploadProfileImage(uid,uri){
    const response = await fetch(uri);
    const blob = await response.blob();

    const imageRef = ref(storage, `profilePictures/${uid}.jpg`)
    await uploadBytes(imageRef, blob);
    const downloadURL = await getDownloadURL(imageRef);

    await updateUserProfile(uid, {photoURL: downloadURL});

    return downloadURL;
}