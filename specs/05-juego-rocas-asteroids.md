# SPEC 05 — Primer juego real: ROCAS (Asteroids)

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-10-06
> **Objective:** Portar a TypeScript el juego Asteroids de `references/started-games/02-asteroids/` y jugarlo de verdad en `/juegos/rocas/jugar`, conectado al HUD, la pausa y el modal de puntuación de `GamePlayer`.

---

## Por qué existe este spec

Hasta ahora `/juegos/[id]/jugar` es un simulacro: `components/game-player.tsx` suma puntos aleatorios con un `setInterval` y dibuja una arena decorativa en CSS. Este spec convierte uno de los ocho juegos del catálogo en un juego jugable real y fija el patrón que seguirán los demás (`references/started-games/03-tetris`, `04-arkanoid`): un motor puro en `lib/games/<juego>/` y un Client Component que lo monta en un `<canvas>`.

Asteroids ya existe como proyecto independiente (`game.js`, 511 líneas, JS plano con globales, sin dependencias). Corresponde a la entrada `rocas` del catálogo, que hoy solo es un mock.

Estado previo que ya existe y **no se rehace**:

- El catálogo `lib/games.ts` y la entrada `rocas` (id, portada `cover-rocas`, categoría `SHOOTER`).
- El marco CRT (`.crt`, `.crt-screen` con `aspect-ratio: 4 / 3`) y el modal de fin de partida de `GamePlayer`.
- El guardado de puntuaciones en `localStorage` (`av_scores`) y la sesión simulada (`av_user`).
- Los otros siete juegos: siguen con la puntuación simulada.

## Scope

**In:**

- Motor del juego en TypeScript estricto, portado de `game.js` sin cambiar sus reglas ni sus constantes:
  - `lib/games/asteroids/entities.ts`: clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y utilidades (`wrap`, `dist`, `rand`, `randInt`).
  - `lib/games/asteroids/engine.ts`: función `createAsteroidsGame(canvas, callbacks)` que contiene el estado, `update`, `draw`, el loop con `requestAnimationFrame` y el manejo de teclado, y devuelve un objeto de control.
- Client Component `components/asteroids-canvas.tsx`: monta un `<canvas width={800} height={600}>`, crea el motor en `useEffect` y lo destruye al desmontar (cancela el `requestAnimationFrame` y quita los listeners).
- Integración en `components/game-player.tsx`: cuando `game.id === "rocas"`, el `GamePlayer` renderiza `AsteroidsCanvas` dentro de `.crt-screen` en lugar de `.game-arena`, y la puntuación, las vidas y el nivel del HUD vienen del motor. Para los demás juegos el componente se comporta como hoy.
- Controles: `←` `→` rotar, `↑` propulsar, `Espacio` disparar. Solo teclado.
- Reglas heredadas del original, sin cambios: 3 vidas, invencibilidad de reaparición de 3 s con parpadeo, asteroides de tamaño 3 → 2 → 1 con puntos 20 / 50 / 100, siguiente nivel con `3 + level` asteroides, power-up de triple disparo (5 s), partículas de explosión, mundo toroidal de 800×600.
- Botones del HUD funcionales:
  - **PAUSA / REANUDAR** detiene y reanuda la simulación (el overlay «EN PAUSA» existente se mantiene).
  - **FIN** termina la partida y abre el modal con la puntuación real.
  - **JUGAR DE NUEVO** (en el modal) empieza una partida nueva desde cero.
- Fin de partida natural (0 vidas): el motor avisa y `GamePlayer` abre el mismo modal «FIN DEL JUEGO».
- Estética vectorial blanco y negro del original dentro del marco CRT; el canvas se escala por CSS para llenar `.crt-screen` manteniendo 4:3.
- Corregir `long` de `rocas` en `lib/games.ts`: quitar la promesa de OVNIs, que el juego no tiene, y mencionar el triple disparo.
- Actualizar la sección «State of the codebase» de `CLAUDE.md`.
- Verificar con el **MCP de Playwright**.

**Out of scope (para futuros specs):**

- Controles táctiles o gamepad.
- Sonido y música (el original no tiene audio).
- OVNIs, nuevos enemigos, nuevos power-ups o cambios de balance.
- Re-skin neón del canvas.
- Persistir puntuaciones en Supabase o leerlas desde `av_scores` en el Salón de la Fama.
- Portar los otros siete juegos (`03-tetris`, `04-arkanoid` y los demás del catálogo).
- Guardar la partida en curso o reanudarla tras recargar.
- Atajo de teclado para pausar (por ejemplo `Esc` o `P`); la pausa es solo por el botón.
- Tests automatizados (`@playwright/test` o unitarios): Playwright MCP sigue siendo solo verificación asistida.
- Cambios en `references/started-games/`, que sigue siendo referencia de solo lectura.

## Modelo de datos

No se introducen datos persistentes ni se cambia el formato de `av_scores` (`{ game, score, name, at }`). Solo se define el contrato entre el motor y React.

```ts
// lib/games/asteroids/engine.ts
export interface AsteroidsCallbacks {
  onStats: (stats: { score: number; lives: number; level: number }) => void; // al cambiar cualquiera
  onGameOver: (finalScore: number) => void; // al llegar a 0 vidas
}

export interface AsteroidsGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias; lo llama el cleanup del useEffect
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks
): AsteroidsGame;

// Estado interno (antes globales en game.js)
type GameState = "playing" | "dead" | "gameover";
```

Convenciones:

- Coordenadas con origen arriba a la izquierda, canvas lógico fijo de 800×600 (`W`, `H`).
- Velocidades en px/s y `dt` en segundos, con `dt` limitado a 0.05 s como en el original.
- El motor no importa React ni toca el DOM salvo el `canvas` recibido y `window` para el teclado.
- Los textos de overlay del original (`GAME OVER`, `ESPACIO PARA REINICIAR`) y el HUD dibujado en el canvas **se eliminan**: los muestran `GamePlayer` y su modal.
- `Espacio` ya no reinicia la partida desde el estado `gameover`; reinicia el botón del modal.
- Los listeners de teclado ignoran los eventos cuyo `target` sea un `<input>` o `<textarea>`, y solo llaman a `preventDefault()` para `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space`, para que la página no haga scroll y el campo de iniciales del modal siga aceptando espacios.

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components (AGENTS.md advierte que esta versión de Next tiene cambios incompatibles). Releer `references/started-games/02-asteroids/game.js` completo mientras se porta.

1. **Entidades.** Crear `lib/games/asteroids/entities.ts` con las utilidades y las cinco clases tipadas. Cada clase recibe el `CanvasRenderingContext2D` en `draw(ctx)` en vez de usar un `ctx` global. Constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`, `W`, `H`) exportadas desde el mismo archivo. Verificación: `npm run build` compila.
2. **Motor.** Crear `lib/games/asteroids/engine.ts` con `createAsteroidsGame`: estado, `initGame`, `nextLevel`, `killShip`, `update`, `draw` (sin HUD ni overlays), loop con `requestAnimationFrame`, teclado con las reglas de «Convenciones», y `pause`/`resume`/`stop`/`destroy`. Llama a `onStats` cuando cambian puntuación, vidas o nivel y a `onGameOver` al pasar a `gameover`. Verificación: `npm run build` y `npm run lint` sin errores.
3. **Canvas en React.** Crear `components/asteroids-canvas.tsx` (`"use client"`): props `paused`, `onStats`, `onGameOver`; crea el motor en `useEffect`, llama a `pause`/`resume` según `paused` y a `destroy` en el cleanup. Añadir en `app/globals.css` una clase `.asteroids-canvas` (ancho y alto 100 % de `.crt-screen`, fondo `#000`). Verificación: `npm run build` compila.
4. **Integración en `GamePlayer`.** En `components/game-player.tsx`: si `game.id === "rocas"`, no arrancar el `setInterval` simulado, renderizar `<AsteroidsCanvas key={runId} …/>` en lugar de `.game-arena`, tomar `score`, `lives` y `level` de `onStats`, y abrir el modal en `onGameOver` y con el botón FIN. `restart` incrementa `runId` para remontar el canvas y reinicia `score`, `lives`, `level`. El HUD muestra `"♥ ".repeat(lives)`. Para el resto de juegos el flujo actual no cambia. Verificación: en `/juegos/rocas/jugar` se juega con el teclado y en `/juegos/caida/jugar` sigue la puntuación simulada.
5. **Copy del catálogo.** En `lib/games.ts`, reescribir `long` de `rocas` sin OVNIs y con mención al triple disparo. Verificación: `/juegos/rocas` muestra el texto nuevo.
6. **Documentación.** Actualizar «State of the codebase» en `CLAUDE.md`: `rocas` es el primer juego real, los archivos nuevos, el contrato `AsteroidsCallbacks`/`AsteroidsGame` y la nota de que los otros siete siguen simulados. Verificación: `npm run build` y `npm run lint` sin errores.
7. **Verificación con Playwright MCP.** Ver «Cómo se verifica».

## Criterios de aceptación

### Build

- [X] `npm run build` termina sin errores de tipos ni de compilación.
- [X] `npm run lint` termina sin errores.
- [X] `lib/games/asteroids/entities.ts`, `lib/games/asteroids/engine.ts` y `components/asteroids-canvas.tsx` existen.

### Juego

- [X] `/juegos/rocas/jugar` responde 200 y muestra un `<canvas>` de 800×600 lógicos dentro de `.crt-screen`, sin la arena decorativa `.game-arena`.
- [X] Al cargar hay 4 asteroides grandes, la nave en el centro parpadeando (invencible) y 3 vidas en el HUD.
- [X] `←` y `→` rotan la nave, `↑` la propulsa y `Espacio` dispara; la página no hace scroll al pulsarlas.
- [X] Destruir un asteroide grande suma 20 puntos, uno mediano 50 y uno pequeño 100, y el HUD lo refleja.
- [X] Un asteroide grande se divide en dos medianos y uno mediano en dos pequeños; uno pequeño desaparece sin dividirse.
- [X] Al chocar con un asteroide fuera de la invencibilidad, el HUD baja una vida y la nave reaparece a los 2 s en el centro.
- [X] Al destruir todos los asteroides el nivel del HUD sube de 1 a 2 y aparecen 5 asteroides grandes (`3 + level`).
- [X] Al perder la tercera vida se abre el modal «FIN DEL JUEGO» con la puntuación final igual a la del HUD.
- [X] Una nave y los asteroides que salen por un borde reaparecen por el opuesto.

### HUD y flujo

- [X] PAUSA congela asteroides, nave y balas y muestra «EN PAUSA»; REANUDAR continúa desde el mismo estado.
- [X] FIN abre el modal con la puntuación actual y el juego deja de responder al teclado.
- [X] «GUARDAR PUNTUACIÓN» agrega `{ game: "rocas", score, name, at }` a `localStorage["av_scores"]`.
- [X] Escribir un espacio en el campo de iniciales del modal no dispara ni hace scroll.
- [X] «JUGAR DE NUEVO» inicia una partida con puntuación 0, 3 vidas y nivel 1.
- [X] Salir de la ruta (SALIR o el nav) y volver no deja dos loops corriendo (la puntuación no avanza más rápido ni se duplican los disparos con una sola pulsación).
- [X] El canvas no dibuja HUD propio ni el texto `GAME OVER`.

### Sin regresiones

- [X] `/juegos/caida/jugar` sigue con puntuación simulada, PAUSA, FIN y modal funcionando.
- [X] `/`, `/biblioteca`, `/juegos/rocas`, `/acceso`, `/salon` y `/acerca` responden 200.
- [X] `/juegos/rocas` muestra el nuevo `long` sin la palabra «OVNIs».
- [X] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.

### Cómo se verifica (Playwright MCP)

Con `npm run dev` corriendo:

1. `browser_navigate` a `/juegos/rocas/jugar`, `browser_snapshot` y `browser_console_messages`: HUD con vidas 3, nivel 01, puntuación 0, sin errores.
2. `browser_evaluate` para comprobar que existe un `canvas` con `width === 800` y `height === 600` y que `.game-arena` no existe.
3. `browser_press_key` con `ArrowUp`, `ArrowLeft` y `Space` y `browser_take_screenshot` antes y después: la nave se mueve y aparecen balas.
4. Dejar que la nave choque con un asteroide (sin disparar) y comprobar con `browser_snapshot` que vidas pasa de 3 a 2; repetir hasta 0 y comprobar que aparece el modal.
5. Pulsar PAUSA, tomar dos capturas separadas por 1 s y comprobar que son idénticas; pulsar REANUDAR y comprobar que cambian.
6. Pulsar FIN, escribir iniciales con un espacio, pulsar «GUARDAR PUNTUACIÓN» y leer `localStorage.getItem("av_scores")` con `browser_evaluate`.
7. Pulsar «JUGAR DE NUEVO» y comprobar puntuación 0, vidas 3, nivel 01.
8. Navegar a `/biblioteca` y volver a `/juegos/rocas/jugar`; con `browser_evaluate` contar cuántos `canvas` hay (debe ser 1) y comprobar que una pulsación de `Space` crea una sola bala.
9. `browser_navigate` a `/juegos/caida/jugar` y comprobar que la puntuación sube sola, y a cada ruta de «Sin regresiones» con `browser_console_messages`.

## Decisiones

- **Sí:** usar la entrada `rocas` existente. Ya es el mismo juego en el catálogo, con portada y categoría; crear `asteroids` duplicaría el mock.
- **Sí:** corregir el `long` de `rocas`. Promete OVNIs que no existen, y la ficha de un juego no debe prometer algo que no se puede jugar.
- **Sí:** portar a TypeScript y montar un canvas en React. Respeta `strict`, el lint y el stack; permite controlar el ciclo de vida desde `useEffect`.
- **No:** copiar `game.js` a `public/` y cargarlo en un `<iframe>`. Aislaría el juego del HUD, la pausa y el guardado de puntuación, y exigiría `postMessage` y un archivo sin tipos.
- **No:** pegar el JS tal cual dentro de un componente. Choca con `strict` y con el lint, y sus globales (`ship`, `score`, `ctx`) no sobreviven a remontajes ni a dos instancias.
- **Sí:** separar `entities.ts` y `engine.ts`. El original son 511 líneas en un archivo; separar entidades de loop mantiene cada archivo revisable y es la plantilla para los siguientes juegos.
- **Sí:** reusar el HUD y el modal de `GamePlayer` y quitar el HUD y overlays del canvas. Un solo HUD y un solo flujo de fin de partida para todos los juegos; PAUSA, FIN y el guardado quedan conectados.
- **No:** mantener el HUD dibujado en el canvas, ni ambos. Duplicaría información y dejaría desconectados los botones de la plataforma.
- **Sí:** el motor comunica con callbacks (`onStats`, `onGameOver`) y expone `pause`/`resume`/`stop`/`destroy`. Es un contrato mínimo, sin React dentro del motor, y reutilizable por los siguientes juegos.
- **Sí:** el nivel del HUD viene del motor para `rocas`. La fórmula `Math.floor(score / 2500) + 1` del simulacro no tiene relación con los niveles reales.
- **Sí:** el reinicio se hace remontando el canvas con `key={runId}`. Es la forma más simple de garantizar estado limpio y de no dejar listeners colgados.
- **Sí:** el teclado ignora `<input>`/`<textarea>` y solo hace `preventDefault` en las cuatro teclas del juego. Si no, el modal de iniciales no podría escribir espacios.
- **Sí:** teclado únicamente, estética vectorial original, puntuación a `av_scores`. Son los límites que el usuario confirmó; táctil, re-skin y Supabase tienen su propio spec.
- **No:** sonido. El original no tiene audio, así que añadirlo es alcance nuevo.
- **No:** atajo de teclado para pausar. No existe en el original y la plataforma ya ofrece el botón; añadirlo implicaría decidir un atajo común a todos los juegos.
- **Sí:** conservar sin cambios las reglas y constantes del original. El objetivo es portar el juego, no rebalancearlo.

## Riesgos

| Riesgo                                                                               | Mitigación                                                                                                                        |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces en desarrollo y deja dos loops corriendo | El cleanup del `useEffect` llama a `destroy()`; el criterio y el paso 8 de verificación comprueban una sola bala por pulsación.   |
| Esta versión de Next cambia convenciones de Client Components                        | Leer `node_modules/next/dist/docs/01-app/` antes del paso 1.                                                                      |
| `onStats` en cada frame provoca renders de React a 60 Hz                             | El motor solo llama a `onStats` cuando cambian `score`, `lives` o `level`, no en cada frame.                                      |
| Las flechas y `Espacio` hacen scroll de la página o activan un botón enfocado        | `preventDefault` solo en esas cuatro teclas y no cuando el `target` es un campo de texto; verificado en los criterios de HUD.     |
| Pausa por botón pero la pestaña pierde el foco y `dt` se dispara al volver           | `dt` se limita a 0.05 s, igual que el original.                                                                                   |
| El canvas escalado por CSS se ve borroso o deformado dentro de `.crt-screen`         | El canvas conserva 800×600 lógicos y `.crt-screen` ya fija `aspect-ratio: 4 / 3`; se revisa con captura en escritorio y a 375 px. |
| El foco queda en el botón PAUSA y `Espacio` lo activa en vez de disparar             | El `keydown` del motor llama a `preventDefault` para `Space`; si no basta, quitar el foco del botón tras el clic.                 |

## Qué **no** está en este spec

- Controles táctiles o gamepad.
- Sonido.
- OVNIs, enemigos o power-ups nuevos y cambios de balance.
- Re-skin neón del canvas.
- Puntuaciones en Supabase o leídas desde `av_scores` en el Salón de la Fama.
- Los otros siete juegos del catálogo.
- Atajo de teclado de pausa y guardado de partida en curso.
- Tests automatizados en el repo.

Cada uno, si llega, va en su propio spec.
