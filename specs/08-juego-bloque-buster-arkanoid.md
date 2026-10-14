# SPEC 08 — Tercer juego real: BLOQUE BUSTER (Arkanoid)

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-10-14
> **Objective:** Portar a TypeScript el Arkanoid de `references/started-games/04-arkanoid/` y jugarlo de verdad en `/juegos/bloque-buster/jugar`, con su puntuación guardada en el leaderboard de `/salon`.

---

## Por qué existe este spec

SPEC 05 y SPEC 07 dejaron el patrón (motor puro + canvas cliente + registro `GAME_ENGINES`). `bloque-buster` ya existe en `games` (ARCADE, `sort_order` 1, portada `cover-bricks`) y hoy usa una puntuación simulada. Este spec lo convierte en el tercer juego real. Es el primero que necesita **assets** (spritesheet PNG) y entrada de **ratón**.

Estado previo que ya existe y **no se rehace**:

- La fila `bloque-buster` en `games`; su `long` ("Pilota una nave-paleta… Cada nivel reorganiza la grilla en patrones imposibles") coincide con el juego, por lo que no hay migración.
- Marco CRT, HUD, pausa y modal de fin de `GamePlayer`, y el registro `GAME_ENGINES`.
- `POST /api/puntuaciones`, `/salon` y `lib/data/scores.ts`: el leaderboard no necesita código nuevo.

El original (`game.js` ~270 líneas + `levels.js` + `assets/spritesheet.js`) es JS plano con globales. Detalle relevante: la paleta del código mide **81 px** de ancho (`paddle.w`), aunque el sprite es de 162×14 y el `CLAUDE.md` del original diga 162; se conserva 81.

## Scope

**In:**

- Motor en TypeScript estricto, portado sin cambiar reglas ni constantes (canvas 800×600, `PADDLE_SPEED` 400, 10×6 bloques de 64×24 con origen (80, 80), pelota 16×16 con velocidad base `vx` 200 / `vy` −300 × `speed` del nivel, paleta en y=560, 3 vidas, +10 por bloque, un bloque por frame, rebote de paleta con tolerancia de 8 px):
  - `lib/games/arkanoid/levels.ts`: `LEVELS` (5 niveles con `speed` 1.00/1.10/1.21/1.33/1.46 y `blocks[]`) generado con la misma lógica que `levels.js`.
  - `lib/games/arkanoid/sprites.ts`: coordenadas de `SPRITES` y `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` 150 ms y carga de la imagen.
  - `lib/games/arkanoid/engine.ts`: `createArkanoidGame(canvas, callbacks)` con estado, loop, dibujo, teclado y ratón.
- Assets: copiar `assets/spritesheet-breakout.png` a `public/games/bloque-buster/spritesheet-breakout.png` (`public/` no existe aún; se crea). El motor lo carga con `Image` y espera a `onload` antes de arrancar el loop.
- Client Component `components/arkanoid-canvas.tsx`: monta un `<canvas width={800} height={600}>` (clase `.arkanoid-canvas`) y llama a `destroy()` al desmontar.
- Registro: añadir `"bloque-buster": ArkanoidCanvas` en `GAME_ENGINES` (`components/game-canvases.tsx`).
- HUD: puntuación, vidas (3 → 0) y nivel (1–5) vienen de `onStats`.
- Controles: `←` `→` mueven la paleta; el ratón sobre el canvas la mueve (coordenadas escaladas por el tamaño CSS del canvas). Sin lanzamiento: la pelota sale al cargar el nivel y al perder una vida, como en el original.
- Fin de partida: al perder la última vida **o** completar el nivel 5, el motor llama a `onGameOver(score)` una sola vez y `GamePlayer` abre el modal «FIN DEL JUEGO».
- Botones del HUD funcionales (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO) como en SPEC 05/07.
- Actualizar «State of the codebase» de `CLAUDE.md`.
- Verificar con el **MCP de Playwright** y el **MCP de Supabase**.

**Out of scope (para futuros specs):**

- Sonido (`ball-bounce.mp3`, `break-sound.mp3` no se copian).
- Overlay de pausa dibujado en el canvas con selector «Saltar al nivel» (permitiría saltarse niveles en el ranking) y teclas `P`/`Escape`.
- HUD, «GAME OVER» y «¡Completaste el juego!» dibujados en el canvas, y reinicio por tecla.
- Controles táctiles o gamepad.
- Cambios de balance, power-ups, bloques de varios golpes, ángulo de rebote según el punto de la paleta.
- Derivar `best` y `plays` de `scores` o cambiar el `long` de `bloque-buster`.
- Portar los otros cinco juegos simulados.
- Tests automatizados en el repo.
- Cambios en `references/started-games/`.

## Modelo de datos

No se añaden tablas ni columnas. Contrato entre el motor y React, igual al de `asteroides` (con vidas y nivel):

```ts
// lib/games/arkanoid/engine.ts
export interface ArkanoidCallbacks {
  onStats: (stats: { score: number; lives: number; level: number }) => void; // solo al cambiar
  onGameOver: (finalScore: number) => void; // una sola vez (derrota o victoria)
}

export interface ArkanoidGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias
}

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks
): ArkanoidGame;

// lib/games/arkanoid/levels.ts
export interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}
export const LEVELS: { speed: number; blocks: LevelBlock[] }[];
```

Convenciones:

- Coordenadas en píxeles lógicos del canvas 800×600, origen arriba a la izquierda.
- `dt` en segundos limitado a 0.05 s (el original no lo limitaba; evita que la pelota atraviese bloques tras una pausa o pestaña en segundo plano).
- El motor no importa React ni toca el DOM salvo el `canvas` y `window` para el teclado.
- Los listeners de teclado ignoran `<input>` y `<textarea>` y solo llaman a `preventDefault()` para `ArrowLeft` y `ArrowRight`. El listener de ratón va en el `canvas` (`mousemove`).
- El canvas solo dibuja bloques, explosiones, paleta y pelota sobre fondo negro; no dibuja textos.
- Mientras la imagen carga no hay loop ni callbacks; si falla la carga, se registra un error en consola y no se arranca.
- Puntuación máxima posible: 5 niveles × ≤60 bloques × 10 = muy por debajo de 9 999 999.

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components (AGENTS.md advierte cambios incompatibles) y releer `game.js` y `levels.js` completos mientras se porta.

1. **Niveles y sprites.** Crear `lib/games/arkanoid/levels.ts` y `lib/games/arkanoid/sprites.ts` (tipos `BlockColor`, tablas de sprites y explosiones, `loadSpritesheet(): Promise<HTMLImageElement>`) y copiar el PNG a `public/games/bloque-buster/`. Verificación: `npm run build` compila y el PNG responde 200 en `/games/bloque-buster/spritesheet-breakout.png`.
2. **Motor.** Crear `lib/games/arkanoid/engine.ts` con `createArkanoidGame`: estado, `loadLevel`, `initBall`, colisiones (paredes, paleta, bloques con `collideAABB`), explosiones, pérdida de vida, paso de nivel, victoria, `draw`, loop con `requestAnimationFrame`, teclado y ratón. `onStats` solo al cambiar; `onGameOver` una vez; `resume` reinicia la marca de tiempo. Si `destroy()` se llama antes de que cargue la imagen, el motor no arranca. Verificación: `npm run build` y `npm run lint` sin errores.
3. **Canvas en React.** Crear `components/arkanoid-canvas.tsx` (`"use client"`) copiando la estructura de `components/tetris-canvas.tsx`. Añadir `.arkanoid-canvas` en `app/globals.css` (`position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#000`). Verificación: `npm run build` compila.
4. **Registro.** Añadir `"bloque-buster": ArkanoidCanvas` a `GAME_ENGINES`. `GamePlayer` no cambia (ya soporta vidas y nivel desde `onStats`). Verificación: `/juegos/bloque-buster/jugar` muestra el canvas y `serpentina` sigue simulado.
5. **Documentación.** Actualizar «State of the codebase» en `CLAUDE.md`: `bloque-buster` es real, archivos nuevos, `public/`, contrato `ArkanoidCallbacks`/`ArkanoidGame`, cinco juegos simulados. Pasar este spec a `Implemented`. Verificación: `npm run build` y `npm run lint` sin errores.
6. **Verificación.** Ver «Cómo se verifica».

## Criterios de aceptación

### Build

- [x] `npm run build` termina sin errores de tipos ni de compilación.
- [x] `npm run lint` termina sin errores.
- [x] Existen `lib/games/arkanoid/levels.ts`, `sprites.ts`, `engine.ts`, `components/arkanoid-canvas.tsx` y `public/games/bloque-buster/spritesheet-breakout.png`.
- [x] `references/started-games/04-arkanoid/` no tiene cambios (`git status`).

### Juego

- [x] `/juegos/bloque-buster/jugar` responde 200 y muestra un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [x] Al cargar se ven 60 bloques de colores (nivel 1), la paleta centrada y la pelota subiendo desde ella.
- [x] `←` y `→` mueven la paleta; mover el ratón sobre el canvas también; la página no hace scroll al pulsar flechas.
- [x] Romper un bloque suma exactamente 10 puntos y dispara la animación de explosión de 4 frames.
- [x] Dejar caer la pelota resta una vida (HUD 3 → 2) y recoloca la pelota sobre la paleta.
- [X] Al romper todos los bloques el nivel pasa de 01 a 02 con la pirámide de 40 bloques y mayor velocidad (`vy` −330).
- [x] Al perder la tercera vida se abre el modal «FIN DEL JUEGO» con la puntuación final igual a la del HUD y vidas en 0.
- [X] Al completar el nivel 5 se abre el modal con la puntuación acumulada (forzable con `browser_evaluate` solo si el motor lo permite; si no, verificarlo por lectura del código).
- [x] El canvas no dibuja puntuación, vidas, nivel, «PAUSA», «GAME OVER» ni selector de nivel.

### HUD y flujo

- [x] PAUSA congela pelota y paleta (dos capturas separadas por 1 s idénticas) y muestra «EN PAUSA»; REANUDAR continúa sin salto de la pelota.
- [x] FIN abre el modal con la puntuación actual y el juego deja de responder al teclado y al ratón.
- [x] Escribir un espacio en el campo de iniciales del modal no dispara nada ni hace scroll.
- [x] «JUGAR DE NUEVO» inicia una partida con puntuación 0, 3 vidas, nivel 01 y 60 bloques.
- [x] Ir a `/biblioteca` y volver a `/juegos/bloque-buster/jugar` deja un solo `canvas` y una sola acción por pulsación.

### Leaderboard

- [x] «GUARDAR PUNTUACIÓN» con nombre `TEST1` crea una fila en `scores` con `game_id = 'bloque-buster'` y la puntuación del HUD.
- [x] `/salon`, pestaña BLOQUE BUSTER, muestra la fila; con sesión `TEST1` aparece «TU MEJOR MARCA».
- [x] `localStorage["av_scores"]` es `null`.
- [x] Al terminar, `select count(*) from scores where player_name like 'TEST%'` devuelve 0.

### Sin regresiones

- [x] `/juegos/asteroides/jugar` y `/juegos/caida/jugar` siguen funcionando (canvas, HUD, pausa, FIN, guardado).
- [x] Un juego simulado (`/juegos/serpentina/jugar`) sigue con puntuación simulada, PAUSA, FIN y modal.
- [x] `/`, `/biblioteca`, `/juegos/bloque-buster`, `/acceso`, `/salon` y `/acerca` responden 200.
- [x] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.
- [x] `get_advisors` (security) no reporta errores nuevos.

### Cómo se verifica (Playwright MCP y Supabase MCP)

Con `npm run dev` corriendo:

1. `browser_navigate` a `/juegos/bloque-buster/jugar`, `browser_snapshot` y `browser_console_messages`: HUD con puntuación 0, vidas ♥ ♥ ♥, nivel 01, sin errores.
2. `browser_evaluate`: existe un `canvas` de 800×600 y no existe `.game-arena`.
3. `browser_press_key` con `ArrowLeft`/`ArrowRight`, y movimiento de ratón con `browser_run_code_unsafe`, con capturas antes y después.
4. Dejar caer la pelota tres veces (sin mover la paleta) y comprobar el modal; repetir moviendo la paleta para romper bloques y ver los puntos.
5. PAUSA: dos capturas separadas por 1 s idénticas; REANUDAR: cambian.
6. FIN, iniciales `TEST1` con un espacio, guardar; `execute_sql` confirma la fila y `localStorage.getItem("av_scores")` es `null`.
7. JUGAR DE NUEVO: puntuación 0, vidas 3, nivel 01.
8. Navegar a `/biblioteca` y volver; contar `canvas` (1) y comprobar que una pulsación mueve la paleta una sola vez.
9. `/salon` pestaña BLOQUE BUSTER; iniciar sesión como `TEST1` y comprobar «TU MEJOR MARCA».
10. Regresión en `asteroides`, `caida`, `serpentina` y cada ruta de «Sin regresiones» con `browser_console_messages`.
11. Limpiar con `delete from scores where player_name like 'TEST%'` y las filas de prueba de `bloque-buster`.

## Decisiones

- **Sí:** reutilizar la fila `bloque-buster` existente. Ya es el mismo juego en el catálogo; no hay migración ni cambio de `long`.
- **Sí:** portar a TypeScript con motor puro + canvas, igual que SPEC 05 y 07.
- **No:** `iframe` ni copiar `game.js` a `public/`. Solo el PNG va a `public/`, porque es un asset binario, no código.
- **Sí:** conservar el spritesheet original (`public/games/bloque-buster/`). Mantiene el aspecto y las explosiones; redibujar con vectores sería un re-skin.
- **Sí:** ratón además de teclado. Es parte del control del original y no afecta a la plataforma; se limita al `canvas` para no capturar el ratón de toda la página.
- **No:** teclas `P`/`Escape` y overlay de pausa con selector de nivel. La pausa es del HUD, y saltar de nivel permitiría falsear el ranking.
- **No:** sonido. Queda para un spec transversal de audio (afectaría a todos los juegos).
- **Sí:** la victoria (nivel 5 completo) llama a `onGameOver` para poder guardar la puntuación; el mensaje «¡Completaste el juego!» del canvas no se porta. Es la única forma de cerrar una partida ganada sin cambiar `GamePlayer`.
- **Sí:** limitar `dt` a 0.05 s aunque el original no lo hacía. Evita atravesar bloques tras una pausa; no cambia reglas ni constantes.
- **Sí:** paleta de 81 px como en el código, no 162 px como dice la documentación del original.
- **Sí:** leaderboard sin código nuevo. SPEC 06 ya acepta cualquier `games.id`.
- **Sí:** conservar sin cambios reglas, constantes y niveles del original.

## Riesgos

| Riesgo                                                             | Mitigación                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| El PNG tarda en cargar y el canvas se ve vacío                     | El loop arranca tras `onload`; el canvas es negro mientras tanto. Si falla, error en consola.          |
| `destroy()` antes de `onload` (Strict Mode) deja un loop huérfano  | El motor comprueba un flag `destroyed` antes de arrancar; la verificación 8 comprueba una sola acción. |
| La pelota atraviesa bloques con `dt` grande                        | `dt` limitado a 0.05 s.                                                                                |
| Coordenadas de ratón erróneas al escalar el canvas                 | Se escalan con `getBoundingClientRect()` y se verifica a distintos tamaños, incluido 375 px.           |
| El ratón mueve la paleta mientras está en pausa o el modal abierto | El handler ignora el movimiento si el motor está pausado o detenido.                                   |
| Flechas hacen scroll o activan el botón enfocado                   | `preventDefault` solo en `ArrowLeft`/`ArrowRight` y no cuando el `target` es un campo de texto.        |
| Se guardan puntuaciones de prueba reales en `scores`               | El paso 11 de verificación las borra.                                                                  |

## Qué **no** está en este spec

- Sonido.
- Selector de nivel, teclas de pausa y overlays dibujados en el canvas.
- Controles táctiles o gamepad.
- Power-ups, bloques resistentes o cambios de balance.
- `best`/`plays` derivados de `scores` y ranking real en `/juegos/[id]`.
- Los otros cinco juegos simulados.
- Tests automatizados en el repositorio.

Cada uno, si llega, va en su propio spec.
