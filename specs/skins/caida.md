# Skins de caida (TETRIS)

- Date: 2026-10-21
- Estado: implementado (sin probar en navegador)
- Veredicto: antes FALTA (paleta fija) -> despues OK

## Patron fijado (reutilizado en bloque-buster)

- `lib/games/skin-ids.ts`: `SKIN_IDS`, `SkinId`, `SKIN_NAMES`, `DEFAULT_SKIN`, `isSkinId` (compartido porque ya lo usan dos juegos).
- `lib/games/<juego>/skins.ts`: `SkinDef` propio, `SKINS`, `DEFAULT_SKIN`.
- Motor: `create...Game(canvas, callbacks, skin = "clasico")` y `setSkin(id)` (redibuja sin tocar el estado).
- `EngineProps.skin?` opcional + `SKIN_GAMES` en `components/game-canvases.tsx`; selector (clases `.chip`) en `GamePlayer` solo si el juego esta en `SKIN_GAMES`.
- Persistencia `localStorage` `av_skin_<slug>`, leida en un efecto, con try/catch y respaldo `clasico`.

## Paletas (contraste frente al fondo del canvas)

| Rol | clasico (fondo #000) | neon (fondo #05050a) | retro (fondo #000) |
| --- | --- | --- | --- |
| I | #4dd0e1 (11.43) | #00f5ff (15.02) | #58e8e8 (14.12) |
| O | #ffd54f (14.88) | #f5ff00 (18.58) | #f8f040 (17.53) |
| T | #ba68c8 (5.90) | #c04dff (5.57) | #f060d0 (7.29) |
| S | #81c784 (10.44) | #00ff88 (15.17) | #58f058 (14.02) |
| Z | #e57373 (7.03) | #ff2d7a (5.72) | #f8f040 (17.53) |
| J | #90caf9 (12.00) | #4d7dff (5.51) | #58e8e8 (14.12) |
| L | #ffb74d (12.13) | #ff9500 (9.25) | #58f058 (14.02) |
| N | #9e9e9e (7.84) | #c7d0e0 (13.10) | #f8f8f8 (19.77) |
| Rejilla | rgba(255,255,255,0.07) (1.12) | #4d5f9e (3.34) | #3f7a3f (4.07) |
| Separador | rgba(255,255,255,0.25) | #8a8fb5 (6.47) | #58f058 (14.02) |
| Extra | bisel claro | shadowBlur 12, fantasma en contorno | borde negro 2 px, sin brillo, fantasma en contorno |

- La rejilla de `clasico` (1.12:1) esta por debajo de 3:1: se conserva tal cual por la regla de no alterar el aspecto actual.
- Las piezas se distinguen por forma (tetrominos). En retro se repiten 4 colores + blanco (paleta limitada); la forma las diferencia.

## Archivos

Creados: `lib/games/skin-ids.ts`, `lib/games/tetris/skins.ts`. Editados: `lib/games/tetris/engine.ts`, `components/tetris-canvas.tsx`, `components/game-canvases.tsx`, `components/game-player.tsx`, `app/globals.css` (`.skin-picker`).
Nota: `COLORS` de `pieces.ts` ya no lo usa el motor (queda como export sin uso).

## Verificacion

- [ ] En `/juegos/caida/jugar` aparece el selector CLÁSICO / NEÓN / RETRO con CLÁSICO activo la primera vez.
- [ ] CLÁSICO se ve igual que antes.
- [ ] NEÓN: bloques con brillo; RETRO: sin brillos ni degradados, bordes duros.
- [ ] Cambiar de skin en plena partida (y en pausa) no reinicia ni cambia puntuacion/nivel.
- [ ] Recargar conserva la skin (`localStorage.av_skin_caida`).
- [ ] Con `localStorage` bloqueado o valor invalido, usa clasico sin errores.
- [ ] Pieza fantasma visible en las tres skins.
- [ ] En otros juegos (p. ej. `serpentina`) no aparece selector.
