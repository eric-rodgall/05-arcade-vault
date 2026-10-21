// Skins de SNAKE. Sin React: solo datos que lee el dibujo del motor.
import { DEFAULT_SKIN, type SkinId } from "../skin-ids";

export { DEFAULT_SKIN };

export interface SkinDef {
  background: string;
  grid: string; // color de la rejilla
  atlas: boolean; // true: frutas del atlas (con respaldo vectorial mientras carga); false: siempre vectorial
  fruit: string; // color de la fruta vectorial
  fruitShape: "circle" | "diamond";
  body: string;
  head: string;
  eyes: string;
  bodyBorder: string | null; // borde duro de 2 px en cada segmento
  glow: number; // shadowBlur de serpiente y fruta vectorial
  fruitGlow: number;
}

export const SKINS: Record<SkinId, SkinDef> = {
  // Aspecto original (atlas de frutas), sin cambios.
  clasico: {
    background: "#0a0a14",
    grid: "rgba(255,255,255,0.05)",
    atlas: true,
    fruit: "#ff2bd6",
    fruitShape: "circle",
    body: "#39ff14",
    head: "#b6ffa0",
    eyes: "#0a0a14",
    bodyBorder: null,
    glow: 8,
    fruitGlow: 10,
  },
  neon: {
    background: "#05050a",
    grid: "#4a5cb0",
    atlas: false,
    fruit: "#ff006e",
    fruitShape: "circle",
    body: "#00f5ff",
    head: "#ffffff",
    eyes: "#05050a",
    bodyBorder: null,
    glow: 14,
    fruitGlow: 16,
  },
  retro: {
    background: "#000000",
    grid: "#606060",
    atlas: false,
    fruit: "#f85858",
    fruitShape: "diamond",
    body: "#58f058",
    head: "#f8f8f8",
    eyes: "#000000",
    bodyBorder: "#000000",
    glow: 0,
    fruitGlow: 0,
  },
};
