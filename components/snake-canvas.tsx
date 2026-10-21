"use client";

import { useEffect, useRef } from "react";
import type { EngineProps } from "@/components/game-canvases";
import {
  createSnakeGame,
  H,
  W,
  type SnakeGame,
} from "@/lib/games/snake/engine";
import { DEFAULT_SKIN } from "@/lib/games/skin-ids";

export function SnakeCanvas({ paused, onStats, onGameOver, skin = DEFAULT_SKIN }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<SnakeGame | null>(null);
  const pausedRef = useRef(paused);
  const onStatsRef = useRef(onStats);
  const onGameOverRef = useRef(onGameOver);
  const skinRef = useRef(skin);

  useEffect(() => {
    pausedRef.current = paused;
    onStatsRef.current = onStats;
    onGameOverRef.current = onGameOver;
    skinRef.current = skin;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createSnakeGame(
      canvas,
      {
        onStats: (stats) => onStatsRef.current(stats),
        onGameOver: (finalScore) => onGameOverRef.current(finalScore),
      },
      skinRef.current
    );
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

  useEffect(() => {
    gameRef.current?.setSkin(skin);
  }, [skin]);

  return (
    <canvas ref={canvasRef} className="snake-canvas" width={W} height={H} />
  );
}
