---
name: add-game
description: Agrega un juego jugable a Arcade Vault con su leaderboard en Supabase. Portar un juego de references/started-games/ (o crear uno nuevo) a un motor TypeScript puro + canvas React, registrarlo en la tabla games, conectarlo al HUD/pausa/modal de GamePlayer y verificar que sus puntuaciones llegan a /salon.
disable-model-invocation: true
argument-hint: "<id-del-juego> [ruta-referencia, ej. references/started-games/03-tetris]"
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git diff:*), Bash(npm run build:*), Bash(npm run lint:*)
---

# /add-game — Agregar un juego + leaderboard

Flujo completo en un solo comando: descubrimiento → **genera el spec** (método de `/spec`) → aprobación → implementación → verificación. Codifica el patrón de `specs/05-juego-rocas-asteroids.md` (motor + canvas + `GamePlayer`) y `specs/06-leaderboard-y-tabla-de-juegos.md` (tablas `games`/`scores` y guardado). Plantillas de código en [reference.md](reference.md).

## Session context

Referencias disponibles:
!`ls references/started-games 2>/dev/null || echo "sin references/started-games"`

Juegos con motor real:
!`ls lib/games 2>/dev/null`

Estado git:
!`git status --short`

Argumentos recibidos: `$ARGUMENTS`

---

## Principios (no negociables)

- El leaderboard **no necesita código nuevo**: `POST /api/puntuaciones`, `/salon` y `lib/data/scores.ts` funcionan con cualquier `games.id`. Solo hay que asegurar la fila en `games` y que `GamePlayer` entregue la puntuación final.
- Motor **puro** (sin React) en `lib/games/<id>/`; canvas cliente en `components/<id>-canvas.tsx`. Nada de `iframe`, nada de copiar `game.js` a `public/`, nada de pegar JS con globales en un componente.
- Portar reglas y constantes del original **sin rebalancear**. Cambios de diseño = otro spec.
- `references/` es solo lectura. UI copy en español. `SUPABASE_SECRET_KEY` solo vive en `lib/supabase/admin.ts`.
- No sembrar puntuaciones falsas; las de prueba se borran al terminar.
- Este Next.js tiene cambios incompatibles: antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components y la de Route Handlers si se toca la API.

## Paso 0 — Contexto y rama

1. Leer `CLAUDE.md` (sección «State of the codebase») y `components/game-player.tsx` para ver el estado actual (si ya existe el registro de motores o sigue `isAsteroides`).
2. Si el árbol git tiene cambios sin commitear, avisar y preguntar antes de seguir.
3. Crear/cambiar a la rama `game-<id>` (confirmar con el usuario).

## Paso 1 — Descubrimiento

Resolver `<id>` y la ruta de referencia desde `$ARGUMENTS`; preguntar con `AskUserQuestion` solo lo que falte:

- **Origen**: ¿hay referencia en `references/started-games/NN-*`? Si sí, leer su `CLAUDE.md`, `README.md` y `game.js` completo (y `levels.js`, `assets/` si existen). Si no, pedir reglas, controles y condición de derrota.
- **Catálogo**: ¿el juego ya está sembrado en `games` (reemplaza la simulación) o es nuevo (hay que insertar fila)? Consultar con `mcp__supabase__execute_sql`: `select id, title, cat, sort_order from games order by sort_order`. Sugerencias conocidas: `caida` ↔ `03-tetris`, `bloque-buster` ↔ `04-arkanoid`.
- **Contrato con el HUD**: ¿tiene vidas? ¿niveles? ¿qué cuenta como puntuación? (el HUD siempre muestra puntuación; vidas y nivel son opcionales).
- **Controles**: solo teclado por defecto; anotar teclas que hacen scroll (flechas, Espacio).
- **Extras del original** que quedan fuera salvo petición: sonido, HUD/overlays dibujados, pantalla de título, high score local (`localStorage` propio), reinicio por tecla.
- **Forma del canvas**: tamaño lógico (ej. 800×600 es 4:3; Tetris 300×600 es vertical → decidir cómo encaja en `.crt-screen`).
- **Rango de puntuación**: `scores.score` admite 1..9 999 999. Si el juego puede superarlo, avisar y decidir (escalar o spec aparte).

## Paso 2 — Generar el spec (automático)

Este skill **genera el spec por sí mismo**; el usuario no ejecuta `/spec`. (`/spec` tiene `disable-model-invocation`, así que no se invoca con la herramienta Skill: se sigue su método en línea.)

1. Leer `.agents/skills/spec/SKILL.md` y `.agents/skills/spec/template.md` y aplicar sus Fases 1–4 con estas adaptaciones:
   - **Fase 1**: ya está hecha en los Pasos 0–1. Leer además `specs/05-*.md` y `specs/06-*.md` como modelo de estructura, idioma (español) y vocabulario de estados.
   - **Fase 2**: no repetir lo ya respondido en el Paso 1. Hacer solo las preguntas que falten (bloques de 3–5 con `AskUserQuestion`, recomendación primero). Si todo está resuelto, pasar a la Fase 3 sin preguntar.
   - **Fase 3**: con la información completa, escribir el spec entero de una vez (sin confirmar sección por sección). Contenido mínimo: Objetivo en una frase (`Portar <juego> a TypeScript y jugarlo en /juegos/<id>/jugar con su leaderboard`), Scope In/Out (marcar fuera: sonido, táctil, atajos extra, re-skin, cambios de balance), contrato del motor (`callbacks` + control), plan de implementación siguiendo los Pasos 3–8 de este skill, criterios de aceptación verificables con Playwright/Supabase (copiar la lista del Paso 9, adaptada al juego), Decisiones (incluidas las respuestas del Paso 1 y la forma del canvas) y Riesgos.
   - **Fase 4**: numerar con `ls specs/` (siguiente número libre), slug `<NN>-juego-<id>.md`, fecha leída de `date +%F`, estado `Draft`. Crear `specs/.spec-config.yml` solo si no existe. Verificar que las dependencias (`SPEC 01`, `05`, `06`, …) existan.
2. Las reglas duras de `/spec` siguen vigentes: no escribir código en este paso y no asumir decisiones sin confirmar.
3. **Aprobación**: mostrar la ruta del spec, resumirlo en 5–8 líneas y preguntar con `AskUserQuestion`: «Aprobar y continuar con la implementación» (recomendado) / «Quiero revisarlo primero» / «Cambios al spec». Con la primera, cambiar el estado a `Approved` en el archivo; con la segunda, detenerse y decir que reanuden con `/add-game <id>` (si ya existe `specs/*-juego-<id>.md`, usarlo en vez de generar otro); con la tercera, aplicar cambios y volver a preguntar.
4. Si ya existe un spec para este juego, no crear otro: leerlo y, si está `Approved`, pasar directamente a los Pasos 3–9.
5. Solo se omite este paso si el usuario lo pide explícitamente («sin spec»); en ese caso registrar la decisión en el resumen final.

A partir de aquí, **el spec aprobado manda**: los Pasos 3–9 se ejecutan en el orden de su «Plan de implementación», tildando sus criterios de aceptación al verificar y pasando su estado a `Implemented` al terminar (Paso 8). Ejecutar paso a paso, mostrando un resumen de lo hecho antes de avanzar al siguiente grupo (como hace `/spec-impl`), sin hacer commits.

## Paso 3 — Fila en `games` (solo si el juego es nuevo)

1. `mcp__supabase__list_migrations` para obtener la versión; `mcp__supabase__list_tables` para confirmar el esquema.
2. `mcp__supabase__apply_migration` con un `insert into public.games (...)` (plantilla en reference.md). `id` = slug de la URL, `cover = 'cover-<id>'`, `cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/green/yellow, `sort_order = max + 1`.
3. Guardar copia exacta en `supabase/migrations/<versión>_<id>.sql`.
4. Añadir `.cover-<id>` (y pseudo-elementos si hace falta) en `app/globals.css`, siguiendo `.cover-asteroides`.
5. Nunca crear una tabla `health_check`. No tocar RLS ni políticas.
6. Si el juego ya existe y su `long` promete algo que el juego no tiene, corregirlo con `update` en una migración.

## Paso 4 — Motor

Crear `lib/games/<id>/engine.ts` (y `entities.ts` si hay varias clases) exportando `create<Nombre>Game(canvas, callbacks)`:

- Contrato: `callbacks = { onStats({ score, lives?, level? }), onGameOver(finalScore) }` → control `{ pause, resume, stop, destroy }`.
- Estado interno, `update(dt)`, `draw()`, loop con `requestAnimationFrame`; `dt` en segundos limitado a 0.05.
- `onStats` solo cuando cambia algo (no a 60 Hz); `onGameOver` una sola vez.
- Teclado en `window`: ignorar `<input>`/`<textarea>`; `preventDefault` solo en las teclas del juego; limpiar listeners en `stop()`.
- `pause()` congela simulación y dibujo de forma que dos capturas consecutivas sean idénticas; `destroy()` = `stop()` + soltar referencias.
- Sin HUD, sin «GAME OVER», sin reinicio por tecla: lo hacen `GamePlayer` y su modal.
- TS estricto, sin `any`. Modelo vivo: `lib/games/asteroids/engine.ts`.

Verificar: `npm run build` y `npm run lint`.

## Paso 5 — Canvas React

Crear `components/<id>-canvas.tsx` (`"use client"`) copiando la estructura de `components/asteroids-canvas.tsx`: refs para `paused`/callbacks, `useEffect` que crea el motor y llama `destroy()` en el cleanup, segundo efecto para `pause`/`resume`. Añadir clase CSS del canvas en `app/globals.css` (o reutilizar una genérica si ya existe) con `position:absolute; inset:0; width/height:100%; background:#000`. Para canvas no 4:3 usar `object-fit: contain` y fondo negro.

## Paso 6 — Integración en `GamePlayer`

`components/game-player.tsx` es compartido; **no duplicarlo**.

- Si todavía usa `isAsteroides`, refactorizar una sola vez a un registro `id → componente canvas` (plantilla en reference.md) y migrar `asteroides` a él sin cambiar su comportamiento.
- Añadir `<id>` al registro. Con motor real: sin `setInterval` simulado, `key={runId}`, `paused={paused || over}`, y `score`/`lives`/`level` desde `onStats`. Juegos sin vidas o sin niveles: mostrar «—» en vez de inventar valores.
- Los juegos sin entrada en el registro conservan el flujo simulado. Verificar que `caida` (u otro simulado) sigue igual.

## Paso 7 — Leaderboard (solo verificar)

No escribir código nuevo aquí. Comprobar (Paso 9) que: existe la fila en `games`, guardar desde el modal crea una fila en `scores` con `game_id = '<id>'`, aparece en la pestaña del juego en `/salon`, y «TU MEJOR MARCA» sale para el nombre de sesión. Si el juego es nuevo, confirmar que `/biblioteca` y `/` muestran la tarjeta.

## Paso 8 — Documentación

Actualizar «State of the codebase» en `CLAUDE.md`: juego ahora real, archivos nuevos, entrada en el registro, cuántos juegos siguen simulados, nuevos `cover-*`. Si hubo spec, marcarlo `Implemented` y tildar criterios.

## Paso 9 — Verificación

1. `npm run build` y `npm run lint` sin errores.
2. Con `npm run dev`, vía Playwright MCP en `/juegos/<id>/jugar`: canvas con el tamaño lógico correcto y sin `.game-arena`; HUD inicial correcto; controles responden y la página no hace scroll; PAUSA congela (dos capturas iguales) y REANUDAR continúa; FIN abre el modal con la puntuación del HUD; escribir un espacio en las iniciales no dispara nada; JUGAR DE NUEVO reinicia a estado limpio; derrota natural abre el modal.
3. Ciclo de vida: ir a `/biblioteca` y volver → un solo `canvas` y una sola acción por pulsación (React Strict Mode no duplica loops).
4. Guardado: guardar con nombre `TEST1`; `mcp__supabase__execute_sql` confirma `select * from scores where game_id='<id>'`; `localStorage["av_scores"]` es `null`; `/salon` pestaña del juego muestra la fila.
5. Regresión: `/`, `/biblioteca`, `/juegos/<id>`, `/salon`, otro juego simulado y `asteroides`; `browser_console_messages` sin errores.
6. `mcp__supabase__get_advisors` (security) sin errores nuevos.
7. Limpieza: `delete from scores where player_name like 'TEST%'` (y las filas de prueba del juego); confirmar conteo.

## Cierre

Resumir en pocas líneas: archivos creados/modificados, migración aplicada, resultado de cada verificación y lo que quedó pendiente. **No hacer commit ni push** salvo que el usuario lo pida.
