"use client";

import { useEffect, useRef } from "react";
import {
  createAsteroidsGame,
  type AsteroidsGame,
} from "@/lib/games/asteroids/engine";

interface AsteroidsCanvasProps {
  paused: boolean;
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  onGameOver: (finalScore: number) => void;
}

export function AsteroidsCanvas({
  paused,
  onStats,
  onGameOver,
}: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
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
    const game = createAsteroidsGame(canvas, {
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
    <canvas
      ref={canvasRef}
      className="asteroids-canvas"
      width={800}
      height={600}
    />
  );
}
