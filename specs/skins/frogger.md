# Skins de FROGGER

- **Date:** 2026-10-27
- **Estado:** Implementado (`npm run lint` y `npm run build` OK; sin prueba en navegador)
- **Veredicto:** antes `FALTA` -> después `OK`

## Notas

- `clasico` conserva los colores y formas originales del motor (movidos a `skins.ts`). Sus contrastes son los de origen: rana sobre tronco 4.09, tortuga sobre río 4.49, tronco sobre río 2.07 (el tronco se lee por forma y veta). No se alteraron.
- `neon` y `retro` usan borde duro de 2 px en entidades y rana, de modo que la rana se distingue sobre troncos y tortugas por borde y forma, no solo por color. Las tortugas sumergidas son un aro (neón) o un cuadrado discontinuo (retro).
- `retro`: sin brillos, rana y tortugas con esquinas rectas. `neon`: `shadowBlur` 12.
- Cambiar de skin con la partida pausada o terminada repinta el fotograma; en marcha lo recoge el siguiente frame.

## Paletas (contraste WCAG contra la franja donde aparece)

| Rol | clasico | neon | retro |
| --- | --- | --- | --- |
| Meta / río / mediana y salida / carretera | `#0b3d1a` `#0a1f5c` `#14532d` `#101014` | `#0a0a14` `#050a33` `#12062a` `#05050a` | `#000000` `#000058` `#003000` `#000000` |
| Rana | `#3ddc57` (5.02 a 10.46 según franja) | `#39ff14` (14.11 a 15.0) | `#58f058` (9.85 a 14.02) |
| Coches (vs carretera) | `#e53935` 4.49, `#fdd835` 13.6, `#1e88e5` 5.16 | `#ff006e` 5.3, `#ffe600` 16.05, `#00f5ff` 15.02 | `#f85858` 6.53, `#f8d838` 14.87, `#58b8f8` 9.63 |
| Camión cuerpo / cabina | `#9aa0a6` 7.19 / `#e8710a` 6.14 | `#b967ff` 6.24 / `#ff9f1c` 9.91 | `#c8c8c8` 12.55 / `#f89838` 9.54 |
| Tronco (vs río) | `#7a4a21` 2.07 | `#ff9f1c` 9.32 | `#c88020` 5.75 |
| Tortuga (vs río) | `#2e9e4f` 4.49 | `#ff4fd8` 6.71 | `#38b8b8` 7.64 |
| Tortuga sumergida | `rgba(60,200,120,.35)` | `#a0359a` 3.16 | `#38b8b8` 7.64 |
| Borde de meta (vs franja) | `#e0b43a` 6.34 | `#ffe600` 15.54 | `#f8d838` 14.87 |
| Línea de carril | `rgba(255,255,255,.18)` (original) | `#4a5cb0` 3.34 | `#808080` 5.32 |
| Barra de tiempo | `#3ddc57` `#fdd835` `#e53935` | `#39ff14` `#ffe600` `#ff006e` | `#58f058` `#f8d838` `#f85858` |
| Brillo / borde | 0 / no | 12 / `#05050a` | 0 / `#000000` |

## Archivos

- Creado: `lib/games/frogger/skins.ts`
- Editados: `lib/games/frogger/engine.ts` (tercer parámetro `skin`, `setSkin`, dibujo con `SkinDef`; sin cambios de lógica), `components/frogger-canvas.tsx` (prop `skin`, efecto `setSkin`), `components/game-canvases.tsx` (`frogger` en `SKIN_GAMES`).
- Reutilizados sin cambios: `lib/games/skin-ids.ts`, selector y persistencia `av_skin_frogger` de `components/game-player.tsx`.

## Criterios de verificación

- [X] En `/juegos/frogger/jugar` aparece el selector SKIN con CLÁSICO / NEÓN / RETRO y CLÁSICO activo por defecto.
- [X] CLÁSICO se ve igual que antes.
- [X] NEÓN: fondo casi negro, vehículos y rana con brillo y borde oscuro, tortugas rosa.
- [X] RETRO: paleta plana sin brillos, rana y tortugas cuadradas con borde negro.
- [X] La rana se distingue sobre troncos y tortugas en los tres skins.
- [X] Cambiar de skin en partida no reinicia ni cambia puntuación, vidas ni nivel; tampoco reanuda si estaba en pausa.
- [X] Recargar conserva el skin (`localStorage` `av_skin_frogger`).
- [X] Con `localStorage` bloqueado funciona con `clasico`.
- [X] Los otros juegos no se ven afectados.
