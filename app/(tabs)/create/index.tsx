import { router } from "expo-router";
import { useEffect } from "react";

export default function CreateIndex() {
  useEffect(() => {
    router.replace("/create/pick-photos");
  }, []);

  return null;
}
