// Skins de FROGGER. Sin React: solo datos que lee el dibujo del motor.
import { DEFAULT_SKIN, type SkinId } from "../skin-ids";

export { DEFAULT_SKIN };

export interface SkinDef {
  // Franjas del mapa
  goalsBand: string;
  river: string;
  safe: string; // mediana y salida
  road: string;
  laneLine: string; // discontinua entre carriles
  // Bocas de meta
  goalFill: string;
  goalBorder: string;
  // Vehículos
  carColors: [string, string, string];
  carWindow: string;
  wheel: string;
  truckBody: string;
  truckCab: string;
  // Río
  log: string;
  logGrain: string;
  turtle: string;
  turtleLine: string;
  turtleSubmerged: string;
  // Rana
  frog: string;
  frogEye: string;
  frogPupil: string;
  // Barra de tiempo (alta / media / baja)
  timeHigh: string;
  timeMid: string;
  timeLow: string;
  // Dibujo
  glow: number; // shadowBlur de entidades y rana
  outline: string | null; // borde duro de 2 px en entidades y rana
  blocky: boolean; // true: tortugas y cuerpo de rana con esquinas rectas (8 bits)
}

export const SKINS: Record<SkinId, SkinDef> = {
  // Aspecto original, sin cambios.
  clasico: {
    goalsBand: "#0b3d1a",
    river: "#0a1f5c",
    safe: "#14532d",
    road: "#101014",
    laneLine: "rgba(255,255,255,0.18)",
    goalFill: "#1f7a34",
    goalBorder: "#e0b43a",
    carColors: ["#e53935", "#fdd835", "#1e88e5"],
    carWindow: "rgba(255,255,255,0.35)",
    wheel: "#050505",
    truckBody: "#9aa0a6",
    truckCab: "#e8710a",
    log: "#7a4a21",
    logGrain: "#4e2d12",
    turtle: "#2e9e4f",
    turtleLine: "#1b6b34",
    turtleSubmerged: "rgba(60,200,120,0.35)",
    frog: "#3ddc57",
    frogEye: "#ffffff",
    frogPupil: "#000000",
    timeHigh: "#3ddc57",
    timeMid: "#fdd835",
    timeLow: "#e53935",
    glow: 0,
    outline: null,
    blocky: false,
  },
  neon: {
    goalsBand: "#0a0a14",
    river: "#050a33",
    safe: "#12062a",
    road: "#05050a",
    laneLine: "#4a5cb0",
    goalFill: "#0a2a1a",
    goalBorder: "#ffe600",
    carColors: ["#ff006e", "#ffe600", "#00f5ff"],
    carWindow: "#ffffff",
    wheel: "#05050a",
    truckBody: "#b967ff",
    truckCab: "#ff9f1c",
    log: "#ff9f1c",
    logGrain: "#05050a",
    turtle: "#ff4fd8",
    turtleLine: "#05050a",
    turtleSubmerged: "#a0359a",
    frog: "#39ff14",
    frogEye: "#ffffff",
    frogPupil: "#05050a",
    timeHigh: "#39ff14",
    timeMid: "#ffe600",
    timeLow: "#ff006e",
    glow: 12,
    outline: "#05050a",
    blocky: false,
  },
  retro: {
    goalsBand: "#000000",
    river: "#000058",
    safe: "#003000",
    road: "#000000",
    laneLine: "#808080",
    goalFill: "#005000",
    goalBorder: "#f8d838",
    carColors: ["#f85858", "#f8d838", "#58b8f8"],
    carWindow: "#f8f8f8",
    wheel: "#000000",
    truckBody: "#c8c8c8",
    truckCab: "#f89838",
    log: "#c88020",
    logGrain: "#000000",
    turtle: "#38b8b8",
    turtleLine: "#000000",
    turtleSubmerged: "#38b8b8",
    frog: "#58f058",
    frogEye: "#f8f8f8",
    frogPupil: "#000000",
    timeHigh: "#58f058",
    timeMid: "#f8d838",
    timeLow: "#f85858",
    glow: 0,
    outline: "#000000",
    blocky: true,
  },
};
