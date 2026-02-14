import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";

export async function getUserProfile(uid) {
  const refDoc = doc(db, "users", uid);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) return null;
  return snap.data();
}

export async function updateUserProfile(uid, data) {
  const refDoc = doc(db, "users", uid);
  await setDoc(
    refDoc,
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function uploadProfileImage(uid, uri) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const filename = `${Date.now()}.jpg`;
  const imageRef = ref(storage, `profilePictures/${uid}/${filename}`);
  await uploadBytes(imageRef, blob);
  return await getDownloadURL(imageRef);
}

export async function updateProfileAndBackfillPosts({
  uid,
  newUsername,
  newDisplayName,
  newPhotoURL,
  newBio,
  newRegion,
}) {
  if (!uid) throw new Error("Missing uid");

  const userUpdates = { updatedAt: serverTimestamp() };
  if (typeof newUsername === "string") userUpdates.username = newUsername;
  if (typeof newDisplayName === "string")
    userUpdates.displayName = newDisplayName;
  if (typeof newPhotoURL === "string") userUpdates.photoURL = newPhotoURL;
  if (typeof newBio === "string") userUpdates.bio = newBio;
  if (newRegion) userUpdates.region = newRegion;

  const userRef = doc(db, "users", uid);
  await updateDoc(doc(db, "users", uid), userUpdates);

  const q = query(collection(db, "posts"), where("uid", "==", uid));
  const snap = await getDocs(q);
  console.log("posts found for backfill:", snap.size);

  const batch = writeBatch(db);
  let count = 0;

  snap.forEach((postDoc) => {
    const postUpdates = {};

    if (typeof newUsername === "string") postUpdates.username = newUsername;
    if (typeof newDisplayName === "string")
      postUpdates.username = newDisplayName;
    if (typeof newPhotoURL === "string") postUpdates.userPhotoURL = newPhotoURL;

    if (Object.keys(postUpdates).length > 0) {
      batch.update(postDoc.ref, postUpdates);
      count += 1;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log("Backfill committed. Updated posts:", count);
  }

  return { updatedPosts: count };
}
