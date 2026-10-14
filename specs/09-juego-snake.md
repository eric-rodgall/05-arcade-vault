# SPEC 09 — Cuarto juego real: SNAKE

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Date:** 2026-10-14
> **Objective:** Crear en TypeScript el juego Snake con los sprites de fruta de `references/source-assets/snake-assets/` y jugarlo en `/juegos/serpentina/jugar`, con su puntuación guardada en el leaderboard de `/salon`.

---

## Por qué existe este spec

SPEC 05, 07 y 08 dejaron el patrón (motor puro + canvas cliente + registro `GAME_ENGINES`). A diferencia de esos juegos, Snake **no tiene un proyecto de referencia** en `references/started-games/`: solo hay un atlas de frutas (`fruits.png` + `sprites.js`) en `references/source-assets/snake-assets/`. Las reglas y el tablero se definen aquí, tomando como modelo el Snake clásico de Google (de donde salen las frutas).

`serpentina` ya existe en `games` (ARCADE, `sort_order` 3, portada `cover-snake`) y hoy usa una puntuación simulada. Este spec la convierte en juego real y la renombra a SNAKE, igual que se hizo con TETRIS y ARKANOID.

Estado previo que ya existe y **no se rehace**:

- La fila `serpentina` en `games` y la portada `cover-snake`.
- Marco CRT (`.crt-screen`, 4:3), HUD, pausa, modal de fin de partida de `GamePlayer` y el registro `GAME_ENGINES`.
- `POST /api/puntuaciones`, `/salon` y `lib/data/scores.ts`: el leaderboard no necesita código nuevo.

El atlas original (`sprites.js`) es un script con `window.SPRITE_ATLAS`. No se importa tal cual: se porta su tabla de coordenadas a TypeScript. La imagen mide 3790×442 y las frutas ocupan la fila y=136–295.

## Scope

**In:**

- Reglas del Snake clásico:
  - Rejilla de 16 × 12 celdas de 40 px (canvas lógico 640×480, 4:3).
  - La serpiente empieza con 3 segmentos, centrada en la rejilla, moviéndose a la derecha.
  - Avanza una celda por paso a velocidad fija: 8 pasos por segundo (125 ms).
  - Muere al chocar con una pared o con su propio cuerpo.
  - Comer una fruta suma 10 puntos y añade un segmento.
  - Siempre hay exactamente una fruta en una celda libre.
  - No se permite girar 180° sobre sí misma; se encolan hasta 2 giros por paso para que dos pulsaciones rápidas no se pierdan.
  - Si la serpiente llena toda la rejilla, la partida termina (victoria) con `onGameOver`.
- Motor en `lib/games/snake/`:
  - `lib/games/snake/fruits.ts`: tabla `FRUITS` (22 frutas con `x, y, w, h` portadas de `sprites.js`), `FRUIT_SHEET_URL` y `loadFruits()`.
  - `lib/games/snake/engine.ts`: `createSnakeGame(canvas, callbacks)` con estado, loop de paso fijo, dibujo y teclado.
- Assets: copiar `fruits.png` a `public/games/serpentina/fruits.png`.
- Dibujo: fondo oscuro con cuadrícula tenue; serpiente vectorial en verde neón (cabeza más brillante, con dos ojos); la fruta se dibuja con el sprite de `fruits.png`, escalado para caber en una celda manteniendo la proporción. Cada aparición elige una fruta al azar de las 22 (todas valen 10).
- Client Component `components/snake-canvas.tsx`: monta un `<canvas width={640} height={480}>` (clase `.snake-canvas`) y llama a `destroy()` al desmontar.
- Registro: añadir `serpentina: SnakeCanvas` en `GAME_ENGINES`.
- HUD: la puntuación viene del motor. Snake no tiene vidas ni niveles: el HUD muestra «—» en Vidas y 01 en Nivel (valor por defecto de `GamePlayer`, que ya existe).
- Controles: `←` `→` `↑` `↓` y también `W` `A` `S` `D`. Solo teclado.
- Fin de partida: al chocar o llenar la rejilla, el motor llama a `onGameOver(score)` una sola vez y `GamePlayer` abre el modal «FIN DEL JUEGO».
- Botones del HUD funcionales (PAUSA/REANUDAR, FIN, JUGAR DE NUEVO) como en SPEC 05/07/08.
- Catálogo: migración que cambia `games.title` de `serpentina` a `SNAKE` y corrige su `long` (hoy promete «núcleos magenta» y velocidad creciente, que este juego no tiene).
- Actualizar «State of the codebase» de `CLAUDE.md`.
- Verificar con el **MCP de Playwright** y el **MCP de Supabase**.

**Out of scope (para futuros specs):**

- Sonido y música.
- Controles táctiles, gestos de deslizamiento o gamepad.
- Niveles, vidas, aumento de velocidad, obstáculos, frutas especiales o modos (paredes envolventes, dos jugadores).
- Cuerpo de la serpiente con sprites (no hay assets); animación suave entre celdas.
- HUD, «GAME OVER» o «PAUSA» dibujados en el canvas, y reinicio por tecla.
- `localStorage` propio para récord local.
- Derivar `best` y `plays` de `scores`.
- Portar los otros cuatro juegos simulados.
- Tests automatizados en el repo.
- Cambios en `references/`.

## Modelo de datos

No se añaden tablas ni columnas. La migración solo actualiza dos campos de la fila `serpentina`. Contrato entre el motor y React:

```ts
// lib/games/snake/engine.ts
export interface SnakeCallbacks {
  onStats: (stats: { score: number }) => void; // solo al cambiar
  onGameOver: (finalScore: number) => void; // una sola vez
}

export interface SnakeGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias
}

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks
): SnakeGame;

// lib/games/snake/fruits.ts
export interface FruitSprite {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const FRUITS: Record<string, FruitSprite>; // 22 entradas, claves de sprites.js
```

Convenciones:

- Rejilla `COLS = 16`, `ROWS = 12`, `CELL = 40`; la celda (0, 0) es la superior izquierda.
- La serpiente es un array de celdas `{ x, y }` con la cabeza en el índice 0.
- Tiempo: `dt` en segundos limitado a 0.05; un acumulador avanza un paso cada `STEP = 0.125` s (varios pasos por frame si hiciera falta, nunca más de 2).
- El motor no importa React ni toca el DOM salvo el `canvas` y `window` para el teclado.
- Los listeners de teclado ignoran `<input>` y `<textarea>` y solo llaman a `preventDefault()` para las cuatro flechas (no para `WASD`).
- El canvas no dibuja textos.
- Puntuación máxima posible: 16 × 12 − 3 = 189 frutas × 10 = 1890, muy por debajo de 9 999 999.
- Si `fruits.png` falla al cargar, el motor registra un error y dibuja la fruta como círculo magenta para que el juego siga siendo jugable.

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components (AGENTS.md advierte cambios incompatibles) y leer `references/source-assets/snake-assets/sprites.js` completo.

1. **Catálogo y assets.** Crear `supabase/migrations/<versión>_snake.sql` y aplicarla con `apply_migration`: `update games set title = 'SNAKE', long = '…' where id = 'serpentina'`. Copiar `fruits.png` a `public/games/serpentina/`. Verificación: `select id, title, long from games where id = 'serpentina'` y el PNG responde 200.
2. **Frutas.** Crear `lib/games/snake/fruits.ts` con `FRUITS`, `FRUIT_SHEET_URL` y `loadFruits()`. Verificación: `npm run build` compila.
3. **Motor.** Crear `lib/games/snake/engine.ts` con `createSnakeGame`: estado, cola de giros, paso fijo, colisiones, aparición de fruta, `draw`, loop con `requestAnimationFrame`, teclado y `pause`/`resume`/`stop`/`destroy`. `resume` reinicia la marca de tiempo; el dibujo no depende de que la imagen haya cargado. Verificación: `npm run build` y `npm run lint` sin errores.
4. **Canvas en React.** Crear `components/snake-canvas.tsx` (`"use client"`) copiando la estructura de `components/arkanoid-canvas.tsx` y añadir `.snake-canvas` en `app/globals.css` (`position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#000`). Verificación: `npm run build` compila.
5. **Registro.** Añadir `serpentina: SnakeCanvas` a `GAME_ENGINES`. `GamePlayer` no cambia. Verificación: `/juegos/serpentina/jugar` muestra el canvas y otro juego simulado (por ejemplo `gloton`) sigue simulado.
6. **Documentación.** Actualizar «State of the codebase» en `CLAUDE.md`: `serpentina`/SNAKE es real, archivos nuevos, `public/games/serpentina/`, contrato `SnakeCallbacks`/`SnakeGame`, la migración y que quedan cuatro juegos simulados. Pasar este spec a `Implemented`. Verificación: `npm run build` y `npm run lint` sin errores.
7. **Verificación.** Ver «Cómo se verifica».

## Criterios de aceptación

### Build

- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] Existen `lib/games/snake/fruits.ts`, `lib/games/snake/engine.ts`, `components/snake-canvas.tsx` y `public/games/serpentina/fruits.png`.
- [ ] `references/` no tiene cambios respecto al estado previo (`git status`).

### Catálogo

- [ ] `select title from games where id = 'serpentina'` devuelve `SNAKE` y el `long` ya no menciona «núcleos magenta» ni velocidad creciente.
- [ ] `/biblioteca`, `/` y `/salon` muestran SNAKE y ninguna pantalla muestra «SERPENTINA».
- [ ] La URL `/juegos/serpentina` sigue respondiendo 200.

### Juego

- [ ] `/juegos/serpentina/jugar` responde 200 y muestra un `<canvas>` de 640×480 lógicos dentro de `.crt-screen`, sin `.game-arena`.
- [ ] Al cargar se ven la serpiente de 3 segmentos avanzando a la derecha y una fruta del atlas en una celda libre.
- [ ] Las flechas y `WASD` giran la serpiente; invertir 180° no tiene efecto; la página no hace scroll al pulsar flechas.
- [ ] Dos giros pulsados dentro del mismo paso se aplican en pasos consecutivos (no se pierden).
- [ ] Comer una fruta suma exactamente 10 puntos, alarga la serpiente un segmento y hace aparecer otra fruta en una celda no ocupada.
- [ ] Chocar con una pared o con el propio cuerpo abre el modal «FIN DEL JUEGO» con la puntuación final igual a la del HUD.
- [ ] La velocidad es constante: 8 pasos por segundo medidos en 2 s.
- [ ] El HUD muestra «—» en Vidas y 01 en Nivel.
- [ ] El canvas no dibuja puntuación, «PAUSA» ni «GAME OVER».

### HUD y flujo

- [ ] PAUSA congela la serpiente (dos capturas separadas por 1 s idénticas) y muestra «EN PAUSA»; REANUDAR continúa sin saltar celdas.
- [ ] FIN abre el modal con la puntuación actual y el juego deja de responder al teclado.
- [ ] Escribir un espacio en el campo de iniciales del modal no dispara nada ni hace scroll.
- [ ] «JUGAR DE NUEVO» inicia una partida con puntuación 0, serpiente de 3 segmentos y una fruta.
- [ ] Ir a `/biblioteca` y volver a `/juegos/serpentina/jugar` deja un solo `canvas` y una sola acción por pulsación.

### Leaderboard

- [ ] «GUARDAR PUNTUACIÓN» con nombre `TEST1` crea una fila en `scores` con `game_id = 'serpentina'` y la puntuación del HUD (requiere ≥ 10 puntos).
- [ ] `/salon`, pestaña SNAKE, muestra la fila; con sesión `TEST1` aparece «TU MEJOR MARCA».
- [ ] `localStorage["av_scores"]` es `null`.
- [ ] Al terminar, `select count(*) from scores where player_name like 'TEST%'` devuelve 0.

### Sin regresiones

- [ ] `asteroides`, `caida` y `bloque-buster` siguen funcionando en `/jugar` (canvas, HUD, pausa, FIN).
- [ ] Un juego simulado (`/juegos/gloton/jugar`) sigue con puntuación simulada, PAUSA, FIN y modal.
- [ ] `/`, `/biblioteca`, `/juegos/serpentina`, `/acceso`, `/salon` y `/acerca` responden 200.
- [ ] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.
- [ ] `get_advisors` (security) no reporta errores nuevos.

### Cómo se verifica (Playwright MCP y Supabase MCP)

Con `npm run dev` corriendo:

1. `browser_navigate` a `/juegos/serpentina/jugar`, `browser_snapshot` y `browser_console_messages`: HUD con puntuación 0, vidas «—», nivel 01, sin errores.
2. `browser_evaluate`: existe un `canvas` de 640×480 y no existe `.game-arena`.
3. `browser_press_key` con flechas y `WASD`, con capturas antes y después; probar el giro de 180°.
4. Llegar a la fruta con una secuencia de giros calculada leyendo el canvas (o `browser_run_code_unsafe`) para comprobar +10 y el crecimiento; chocar con la pared y comprobar el modal.
5. PAUSA: dos capturas separadas por 1 s idénticas; REANUDAR: cambian.
6. FIN, iniciales `TEST1` con un espacio, guardar (con puntuación ≥ 10); `execute_sql` confirma la fila y `localStorage.getItem("av_scores")` es `null`.
7. JUGAR DE NUEVO: puntuación 0 y serpiente de 3 segmentos.
8. Navegar a `/biblioteca` y volver; contar `canvas` (1) y comprobar que una pulsación gira una sola vez.
9. `/salon` pestaña SNAKE; iniciar sesión como `TEST1` y comprobar «TU MEJOR MARCA».
10. Regresión en `asteroides`, `caida`, `bloque-buster`, `gloton` y cada ruta de «Sin regresiones» con `browser_console_messages`.
11. Limpiar con `delete from scores where player_name like 'TEST%'` y las filas de prueba de `serpentina`.

## Decisiones

- **Sí:** reutilizar la fila `serpentina` existente y conservar el slug. Cambiarlo rompería enlaces y puntuaciones.
- **Sí:** renombrar el título a SNAKE por migración, como con TETRIS y ARKANOID.
- **Sí:** corregir el `long` de la fila. Promete núcleos magenta y velocidad creciente, y el juego elegido usa frutas y velocidad fija.
- **Sí:** reglas del Snake clásico, sin vidas ni niveles. Es la versión más simple y coincide con el origen de los sprites.
- **No:** velocidad creciente por nivel y paredes envolventes. Se descartaron al elegir el clásico; si se quieren, van en otro spec.
- **Sí:** rejilla 16×12 de 40 px (640×480, 4:3). Encaja en `.crt-screen` sin barras negras.
- **Sí:** serpiente vectorial de neón. No hay sprites de serpiente en los assets y dibujarla con formas encaja con el estilo del vault.
- **Sí:** fruta aleatoria del atlas en cada aparición, todas valen 10. Usa todo el atlas sin añadir reglas de puntuación.
- **No:** copiar `sprites.js` ni exponer `window.SPRITE_ATLAS`. Se porta la tabla a TypeScript; es un script con globales.
- **Sí:** solo `fruits.png` va a `public/`, porque es un asset binario.
- **Sí:** cola de hasta 2 giros por paso. Evita perder pulsaciones rápidas y morir por girar 180° en dos teclas.
- **Sí:** las teclas `WASD` además de las flechas; `preventDefault` solo en flechas.
- **Sí:** la victoria (rejilla llena) llama a `onGameOver`, igual que en SPEC 08.
- **Sí:** fallback de círculo si falla la carga de la imagen, para no bloquear el juego por un asset decorativo.
- **Sí:** leaderboard sin código nuevo. SPEC 06 ya acepta cualquier `games.id`.

## Riesgos

| Riesgo                                                          | Mitigación                                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Las coordenadas del atlas recortan mal alguna fruta             | Se revisa una captura con las 22 frutas durante el paso 3 antes de dar por buenas las coordenadas. |
| `destroy()` antes de que cargue la imagen (Strict Mode)         | El motor no depende de la imagen para arrancar; al cargar comprueba un flag `stopped`.             |
| Al reanudar, `dt` acumulado hace avanzar varias celdas de golpe | `resume()` reinicia la marca de tiempo, `dt` ≤ 0.05 s y máximo 2 pasos por frame.                  |
| Flechas hacen scroll o activan el botón enfocado                | `preventDefault` solo en las flechas y no cuando el `target` es un campo de texto.                 |
| Puntuación 0 no se puede guardar (la API exige ≥ 1)             | Es el comportamiento de SPEC 06; la verificación juega hasta comer al menos una fruta.             |
| Se guardan puntuaciones de prueba reales en `scores`            | El paso 11 de verificación las borra.                                                              |

## Qué **no** está en este spec

- Sonido y música.
- Controles táctiles o gamepad.
- Niveles, vidas, velocidad creciente, obstáculos, frutas especiales o modos de juego.
- Sprites de serpiente y animaciones entre celdas.
- `best`/`plays` derivados de `scores` y ranking real en `/juegos/[id]`.
- Los otros cuatro juegos simulados.
- Tests automatizados en el repositorio.

Cada uno, si llega, va en su propio spec.
