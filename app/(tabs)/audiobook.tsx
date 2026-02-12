import { router } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MiniPlayer from "../../components/miniPlayer";
import { db } from "../../firebase";

export default function AudiobookScreen() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);

    const q = query(
      collection(db, "audiobooks"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBooks(items);
        setLoading(false);
      },
      (err) => {
        console.log("audiobooks listener error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  const filteredBooks = books.filter((b) =>
    (b.title ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  if (loading) {
    return <Text style={{ padding: 16 }}> Loading... </Text>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Search audiobooks"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        style={styles.screen}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/audiobook/${item.id}` as any)}
          >
            <Image source={{ uri: item.coverUrl }} style={styles.cover} />

            <View style={styles.textWrapper}>
              <Text style={styles.title}>{item.title}</Text>

              <Text style={styles.intro} numberOfLines={2}>
                {item.intro}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  screen: {
    flex: 1,
  },

  loading: {
    padding: 16,
  },

  listContent: {
    padding: 12,
  },

  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "white",
    marginBottom: 10,
  },

  cover: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
  },

  textWrapper: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
  },

  intro: {
    marginTop: 4,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
});
