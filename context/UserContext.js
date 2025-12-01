import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { getUserProfile } from "../lib/getUserProfile";


const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // logged in user's profile
  const [loading, setLoading] = useState(true); // loading state

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(firebaseUser.uid);

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...profile,  // username, profilePic, etc.
        });
      } catch (err) {
        console.log("Failed to load profile:", err);

        // still allow login even if profile didn’t load
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider value={{ user, loading , setUser}}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

