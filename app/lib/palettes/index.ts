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
  surfaceHover: string;
  surfacePressed: string;
  borderFocus: string;
  surfaceDisabled: string;
  dangerPrimary: string;
  dangerSubtle: string;
  dangerHover: string;
  dangerText: string;
  warningPrimary: string;
  warningSubtle: string;
  warningHover: string;
  warningText: string;
  successPrimary: string;
  successSubtle: string;
  successHover: string;
  successText: string;
  infoPrimary: string;
  infoSubtle: string;
  infoHover: string;
  infoText: string;
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