import { PALETTES } from "@/constants/palettes";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const THEME = PALETTES.beige;

export default function Page() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <Text
        style={{ paddingHorizontal: 18, paddingVertical: 18, fontSize: 18 }}
      >
        Page in progress...
      </Text>
    </SafeAreaView>
  );
}
