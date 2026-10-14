"use client";

import { useEffect, useRef } from "react";
import type { EngineProps } from "@/components/game-canvases";
import {
  createSnakeGame,
  H,
  W,
  type SnakeGame,
} from "@/lib/games/snake/engine";

export function SnakeCanvas({ paused, onStats, onGameOver }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<SnakeGame | null>(null);
  const pausedRef = useRef(paused);
  const onStatsRef = useRef(onStats);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    pausedRef.current = paused;
    onStatsRef.current = onStats;
    onGameOverRef.current = onGameOver;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createSnakeGame(canvas, {
      onStats: (stats) => onStatsRef.current(stats),
      onGameOver: (finalScore) => onGameOverRef.current(finalScore),
    });
    gameRef.current = game;
    if (pausedRef.current) game.pause();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (paused) gameRef.current?.pause();
    else gameRef.current?.resume();
  }, [paused]);

  return (
    <canvas ref={canvasRef} className="snake-canvas" width={W} height={H} />
  );
}
