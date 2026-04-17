export type Palette = {
  canvas: string;
  frame: string;
  card: string;
  panel: string;
  tier1: string;
  borderDefault: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accentPrimary: string;
  accentSubtle: string;
  dotGrid: string;
};

import { zincLight } from "./zinc-light";
import { zincDark } from "./zinc-dark";

export const palettes = {
  zincLight,
  zincDark,
} as const;

export type PaletteName = keyof typeof palettes;

export const activePaletteName: PaletteName = "zincLight";
export const activePalette: Palette = palettes[activePaletteName];