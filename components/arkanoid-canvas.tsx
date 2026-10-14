"use client";

import { useEffect, useRef } from "react";
import type { EngineProps } from "@/components/game-canvases";
import {
  createArkanoidGame,
  H,
  W,
  type ArkanoidGame,
} from "@/lib/games/arkanoid/engine";

export function ArkanoidCanvas({ paused, onStats, onGameOver }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ArkanoidGame | null>(null);
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
    const game = createArkanoidGame(canvas, {
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
    <canvas ref={canvasRef} className="arkanoid-canvas" width={W} height={H} />
  );
}
