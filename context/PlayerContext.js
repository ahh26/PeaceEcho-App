import { Audio } from "expo-av";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const soundRef = useRef(null);
  const currentRef = useRef(null);

  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,

          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.log("Audio mode error:", e);
      }
    })();

    return () => {
      // cleanup on app reload
      (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch {}
      })();
    };
  }, []);

  const attachStatusListener = (sound) => {
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (!status.isLoaded) return;

      setIsPlaying(status.isPlaying);
      setPositionMs(status.positionMillis ?? 0);
      setDurationMs(status.durationMillis ?? 0);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPositionMs(0);
        try {
          await sound.setPositionAsync(0);
        } catch {}
      }
    });
  };

  const unloadExisting = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  };

  const play = async (audiobook) => {
    if (!audiobook?.audioUrl) return;

    // same audiobook → resume; at the end -> start from beginning
    if (currentRef.current?.id === audiobook.id && soundRef.current) {
      try {
        const st = await soundRef.current.getStatusAsync();
        const nearEnd =
          st?.isLoaded &&
          st.durationMillis != null &&
          st.positionMillis != null &&
          st.positionMillis >= st.durationMillis - 250;

        if (nearEnd) {
          await soundRef.current.setPositionAsync(0);
        }

        await soundRef.current.playAsync();
      } catch {}
      return;
    }

    await unloadExisting();

    const { sound } = await Audio.Sound.createAsync(
      { uri: audiobook.audioUrl },
      { shouldPlay: true },
    );

    soundRef.current = sound;
    currentRef.current = audiobook;
    setCurrent(audiobook);

    attachStatusListener(sound);

    try {
      await sound.playAsync();
    } catch {}
  };

  const pause = async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.pauseAsync();
    } catch {}
  };

  const resume = async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.playAsync();
    } catch {}
  };

  const stop = async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.stopAsync();
      await soundRef.current.setPositionAsync(0);
    } catch {}
    setIsPlaying(false);
    setPositionMs(0);
  };

  const seekTo = async (ms) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(ms);
    } catch {}
  };

  return (
    <PlayerContext.Provider
      value={{
        current,
        isPlaying,
        positionMs,
        durationMs,
        play,
        pause,
        resume,
        stop,
        seekTo,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
