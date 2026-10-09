import type { ComponentType } from "react";
import { AsteroidsCanvas } from "@/components/asteroids-canvas";
import { TetrisCanvas } from "@/components/tetris-canvas";

export interface EngineStats {
  score: number;
  lives?: number;
  level?: number;
}

export interface EngineProps {
  paused: boolean;
  onStats: (stats: EngineStats) => void;
  onGameOver: (finalScore: number) => void;
}

// Juegos con motor real. Los ids que no estén aquí usan la puntuación simulada.
export const GAME_ENGINES: Record<string, ComponentType<EngineProps>> = {
  asteroides: AsteroidsCanvas,
  caida: TetrisCanvas,
};
