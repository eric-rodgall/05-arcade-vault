# Plantillas para /add-game

Sustituir `<id>` (slug, ej. `caida`), `<Nombre>` (PascalCase, ej. `Caida`) y los tamaños lógicos.

## 1. Migración: fila en `games`

```sql
-- supabase/migrations/<versión>_<id>.sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, sort_order)
select
  '<id>',
  '<TÍTULO>',
  '<frase corta>',
  '<descripción larga: solo lo que el juego realmente tiene>',
  'ARCADE',            -- ARCADE | PUZZLE | SHOOTER | VERSUS
  'cover-<id>',
  'cyan',              -- cyan | magenta | green | yellow
  0,
  '0',
  coalesce(max(sort_order), 0) + 1
from public.games;
```

## 2. Motor (`lib/games/<id>/engine.ts`)

```ts
export interface <Nombre>Stats {
  score: number;
  lives?: number; // omitir si el juego no tiene vidas
  level?: number; // omitir si no tiene niveles
}

export interface <Nombre>Callbacks {
  onStats: (stats: <Nombre>Stats) => void; // solo al cambiar
  onGameOver: (finalScore: number) => void; // una sola vez
}

export interface <Nombre>Game {
  pause(): void;
  resume(): void;
  stop(): void; // quita loop y listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias
}

const W = 800; // tamaño lógico del canvas
const H = 600;
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"];

export function create<Nombre>Game(
  canvas: HTMLCanvasElement,
  callbacks: <Nombre>Callbacks
): <Nombre>Game {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  let score = 0;
  let over = false;
  let paused = false;
  let rafId: number | null = null;
  let last = 0;
  const keys = new Set<string>();

  const emitStats = () => callbacks.onStats({ score });

  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

  function update(dt: number) {
    // lógica portada del original; al terminar:
    // over = true; callbacks.onGameOver(score);
  }

  function draw() {
    ctx!.fillStyle = "#000";
    ctx!.fillRect(0, 0, W, H);
    // dibujo portado; sin HUD ni textos GAME OVER
  }

  function loop(ts: number) {
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    if (!paused && !over) update(dt);
    draw();
    if (!over) rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  emitStats();
  rafId = requestAnimationFrame((ts) => {
    last = ts;
    loop(ts);
  });

  return {
    pause() { paused = true; },
    resume() {
      if (!paused) return;
      paused = false;
      last = performance.now(); // evita un dt enorme al volver
    },
    stop,
    destroy() { stop(); keys.clear(); },
  };
}
```

Ajustar a la estructura real de `lib/games/asteroids/engine.ts` si difiere (es el modelo canónico).

## 3. Canvas React (`components/<id>-canvas.tsx`)

Copiar `components/asteroids-canvas.tsx` cambiando: import `create<Nombre>Game`, tipo `<Nombre>Game`, `className="<id>-canvas"`, `width`/`height` del canvas lógico y el tipo de `onStats`.

```css
/* app/globals.css */
.<id > -canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
  object-fit: contain; /* para canvas no 4:3 */
}
```

## 4. Registro de motores para `GamePlayer`

```ts
// components/game-canvases.tsx  ("use client" no hace falta si solo exporta el mapa de componentes cliente)
import type { ComponentType } from "react";
import { AsteroidsCanvas } from "@/components/asteroids-canvas";
import { <Nombre>Canvas } from "@/components/<id>-canvas";

export interface EngineStats { score: number; lives?: number; level?: number }
export interface EngineProps {
  paused: boolean;
  onStats: (stats: EngineStats) => void;
  onGameOver: (finalScore: number) => void;
}

export const GAME_ENGINES: Record<string, ComponentType<EngineProps>> = {
  asteroides: AsteroidsCanvas,
  <id>: <Nombre>Canvas,
};
```

En `GamePlayer`:

```tsx
const Engine = GAME_ENGINES[game.id];
const hasEngine = Boolean(Engine);
// efecto simulado: if (hasEngine || over || paused) return;
// nivel: hasEngine ? engineLevel : Math.floor(score / 2500) + 1
// render:
{
  Engine ? (
    <Engine
      key={runId}
      paused={paused || over}
      onStats={(s) => {
        setScore(s.score);
        if (s.lives !== undefined) setLives(s.lives);
        if (s.level !== undefined) setEngineLevel(s.level);
      }}
      onGameOver={(final) => {
        setScore(final);
        setOver(true);
      }}
    />
  ) : (
    <div className="game-arena">…</div>
  );
}
```

Con `react-hooks/static-components` activo, evitar crear el componente dentro del render (`GAME_ENGINES[game.id]` es una referencia estable y está permitido; si el lint se queja, usar `React.createElement(GAME_ENGINES[game.id], props)`).

## 5. Verificación rápida con Playwright MCP

```js
// browser_evaluate
() => {
  const c = document.querySelector(".crt-screen canvas");
  return {
    n: document.querySelectorAll("canvas").length,
    w: c?.width,
    h: c?.height,
    arena: !!document.querySelector(".game-arena"),
    avScores: localStorage.getItem("av_scores"),
  };
};
```

SQL de comprobación y limpieza:

```sql
select player_name, score, created_at from scores where game_id = '<id>' order by score desc, created_at asc;
delete from scores where player_name like 'TEST%';
select count(*) from scores where player_name like 'TEST%'; -- 0
```
