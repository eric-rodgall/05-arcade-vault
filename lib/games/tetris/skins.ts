// Skins de TETRIS. Sin React: solo datos que lee el dibujo del motor.
import { DEFAULT_SKIN, type SkinId } from "../skin-ids";

export { DEFAULT_SKIN };

export interface SkinDef {
  background: string;
  grid: string;
  gridWidth: number;
  separator: string;
  colors: (string | null)[]; // índice 0 = vacío; 1..8 = I O T S Z J L N
  bevel: string | null; // franja clara superior de cada bloque
  border: string | null; // borde duro de 2 px alrededor del bloque
  glow: number; // shadowBlur de los bloques (0 = sin brillo)
  ghost: "fill" | "outline"; // pieza fantasma: relleno translúcido o solo contorno
  ghostAlpha: number;
}

export const SKINS: Record<SkinId, SkinDef> = {
  // Aspecto original, sin cambios.
  clasico: {
    background: "#000",
    grid: "rgba(255,255,255,0.07)",
    gridWidth: 0.5,
    separator: "rgba(255,255,255,0.25)",
    colors: [
      null,
      "#4dd0e1",
      "#ffd54f",
      "#ba68c8",
      "#81c784",
      "#e57373",
      "#90caf9",
      "#ffb74d",
      "#9e9e9e",
    ],
    bevel: "rgba(255,255,255,0.12)",
    border: null,
    glow: 0,
    ghost: "fill",
    ghostAlpha: 0.2,
  },
  neon: {
    background: "#05050a",
    grid: "#4d5f9e",
    gridWidth: 0.5,
    separator: "#8a8fb5",
    colors: [
      null,
      "#00f5ff",
      "#f5ff00",
      "#c04dff",
      "#00ff88",
      "#ff2d7a",
      "#4d7dff",
      "#ff9500",
      "#c7d0e0",
    ],
    bevel: null,
    border: null,
    glow: 12,
    ghost: "outline",
    ghostAlpha: 0.7,
  },
  retro: {
    background: "#000",
    grid: "#3f7a3f",
    gridWidth: 1,
    separator: "#58f058",
    colors: [
      null,
      "#58e8e8",
      "#f8f040",
      "#f060d0",
      "#58f058",
      "#f8f040",
      "#58e8e8",
      "#58f058",
      "#f8f8f8",
    ],
    bevel: null,
    border: "#000",
    glow: 0,
    ghost: "outline",
    ghostAlpha: 1,
  },
};
