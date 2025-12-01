import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { getUserProfile } from "../lib/getUserProfile";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // logged in user's profile
  const [loading, setLoading] = useState(true); // loading state

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setUser({
          uid: firebaseUser.uid,
          ...profile,     // username, age, country, profilePic, etc.
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

