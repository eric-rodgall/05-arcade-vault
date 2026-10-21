# Skins de SERPENTINA (SNAKE)

- **Date:** 2026-10-21
- **Estado:** Implementado (lint OK; `npm run build` no ejecutado en esta pasada; sin prueba en navegador)
- **Veredicto:** antes `FALTA` -> después `OK`

## Comportamiento respecto al atlas de frutas

- `clasico`: conserva el atlas `public/games/serpentina/fruits.png` (22 sprites) y el círculo magenta como respaldo mientras carga. Aspecto idéntico al anterior.
- `neon` y `retro`: **no usan el atlas**; la fruta es siempre vectorial (círculo con brillo en neón, rombo de bordes duros en retro). Así no hay sprites de colores ajenos a la paleta. La fruta se distingue de la serpiente por forma (círculo/rombo frente a cuadrados) y por color.
- Cambiar de skin en partida no reinicia nada: el atlas sigue cargado y se vuelve a usar al regresar a `clasico`.

## Paletas y contraste (WCAG, contra el fondo del canvas)

| Rol | clasico | neon | retro |
| --- | --- | --- | --- |
| Fondo | `#0a0a14` | `#05050a` | `#000000` |
| Cuerpo | `#39ff14` (14.52) | `#00f5ff` (15.02) | `#58f058` (14.02) |
| Cabeza | `#b6ffa0` (16.69) | `#ffffff` (20.34) | `#f8f8f8` (19.77) |
| Ojos (sobre la cabeza) | `#0a0a14` (16.69) | `#05050a` (20.34) | `#000000` (19.77) |
| Fruta vectorial | `#ff2bd6` (6.16) | `#ff006e` (5.30) | `#f85858` (6.53) |
| Rejilla | `rgba(255,255,255,0.05)` (decoración, valor original sin cambios) | `#4a5cb0` (3.34) | `#606060` (3.34) |
| Brillo (shadowBlur) serpiente / fruta | 8 / 10 | 14 / 16 | 0 / 0 |
| Borde de segmento | no | no | `#000` 2 px |

Cuerpo/cabeza se distinguen también por tono y por los ojos; fruta frente a cuerpo, por forma.

## Archivos

- Creado: `lib/games/snake/skins.ts`
- Editados: `lib/games/snake/engine.ts` (tercer parámetro `skin`, `setSkin`, dibujo con `SkinDef`; sin cambios de lógica), `components/snake-canvas.tsx` (prop `skin`, efecto `setSkin`), `components/game-canvases.tsx` (`serpentina` en `SKIN_GAMES`).
- Reutilizados sin cambios: `lib/games/skin-ids.ts`, selector y persistencia `av_skin_serpentina` de `components/game-player.tsx`.

## Criterios de verificación

- [ ] En `/juegos/serpentina/jugar` aparece el selector SKIN con CLÁSICO / NEÓN / RETRO y CLÁSICO activo por defecto.
- [ ] CLÁSICO se ve igual que antes (frutas del atlas).
- [ ] NEÓN: fondo casi negro, serpiente cian con brillo, fruta rosa circular, sin sprites del atlas.
- [ ] RETRO: fondo negro, serpiente verde con borde negro, fruta roja en rombo, sin brillos.
- [ ] Cambiar de skin durante la partida no reinicia la partida ni cambia la puntuación; tampoco la reanuda si estaba en pausa.
- [ ] Recargar la página conserva el skin (`localStorage` `av_skin_serpentina`).
- [ ] Con `localStorage` bloqueado el juego funciona con `clasico`.
- [ ] Los otros juegos con skins no se ven afectados.
