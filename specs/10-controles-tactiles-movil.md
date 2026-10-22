# SPEC 10 — Controles táctiles para jugar en móvil

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-10-21
> **Objective:** Permitir jugar los cuatro juegos reales (`asteroides`, `caida`, `bloque-buster`, `serpentina`) en un móvil mediante un gamepad virtual bajo el canvas, visible solo en dispositivos táctiles, y con el reproductor `/juegos/[id]/jugar` usable a 375 px de ancho.

---

## Por qué existe este spec

Los cuatro motores solo escuchan `window` `keydown`/`keyup` (y ARKANOID, `mousemove` en el canvas). En un móvil no hay teclado, así que ningún juego real se puede jugar. El mockup original tenía un gamepad (`.gp*`) que SPEC 02 dejó explícitamente fuera de alcance; este spec lo retoma de forma funcional.

Estado previo que ya existe y **no se rehace**:

- Los cuatro motores (`lib/games/<juego>/engine.ts`), sus canvas (`components/*-canvas.tsx`), el registro `GAME_ENGINES` y los skins (`SKIN_GAMES`).
- HUD, pausa, modal de fin y guardado de puntuación de `GamePlayer`; `POST /api/puntuaciones` y `/salon`.
- Entrada de teclado y ratón: **se conserva sin cambios**. El gamepad es un añadido.

Cada motor ya reacciona a códigos de tecla concretos (`e.code`): ASTEROIDES lee estado mantenido (`ArrowLeft/Right/Up`) y pulsación (`Space`); TETRIS ejecuta una acción por `keydown` (el repetir al mantener lo hace hoy el autorepeat del teclado); ARKANOID lee `ArrowLeft/Right` mantenidos; SNAKE encola un giro por `keydown`. El gamepad se apoya en esos mismos códigos.

## Scope

**In:**

- API de entrada común en `lib/games/input.ts`:
  - Tipo `GameInputCode` (`"ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Space"`) e interfaz `GameInputSink { setInput(code: GameInputCode, pressed: boolean): void }`.
- Cada uno de los 4 motores añade `setInput` a su objeto de retorno. Internamente reutiliza la misma lógica que hoy dispara su `onKeyDown`/`onKeyUp` (se extrae la lógica a funciones `press(code)`/`release(code)` que llaman tanto el teclado como `setInput`); los motores siguen escuchando el teclado. `setInput` se ignora si el motor está pausado, terminado o detenido.
- Los 4 canvas (`components/*-canvas.tsx`) reciben un prop `inputRef` y lo rellenan con el `GameInputSink` del motor (y lo vacían en la limpieza). `EngineProps` en `components/game-canvases.tsx` añade `inputRef?: RefObject<GameInputSink | null>`.
- Configuración contextual en `lib/games/touch-layouts.ts`: `TOUCH_LAYOUTS: Record<string, TouchLayout>`, indexado por `game.id`, con los botones que usa cada juego y su etiqueta:
  - `asteroides`: D-pad `←` `→` `↑` (rotar izq., rotar der., empuje) + botón A «DISPARO» (`Space`).
  - `caida`: D-pad `←` `→` `↓` + botón A «ROTAR» (`ArrowUp`) + botón B «CAÍDA» (`Space`).
  - `bloque-buster`: D-pad `←` `→`.
  - `serpentina`: D-pad `←` `→` `↑` `↓`.
- Client Component `components/touch-controls.tsx`: renderiza D-pad a la izquierda y botones A/B a la derecha según `TOUCH_LAYOUTS[game.id]`:
  - `onPointerDown` → `setInput(code, true)` con `setPointerCapture`; `onPointerUp`/`onPointerCancel`/`onLostPointerCapture` → `setInput(code, false)`. Se admiten varios dedos a la vez (D-pad + botón).
  - **Repetición al mantener** solo para `caida` en `←` `→` `↓`: tras 220 ms se repite cada 80 ms (envía `true` repetido), porque el motor mueve una celda por `keydown`. En el resto de juegos no se repite.
  - Al pasar a pausa, abrir el modal de fin o desmontar, suelta todas las teclas pulsadas (`setInput(code, false)`) y los botones quedan deshabilitados.
  - `aria-label` por botón y `type="button"`.
- Detección y visibilidad solo por CSS: `.touch-controls { display: none }` y `@media (pointer: coarse) { .touch-controls { display: flex } }` en `app/globals.css`. Sin JavaScript ni estado de hidratación para detectarlo.
- Evitar scroll y zoom al jugar: `touch-action: none` en `.touch-controls` y en los `canvas` de los juegos reales; `user-select: none`, `-webkit-user-select: none` y `-webkit-touch-callout: none` en los controles; `-webkit-tap-highlight-color: transparent`; `contextmenu` prevenido en los botones (evita el menú por pulsación larga).
- Reproductor responsive a 375 px (solo CSS, en `app/globals.css`): el HUD (`.player-hud`) envuelve en filas sin desbordar horizontalmente, `.hud-actions` en una fila completa con botones táctiles de ≥ 44 px de alto, `.crt` ocupa todo el ancho útil con margen lateral de 16 px, y los controles táctiles quedan bajo `.crt-bottom` con botones de ≥ 56 px.
- `GamePlayer` monta `<TouchControls>` bajo el `.crt` solo si `Engine` existe, pasa `inputRef` al motor y el estado `paused || over` para deshabilitar.
- Actualizar «Shared code» y «Games» de `CLAUDE.md`.
- Verificar con el **MCP de Playwright** emulando un dispositivo táctil.

**Out of scope (para futuros specs):**

- Gestos sobre el canvas: arrastrar para mover la paleta de ARKANOID, deslizar en SNAKE, toques en el canvas.
- Aviso de girar a horizontal y bloqueo de orientación.
- Vibración háptica y sonido.
- Interruptor manual de «CONTROLES TÁCTILES» y detección por ancho de pantalla (solo `(pointer: coarse)`).
- Hacer jugables los cuatro juegos aún simulados (`gloton`, `invasores`, `ranaria`, `duelo-pixel`): no se montan controles ahí.
- Gamepad físico (Gamepad API).
- Rediseño de otras pantallas para móvil (`/`, `/biblioteca`, `/salon`, `/acerca`, nav).
- Cambios en reglas, velocidades o dificultad de los juegos.
- Tests automatizados en el repo.

## Modelo de datos

No se añaden tablas, columnas ni claves de `localStorage`. Contratos nuevos:

```ts
// lib/games/input.ts
export type GameInputCode =
  "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Space";

export interface GameInputSink {
  setInput(code: GameInputCode, pressed: boolean): void;
}

// lib/games/touch-layouts.ts
export interface TouchButton {
  code: GameInputCode;
  label: string; // etiqueta visible y base del aria-label
  repeat?: boolean; // true solo en caida: ←, →, ↓
}

export interface TouchLayout {
  dpad: TouchButton[]; // subconjunto de ←, →, ↑, ↓
  actions: TouchButton[]; // 0, 1 o 2 botones A/B
}

export const TOUCH_LAYOUTS: Record<string, TouchLayout>;

// components/game-canvases.tsx
export interface EngineProps {
  // …existentes…
  inputRef?: RefObject<GameInputSink | null>;
}
```

Convenciones:

- `setInput` en cada motor usa los mismos códigos que su teclado; para SNAKE y TETRIS (una acción por pulsación) solo actúa con `pressed === true`; para ASTEROIDES y ARKANOID actualiza el estado mantenido.
- Un `setInput(code, true)` repetido sin `false` intermedio no debe romper el estado de ASTEROIDES (`justPressed` solo se marca si no estaba ya pulsado, igual que hoy).
- `preventDefault` de teclado no aplica a `setInput`. El motor no toca el DOM por ello.
- Los motores siguen sin importar React.

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components (AGENTS.md advierte cambios incompatibles), y releer los bloques de entrada de los cuatro `engine.ts` y los canvas.

1. **Contratos.** Crear `lib/games/input.ts` y `lib/games/touch-layouts.ts`. Verificación: `npm run build` compila.
2. **Motores.** En cada `engine.ts` extraer la lógica de teclado a `press`/`release` y exponer `setInput` en el objeto devuelto (`SnakeGame`, `TetrisGame`, `ArkanoidGame`, `AsteroidsGame`). El teclado sigue funcionando igual. Verificación: `npm run build` y `npm run lint` sin errores; en escritorio los cuatro juegos responden al teclado como antes.
3. **Canvas y registro.** Añadir el prop `inputRef` a `EngineProps` y rellenarlo/vaciarlo en los cuatro `*-canvas.tsx`. Verificación: `npm run build` compila.
4. **Controles.** Crear `components/touch-controls.tsx` con pointer events, multitoque, repetición de `caida` y liberación en pausa/fin/desmontaje. Verificación: `npm run build` compila.
5. **Integración y CSS.** Montar `TouchControls` en `GamePlayer`; añadir en `app/globals.css` los estilos del gamepad, `(pointer: coarse)`, `touch-action`/`user-select` y el layout responsive del reproductor. Verificación: en escritorio (puntero fino) no se ve el gamepad; con emulación táctil sí.
6. **Documentación.** Actualizar `CLAUDE.md` (código compartido, contrato `GameInputSink`, controles táctiles por juego) y pasar este spec a `Implemented`. Verificación: `npm run build` y `npm run lint` sin errores.
7. **Verificación.** Ver «Cómo se verifica».

## Criterios de aceptación

### Build

- [x] `npm run build` termina sin errores de tipos ni de compilación.
- [x] `npm run lint` termina sin errores.
- [x] Existen `lib/games/input.ts`, `lib/games/touch-layouts.ts` y `components/touch-controls.tsx`.
- [x] Los cuatro motores devuelven un objeto con `setInput` y ningún motor importa React.
- [x] `references/` no tiene cambios (`git status`).

### Detección y layout

- [x] Con puntero fino (escritorio) `.touch-controls` tiene `display: none` en los 4 juegos reales.
- [x] Con emulación táctil (`pointer: coarse`) el gamepad se ve bajo el `.crt` en los 4 juegos reales.
- [x] En juegos simulados (`/juegos/gloton/jugar`) no existe `.touch-controls` ni con emulación táctil.
- [x] A 375 × 667 `document.documentElement.scrollWidth <= 375` en `/juegos/<id>/jugar` de los 4 juegos y el HUD no se desborda.
- [x] Los botones del HUD miden ≥ 44 px de alto y los del gamepad ≥ 56 px a 375 px.
- [x] Cada juego muestra solo sus botones: `asteroides` ← → ↑ + DISPARO; `caida` ← → ↓ + ROTAR + CAÍDA; `bloque-buster` ← →; `serpentina` ← → ↑ ↓.

### Control por juego (con emulación táctil)

- [ ] `asteroides`: mantener ← o → rota la nave mientras se pulsa y para al soltar; mantener ↑ da empuje; DISPARO dispara una bala por toque; ← y DISPARO a la vez funcionan (multitoque).
- [x] `caida`: ← y → mueven una celda por toque y siguen moviendo al mantener (220 ms + 80 ms); ↓ baja la pieza (también repite); ROTAR rota; CAÍDA hace caída instantánea.
- [x] `bloque-buster`: mantener ← o → mueve la paleta y se detiene al soltar.
- [ ] `serpentina`: cada toque en una dirección gira la serpiente; la dirección opuesta no tiene efecto; dos toques rápidos se aplican en pasos consecutivos.
- [ ] La página no hace scroll ni zoom al tocar o mantener los botones, ni aparece menú contextual por pulsación larga.
- [ ] El teclado sigue funcionando en los 4 juegos (escritorio) y el ratón en ARKANOID.

### HUD y flujo

- [x] Con PAUSA activa los botones del gamepad están deshabilitados y no mueven el juego; al reanudar no queda ninguna tecla «pegada».
- [ ] Soltar el dedo fuera del botón libera la tecla; pausar o abrir el modal con un botón pulsado libera la tecla.
- [x] Con el modal «FIN DEL JUEGO» abierto el gamepad no responde; el campo de iniciales y GUARDAR PUNTUACIÓN siguen siendo usables y visibles a 375 px.
- [x] «JUGAR DE NUEVO» deja un gamepad funcional y una sola acción por toque.
- [x] Ir a `/biblioteca` y volver a `/juegos/serpentina/jugar` deja un solo `canvas`, un solo gamepad y un giro por toque.

### Leaderboard

- [x] Una partida jugada con el gamepad (puntuación ≥ 1) se guarda con nombre `TEST1` en `scores` con el `game_id` correcto.
- [x] Al terminar, `select count(*) from scores where player_name like 'TEST%'` devuelve 0.

### Sin regresiones

- [ ] Teclado y HUD (PAUSA, FIN, JUGAR DE NUEVO, skins) siguen funcionando en los 4 juegos en escritorio.
- [x] `/`, `/biblioteca`, `/juegos/serpentina`, `/acceso`, `/salon` y `/acerca` responden 200.
- [x] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.
- [ ] `get_advisors` (security) no reporta errores nuevos.

### Cómo se verifica (Playwright MCP y Supabase MCP)

Con `npm run dev` corriendo:

1. Escritorio: `browser_navigate` a `/juegos/serpentina/jugar`; `browser_evaluate` confirma que `getComputedStyle(document.querySelector(".touch-controls")).display === "none"`; el teclado sigue girando la serpiente.
2. Emulación táctil: con `browser_run_code_unsafe` crear un contexto con `hasTouch: true`, `isMobile: true`, viewport 375×667 (o `browser_resize` + `browser_emulate_media`); comprobar `matchMedia("(pointer: coarse)").matches` y que `.touch-controls` es visible.
3. Para cada uno de los 4 juegos: `browser_snapshot`, `browser_console_messages` (sin errores) y `scrollWidth <= 375`.
4. Pulsar/mantener botones con eventos de puntero (`browser_run_code_unsafe`, `page.touchscreen`/`dispatchEvent` de `pointerdown`/`pointerup`) y comparar capturas antes y después: rotación de nave y disparo (`asteroides`), movimiento y repetición (`caida`, contando celdas en 400 ms), paleta (`bloque-buster`), giros (`serpentina`).
5. PAUSA con un botón mantenido: capturas idénticas con 1 s de diferencia; REANUDAR: sin tecla pegada.
6. FIN, iniciales `TEST1`, guardar; `execute_sql` confirma la fila.
7. Navegar a `/biblioteca` y volver; contar `canvas` (1) y `.touch-controls` (1).
8. Regresión en escritorio de los 4 juegos, `gloton` y cada ruta de «Sin regresiones» con `browser_console_messages`.
9. Limpiar con `delete from scores where player_name like 'TEST%'`.

## Decisiones

- **Sí:** gamepad virtual (D-pad + A/B) en los cuatro juegos, no gestos. Una sola forma de control, sin tocar los canvas ni reglas por juego; los gestos quedan para otro spec.
- **Sí:** entrada «React → motor» con `setInput(code, pressed)`, reutilizando los códigos de tecla de cada motor. Evita `KeyboardEvent` sintéticos (frágiles por foco y autorepeat) y reescribir los motores con acciones abstractas.
- **No:** `KeyboardEvent` sintéticos en `window`. Ningún motor se tendría que tocar, pero no distingue pausa/pulsaciones múltiples ni controla la repetición.
- **No:** dibujar los botones en el canvas. Rompe la regla «el canvas no dibuja HUD ni overlays» y complica el escalado.
- **Sí:** los motores siguen escuchando teclado y ratón. En escritorio no cambia nada.
- **Sí:** mando contextual (solo los botones del juego) con configuración en `lib/games/touch-layouts.ts`. Menos botones sin función y toques más grandes.
- **Sí:** detección solo por CSS `(pointer: coarse)`. Sin JS ni problemas de hidratación; el ancho de pantalla falla en tablets y escritorios estrechos.
- **No:** interruptor manual ni detección por ancho. Se decidió que no hace falta.
- **Sí:** repetición al mantener solo en TETRIS, desde el componente de controles. Es el único motor que mueve una celda por `keydown`; ASTEROIDES y ARKANOID leen estado mantenido y SNAKE debe girar una vez por toque.
- **Sí:** pointer events con `setPointerCapture` y multitoque. Permite D-pad + botón a la vez y garantiza soltar la tecla aunque el dedo salga del botón.
- **No:** gestos en ARKANOID (arrastrar paleta) ni vibración ni aviso de orientación. Se dejaron fuera del alcance al definir el spec.
- **No:** controles en los juegos simulados. No tienen motor al que enviar entrada.
- **Sí:** rediseño responsive acotado al reproductor `/jugar`. El resto de pantallas queda para otro spec.
- **Sí:** gamepad con `position: sticky; bottom: 0` y HUD compacto a ≤ 520 px (clase `hud-stats`, `.crt-bottom` oculto). Añadido al verificar: a 667 px de alto los botones quedaban bajo la línea de flotación y no se podían usar mientras se veía el canvas. En pantallas estrechas A/B se apilan en vertical para que `caida` no desborde 375 px.

## Verificación pendiente

Criterios sin marcar porque no se comprobaron en la verificación: `asteroides` ← por toque (en `npm run dev` el botón «N» de Next.js tapa ese punto), giro de 180° y toques rápidos en `serpentina`, zoom y menú contextual, soltar el dedo arrastrando fuera del botón, ratón en ARKANOID, regresión de teclado y skins en los 4 juegos y `get_advisors`.

## Riesgos

| Riesgo                                                                      | Mitigación                                                                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Teclas «pegadas» si se pausa o se abre el modal con un dedo apoyado         | `TouchControls` suelta todo al cambiar `paused`/`over`/desmontar; `setInput(…, false)` se acepta aunque el motor esté pausado. |
| `pointerup` no llega (dedo fuera del botón, llamada entrante)               | `setPointerCapture` más `pointercancel` y `lostpointercapture` liberan la tecla.                                               |
| El navegador hace scroll, zoom o menú contextual al mantener                | `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `contextmenu` prevenido.                            |
| `(pointer: coarse)` es falso en un portátil táctil con ratón                | Aceptado: se verá el teclado/ratón. Si hace falta, un interruptor va en otro spec.                                             |
| ASTEROIDES cuenta dos disparos por `true` repetido                          | `setInput` aplica la misma regla que `onKeyDown` (`justPressed` solo si no estaba pulsado).                                    |
| El canvas 4:3 queda pequeño en móvil vertical (ASTEROIDES/ARKANOID 800×600) | Se mantiene `object-fit: contain`; aceptado. El aviso de orientación queda fuera.                                              |
| Los pointer events de escritorio disparan el gamepad con el ratón           | El gamepad está oculto con puntero fino; sin efecto.                                                                           |
| Se guardan puntuaciones de prueba reales en `scores`                        | El paso 9 de verificación las borra.                                                                                           |

## Qué **no** está en este spec

- Gestos sobre el canvas (arrastrar, deslizar, tocar).
- Aviso o bloqueo de orientación.
- Vibración háptica y sonido.
- Interruptor manual de controles táctiles.
- Juegos aún simulados (`gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Gamepad físico.
- Responsive del resto de la web (home, biblioteca, salón, acerca, nav).
- Tests automatizados en el repositorio.

Cada uno, si llega, va en su propio spec.
