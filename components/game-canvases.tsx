import type { ComponentType, RefObject } from "react";
import { ArkanoidCanvas } from "@/components/arkanoid-canvas";
import { AsteroidsCanvas } from "@/components/asteroids-canvas";
import { SnakeCanvas } from "@/components/snake-canvas";
import { TetrisCanvas } from "@/components/tetris-canvas";
import type { GameInputSink } from "@/lib/games/input";
import type { SkinId } from "@/lib/games/skin-ids";

export interface EngineStats {
  score: number;
  lives?: number;
  level?: number;
}

export interface EngineProps {
  paused: boolean;
  onStats: (stats: EngineStats) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId; // opcional: solo lo usan los juegos de SKIN_GAMES
  inputRef?: RefObject<GameInputSink | null>; // el gamepad táctil lo lee para enviar entrada
}

// Juegos con motor real. Los ids que no estén aquí usan la puntuación simulada.
export const GAME_ENGINES: Record<string, ComponentType<EngineProps>> = {
  asteroides: AsteroidsCanvas,
  caida: TetrisCanvas,
  "bloque-buster": ArkanoidCanvas,
  serpentina: SnakeCanvas,
};

// Juegos cuyo motor soporta skins (el selector de GamePlayer solo aparece para ellos).
export const SKIN_GAMES: ReadonlySet<string> = new Set([
  "caida",
  "bloque-buster",
  "serpentina",
  "asteroides",
]);
