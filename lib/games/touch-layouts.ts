// Botones del gamepad virtual por juego (clave: `games.id`). Sin React.
import type { GameInputCode } from "@/lib/games/input";

export interface TouchButton {
  code: GameInputCode;
  label: string; // etiqueta visible y base del aria-label
  repeat?: boolean; // repite al mantener (solo caida: ←, →, ↓)
}

export interface TouchLayout {
  dpad: TouchButton[]; // subconjunto de ←, →, ↑, ↓
  actions: TouchButton[]; // 0, 1 o 2 botones A/B
}

const LEFT: TouchButton = { code: "ArrowLeft", label: "←" };
const RIGHT: TouchButton = { code: "ArrowRight", label: "→" };
const UP: TouchButton = { code: "ArrowUp", label: "↑" };
const DOWN: TouchButton = { code: "ArrowDown", label: "↓" };

export const TOUCH_LAYOUTS: Record<string, TouchLayout> = {
  asteroides: {
    dpad: [LEFT, RIGHT, UP],
    actions: [{ code: "Space", label: "DISPARO" }],
  },
  caida: {
    dpad: [
      { ...LEFT, repeat: true },
      { ...RIGHT, repeat: true },
      { ...DOWN, repeat: true },
    ],
    actions: [
      { code: "ArrowUp", label: "ROTAR" },
      { code: "Space", label: "CAÍDA" },
    ],
  },
  "bloque-buster": {
    dpad: [LEFT, RIGHT],
    actions: [],
  },
  serpentina: {
    dpad: [LEFT, RIGHT, UP, DOWN],
    actions: [],
  },
};
