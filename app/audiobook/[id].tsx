import { PALETTES } from "@/constants/palettes";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayer } from "../../context/PlayerContext";
import { db } from "../../firebase";

const THEME = PALETTES.beige;

function formatTime(ms: number) {
  if (!ms || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioBookDetail() {
  const { id } = useLocalSearchParams();
  const [book, setBook] = useState<any>(null);
  const {
    current,
    isPlaying,
    positionMs,
    durationMs,
    play,
    pause,
    resume,
    seekTo,
  } = usePlayer();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const ref = doc(db, "audiobooks", String(id));
        const snap = await getDoc(ref);
        if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
      } catch (e) {
        console.log("load audiobook error:", e);
      }
    };

    load();
  }, [id]);

  const isThis = current?.id === book?.id;
  const effectivePos = isThis ? (positionMs ?? 0) : 0;
  const effectiveDur = isThis ? (durationMs ?? 0) : 0;

  const barRef = useRef<View>(null);
  const barLeftXRef = useRef(0);
  const barWidthRef = useRef(0);

  const [barWidth, setBarWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const scrubXAnim = useRef(new Animated.Value(0)).current; //for scrubbing

  const playbackWidth =
    barWidth && effectiveDur ? (effectivePos / effectiveDur) * barWidth : 0;

  const knobLeft = playbackWidth - 7;

  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

  const xToMs = (x: number) => {
    const w = barWidthRef.current;
    if (!effectiveDur || !w) return 0;
    const pct = clamp(x / w, 0, 1);
    return Math.floor(pct * effectiveDur);
  };

  const measureBar = () => {
    barRef.current?.measureInWindow((x, _y, w) => {
      barLeftXRef.current = x;
      barWidthRef.current = w;
      if (!isScrubbing) setBarWidth(w);
    });
  };

  const displayedPos = useMemo(() => {
    if (!isScrubbing) return effectivePos;
    const x = (scrubXAnim as any).__getValue?.() ?? 0;
    return xToMs(x);
  }, [isScrubbing, effectivePos, barWidth, effectiveDur]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isThis && !!effectiveDur,
        onMoveShouldSetPanResponder: () => isThis && !!effectiveDur,

        onPanResponderGrant: () => {
          if (!isThis || !effectiveDur) return;
          setIsScrubbing(true);
          measureBar();
          scrubXAnim.setValue(playbackWidth);
        },

        onPanResponderMove: (_evt, gestureState) => {
          if (!isThis || !effectiveDur) return;

          const left = barLeftXRef.current;
          const w = barWidthRef.current;
          if (!w) return;

          const x = clamp(gestureState.moveX - left, 0, w);
          scrubXAnim.setValue(x);
        },

        onPanResponderRelease: async () => {
          if (!isThis || !effectiveDur) return;
          const x = (scrubXAnim as any).__getValue?.() ?? 0;
          await seekTo(xToMs(x));
          setIsScrubbing(false);
        },

        onPanResponderTerminate: async () => {
          if (!isThis || !effectiveDur) return;
          const x = (scrubXAnim as any).__getValue?.() ?? 0;
          await seekTo(xToMs(x));
          setIsScrubbing(false);
        },
      }),
    [isThis, effectiveDur, seekTo],
  );

  const onPressPlay = async () => {
    if (!book) return;

    if (isThis) {
      if (isPlaying) await pause();
      else await resume();
      return;
    }

    await play({
      id: book.id,
      title: book.title,
      audioUrl: book.audioUrl,
      coverUrl: book.coverUrl,
    });
  };

  const jumpBy = async (deltaMs: number) => {
    if (!isThis) return;
    const next = Math.max(
      0,
      Math.min(effectiveDur || 0, effectivePos + deltaMs),
    );
    await seekTo(next);
  };

  if (!book) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontWeight: "700" }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        scrollEnabled={!isScrubbing}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={28} color="#4D5161" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Listening Now</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Cover */}
        <View style={styles.coverWrap}>
          <Image source={{ uri: book.coverUrl }} style={styles.cover} />
        </View>

        {/* Player area (squeezed) */}
        <View style={styles.playerArea}>
          <Text style={styles.title}>{book.title}</Text>
          {!!book.intro && <Text style={styles.intro}>{book.intro}</Text>}

          {/* Progress */}
          <View
            ref={barRef}
            onLayout={measureBar}
            style={styles.progressOuter}
            {...panResponder.panHandlers}
          >
            <View style={styles.progressTrack}>
              {isScrubbing ? (
                <Animated.View
                  style={[styles.progressInner, { width: scrubXAnim }]}
                />
              ) : (
                <View
                  style={[styles.progressInner, { width: playbackWidth }]}
                />
              )}
            </View>

            {barWidth > 0 &&
              (isScrubbing ? (
                <Animated.View
                  style={[
                    styles.knob,
                    {
                      transform: [
                        { translateX: Animated.subtract(scrubXAnim, 7) },
                      ],
                    },
                  ]}
                />
              ) : (
                <View style={[styles.knob, { left: knobLeft }]} />
              ))}
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(displayedPos)}</Text>
            <Text style={styles.time}>{formatTime(effectiveDur)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={() => jumpBy(-15000)}>
              <Ionicons name="play-back" size={28} color="#495666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.playBtn} onPress={onPressPlay}>
              <Ionicons
                name={isThis && isPlaying ? "pause" : "play"}
                size={26}
                color="white"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => jumpBy(15000)}>
              <Ionicons name="play-forward" size={28} color="#495666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Transcript block */}
        <View style={styles.transcriptBlock}>
          <Text style={styles.transcriptTitle}>Transcript</Text>

          {book.transcriptText ? (
            <Text style={styles.transcript}>{book.transcriptText}</Text>
          ) : (
            <Text style={styles.noTranscript}>
              No transcript available currently.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  content: {
    marginTop: 18,
    paddingHorizontal: 6,
  },

  container: {
    padding: 18,
    paddingBottom: 40,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  topTitle: {
    color: THEME.text,
    fontWeight: "700",
    opacity: 0.75,
  },

  coverWrap: {
    alignItems: "center",
    marginTop: 20,
  },

  cover: {
    width: 350,
    height: 350,
    borderRadius: 12,
    backgroundColor: THEME.accentSoft, // helps while loading
  },

  playerArea: {
    marginTop: 18,
    marginHorizontal: 20,
  },

  title: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 20,
  },

  intro: {
    color: THEME.subtext,
    opacity: 0.85,
    marginTop: 8,
    lineHeight: 19,
  },

  progressOuter: {
    marginTop: 16,
    height: 20,
    justifyContent: "center",
  },

  progressTrack: {
    height: 4,
    backgroundColor: THEME.accentSoft,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressInner: {
    height: 4,
    backgroundColor: THEME.accent,
    borderRadius: 999,
  },

  knob: {
    position: "absolute",
    top: 3,
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: THEME.accent,
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  time: {
    color: THEME.subtle,
    fontSize: 12,
  },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    marginTop: 16,
  },

  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: THEME.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },

  transcriptBlock: {
    marginTop: 40,
    padding: 16,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },

  transcriptTitle: {
    color: THEME.text,
    fontWeight: "800",
    fontSize: 18,
  },

  transcript: {
    color: THEME.text,
    opacity: 0.88,
    marginTop: 10,
    lineHeight: 22,
  },

  noTranscript: {
    marginTop: 10,
    color: THEME.subtext,
    opacity: 0.85,
    fontWeight: "700",
    lineHeight: 20,
  },
});
