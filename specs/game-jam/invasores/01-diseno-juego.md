# SPEC invasores-01 — Diseño del juego: INVASORES (Space Invaders)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-10-21
> **Objective:** Definir las reglas, controles, puntuación, estética neón y la actualización de la fila `invasores` de `games` para convertir el juego simulado en un Space Invaders por oleadas con vidas, dibujado solo con primitivas de canvas.

---

## Por qué existe este spec

`invasores` ya está en el catálogo (SHOOTER, verde, `sort_order` 5, portada `cover-invaders`) pero produce una puntuación simulada en `.game-arena`. Este spec define el diseño del juego real; `02-motor-y-canvas.md` define el motor, el canvas y el plan de implementación.

Diferencias respecto a los juegos anteriores:

- A diferencia de `asteroides`, el movimiento es discreto (la formación avanza a saltos) y hay escudos destructibles.
- A diferencia de Snake, no hay assets: no se usa `public/games/`. Todo (alienígenas, cañón, escudos, OVNI, disparos, partículas) se dibuja con `fillRect`, `arc` y `ellipse`. Los alienígenas son bitmaps de texto pintados píxel a píxel con `fillRect`.
- Es el primer juego del vault con `lives` **y** `level` en `onStats`, igual que `asteroides`, pero con vidas visibles en el HUD de `GamePlayer`.

Estado previo que ya existe y **no se rehace**:

- La fila `invasores` en `games` y la portada `cover-invaders`.
- Marco CRT, HUD, pausa, modal de fin de partida de `GamePlayer` y el registro `GAME_ENGINES`.
- `POST /api/puntuaciones`, `/salon` y `lib/data/scores.ts`.

El nombre «Space Invaders» es marca registrada: el título del catálogo sigue siendo INVASORES, y los diseños de alienígenas son propios.

## Scope

**In:**

- Concepto: defender la base de oleadas de invasores que descienden en formación. Cada oleada limpiada genera otra más rápida y baja. La partida termina al perder las 3 vidas o si los invasores llegan a la línea de invasión.
- Formación: 5 filas × 11 columnas = 55 invasores de tres tipos:
  - Fila 0: **calamar** (tipo A), 30 puntos.
  - Filas 1–2: **cangrejo** (tipo B), 20 puntos.
  - Filas 3–4: **dron** (tipo C), 10 puntos.
- Movimiento de la formación: a saltos de 12 px en horizontal; al tocar un borde baja 20 px y cambia de sentido. El intervalo entre saltos se acorta al morir invasores (cada baja acelera la formación) y con el nivel. Cada salto alterna el frame de animación (2 frames por tipo).
- Cañón del jugador: se mueve en horizontal a 300 px/s, un solo disparo en pantalla a la vez (520 px/s hacia arriba).
- Fuego enemigo: hasta 3 disparos enemigos simultáneos, lanzados por el invasor más bajo de una columna elegida al azar. Cadencia mayor con el nivel.
- OVNI: cruza la parte superior cada 15–25 s (sentido aleatorio) y concede 50, 100, 150 o 300 puntos (aleatorio al aparecer). Solo hay un OVNI a la vez; no aparece con menos de 8 invasores vivos.
- Escudos: 4 búnkeres de 11 × 8 celdas de 4 px que se erosionan con los disparos (del jugador y enemigos) y al ser tocados por invasores. Se restauran al empezar cada oleada.
- Vidas: 3. Un disparo enemigo que alcanza el cañón quita 1 vida, destruye los disparos en curso, y el cañón reaparece en el centro tras 1,2 s con 1,5 s de invulnerabilidad parpadeante.
- Niveles: al eliminar los 55 invasores, tras 1,0 s empieza la oleada siguiente (`level + 1`). Las vidas y la puntuación se conservan. La formación aparece más baja y más rápida (ver `02`).
- Fin de partida: se llama a `onGameOver(score)` una sola vez cuando las vidas llegan a 0 o cuando algún invasor vivo alcanza la línea de invasión (y = 540).
- Estética neón en canvas 2D: fondo casi negro con estrellas fijas tenues; invasores con colores por tipo (calamar magenta, cangrejo cyan, dron verde), cañón y disparos verdes con `shadowBlur`, disparos enemigos amarillos, OVNI magenta, escudos verdes. Línea de suelo verde tenue a y = 574.
- Categoría y color: `SHOOTER` / `green` (sin cambios).
- Controles: `←` `→` (o `A` `D`) para mover, `Space` para disparar (mantener pulsado dispara en cuanto el disparo anterior desaparece). Solo teclado.
- HUD: `onStats({ score, lives, level })`. El canvas no dibuja puntuación, vidas, nivel ni textos de estado.
- Migración de catálogo que actualiza `long` de `invasores` (y no el título ni el resto de campos).

**Out of scope (para futuros specs):**

- Sonido y música.
- Controles táctiles, ratón o gamepad.
- Vida extra por puntos, power-ups, jefes, modo dos jugadores.
- Sprites o spritesheets externos, cualquier asset en `public/`.
- HUD, «GAME OVER» o «PAUSA» dibujados en el canvas, y reinicio por tecla.
- Récord local en `localStorage`.
- Derivar `best` y `plays` de `scores`.
- Portar los otros juegos simulados.
- Tests automatizados.

## Modelo de datos

No se añaden tablas ni columnas. Fila final de `games` para `invasores` (se **actualiza**, no se inserta, porque ya existe):

| Campo        | Valor                                                                                                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`         | `invasores`                                                                                                                                                                                                                                                  |
| `title`      | `INVASORES`                                                                                                                                                                                                                                                  |
| `short`      | `Defiende el planeta de filas alienígenas.`                                                                                                                                                                                                                  |
| `long`       | `Oleadas de invasores descienden en formación, cada una más rápida que la anterior. Mueve tu cañón, dispara y refúgiate tras los escudos que se desmoronan. Tienes 3 vidas: si te quedas sin ellas, o si los invasores llegan al suelo, la partida termina.` |
| `cat`        | `SHOOTER`                                                                                                                                                                                                                                                    |
| `cover`      | `cover-invaders`                                                                                                                                                                                                                                             |
| `color`      | `green`                                                                                                                                                                                                                                                      |
| `sort_order` | `5`                                                                                                                                                                                                                                                          |

`best`, `plays` y `title`/`short`/`cat`/`cover`/`color`/`sort_order` no cambian.

Reglas de puntuación (enteros; el máximo práctico queda muy por debajo de 9 999 999, y el motor aplica `Math.min(score, 9_999_999)`):

| Evento                           | Puntos                     |
| -------------------------------- | -------------------------- |
| Calamar (fila 0)                 | 30                         |
| Cangrejo (filas 1–2)             | 20                         |
| Dron (filas 3–4)                 | 10                         |
| OVNI                             | 50, 100, 150 o 300         |
| Limpiar una oleada (bonus)       | 100 × nivel que se termina |
| Perder una vida / romper escudos | 0                          |

Máximo por oleada sin OVNI: 11 × 30 + 22 × 20 + 22 × 10 = 990.

## Plan de implementación

Este archivo no se implementa solo: el plan paso a paso (migración, motor, canvas, registro, verificación) está en `02-motor-y-canvas.md`, pasos 1 a 8. El paso 1 de ese plan aplica la migración de este archivo.

## Criterios de aceptación

- [ ] `select id, title, short, "long", cat, cover, color, sort_order from games where id = 'invasores'` devuelve exactamente los valores de la tabla de «Modelo de datos».
- [ ] La migración no altera ninguna otra fila de `games` (`select count(*) from games` sigue en 8 y los demás `long` no cambian).
- [ ] En `/jugar` se ve una formación de 5 × 11 invasores con calamares arriba (fila 0), cangrejos en filas 1–2 y drones en filas 3–4, un cañón abajo y 4 escudos.
- [ ] Matar un calamar, un cangrejo y un dron suma exactamente 30, 20 y 10 en el HUD.
- [ ] Solo puede haber un disparo del jugador en pantalla a la vez.
- [ ] Un disparo enemigo que alcanza el cañón baja Vidas de 3 a 2 en el HUD; con 0 vidas aparece el modal «FIN DEL JUEGO».
- [ ] Si un invasor llega a y = 540 el modal «FIN DEL JUEGO» aparece aunque queden vidas.
- [ ] Limpiar la oleada sube Nivel de 01 a 02 y suma 100 puntos de bonus.
- [ ] Ningún texto (puntuación, vidas, «PAUSA», «GAME OVER») se dibuja en el canvas.
- [ ] No se descarga ningún PNG/JPG/SVG durante la partida (`browser_network_requests` sin imágenes de `/games/invasores/`).
- [ ] Los criterios restantes, de motor y flujo, están en `02-motor-y-canvas.md`.

## Decisiones

- **Sí:** conservar el slug `invasores` y el título INVASORES. «Space Invaders» es marca registrada y cambiar el slug rompería enlaces y puntuaciones.
- **Sí:** actualizar solo `long` por migración. El texto actual no menciona vidas, escudos ni oleadas crecientes.
- **Sí:** bitmaps de texto pintados con `fillRect` en vez de sprites. Cumple «sin assets externos» y permite colorear y animar por código.
- **Sí:** formación 5 × 11 con tres tipos y puntuación 30/20/10, el reparto clásico y fácil de explicar.
- **Sí:** 3 vidas con invulnerabilidad breve tras perder una, para que un disparo no quite dos vidas seguidas.
- **Sí:** la llegada de invasores a la línea de invasión termina la partida de golpe. Es la condición de derrota clásica y evita partidas eternas.
- **Sí:** bonus por oleada limpiada (100 × nivel) para que avanzar de nivel sea visible en la puntuación.
- **No:** vida extra por puntos ni power-ups. Mantienen las reglas simples; irán en otro spec si se quieren.
- **Sí:** un único disparo del jugador en pantalla; obliga a apuntar y da ritmo.
- **Sí:** `Space` con `preventDefault` solo dentro del motor y sin actuar sobre `<input>`/`<textarea>` (el modal tiene campo de iniciales).

## Riesgos

| Riesgo                                                           | Mitigación                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| La formación se vuelve injugablemente rápida con pocos invasores | Intervalo mínimo de salto 0,04 s (ver `02`) y factor de nivel con suelo de 0,5.                   |
| Partidas demasiado largas o cortas para el leaderboard           | Parámetros (`STEP_*`, cadencia enemiga) como constantes nombradas, fáciles de ajustar tras jugar. |
| El jugador queda sin escudos y el juego se vuelve injusto        | Los escudos se restauran al inicio de cada oleada.                                                |
| Puntuación 0 no se puede guardar (la API exige ≥ 1)              | Comportamiento de SPEC 06; la verificación juega hasta matar al menos un invasor.                 |
| Parecido excesivo con el juego original                          | Bitmaps propios y título propio; solo se replica la mecánica, que no es protegible.               |

## Qué **no** está en este spec

- El motor, el canvas, el registro y el plan de pasos: están en `02-motor-y-canvas.md`.
- Sonido y música.
- Controles táctiles, ratón o gamepad.
- Vida extra, power-ups, jefes y multijugador.
- Assets externos de cualquier tipo.
- `best`/`plays` derivados de `scores`.
- Tests automatizados en el repositorio.

Cada uno, si llega, va en su propio spec.
