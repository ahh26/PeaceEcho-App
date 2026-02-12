import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePlayer } from "../context/PlayerContext";

export default function MiniPlayer() {
  const { current, isPlaying, pause, resume } = usePlayer();

  if (!current) return null;

  const onToggle = async () => {
    if (isPlaying) await pause();
    else await resume();
  };

  const goToDetail = () => {
    router.push(`/audiobook/${current.id}` as any);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.left} onPress={goToDetail}>
        {!!current.coverUrl && (
          <Image source={{ uri: current.coverUrl }} style={styles.cover} />
        )}

        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {isPlaying ? "Playing" : "Paused"}
          </Text>
        </View>
      </Pressable>

      <TouchableOpacity style={styles.button} onPress={onToggle}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12, // if only on audiobook page, keep it low
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  left: {
    //left part of miniplayer
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    opacity: 0.6,
  },
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
