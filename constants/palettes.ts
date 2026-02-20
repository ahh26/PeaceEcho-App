export const PALETTES = {
  sage: {
    bg: "#F6F7F3",
    card: "#FFFFFF",
    border: "#E6E9E3",
    text: "#1F2A24",
    subtext: "#7C877F",
    subtle: "#9CA3AF",
    accent: "#6F8B77",
    accentSoft: "#E7EFE9",
    shadow: "rgba(17, 24, 39, 0.08)",
  },
  beige: {
    bg: "#FAF7F0",
    card: "#FFFFFF",
    border: "#E6E0D4",
    text: "#111827",
    subtext: "#6B7280",
    subtle: "#9CA3AF",
    accent: "#6F8B77", // keep sage as accent if like
    accentSoft: "#E7EFE9",
    shadow: "rgba(17, 24, 39, 0.08)",
  },
  sandProfile: {
    bg: "#FAF7F0",
    card: "#FFFFFF",
    border: "#E6D8C3",
    text: "#111827",
    subtext: "#C9B79B", // used for bio/secondary text
    subtle: "#9CA3AF",
    accent: "#D7C3A2", // sand
    accentSoft: "#EFE3CF", // sandSoft
    shadow: "rgba(17, 24, 39, 0.08)",
    glass: "rgba(255,255,255,0.78)",
  },
} as const;

export type PaletteName = keyof typeof PALETTES; // "sage" | "beige"
export type Palette = (typeof PALETTES)[PaletteName];
