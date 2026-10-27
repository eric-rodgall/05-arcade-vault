# Controles web y móvil: frogger

Date: 2026-10-27
Estado: implementado (GAME_ENGINES + SKIN_GAMES), con skins.
Veredicto: antes OK, después OK (sin cambios de código necesarios).
No probado en navegador (revisión estática + lint + build).

| Check | Estado | Ref |
|---|---|---|
| `setInput` devuelto y comparte lógica con teclado (`press`) | ✔ | lib/games/frogger/engine.ts:523-556 |
| `true` ignorado si pausado/terminado/detenido; `false` aceptado (no-op, acción por pulsación) | ✔ | engine.ts:525, 554-556 |
| Una acción por pulsación (solo `pressed === true`) | ✔ | engine.ts:555 |
| Códigos de `GameInputCode` (flechas); sin React ni DOM en `setInput` | ✔ | engine.ts:56-61 |
| Teclado ignora input/textarea, `preventDefault` solo en flechas, ignora `e.repeat` | ✔ | engine.ts:529-534 |
| Listener retirado en `stop()`/`destroy()` | ✔ | engine.ts:561-571 |
| Canvas rellena `inputRef`, lo vacía al desmontar, `destroy()` en limpieza | ✔ | components/frogger-canvas.tsx:44-58 |
| Skin no rompe `inputRef` ni reinicia la partida (`setSkin` aparte) | ✔ | frogger-canvas.tsx:60-62 |
| `EngineProps.inputRef` opcional; registro en `GAME_ENGINES` | ✔ | components/game-canvases.tsx:17-30 |
| `touch-action: none` en el canvas | ✔ | app/globals.css:1350 |
| `TOUCH_LAYOUTS.frogger`: ← → ↑ ↓, sin A/B, sin `repeat` | ✔ | lib/games/touch-layouts.ts:46-49 |
| Pointer events, captura, multitoque, cancel/lostcapture sueltan, `type="button"`, aria-label, contextmenu | ✔ | components/touch-controls.tsx:77-113 |
| Pausa/fin sueltan y deshabilitan | ✔ | touch-controls.tsx:95-98; game-player.tsx:201 |
| `.touch-controls` solo con `pointer: coarse`, user-select/callout/tap-highlight | ✔ | globals.css:1351-1361 |
| Botones ≥ 56 px, sin desborde a 375 px | no verificable (sin navegador) | globals.css (SPEC 11) |

## Cambios hechos
Ninguno.

## Pendientes
- Hueco no bloqueante: el motor guarda solo una `pendingDir`; dos toques en el mismo frame se quedan con el último. Es regla del juego, no se toca.

## Verificación manual / Playwright
- [X] Contexto `hasTouch`/`isMobile` 375×667: aparece el gamepad con 4 flechas y sin A/B.
- [X] Tocar cada flecha mueve la rana una casilla; mantener no repite.
- [X] Pausar con un botón pulsado: la rana no se mueve y los botones quedan deshabilitados.
- [X] Abrir el modal de fin: botones deshabilitados.
- [X] `document.documentElement.scrollWidth <= 375`.
- [X] Cambiar de skin durante la partida no reinicia ni pierde el control táctil.
- [X] Escritorio: flechas mueven, no se ve el gamepad; escribir en un input no mueve la rana.
