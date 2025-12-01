import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export const getUserProfile = async (uid) => {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data();
};
