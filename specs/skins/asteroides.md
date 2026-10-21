# Skins de asteroides (ASTEROIDES)

- Date: 2026-10-21
- Estado: implementado (sin probar en navegador; lint OK, build pendiente de ejecutar por el coordinador)
- Veredicto: antes FALTA (todo en blanco fijo) -> despues OK

Reutiliza el patron de `specs/skins/caida.md`: `lib/games/skin-ids.ts`, `skins.ts` por juego, `setSkin`, `EngineProps.skin?`, `SKIN_GAMES`, selector en `GamePlayer`, clave `av_skin_asteroides`.

## Paletas (contraste frente al fondo)

| Rol            | clasico (fondo #000)       | neon (fondo #05050a)           | retro (fondo #000)                     |
| -------------- | -------------------------- | ------------------------------ | -------------------------------------- |
| Nave           | #ffffff (21.00)            | #00f5ff (15.02)                | #f8f040 (17.53)                        |
| Asteroides     | #ffffff (21.00)            | #c04dff (5.57)                 | #f8f8f8 (19.77)                        |
| Balas          | #ffffff (21.00)            | #f5ff00 (18.58)                | #f8f040 (17.53)                        |
| Power-up 3x    | #00ffff (16.75)            | #00ff88 (15.17)                | #58e8e8 (14.12)                        |
| Llama          | rgba(255,130,0,.85) (~7.5) | #ff9500 (9.25)                 | #f8a030 (10.06)                        |
| Particulas     | blanco con desvanecido     | #ff006e (5.30) con desvanecido | #f8f8f8 opaco, sin desvanecido         |
| Trazo / brillo | 1.5 px, round, sin brillo  | 2 px, round, shadowBlur 12     | 2 px, miter (bordes duros), sin brillo |

- `clasico` conserva exactamente los valores originales.
- No hay rejilla ni decoracion. Nave (triangulo con muesca), asteroides (poligono irregular grande), balas (punto), power-up (rombo con "3x") se distinguen por forma y tamano, no solo por color.

## Archivos

Creado: `lib/games/asteroids/skins.ts`. Editados: `lib/games/asteroids/entities.ts` (`draw(ctx, skin)`), `lib/games/asteroids/engine.ts` (3er parametro y `setSkin`, que redibuja tambien en pausa), `components/asteroids-canvas.tsx`, `components/game-canvases.tsx` (`asteroides` en `SKIN_GAMES`). `GamePlayer` ya soportaba el selector generico.

## Verificacion

- [ ] `/juegos/asteroides/jugar` muestra el selector con CLÁSICO activo por defecto.
- [ ] CLÁSICO se ve igual que antes (todo blanco, power-up cian, llama naranja).
- [ ] NEÓN muestra brillo y la paleta indicada; RETRO, bordes duros, sin brillo y particulas opacas.
- [ ] Cambiar de skin en partida no reinicia, ni altera puntos, vidas ni nivel; los asteroides siguen su trayectoria.
- [ ] Cambiar en pausa redibuja inmediatamente.
- [ ] Recargar conserva la skin (`localStorage.av_skin_asteroides`).
- [ ] Con 3x activo, la llama del propulsor y las explosiones se ven en las tres skins.
