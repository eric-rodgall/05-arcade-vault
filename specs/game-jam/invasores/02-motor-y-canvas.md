# SPEC invasores-02 — Motor y canvas: INVASORES

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC invasores-01
> **Date:** 2026-10-21
> **Objective:** Implementar `createInvasoresGame` (motor puro) y `InvasoresCanvas`, registrarlos en `GAME_ENGINES` y verificar que `/juegos/invasores/jugar` es jugable con oleadas, vidas y puntuación guardada en el leaderboard.

---

## Por qué existe este spec

`01-diseno-juego.md` fija las reglas y la fila de `games`. Este archivo traduce ese diseño a la arquitectura obligatoria del proyecto (motor puro en `lib/games/invasores/engine.ts`, canvas cliente, registro `GAME_ENGINES`) y define las constantes exactas para que la implementación sea comprobable. No hay assets: todo se dibuja con primitivas de canvas.

## Scope

**In:**

- `supabase/migrations/20261021000000_invasores.sql` con el `update` de `long` definido en `01`.
- `lib/games/invasores/sprites.ts`: bitmaps de texto (`ALIEN_BITMAPS`, `SHIELD_MASK`) y `drawBitmap()`.
- `lib/games/invasores/engine.ts`: `createInvasoresGame(canvas, callbacks)` con estado, loop, colisiones, dibujo y teclado.
- `components/invasores-canvas.tsx` (`"use client"`), clase `.invasores-canvas` en `app/globals.css`.
- Registro `invasores: InvasoresCanvas` en `GAME_ENGINES` (`components/game-canvases.tsx`).
- Actualizar «Games» en `CLAUDE.md` y `references/implemented-games.md` solo al implementar (lo hace `/spec-impl`, no este spec de diseño).
- Verificación con Playwright MCP y Supabase MCP.

**Out of scope:**

- Sonido, táctil, ratón, gamepad, power-ups, vida extra.
- HUD y mensajes dibujados en el canvas.
- Assets en `public/`.
- Cambios en `GamePlayer`, `/api/puntuaciones` o `lib/data/*`.
- Tests automatizados en el repo.

## Modelo de datos

Sin tablas nuevas. Contrato público:

```ts
// lib/games/invasores/engine.ts
export interface InvasoresStats {
  score: number;
  lives: number;
  level: number;
}

export interface InvasoresCallbacks {
  onStats: (stats: InvasoresStats) => void; // solo al cambiar; también una vez al crear
  onGameOver: (finalScore: number) => void; // una sola vez
}

export interface InvasoresGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene loop y listeners; no reanudable
  destroy(): void; // stop() + liberar referencias
}

export function createInvasoresGame(
  canvas: HTMLCanvasElement,
  callbacks: InvasoresCallbacks
): InvasoresGame;
```

```ts
// lib/games/invasores/sprites.ts
export type AlienKind = "squid" | "crab" | "drone";
export const ALIEN_BITMAPS: Record<AlienKind, [string[], string[]]>; // 2 frames de 8 filas × 11 columnas; "#" = píxel
export const SHIELD_MASK: string[]; // 8 filas × 11 columnas
export function drawBitmap(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  px: number // tamaño de píxel
): void; // un fillRect(px, px) por "#"
```

Bitmaps (11 × 8; frame 0 y frame 1):

```
squid f0        squid f1        crab f0         crab f1         drone f0        drone f1
....###....     ....###....     ..#.....#..     ..#.....#..     ...#####...     ...#####...
...#####...     ...#####...     ...#...#...     #..#...#..#     .#########.     .#########.
..#######..     ..#######..     ..#######..     #.#######.#     ###########     ###########
.##.###.##.     .##.###.##.     .##.###.##.     ###.###.###     ###..#..###     ###..#..###
###########     ###########     ###########     ###########     ###########     ###########
..#.###.#..     ..#.###.#..     #.#######.#     .#########.     ..##...##..     ...##.##...
.#.......#.     .#.#...#.#.     #.#.....#.#     ..#.....#..     .##.###.##.     ..##...##..
..#.....#..     #.........#     ...##.##...     .#.......#.     ##.......##     ...##.##...
```

Escudo (`SHIELD_MASK`):

```
..#######..
.#########.
###########
###########
###########
###########
###.....###
##.......##
```

Constantes (en `engine.ts`):

```ts
const W = 800,
  H = 600;
const PX = 3; // píxel de bitmap de invasor → 33×24
const ALIEN_W = 33,
  ALIEN_H = 24;
const COLS = 11,
  ROWS = 5;
const GAP_X = 48,
  GAP_Y = 38; // paso entre celdas de la formación
const FORM_X0 = 143; // x inicial (centrada)
const FORM_Y0 = 90; // y inicial en nivel 1
const FORM_Y_PER_LEVEL = 16,
  FORM_Y_MAX_EXTRA = 64;
const STEP_DX = 12,
  STEP_DY = 20;
const EDGE_MARGIN = 24; // límite lateral de la formación
const INVASION_Y = 540; // base del invasor ≥ esto ⇒ game over
const POINTS = { squid: 30, crab: 20, drone: 10 };
const UFO_POINTS = [50, 100, 150, 300];
const CANNON_W = 40,
  CANNON_H = 18,
  CANNON_Y = 552,
  CANNON_SPEED = 300;
const PLAYER_BULLET_SPEED = 520; // bala 3×12
const ENEMY_BULLET_SPEED = 260; // bala 4×12
const MAX_ENEMY_BULLETS = 3;
const SHIELD_COUNT = 4,
  SHIELD_CELL = 4,
  SHIELD_Y = 470; // centros x = 100, 300, 500, 700
const START_LIVES = 3;
const RESPAWN_DELAY = 1.2,
  INVULN_TIME = 1.5,
  WAVE_DELAY = 1.0;
const MAX_DT = 0.05;
const MAX_SCORE = 9_999_999;
```

Fórmulas:

- Intervalo de salto de la formación: `stepInterval = max(0.04, (0.012 + 0.011 × vivos) × max(0.5, 0.92^(level − 1)))` segundos. Con 55 vivos en nivel 1 ≈ 0,617 s; con 1 vivo ≈ 0,04 s (suelo).
- Y inicial de la oleada: `FORM_Y0 + min(level − 1, 4) × FORM_Y_PER_LEVEL`.
- Intervalo entre disparos enemigos: aleatorio en `[0.6, 1.4] × max(0.4, 0.92^(level − 1))` s, solo si hay menos de `MAX_ENEMY_BULLETS` en pantalla.
- Disparo enemigo: columna aleatoria entre las que tienen invasores vivos; sale del invasor vivo más bajo de esa columna.
- OVNI: aparece tras un temporizador aleatorio 15–25 s (solo si hay ≥ 8 invasores vivos y no hay otro OVNI), y = 50, 28×14 px, velocidad 120 px/s, valor aleatorio de `UFO_POINTS`.
- Bonus de oleada: `100 × level` (con el nivel que se acaba de completar).
- Daño a escudo: al impactar una bala en una celda viva se eliminan esa celda y sus 4 vecinas. Un invasor que solape celdas vivas las elimina.

Entidades (estado interno, no exportado): `Alien { row, col, kind, alive }`, `Formation { x, y, dir: 1 | -1, frame: 0 | 1, timer }`, `Bullet { x, y, vy, friendly }`, `Cannon { x, alive, invuln, respawn }`, `Shield { x, cells: boolean[8][11] }`, `Ufo | null`, `Particle { x, y, vx, vy, life, color }` (explosiones de 8 partículas).

Convenciones:

- Canvas lógico 800×600 (4:3). `onStats` se emite solo si cambia alguno de `score`, `lives` o `level`.
- `dt` en segundos limitado a `MAX_DT`. El movimiento del cañón y las balas es continuo; la formación avanza al cumplirse `stepInterval` (como máximo un salto por frame).
- Teclado: `←`/`A` izquierda, `→`/`D` derecha, `Space` disparo. `preventDefault` solo en `←`, `→` y `Space`; se ignoran eventos con `target` `<input>` o `<textarea>`. Las teclas se registran con `keydown`/`keyup` en `window`; `blur` limpia las teclas pulsadas.
- `onGameOver` se llama una sola vez (guarda `over`); tras ello el motor ignora el teclado.
- Estados internos: `playing`, `respawning`, `waveClear`, `over`. Durante `respawning` y `waveClear` la formación y las balas enemigas siguen congeladas (las balas enemigas se eliminan al perder una vida).
- El canvas no dibuja textos.
- Colores: calamar `#ff2bd6`, cangrejo `#19e6ff`, dron `#39ff88`, cañón/escudos/bala propia `#39ff88`, bala enemiga `#ffe94d`, OVNI `#ff2bd6`, fondo `#05060a`, estrellas (60, posiciones fijas por semilla) `rgba(255,255,255,0.25)`.

## Plan de implementación

Antes del paso 1, leer `node_modules/next/dist/docs/01-app/` sobre Client Components (AGENTS.md avisa de cambios incompatibles), y leer `components/arkanoid-canvas.tsx`, `components/game-canvases.tsx` y `lib/games/asteroids/engine.ts` como modelo de estructura.

1. **Catálogo.** Crear `supabase/migrations/20261021000000_invasores.sql` con `update public.games set "long" = '<long de 01>' where id = 'invasores';` y aplicarla con `apply_migration`. Verificación: `select id, title, "long" from games where id = 'invasores'` devuelve el texto de `01`; `select count(*) from games` sigue en 8.
2. **Sprites.** Crear `lib/games/invasores/sprites.ts` con `ALIEN_BITMAPS`, `SHIELD_MASK` y `drawBitmap`. Verificación: `npm run build` compila; cada fila mide exactamente 11 caracteres y hay 8 filas por frame.
3. **Estado y reglas.** Crear `lib/games/invasores/engine.ts` con constantes, estado, creación de oleada, salto de formación, disparos, colisiones (AABB), escudos, OVNI, vidas, niveles y `onStats`/`onGameOver`. Verificación: `npm run build` y `npm run lint` sin errores.
4. **Dibujo.** Añadir `draw()` (fondo, estrellas, suelo, invasores con `drawBitmap` y `PX = 3`, cañón con `fillRect` + `arc`, escudos celda a celda, OVNI con `ellipse`, balas, partículas, parpadeo en invulnerabilidad), con `shadowBlur` restaurado a 0 tras cada grupo. Verificación: captura visual con los 55 invasores, 4 escudos y cañón.
5. **Loop y teclado.** `requestAnimationFrame` con `dt` limitado; `pause`/`resume` (este reinicia la marca de tiempo)/`stop`/`destroy`; listeners según «Convenciones». Verificación: `npm run lint`; tras `destroy()` no quedan listeners ni frames pendientes.
6. **Canvas en React.** Crear `components/invasores-canvas.tsx` (`"use client"`) copiando la estructura de `components/arkanoid-canvas.tsx` con `<canvas width={800} height={600} className="invasores-canvas">`, y añadir `.invasores-canvas` a `app/globals.css` (`position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#000`). Verificación: `npm run build` compila.
7. **Registro.** Añadir `invasores: InvasoresCanvas` a `GAME_ENGINES`. `GamePlayer` no cambia. Verificación: `/juegos/invasores/jugar` muestra el canvas y `/juegos/gloton/jugar` sigue simulado.
8. **Verificación.** Ver «Cómo se verifica». Al terminar, `/spec-impl` actualiza `CLAUDE.md` («Games») y `references/implemented-games.md` y pasa los specs a `Implemented`.

## Criterios de aceptación

### Build

- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] Existen `lib/games/invasores/engine.ts`, `lib/games/invasores/sprites.ts`, `components/invasores-canvas.tsx` y la migración `20261021000000_invasores.sql`.
- [ ] No existe `public/games/invasores/` ni ningún `import` de PNG/SVG en los archivos nuevos.
- [ ] `engine.ts` no importa React ni `next/*`.

### Juego

- [ ] `/juegos/invasores/jugar` responde 200 y muestra un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [ ] Al cargar el HUD muestra puntuación 0, Vidas 3 y Nivel 01.
- [ ] `←`/`→` y `A`/`D` mueven el cañón; no sale del canvas (x entre 0 y 760); la página no hace scroll al pulsar flechas ni Space.
- [ ] `Space` dispara; mientras la bala sigue en pantalla otro `Space` no crea una segunda bala.
- [ ] La formación se mueve a saltos de 12 px, baja 20 px al tocar un borde y cambia de sentido; el frame de animación alterna en cada salto.
- [ ] El intervalo de salto disminuye al morir invasores (medido: con 55 vivos ≈ 0,6 s; con 1 vivo ≈ 0,04 s).
- [ ] Matar calamar, cangrejo y dron suma 30, 20 y 10 en el HUD.
- [ ] Hay como máximo 3 disparos enemigos a la vez y siempre salen del invasor más bajo de su columna.
- [ ] Un disparo enemigo en el cañón reduce Vidas en 1, el cañón desaparece 1,2 s y reaparece parpadeando 1,5 s sin poder perder otra vida.
- [ ] Con Vidas 0 aparece el modal «FIN DEL JUEGO» con puntuación igual a la del HUD.
- [ ] Si un invasor llega a y = 540 aparece el modal aunque queden vidas.
- [ ] Los disparos y los invasores erosionan los escudos; al empezar la oleada siguiente los 4 escudos están completos.
- [ ] El OVNI cruza por y = 50 y suma 50, 100, 150 o 300 al ser alcanzado.
- [ ] Limpiar los 55 invasores suma 100 × nivel, sube Nivel a 02 tras 1 s y la formación aparece 16 px más baja y con salto más corto.
- [ ] El canvas no dibuja puntuación, vidas, «PAUSA» ni «GAME OVER».
- [ ] `onGameOver` se llama una sola vez por partida (el modal no se abre dos veces).

### HUD y flujo

- [ ] PAUSA congela todo (dos capturas separadas 1 s idénticas) y muestra «EN PAUSA»; REANUDAR continúa sin saltos.
- [ ] FIN abre el modal con la puntuación actual y el juego deja de responder al teclado.
- [ ] Escribir un espacio en el campo de iniciales del modal no dispara ni hace scroll.
- [ ] «JUGAR DE NUEVO» empieza con puntuación 0, Vidas 3, Nivel 01 y 55 invasores.
- [ ] Ir a `/biblioteca` y volver a `/juegos/invasores/jugar` deja un solo `canvas` y un solo disparo por pulsación de Space.

### Leaderboard

- [ ] «GUARDAR PUNTUACIÓN» con `TEST1` crea una fila en `scores` con `game_id = 'invasores'` y la puntuación del HUD (≥ 10).
- [ ] `/salon`, pestaña INVASORES, muestra la fila; con sesión `TEST1` aparece «TU MEJOR MARCA».
- [ ] `localStorage["av_scores"]` es `null`.
- [ ] Al terminar, `select count(*) from scores where player_name like 'TEST%'` devuelve 0.

### Sin regresiones

- [ ] `asteroides`, `caida`, `bloque-buster` y `serpentina` siguen funcionando en `/jugar`.
- [ ] `/juegos/gloton/jugar` sigue con puntuación simulada, PAUSA, FIN y modal.
- [ ] `/`, `/biblioteca`, `/juegos/invasores`, `/acceso`, `/salon` y `/acerca` responden 200.
- [ ] Sin errores de hidratación ni errores en la consola del navegador.
- [ ] `references/` y `specs/*.md` no tienen cambios (`git status`).
- [ ] `get_advisors` (security) no reporta errores nuevos.

### Cómo se verifica (Playwright MCP y Supabase MCP)

Con `npm run dev` corriendo:

1. `execute_sql` con `select * from games where id = 'invasores'` y comparar con `01`.
2. `browser_navigate` a `/juegos/invasores/jugar`, `browser_snapshot` y `browser_console_messages`: HUD 0 / 3 / 01, sin errores.
3. `browser_evaluate`: `document.querySelectorAll('canvas').length === 1`, tamaño 800×600 y no existe `.game-arena`. `browser_network_requests`: sin imágenes de la partida.
4. `browser_press_key` `ArrowLeft`/`ArrowRight`/`a`/`d` y capturas antes y después; `Space` dos veces seguidas y comprobar una sola bala.
5. Jugar hasta matar invasores de cada tipo (o `browser_run_code_unsafe` para pulsar teclas en bucle) y comprobar +30/+20/+10 en el HUD.
6. Dejar que los disparos enemigos alcancen el cañón: Vidas 3 → 2 → 1 → 0 y modal «FIN DEL JUEGO». Repetir sin moverse y sin disparar para ver la derrota por invasión.
7. PAUSA: dos capturas separadas 1 s idénticas; REANUDAR: cambian.
8. FIN, iniciales `TEST1` con un espacio, guardar; `execute_sql` confirma la fila y `localStorage.getItem("av_scores")` es `null`.
9. JUGAR DE NUEVO: 0 / 3 / 01.
10. Navegar a `/biblioteca` y volver; un solo `canvas` y un disparo por pulsación.
11. `/salon` pestaña INVASORES; sesión `TEST1` y «TU MEJOR MARCA».
12. Regresión en `asteroides`, `caida`, `bloque-buster`, `serpentina`, `gloton` y rutas de «Sin regresiones».
13. Limpiar con `delete from scores where player_name like 'TEST%'` y las filas de prueba de `invasores`.

## Decisiones

- **Sí:** `onStats` con `{ score, lives, level }`; `GamePlayer` ya muestra Vidas y Nivel con esos campos.
- **Sí:** bitmaps como arrays de strings y `fillRect` por píxel. Cumple «solo primitivas», es legible en el diff y permite animar con 2 frames.
- **Sí:** un único `sprites.ts` solo para datos de dibujo, y el resto en `engine.ts` (como `levels.ts` en Arkanoid). No se divide más para S/M.
- **Sí:** formación en saltos discretos con intervalo en función de invasores vivos y nivel, con suelo 0,04 s y factor mínimo 0,5. Da tensión creciente sin que sea imposible.
- **Sí:** el cañón desaparece 1,2 s y luego es invulnerable 1,5 s; las balas enemigas se limpian al perder una vida.
- **Sí:** colisiones AABB sin librerías. Las entidades son pequeñas y pocas.
- **Sí:** `Math.min(score, MAX_SCORE)` por seguridad con la API, aunque el límite es inalcanzable en la práctica.
- **No:** HUD o mensajes dentro del canvas, por la regla del proyecto.
- **Sí:** `Space` con `preventDefault` solo si el `target` no es campo de texto; la tecla pulsada queda registrada para disparo continuo.
- **Sí:** la migración solo toca `long`; el slug y los demás campos no cambian.

## Riesgos

| Riesgo                                                          | Mitigación                                                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Rendimiento por `fillRect` píxel a píxel (55 × ~50 rectángulos) | ~3 000 rectángulos por frame es trivial; si hiciera falta, pre-renderizar bitmaps a `OffscreenCanvas`.    |
| `shadowBlur` caro o que se «filtra» al resto del dibujo         | Aplicarlo solo a cañón, balas y OVNI, y restablecerlo a 0 tras cada grupo.                                |
| `dt` grande al reanudar o cambiar de pestaña                    | `resume()` reinicia la marca de tiempo y `dt ≤ 0.05`; la formación avanza como máximo un salto por frame. |
| `Space` activa el botón enfocado del HUD o hace scroll          | `preventDefault` en `Space` desde `window` solo si el `target` no es campo de texto.                      |
| Strict Mode monta dos veces el canvas                           | `destroy()` en el cleanup del efecto; verificación del criterio de un solo `canvas`.                      |
| Pulsaciones residuales entre partidas (tecla «pegada»)          | `blur` y `destroy()` limpian el estado de teclas; el restart remonta el motor (`key={runId}`).            |
| Se guardan puntuaciones de prueba reales                        | El paso 13 de verificación las borra.                                                                     |

## Qué **no** está en este spec

- Sonido y música.
- Controles táctiles, ratón o gamepad.
- Vida extra, power-ups, jefes y multijugador.
- Assets externos y cualquier archivo en `public/`.
- Reglas y fila de catálogo: están en `01-diseno-juego.md`.
- `best`/`plays` derivados de `scores`.
- Tests automatizados en el repositorio.

Cada uno, si llega, va en su propio spec.
