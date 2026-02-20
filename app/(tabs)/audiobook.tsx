import { PALETTES } from "@/constants/palettes";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import MiniPlayer from "../../components/miniPlayer";
import { usePlayer } from "../../context/PlayerContext";
import { auth, db } from "../../firebase";

const THEME = PALETTES.beige;

export default function AudiobookScreen() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const { current } = usePlayer();

  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!auth.currentUser) return;
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

  const filteredBooks = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return books;

    return books.filter((b) => {
      const title = String(b.title ?? "").toLowerCase();
      const intro = String(b.intro ?? "").toLowerCase();
      const author = String(b.authorName ?? b.username ?? "").toLowerCase();
      return title.includes(s) || intro.includes(s) || author.includes(s);
    });
  }, [books, search]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.pageTitle}>Voices</Text>
      <Text style={styles.pageSub}>
        Listen to stories that build understanding.
      </Text>

      <View style={{ height: 12 }} />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={THEME.subtle} />
        <TextInput
          placeholder="Search by title, intro, or author…"
          placeholderTextColor={THEME.subtle}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={18} color={THEME.subtle} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 10 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safe}>
        {header}
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading audiobooks...</Text>
        </View>
        <MiniPlayer />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16 + insets.bottom + 84, //room for MiniPlayer
        }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="headset-outline" size={22} color={THEME.accent} />
            </View>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyText}>
              Try a different keyword, or clear the search.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cover = item.coverUrl || item.coverURL || item.imageUrl;
          const title = item.title ?? "Untitled";
          const intro = item.intro ?? "";
          const author = item.authorName ?? item.username ?? "";
          const mins = item.durationMins ?? item.lengthMins ?? null;

          const isActive = current?.id === item.id; // this book is the current one
          return (
            <TouchableOpacity
              activeOpacity={0.92}
              style={[styles.rowCard, isActive && styles.rowCardActive]}
              onPress={() => router.push(`/audiobook/${item.id}` as any)}
            >
              {/* Left big cover */}
              <Image
                source={
                  cover
                    ? { uri: cover }
                    : { uri: "https://via.placeholder.com/600" }
                }
                style={styles.rowCover}
              />

              {/* Right content */}
              <View style={styles.rowContent}>
                <View style={styles.topStack}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {title}
                    </Text>
                  </View>

                  {(!!author || !!mins) && (
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {author ? author : ""}
                      {author && mins ? " • " : ""}
                      {mins ? `${mins} min` : ""}
                    </Text>
                  )}

                  {!!intro && (
                    <Text style={styles.rowIntro} numberOfLines={3}>
                      {intro}
                    </Text>
                  )}
                </View>

                {/* Listen pinned to bottom-right */}
                <View
                  style={[styles.listenBtn, isActive && styles.listenBtnActive]}
                >
                  <Ionicons
                    name={isActive ? "stats-chart" : "play"}
                    size={14}
                    color={THEME.accent}
                  />
                  <Text style={styles.listenText}>
                    {isActive ? "Now Playing" : "Listen"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },

  header: { paddingHorizontal: 16, paddingBottom: 4 },

  pageTitle: { fontSize: 22, fontWeight: "900", color: THEME.text },
  pageSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: THEME.subtext,
  },

  searchBar: {
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
    fontWeight: "700",
    paddingRight: 28,
  },
  clearBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -9 }],
  },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cover: { width: 200, height: 200, borderRadius: 14, backgroundColor: "#EEE" },
  textWrap: { flex: 1, minWidth: 0 },

  title: { fontSize: 15, fontWeight: "900", color: THEME.text },
  author: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: THEME.subtext,
  },
  intro: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
    opacity: 0.85,
    lineHeight: 18,
  },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: THEME.accentSoft,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  metaText: { fontSize: 12, fontWeight: "900", color: THEME.text },
  metaRight: { fontSize: 12, fontWeight: "800", color: THEME.subtext },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: THEME.subtext, fontWeight: "700" },

  emptyWrap: { marginTop: 30, alignItems: "center", paddingHorizontal: 20 },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.accentSoft,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "900",
    color: THEME.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: THEME.subtext,
    textAlign: "center",
    lineHeight: 18,
  },
  rowCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },

  // Big but not TOO big — keeps the right side readable
  rowCover: {
    width: 150,
    height: 150,
    borderRadius: 16,
    backgroundColor: "#EEE",
  },

  rowContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-start",
    paddingBottom: 44,
    position: "relative",
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  rowTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: "900",
    color: THEME.text,
    lineHeight: 22,
  },

  rowMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    color: THEME.subtext,
  },

  rowIntro: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
    opacity: 0.85,
    lineHeight: 18,
  },

  rowBottom: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  listenBtn: {
    position: "absolute",
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: THEME.accentSoft,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  listenText: {
    fontSize: 13,
    fontWeight: "900",
    color: THEME.text,
  },
  topStack: {
    alignSelf: "stretch",
  },
  rowCardActive: {
    backgroundColor: "#EEF6F1", // noticeable green tint
    borderColor: THEME.accent,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  listenBtnActive: {
    backgroundColor: "#DCE9DF",
    borderColor: THEME.accent,
  },
});
