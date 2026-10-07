"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AsteroidsCanvas } from "@/components/asteroids-canvas";
import { useSession } from "@/components/session-provider";
import type { Game } from "@/lib/games";

const LIVES = 3;
const MAX_NAME = 10;

async function saveScore(entry: { game: string; score: number; name: string }): Promise<boolean> {
  try {
    const res = await fetch("/api/puntuaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [runId, setRunId] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const name = (nameEdit ?? user?.name ?? "INVITADO").toUpperCase().slice(0, MAX_NAME);
  const isAsteroides = game.id === "asteroides";
  const level = isAsteroides ? engineLevel : Math.floor(score / 2500) + 1;

  useEffect(() => {
    if (isAsteroides || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [isAsteroides, over, paused]);

  const restart = () => {
    setScore(0);
    setLives(LIVES);
    setEngineLevel(1);
    setRunId((id) => id + 1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setSaveError(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    const ok = await saveScore({ game: game.id, score, name });
    setSaving(false);
    if (ok) setSaved(true);
    else setSaveError(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim()}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button type="button" className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button type="button" className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroides ? (
            <AsteroidsCanvas
              key={runId}
              paused={paused || over}
              onStats={(stats) => {
                setScore(stats.score);
                setLives(stats.lives);
                setEngineLevel(stats.level);
              }}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setNameEdit(e.target.value.toUpperCase().slice(0, MAX_NAME))}
                  placeholder="TUS INICIALES"
                />
                <button
                  type="button"
                  className="btn yellow"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveError && !saved && (
              <div className="mono" style={{ color: "var(--magenta)", fontSize: 12, marginTop: 12 }}>
                [ERROR] NO SE PUDO GUARDAR. INTENTA DE NUEVO.
              </div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
