# SPEC 07 — Segundo juego real: CAÍDA (Tetris)

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 05, SPEC 06
> **Date:** 2026-10-09
> **Objective:** Portar a TypeScript el Tetris de `references/started-games/03-tetris/` y jugarlo de verdad en `/juegos/caida/jugar`, con su puntuación guardada en el leaderboard de `/salon`.

---

## Por qué existe este spec

SPEC 05 portó `asteroides` y dejó el patrón (motor puro + canvas cliente), pero `components/game-player.tsx` sigue con `isAsteroides` fijo. SPEC 06 hizo que cualquier `games.id` pueda guardar puntuaciones. `caida` ya existe en la tabla `games` (PUZZLE, `sort_order` 2) y hoy usa una puntuación simulada. Este spec la convierte en juego real y introduce el registro de motores para que los siguientes juegos solo añadan una entrada.

El Tetris original es un proyecto independiente (`game.js`, ~330 líneas, JS plano con globales). Tiene 8 piezas: las 7 clásicas más la «N» (tuerca), aunque su README diga 7.

Estado previo que ya existe y **no se rehace**:

- La fila `caida` en `games` y su portada `cover-caida`; su `long` ya describe el juego (piezas, líneas, velocidad cada 10 líneas), por lo que no cambia.
- El marco CRT (`.crt`, `.crt-screen` con `aspect-ratio: 4 / 3`), el HUD, la pausa y el modal de fin de partida de `GamePlayer`.
- `POST /api/puntuaciones`, `/salon` y `lib/data/scores.ts`: el leaderboard no necesita código nuevo.

## Scope

**In:**

- Motor en TypeScript estricto, portado de `game.js` sin cambiar reglas ni constantes (`COLS` 10, `ROWS` 20, `BLOCK` 30, 8 piezas, wall kicks `[0,-1,1,-2,2]`, `LINE_SCORES` `[0,100,300,500,800]` × nivel, hard drop +2 por celda, soft drop +1 por fila, nivel = `floor(lines/10)+1`, `dropInterval = max(100, 1000 − (level−1)×90)`):
  - `lib/games/tetris/engine.ts`: `createTetrisGame(canvas, callbacks)` con estado, loop, dibujo y teclado.
  - `lib/games/tetris/pieces.ts`: constantes (`PIECES`, `COLORS`, `LINE_SCORES`) y utilidades puras (`rotateCW`, `collide`).
- Client Component `components/tetris-canvas.tsx`: monta un `<canvas width={420} height={600}>` y llama a `destroy()` al desmontar.
- Canvas lógico de 420×600: tablero de 300×600 a la izquierda y una columna de 120 px a la derecha con la mini-vista de la **siguiente pieza**. Se escala por CSS con `object-fit: contain` y fondo negro, centrado en `.crt-screen`.
- Registro de motores: `components/game-canvases.tsx` exporta `GAME_ENGINES: Record<string, ComponentType<EngineProps>>` con `asteroides` y `caida`. `GamePlayer` lo usa en lugar de `isAsteroides`; los juegos sin entrada conservan el flujo simulado.
- HUD: la puntuación y el nivel vienen del motor. Tetris no tiene vidas: el HUD muestra «—» en Vidas.
- Controles: `←` `→` mover, `↓` soft drop, `↑` o `X` rotar, `Espacio` hard drop. Solo teclado.
- Pieza fantasma (alpha 0.2) y cuadrícula con color fijo en el canvas.
- Fin de partida natural (una pieza nueva colisiona al aparecer): el motor avisa y `GamePlayer` abre el modal «FIN DEL JUEGO».
- Botones del HUD funcionales (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO) como en SPEC 05.
- Actualizar «State of the codebase» de `CLAUDE.md`.
- Verificar con el **MCP de Playwright** y el **MCP de Supabase**.

**Out of scope (para futuros specs):**

- Sonido y música.
- Controles táctiles o gamepad.
- Tecla `P` para pausar (la pausa es solo por el botón, como en `asteroides`).
- Tema claro/oscuro del original (`localStorage` `tetris-theme`) y cualquier `localStorage` propio.
- HUD, «GAME OVER» o «PAUSA» dibujados en el canvas, y reinicio por tecla.
- Cambios de balance, bolsa de 7 piezas, hold, T-spin, animación de líneas.
- Derivar `best` y `plays` de `scores` o cambiar el `long` de `caida`.
- Portar los otros seis juegos simulados.
- Tests automatizados en el repo.
- Cambios en `references/started-games/`.

## Modelo de datos

No se añaden tablas ni columnas. `caida` ya existe en `games`. Se define el contrato entre el motor y React, igual al de `asteroides` con `lives` opcional.

```ts
// lib/games/tetris/engine.ts
export interface TetrisCallbacks {
  onStats: (stats: { score: number; level: number; lines: number }) => void; // solo al cambiar
  onGameOver: (finalScore: number) => void; // una sola vez
}

export interface TetrisGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias
}

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks
): TetrisGame;

// components/game-canvases.tsx
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
export const GAME_ENGINES: Record<string, ComponentType<EngineProps>>;
```

Convenciones:

- Tablero `ROWS × COLS`: `0` vacío, `1–8` índice de color de la pieza.
- Canvas lógico fijo de 420×600 (`W`, `H`); tablero con origen en (0, 0) y panel «siguiente» en x = 300..420.
- `dt` en segundos limitado a 0.05 s. El acumulador de caída trabaja en ms o segundos, pero con una sola unidad.
- El motor no importa React ni toca el DOM salvo el `canvas` recibido y `window` para el teclado.
- Los listeners de teclado ignoran `<input>` y `<textarea>` y solo llaman a `preventDefault()` para `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp` y `Space` (no para `KeyX`).
- `lines` se reporta en `onStats` pero el HUD actual no lo muestra.
- El rango de `scores.score` (1..9 999 999) no se alcanza en la práctica; el motor no lo trunca.

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components (AGENTS.md advierte cambios incompatibles) y releer `references/started-games/03-tetris/game.js` completo mientras se porta.

1. **Piezas y utilidades.** Crear `lib/games/tetris/pieces.ts` con `PIECES` (8 piezas), `COLORS`, `LINE_SCORES`, `COLS`, `ROWS`, `BLOCK`, y las funciones puras `rotateCW(shape)` y `collide(board, shape, ox, oy)`. Verificación: `npm run build` compila.
2. **Motor.** Crear `lib/games/tetris/engine.ts` con `createTetrisGame`: estado, `spawn`, `lockPiece`, `clearLines`, hard/soft drop, `tryRotate`, `draw` (cuadrícula, tablero, fantasma, pieza actual, mini-vista «siguiente»), loop con `requestAnimationFrame`, teclado con las reglas de «Convenciones» y `pause`/`resume`/`stop`/`destroy`. `resume` reinicia la marca de tiempo para no acumular un salto. Llama a `onStats` solo cuando cambian puntuación, nivel o líneas y a `onGameOver` una vez. Verificación: `npm run build` y `npm run lint` sin errores.
3. **Canvas en React.** Crear `components/tetris-canvas.tsx` (`"use client"`) copiando la estructura de `components/asteroids-canvas.tsx` (refs de callbacks y `paused`, `destroy()` en el cleanup). Añadir `.tetris-canvas` en `app/globals.css` (`position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#000`). Verificación: `npm run build` compila.
4. **Registro de motores.** Crear `components/game-canvases.tsx` con `GAME_ENGINES`; adaptar `AsteroidsCanvas` al tipo `EngineProps` sin cambiar su comportamiento. Verificación: `npm run build` compila (aún sin consumidores).
5. **Integración en `GamePlayer`.** En `components/game-player.tsx`, sustituir `isAsteroides` por `const Engine = GAME_ENGINES[game.id]`: sin `setInterval` simulado cuando hay motor, `<Engine key={runId} paused={paused || over} …/>` en lugar de `.game-arena`, puntuación y nivel desde `onStats`, vidas desde `onStats` solo si llegan (si no, el HUD muestra «—»). `restart` reinicia puntuación, vidas y nivel. Verificación: `/juegos/asteroides/jugar` se comporta igual que antes, `/juegos/caida/jugar` muestra el canvas y un tercer juego simulado (por ejemplo `serpentina`) conserva la puntuación simulada.
6. **Documentación.** Actualizar «State of the codebase» en `CLAUDE.md`: `caida` es real, archivos nuevos, registro `GAME_ENGINES`, contrato `TetrisCallbacks`/`TetrisGame` y que quedan seis juegos simulados. Pasar este spec a `Implemented`. Verificación: `npm run build` y `npm run lint` sin errores.
7. **Verificación.** Ver «Cómo se verifica».

## Criterios de aceptación

### Build

- [x] `npm run build` termina sin errores de tipos ni de compilación.
- [x] `npm run lint` termina sin errores.
- [x] Existen `lib/games/tetris/pieces.ts`, `lib/games/tetris/engine.ts`, `components/tetris-canvas.tsx` y `components/game-canvases.tsx`.
- [x] `components/game-player.tsx` ya no contiene la cadena `isAsteroides`.

### Juego

- [x] `/juegos/caida/jugar` responde 200 y muestra un `<canvas>` de 420×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [x] Al cargar hay un tablero vacío, una pieza cayendo desde la parte superior central y la siguiente pieza en el panel derecho.
- [x] `←` y `→` mueven la pieza, `↓` la baja una fila (+1 punto), `↑` y `X` la rotan y `Espacio` la deja caer de golpe; la página no hace scroll al pulsar flechas ni Espacio.
- [ ] Un hard drop desde la fila 0 sobre un tablero vacío suma 2 puntos por cada celda recorrida.
- [ ] Completar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 puntos multiplicados por el nivel, y la fila completa desaparece.
- [ ] El nivel del HUD sube a 2 tras 10 líneas y la caída se acelera (`dropInterval` 910 ms).
- [ ] La rotación pegada a una pared aplica los wall kicks sin atravesar bloques.
- [x] Aparece la pieza fantasma (alpha 0.2) donde aterrizará la pieza actual.
- [ ] Aparece alguna vez la pieza «N» (tuerca) en una partida larga o forzando el azar con `browser_evaluate`.
- [x] Cuando una pieza nueva colisiona al aparecer, se abre el modal «FIN DEL JUEGO» con la puntuación final igual a la del HUD.
- [x] El HUD muestra «—» en Vidas.
- [x] El canvas no dibuja puntuación, nivel, «PAUSA» ni «GAME OVER».

### HUD y flujo

- [x] PAUSA congela la pieza y el tablero (dos capturas separadas por 1 s son idénticas) y muestra «EN PAUSA»; REANUDAR continúa sin salto de caída.
- [x] FIN abre el modal con la puntuación actual y el juego deja de responder al teclado.
- [ ] Escribir un espacio en el campo de iniciales del modal no dispara un hard drop ni hace scroll.
- [x] «JUGAR DE NUEVO» inicia una partida con puntuación 0, nivel 01 y tablero vacío.
- [x] Ir a `/biblioteca` y volver a `/juegos/caida/jugar` deja un solo `canvas` y una sola acción por pulsación.

### Leaderboard

- [x] «GUARDAR PUNTUACIÓN» con nombre `TEST1` crea una fila en `scores` con `game_id = 'caida'` y la puntuación del HUD.
- [ ] `/salon`, pestaña CAÍDA, muestra la fila; con sesión `TEST1` aparece «TU MEJOR MARCA».
- [ ] `localStorage["av_scores"]` es `null`.
- [x] Al terminar, `select count(*) from scores where player_name like 'TEST%'` devuelve 0.

### Sin regresiones

- [x] `/juegos/asteroides/jugar` sigue funcionando (canvas, vidas en el HUD, pausa, FIN, guardado).
- [x] Un juego simulado (`/juegos/serpentina/jugar`) sigue con puntuación simulada, PAUSA, FIN y modal.
- [x] `/`, `/biblioteca`, `/juegos/caida`, `/acceso`, `/salon` y `/acerca` responden 200.
- [x] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.
- [x] `get_advisors` (security) no reporta errores nuevos.

### Cómo se verifica (Playwright MCP y Supabase MCP)

Con `npm run dev` corriendo:

1. `browser_navigate` a `/juegos/caida/jugar`, `browser_snapshot` y `browser_console_messages`: HUD con puntuación 0, nivel 01, vidas «—», sin errores.
2. `browser_evaluate`: existe un `canvas` de 420×600 y no existe `.game-arena`.
3. `browser_press_key` con `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space`, con `browser_take_screenshot` antes y después.
4. Apilar piezas con hard drops hasta perder y comprobar el modal; repetir y limpiar líneas para ver los puntos.
5. PAUSA: dos capturas separadas por 1 s idénticas; REANUDAR: cambian.
6. FIN, iniciales `TEST1` con un espacio, guardar; `execute_sql` confirma la fila y `localStorage.getItem("av_scores")` es `null`.
7. JUGAR DE NUEVO: puntuación 0, nivel 01.
8. Navegar a `/biblioteca` y volver; contar `canvas` (1) y comprobar que una pulsación mueve la pieza una sola columna.
9. `/salon` pestaña CAÍDA; iniciar sesión como `TEST1` y comprobar «TU MEJOR MARCA».
10. Regresión en `asteroides`, `serpentina` y cada ruta de «Sin regresiones» con `browser_console_messages`.
11. Limpiar con `delete from scores where player_name like 'TEST%'` y las filas de prueba de `caida`.

## Decisiones

- **Sí:** reutilizar la fila `caida` existente. Ya es el mismo juego en el catálogo; no hay migración ni cambio de `long`.
- **Sí:** portar a TypeScript con motor puro + canvas, igual que SPEC 05. Respeta `strict` y el ciclo de vida de React.
- **No:** `iframe` ni copiar `game.js` a `public/`. Aislaría el juego del HUD, la pausa y el guardado.
- **Sí:** conservar las 8 piezas, incluida la tuerca «N». El objetivo es portar el código, no corregirlo hacia el Tetris estándar.
- **Sí:** canvas lógico de 420×600 con el tablero de 300×600 a la izquierda y la mini-vista «siguiente» a la derecha. Se pidió canvas 300×600 centrado con barras negras; para dibujar la siguiente pieza dentro del canvas (sin tocar el HUD) se añade una columna de 120 px y se mantiene el escalado `object-fit: contain`.
- **Sí:** la «siguiente pieza» se dibuja dentro del canvas. Es parte del juego, no un HUD duplicado; puntuación, nivel y overlays siguen fuera del canvas.
- **No:** tecla `P`, tema claro/oscuro y reinicio por tecla. La pausa y el reinicio son de la plataforma, igual que en `asteroides`.
- **Sí:** crear el registro `GAME_ENGINES` ahora. Es el segundo motor real; seguir con `isAsteroides` obligaría a otra condición por juego.
- **Sí:** el HUD muestra «—» en Vidas para juegos sin vidas, en vez de inventar un valor.
- **Sí:** `lines` se emite en `onStats` aunque el HUD no lo muestre. Es barato y deja el dato listo para un HUD futuro.
- **Sí:** color de la cuadrícula fijo en el canvas. El original lo leía de una variable CSS del tema, que aquí no existe.
- **Sí:** el leaderboard sin código nuevo. SPEC 06 ya acepta cualquier `games.id`.
- **Sí:** conservar sin cambios reglas y constantes del original.

## Riesgos

| Riesgo                                                       | Mitigación                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces y deja dos loops | El cleanup llama a `destroy()`; el paso 8 de verificación comprueba una sola acción por pulsación. |
| Al reanudar, `dt` acumulado hace caer varias filas de golpe  | `resume()` reinicia la marca de tiempo y `dt` se limita a 0.05 s.                                  |
| Flechas y `Espacio` hacen scroll o activan el botón enfocado | `preventDefault` solo en esas teclas y no cuando el `target` es un campo de texto.                 |
| El canvas vertical se ve pequeño dentro del marco 4:3        | `object-fit: contain` con fondo negro; se revisa con captura en escritorio y a 375 px.             |
| Refactor de `GamePlayer` rompe `asteroides`                  | El paso 5 verifica `asteroides` y un juego simulado antes de cerrar.                               |
| Se guardan puntuaciones de prueba reales en `scores`         | El paso 11 de verificación las borra.                                                              |

## Qué **no** está en este spec

- Sonido y música.
- Controles táctiles o gamepad.
- Tecla de pausa, tema claro/oscuro y reinicio por tecla.
- Hold, bolsa de 7, T-spin, animaciones o cambios de balance.
- `best`/`plays` derivados de `scores` y ranking real en `/juegos/[id]`.
- Los otros seis juegos simulados.
- Tests automatizados en el repositorio.

Cada uno, si llega, va en su propio spec.
