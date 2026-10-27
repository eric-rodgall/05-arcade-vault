"use client";

import { useEffect, useRef } from "react";
import type { EngineProps } from "@/components/game-canvases";
import { DEFAULT_SKIN } from "@/lib/games/skin-ids";
import {
  createFroggerGame,
  H,
  W,
  type FroggerGame,
} from "@/lib/games/frogger/engine";

export function FroggerCanvas({
  paused,
  onStats,
  onGameOver,
  skin = DEFAULT_SKIN,
  inputRef,
}: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FroggerGame | null>(null);
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
    const game = createFroggerGame(
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
    <canvas ref={canvasRef} className="frogger-canvas" width={W} height={H} />
  );
}
