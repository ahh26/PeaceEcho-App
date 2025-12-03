// app/(tabs)/create/index.tsx
import { router } from "expo-router";
import { useEffect } from "react";

export default function CreateIndex() {
  useEffect(() => {
    router.replace("/(tabs)/create/pick");
  }, []);

  return null;
}
