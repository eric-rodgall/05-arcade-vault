# Skins de bloque-buster (ARKANOID)

- Date: 2026-10-21
- Estado: implementado (sin probar en navegador)
- Veredicto: antes FALTA (spritesheet fijo) -> despues OK

Reutiliza el patron descrito en `specs/skins/caida.md`.

## Paletas (contraste frente al fondo)

`clasico` dibuja el spritesheet original sobre #000 (sin cambios). `neon` y `retro` dibujan formas vectoriales (la hoja se sigue cargando; el bucle espera a que cargue en las tres).

| Rol | clasico | neon (fondo #05050a) | retro (fondo #000) |
| --- | --- | --- | --- |
| Bloque red | sprite | #ff006e (5.30) | #f85858 (6.53) |
| Bloque yellow | sprite | #f5ff00 (18.58) | #f8f040 (17.53) |
| Bloque cyan | sprite | #00f5ff (15.02) | #58e8e8 (14.12) |
| Bloque magenta | sprite | #c04dff (5.57) | #f060d0 (7.29) |
| Bloque hotpink | sprite | #ff9500 (9.25) | #f8a030 (10.06) |
| Bloque green | sprite | #00ff88 (15.17) | #58f058 (14.02) |
| Bloque gray | sprite | #c7d0e0 (13.10) | #f8f8f8 (19.77) |
| Paleta | sprite | #00f5ff (15.02) | #f8f8f8 (19.77) |
| Pelota | sprite | #ffffff (20.34), circular | #f8f040 (17.53), cuadrada |
| Extra | - | shadowBlur 14, explosion con desvanecido | borde negro 2 px, sin brillo, explosion en parpadeo duro |

- El campo `blocks` de `clasico` es solo de respaldo (no se usa; manda el sprite).
- Paleta (rectangulo ancho), pelota (16 px) y bloques (rejilla) se distinguen por forma y tamaño, no solo por color. No hay elementos de decoracion (sin rejilla).

## Archivos

Creados: `lib/games/arkanoid/skins.ts`. Editados: `lib/games/arkanoid/engine.ts`, `components/arkanoid-canvas.tsx` (y los compartidos ya listados en caida: `game-canvases.tsx` con `SKIN_GAMES`, `game-player.tsx`).

## Verificacion

- [ ] `/juegos/bloque-buster/jugar` muestra el selector con CLÁSICO activo por defecto.
- [ ] CLÁSICO conserva los sprites originales.
- [ ] NEÓN y RETRO se ven con la paleta indicada, legibles sobre fondo oscuro.
- [ ] Cambiar de skin durante la partida no reinicia, ni altera puntos, vidas ni nivel; la pelota sigue su trayectoria.
- [ ] Cambiar en pausa redibuja inmediatamente.
- [ ] Recargar conserva la skin (`localStorage.av_skin_bloque-buster`).
- [ ] Las explosiones de bloque se ven en las tres skins.
