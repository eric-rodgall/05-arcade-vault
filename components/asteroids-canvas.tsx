"use client";

import { useEffect, useRef } from "react";
import type { EngineProps } from "@/components/game-canvases";
import {
  createAsteroidsGame,
  type AsteroidsGame,
} from "@/lib/games/asteroids/engine";
import { DEFAULT_SKIN } from "@/lib/games/skin-ids";

export function AsteroidsCanvas({
  paused,
  onStats,
  onGameOver,
  skin = DEFAULT_SKIN,
  inputRef,
}: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
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
    const game = createAsteroidsGame(
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
    if (!inputRef) return;
    inputRef.current = gameRef.current;
    return () => {
      inputRef.current = null;
    };
  }, [inputRef]);

  useEffect(() => {
    if (paused) gameRef.current?.pause();
    else gameRef.current?.resume();
  }, [paused]);

  useEffect(() => {
    gameRef.current?.setSkin(skin);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      className="asteroids-canvas"
      width={800}
      height={600}
    />
  );
}
