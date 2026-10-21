// Skins de ARKANOID. Sin React: solo datos que lee el dibujo del motor.
import { DEFAULT_SKIN, type SkinId } from "../skin-ids";
import type { BlockColor } from "./sprites";

export { DEFAULT_SKIN };

export interface SkinDef {
  background: string;
  sprites: boolean; // true: dibuja el spritesheet; false: formas vectoriales
  blocks: Record<BlockColor, string>; // solo en modo vectorial
  blockBorder: string | null; // borde duro de 2 px (modo vectorial)
  paddle: string;
  ball: string;
  glow: number; // shadowBlur de bloques, paleta y pelota
  roundBall: boolean; // pelota circular (neón) o cuadrada (retro)
  explosion: "fade" | "flash"; // desvanecer o parpadeo a blanco en pasos
}

export const SKINS: Record<SkinId, SkinDef> = {
  // Aspecto original (spritesheet), sin cambios.
  clasico: {
    background: "#000",
    sprites: true,
    blocks: {
      gray: "#9e9e9e",
      red: "#e53935",
      yellow: "#fdd835",
      cyan: "#26c6da",
      magenta: "#ab47bc",
      hotpink: "#ec407a",
      green: "#66bb6a",
    },
    blockBorder: null,
    paddle: "#ffffff",
    ball: "#ffffff",
    glow: 0,
    roundBall: false,
    explosion: "fade",
  },
  neon: {
    background: "#05050a",
    sprites: false,
    blocks: {
      gray: "#c7d0e0",
      red: "#ff006e",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#c04dff",
      hotpink: "#ff9500",
      green: "#00ff88",
    },
    blockBorder: null,
    paddle: "#00f5ff",
    ball: "#ffffff",
    glow: 14,
    roundBall: true,
    explosion: "fade",
  },
  retro: {
    background: "#000",
    sprites: false,
    blocks: {
      gray: "#f8f8f8",
      red: "#f85858",
      yellow: "#f8f040",
      cyan: "#58e8e8",
      magenta: "#f060d0",
      hotpink: "#f8a030",
      green: "#58f058",
    },
    blockBorder: "#000",
    paddle: "#f8f8f8",
    ball: "#f8f040",
    glow: 0,
    roundBall: false,
    explosion: "flash",
  },
};
