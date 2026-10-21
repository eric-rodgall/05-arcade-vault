// Skins de ASTEROIDES. Sin React: solo datos que lee el dibujo del motor.
import { DEFAULT_SKIN, type SkinId } from "../skin-ids";

export { DEFAULT_SKIN };

export interface SkinDef {
  background: string;
  ship: string;
  asteroid: string;
  bullet: string;
  powerUp: string;
  flame: string;
  particle: string; // "r,g,b": el alfa lo pone el desvanecido
  glow: number; // shadowBlur de las entidades
  lineWidth: number; // grosor del trazo de nave y asteroides
  lineJoin: CanvasLineJoin; // "round" o "miter" (bordes duros)
  fade: boolean; // partículas con desvanecido (false: opacas hasta desaparecer)
}

export const SKINS: Record<SkinId, SkinDef> = {
  // Aspecto original, sin cambios.
  clasico: {
    background: "#000",
    ship: "#fff",
    asteroid: "#fff",
    bullet: "#fff",
    powerUp: "#0ff",
    flame: "rgba(255, 130, 0, 0.85)",
    particle: "255,255,255",
    glow: 0,
    lineWidth: 1.5,
    lineJoin: "round",
    fade: true,
  },
  neon: {
    background: "#05050a",
    ship: "#00f5ff",
    asteroid: "#c04dff",
    bullet: "#f5ff00",
    powerUp: "#00ff88",
    flame: "#ff9500",
    particle: "255,0,110",
    glow: 12,
    lineWidth: 2,
    lineJoin: "round",
    fade: true,
  },
  retro: {
    background: "#000",
    ship: "#f8f040",
    asteroid: "#f8f8f8",
    bullet: "#f8f040",
    powerUp: "#58e8e8",
    flame: "#f8a030",
    particle: "248,248,248",
    glow: 0,
    lineWidth: 2,
    lineJoin: "miter",
    fade: false,
  },
};
