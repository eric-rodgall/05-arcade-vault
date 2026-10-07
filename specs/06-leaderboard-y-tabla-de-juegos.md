# SPEC 06 — Tabla de juegos y leaderboard en Supabase

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02, SPEC 04, SPEC 05
> **Date:** 2026-10-07
> **Objective:** Crear en Supabase las tablas `games` y `scores` y conectarlas para que el catálogo se lea de la base de datos y las puntuaciones reales se guarden y se muestren en el Salón de la Fama.

---

## Por qué existe este spec

La SPEC 04 dejó la conexión a Supabase lista pero sin tablas ni consumidores. Hoy el catálogo vive en `lib/games.ts`, el Salón de la Fama inventa sus filas con `seededScores` y el botón «GUARDAR PUNTUACIÓN» solo escribe en `localStorage["av_scores"]`, que nadie lee. Este spec es el primer uso real de Supabase: un esquema mínimo (`games` y `scores`), un camino de escritura protegido y un ranking real en `/salon`.

No hay autenticación real, así que el jugador se identifica solo por el nombre que ya se pide en el modal de fin de partida. La auth llegará en otra spec y añadirá `user_id`.

Estado previo que ya existe y **no se rehace**:

- Los clientes `lib/supabase/client.ts` y `lib/supabase/server.ts` y el endpoint `/api/supabase/health` (SPEC 04). La tabla `health_check` sigue sin existir a propósito: **no crear ninguna tabla con ese nombre**.
- El juego real `asteroides` (id renombrado desde `rocas`) y el modal de fin de partida de `GamePlayer` (SPEC 05).
- La sesión simulada `av_user` en `localStorage`.
- El patrón de Route Handler con códigos de error en mayúsculas de `app/api/contacto/route.ts`.

## Scope

**In:**

- Migración en Supabase con dos tablas en `public`, ambas con RLS activada:
  - `games`: el catálogo, sembrado con los 8 juegos actuales de `lib/games.ts`.
  - `scores`: las puntuaciones, **vacía** al terminar el spec.
- Políticas RLS: `anon` y `authenticated` solo pueden hacer `SELECT` en ambas tablas. Ninguna política de `INSERT`, `UPDATE` ni `DELETE`.
- Copia de la migración versionada en `supabase/migrations/`.
- Variable de entorno de servidor `SUPABASE_SECRET_KEY` (sin prefijo `NEXT_PUBLIC_`), documentada vacía en `.env.template` y con el valor real solo en `.env.local`.
- `lib/supabase/admin.ts`: cliente de servidor con la secret key (`createClient` de `@supabase/supabase-js`, sin cookies), usado únicamente por el Route Handler de escritura.
- Capa de datos con tipos escritos a mano:
  - `lib/data/games.ts`: `getGames()` y `getGame(id)` leen de `games` con el cliente de servidor.
  - `lib/data/scores.ts`: `getTopScores(gameId, limit)` y `getPlayerBest(gameId, name)`.
- Route Handler `app/api/puntuaciones/route.ts`:
  - `POST` valida e inserta una puntuación con el cliente admin.
  - `GET ?juego=<id>&jugador=<nombre>` devuelve la mejor marca real del jugador en ese juego y su rango.
- Catálogo desde la base de datos: `/`, `/biblioteca`, `/juegos/[id]` y `/juegos/[id]/jugar` leen `games` en vez de `GAMES`. `Library` recibe los juegos por props.
- `GamePlayer` guarda la puntuación con `POST /api/puntuaciones` para **los 8 juegos** (los 7 simulados también), con estado de «guardando» y error en línea si falla. Deja de escribir `av_scores`.
- `/salon` muestra el ranking real (top 12 por juego), el podio con los 3 primeros, un estado vacío por juego sin datos y la fila «TU MEJOR MARCA» con la marca real del nombre de sesión (o sin fila si no existe o no hay sesión).
- Eliminar `GAMES` y `getGame` de `lib/games.ts`; el archivo conserva los tipos y `CATS`.
- Actualizar «State of the codebase» en `CLAUDE.md`.
- Verificar con el **MCP de Playwright**, `curl` y `execute_sql` del MCP de Supabase.

**Out of scope (para futuros specs):**

- Autenticación real, `user_id` en `scores`, `proxy.ts` y cookies de sesión.
- Derivar `best` y `plays` de `scores` (hoy son cifras de catálogo sembradas).
- Reemplazar la tabla «MEJORES PUNTUACIONES» de `/juegos/[id]`, que sigue con `seededScores`, ni los datos de «recientes» y «top players» del home (`lib/home.ts`).
- Mostrar la posición del jugador en el modal de fin de partida.
- Límite de frecuencia (rate limiting), captcha o detección de trampas más allá de la validación de rango.
- Paginación, filtros por fecha o ranking global entre juegos.
- Realtime de Supabase o actualización en vivo del ranking.
- Tipos generados con `generate_typescript_types`.
- Editar o borrar puntuaciones desde la app.
- Portar los otros siete juegos a motores reales.
- Tests automatizados (`@playwright/test` o unitarios): Playwright MCP sigue siendo solo verificación asistida.

## Modelo de datos

```sql
-- Migración: games_y_scores
create table public.games (
  id         text primary key,                 -- slug de la URL: "asteroides", "caida"...
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                    -- clase CSS: "cover-asteroides"
  color      text not null check (color in ('cyan','magenta','green','yellow')),
  best       integer not null default 0,       -- cifra de catálogo, no derivada
  plays      text not null default '0',        -- texto de catálogo: "12.4K"
  sort_order integer not null
);

create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games(id),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score       integer not null check (score between 1 and 9999999),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
-- Sin políticas de INSERT/UPDATE/DELETE: solo la secret key (server-only) escribe.
```

La siembra de `games` copia los 8 registros de `lib/games.ts` tal cual (`title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`), con `sort_order` de 1 a 8 en el orden actual del arreglo.

```ts
// lib/games.ts conserva solo los tipos y las categorías
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Filter = "TODOS" | Category;
export type AccentColor = "cyan" | "magenta" | "green" | "yellow";
export interface Game {
  /* igual que hoy */
}
export const CATS: Filter[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

// lib/data/scores.ts
export interface ScoreRow {
  rank: number; // 1..n, por score descendente y created_at ascendente
  name: string;
  score: number;
  date: string; // "dd/mm/yyyy" (es-ES) a partir de created_at
}

// app/api/puntuaciones/route.ts
// POST body:    { game: string, name: string, score: number }
// 200           { ok: true }
// 400           { ok: false, error: "DATOS_INVALIDOS" }      — nombre vacío o >10, score no entero o fuera de 1..9999999
// 404           { ok: false, error: "JUEGO_NO_ENCONTRADO" }  — game_id inexistente (violación de FK)
// 500           { ok: false, error: "CONFIG_FALTANTE" | "GUARDADO_FALLIDO" }
//
// GET ?juego=&jugador=
// 200           { ok: true, mejor: { rank, score, date } | null }
// 400           { ok: false, error: "DATOS_INVALIDOS" }      — falta juego o jugador
// 500           { ok: false, error: "CONSULTA_FALLIDA" }
```

Convenciones:

- El nombre se recorta (`trim`) y se guarda en mayúsculas, igual que el input del modal.
- Desempate del ranking: a igual `score`, gana la fila más antigua.
- `SUPABASE_SECRET_KEY` nunca se escribe en archivos versionados, ni se imprime en logs, ni se importa desde un Client Component.
- `av_user` no cambia. `av_scores` deja de escribirse; las entradas viejas en `localStorage` se ignoran.

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` las guías de renderizado dinámico y caché (el cliente de servidor usa `cookies()`, lo que vuelve dinámicas las páginas que lo llaman, y `generateStaticParams` puede dejar de aplicar) y la de Route Handlers con parámetros de consulta. AGENTS.md advierte que esta versión de Next tiene cambios incompatibles.

1. **Migración.** Con `apply_migration` del MCP de Supabase, aplicar el SQL del modelo de datos más la siembra de los 8 juegos. Guardar una copia en `supabase/migrations/<versión>_games_y_scores.sql`, con `<versión>` tomada de `list_migrations`. La app no cambia. Verificación: `list_tables` muestra `games` y `scores` con RLS activada, `select count(*) from games` devuelve 8, `select count(*) from scores` devuelve 0 y `get_advisors` (security) no reporta errores.
2. **Secret key.** Añadir `SUPABASE_SECRET_KEY=` vacía a `.env.template`. El valor real lo pone el usuario en `.env.local` (se obtiene en el panel de Supabase, API Keys; si `get_publishable_keys` lo lista, se usa de ahí). Crear `lib/supabase/admin.ts` con `createAdminClient()` que lanza si falta la variable. Verificación: `npm run build` compila y `git status` no muestra `.env.local`.
3. **Capa de datos de juegos.** Crear `lib/data/games.ts` con `getGames()` (ordenado por `sort_order`) y `getGame(id)` (`null` si no existe), ambos con el cliente de servidor y lanzando `Error` si Supabase falla. Verificación: `npm run build` compila (aún sin consumidores).
4. **Catálogo desde la base de datos.** Migrar a `lib/data/games.ts`: `components/home-page.tsx` (`getGames()` y `slice(0, 6)`), `app/biblioteca/page.tsx` (pasa `games` a `Library` por props), `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx` (`getGame` + `notFound()`), ajustando o quitando `generateStaticParams` según la doc leída. `lib/games.ts` mantiene `GAMES` por ahora solo para `HallOfFame`. Verificación: `/`, `/biblioteca` y `/juegos/asteroides` muestran los 8 juegos desde la BD; `/juegos/no-existe` da 404.
5. **Capa de datos de puntuaciones y API.** Crear `lib/data/scores.ts` y `app/api/puntuaciones/route.ts` (`POST` con cliente admin, `GET` con cliente de servidor), con el contrato del modelo de datos. Verificación con `curl`: un `POST` válido responde 200 y el `GET` devuelve esa marca; un `POST` con nombre vacío da 400; con `game: "x"` da 404.
6. **El jugador guarda en Supabase.** En `components/game-player.tsx`, reemplazar `saveScore` por `fetch("/api/puntuaciones", { method: "POST" })`, con estado «guardando» (botón deshabilitado), `saved` solo si la respuesta es 200 y un mensaje de error en línea si falla; recortar el nombre por defecto a 10 caracteres; quitar `SCORES_KEY`. Verificación: terminar una partida de cualquier juego, guardar, y ver la fila con `execute_sql`.
7. **Salón de la Fama real.** Convertir `app/salon/page.tsx` en Server Component que carga `getGames()` y el top 12 de cada juego (`Promise.all`) y los pasa a `HallOfFame`, que sigue como Client Component con las pestañas. Podio y tabla con filas reales; un juego sin filas muestra «NADIE HA ENTRADO AL SALÓN TODAVÍA» y oculta podio y tabla. Si la carga falla, la página muestra «NO SE PUDO CARGAR EL RANKING» en vez de datos falsos. La fila «TU MEJOR MARCA» se pide con `GET /api/puntuaciones` al cambiar de pestaña o de sesión y no se pinta si `mejor` es `null`. Eliminar `GAMES` y `getGame` de `lib/games.ts`. Verificación: `npm run build` y `npm run lint` sin errores; ningún archivo importa `GAMES` ni `getGame` de `@/lib/games`.
8. **Documentación.** Actualizar «State of the codebase» en `CLAUDE.md`: tablas `games` y `scores` y sus políticas, `SUPABASE_SECRET_KEY` y `lib/supabase/admin.ts`, la capa `lib/data/`, `/api/puntuaciones`, que `/salon` es real, que `av_scores` ya no se usa y que `/juegos/[id]` y el home conservan datos simulados en el ranking. Verificación: `npm run build` y `npm run lint` sin errores.
9. **Verificación con Playwright MCP.** Ver «Cómo se verifica».

## Criterios de aceptación

### Base de datos

- [ ] `list_tables` (esquema `public`) devuelve `games` y `scores`, ambas con RLS activada, y ninguna tabla llamada `health_check`.
- [ ] `select count(*) from games` devuelve 8 y `select id from games order by sort_order` devuelve los ids en el orden actual del catálogo, con `asteroides` en sexta posición.
- [ ] `get_advisors` de seguridad no reporta errores.
- [ ] Un `insert` en `scores` con la publishable key (cliente `anon`) es rechazado por RLS.
- [ ] Un `insert` con `score` 0, con `player_name` vacío o de más de 10 caracteres, o con `game_id` inexistente es rechazado por la base de datos.
- [ ] `supabase/migrations/` contiene la copia de la migración aplicada.

### Entorno y seguridad

- [ ] `.env.template` contiene `SUPABASE_SECRET_KEY=` sin valor.
- [ ] `git status` no muestra `.env.local` como archivo a commitear y ningún archivo versionado contiene el valor real de la secret key.
- [ ] `SUPABASE_SECRET_KEY` solo se referencia en `lib/supabase/admin.ts`, y ese archivo no se importa desde ningún archivo con `"use client"`.
- [ ] Sin `SUPABASE_SECRET_KEY`, `POST /api/puntuaciones` responde 500 con `{ ok: false, error: "CONFIG_FALTANTE" }`.

### Catálogo

- [ ] `/biblioteca` muestra 8 tarjetas leídas de `games`; filtrar por `SHOOTER` deja INVASORES y ASTEROIDES; buscar «zzz» muestra el estado vacío existente.
- [ ] `/` muestra los 6 primeros juegos por `sort_order` en «JUEGOS DISPONIBLES AHORA».
- [ ] `/juegos/asteroides` y `/juegos/asteroides/jugar` responden 200 y `/juegos/no-existe` responde 404.
- [ ] Ninguna pantalla muestra datos de `lib/games.ts` (el arreglo `GAMES` ya no existe).

### Guardado de puntuaciones

- [ ] `POST /api/puntuaciones` con `{ game: "caida", name: "test", score: 1234 }` responde 200 y la fila aparece en `scores` con `player_name = 'TEST'`.
- [ ] Con nombre vacío o de 11 caracteres, `score` 0, `score` decimal o fuera de 1..9999999, responde 400 `DATOS_INVALIDOS`.
- [ ] Con `game: "no-existe"` responde 404 `JUEGO_NO_ENCONTRADO`.
- [ ] En el modal de fin de partida de `/juegos/caida/jugar`, «GUARDAR PUNTUACIÓN» deshabilita el botón mientras guarda y luego muestra «PUNTUACIÓN GUARDADA_».
- [ ] Si el `POST` falla (por ejemplo, con `SUPABASE_SECRET_KEY` quitada), el modal muestra un error en línea, el botón sigue disponible y **no** aparece «PUNTUACIÓN GUARDADA_».
- [ ] Terminar una partida real de `asteroides` y guardar crea una fila con `game_id = 'asteroides'` y la puntuación del HUD.
- [ ] `localStorage["av_scores"]` no se crea ni se modifica al guardar.

### Salón de la Fama

- [ ] Con `scores` vacía, `/salon` muestra «NADIE HA ENTRADO AL SALÓN TODAVÍA» en cada pestaña, sin podio ni tabla.
- [ ] Tras guardar 4 puntuaciones distintas de prueba en `caida`, la pestaña CAÍDA muestra el podio con las 3 mejores en orden descendente y una cuarta fila en la tabla con rango `#04`.
- [ ] A igual puntuación, la fila más antigua aparece primero.
- [ ] Con sesión iniciada con un nombre que tiene marca en ese juego, aparece «TU MEJOR MARCA» con su puntuación y rango reales; con un nombre sin marca, la fila no aparece; sin sesión, tampoco.
- [ ] `GET /api/puntuaciones?juego=caida&jugador=TEST` devuelve `{ ok: true, mejor: { rank, score, date } }`, y con un jugador sin marcas devuelve `mejor: null`.
- [ ] Con las credenciales de Supabase inválidas, `/salon` muestra «NO SE PUDO CARGAR EL RANKING» y ninguna fila inventada.

### Build y sin regresiones

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/`, `/biblioteca`, `/juegos/asteroides`, `/juegos/asteroides/jugar`, `/acceso`, `/salon` y `/acerca` responden 200.
- [ ] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.
- [ ] `/api/supabase/health` sigue respondiendo 200 `{ ok: true }`.
- [ ] El inicio de sesión simulado sigue funcionando (`av_user` en `localStorage`).
- [ ] Al terminar la verificación, `select count(*) from scores where player_name like 'TEST%'` devuelve 0.

### Cómo se verifica (Playwright MCP, curl y MCP de Supabase)

Con `npm run dev` corriendo y `.env.local` con las tres variables de Supabase:

1. Tras el paso 1: `list_tables`, `execute_sql` con los conteos y `get_advisors`. Probar con `execute_sql` los `insert` inválidos de «Base de datos».
2. `browser_navigate` a `/biblioteca`, `/` y `/juegos/asteroides` con `browser_snapshot`: 8 tarjetas, 6 mini-tarjetas y la ficha con los datos de la BD. `/juegos/no-existe` debe dar 404.
3. `curl` a `POST /api/puntuaciones` con los casos 200, 400 y 404, y a `GET /api/puntuaciones?juego=caida&jugador=TEST`.
4. `browser_navigate` a `/salon` con `scores` vacía: estado vacío en cada pestaña.
5. `browser_navigate` a `/juegos/caida/jugar`, pulsar **FIN**, escribir el nombre `TEST1` y guardar; repetir con `TEST2`, `TEST3` y `TEST4` y puntuaciones distintas. `execute_sql` confirma las 4 filas y `browser_evaluate` confirma que `localStorage["av_scores"]` es `null`.
6. `browser_navigate` a `/salon`, pestaña CAÍDA: podio, rango `#04` y orden descendente. Iniciar sesión en `/acceso` con el nombre `TEST2` y comprobar «TU MEJOR MARCA»; repetir con un nombre sin marcas.
7. En `/juegos/asteroides/jugar`, jugar con teclado hasta perder una partida, guardar y comprobar con `execute_sql` la fila con `game_id = 'asteroides'`.
8. Quitar temporalmente `SUPABASE_SECRET_KEY`, reiniciar `npm run dev`, guardar una puntuación y comprobar el error en línea del modal y el 500 `CONFIG_FALTANTE`. Restaurar el valor al terminar.
9. Poner temporalmente una `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` inválida, reiniciar y comprobar el mensaje de error de `/salon`. Restaurar el valor al terminar.
10. `browser_console_messages` en cada ruta de «Sin regresiones»: sin errores.
11. Limpiar con `execute_sql`: `delete from scores where player_name like 'TEST%'` y las filas de la partida de `asteroides`; comprobar que `scores` vuelve a estar vacía.

## Decisiones

- **Sí:** una sola spec para `games` y `scores`. Son dependientes (FK) y el ranking no tiene sentido sin el catálogo en la BD; separarlas dejaría una tabla sin consumidor.
- **Sí:** `games.id` es el slug de texto actual (`asteroides`, `caida`...). Las URLs y el `game.id` del código no cambian y `scores.game_id` es legible.
- **No:** `id` numérico o uuid para `games`. Obligaría a mapear slug ↔ id en cada ruta sin ningún beneficio.
- **Sí:** columnas de `games` con los mismos nombres que los campos de `Game` (`short`, `long`, `cat`...). La capa de datos no necesita mapeo.
- **Sí:** `best` y `plays` como columnas estáticas sembradas. Derivarlos de `scores` arrancaría en 0 y exige agregados o vistas; queda para otra spec.
- **Sí:** las puntuaciones se identifican por `player_name` libre, sin `user_id`. No hay auth real; añadirla ahora mezclaría otra área (cookies, `proxy.ts`).
- **No:** `signInAnonymously()` de Supabase para tener `user_id`. Añade auth y `proxy.ts` y se separa en otra spec.
- **Sí:** escritura solo a través de `POST /api/puntuaciones` con la secret key en el servidor, y `anon` solo con `SELECT`. Una policy de `INSERT` para `anon` dejaría a cualquiera con la publishable key (pública por diseño) inyectar puntuaciones desde el navegador, saltándose la validación del servidor.
- **No:** `INSERT` directo desde el navegador con CHECKs en la tabla. Más simple, pero sin ningún control salvo los CHECKs.
- **Sí (excepción a la SPEC 04):** se introduce `SUPABASE_SECRET_KEY`. La SPEC 04 la dejó fuera porque entonces no había nada que escribir; aquí es la única forma de que el servidor escriba con RLS cerrada. Queda confinada a `lib/supabase/admin.ts` y al Route Handler.
- **Sí:** CHECKs en la tabla (`score` 1..9999999, nombre 1..10) además de la validación del handler. La base de datos es la última barrera aunque el handler cambie.
- **Sí:** `score >= 1`. Una partida de 0 puntos no aporta nada al ranking.
- **Sí:** guardan los 8 juegos, incluidos los 7 simulados. `GamePlayer` es un solo componente y bifurcar por juego añadiría código que desaparecerá cuando cada juego tenga motor real. Las puntuaciones simuladas se limpian si hace falta.
- **Sí:** `scores` arranca vacía y `/salon` tiene estado vacío. Sembrar filas ficticias mezclaría datos falsos con reales.
- **Sí:** «TU MEJOR MARCA» sale de la BD por el nombre de sesión. Reemplaza una fila inventada; sin marca real, no se muestra.
- **Sí:** el nombre de sesión es un identificador débil: cualquiera puede escribir el nombre de otro. Se acepta hasta que haya auth real.
- **No:** quitar la fila «TU MEJOR MARCA». Es una función del diseño original y con datos reales ya tiene sentido.
- **Sí:** si Supabase falla, las páginas del catálogo lanzan error y `/salon` muestra un mensaje; no hay fallback a datos simulados. Un fallback ocultaría que la BD está caída y mostraría un catálogo distinto al real.
- **Sí:** `/salon` carga el top 12 de los 8 juegos en el servidor y las pestañas cambian en el cliente sin nuevas peticiones. Son 8 consultas pequeñas y evita un estado de carga por pestaña.
- **No:** realtime, paginación ni rate limiting en esta spec. Aumentan el alcance y no hacen falta para tener un ranking real.
- **Sí:** copiar la migración a `supabase/migrations/`. El esquema debe quedar en el repositorio y no solo en el proyecto remoto.
- **No:** tipos generados con `generate_typescript_types`. Con dos tablas pequeñas, los tipos a mano bastan; se reconsidera cuando haya más tablas.

## Riesgos

| Riesgo                                                                                                                                 | Mitigación                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filtrar `SUPABASE_SECRET_KEY` (omite RLS) al repositorio o al cliente                                                                  | Solo en `.env.local`, sin prefijo `NEXT_PUBLIC_`, importada únicamente desde `lib/supabase/admin.ts`; criterios de aceptación específicos y `grep` de verificación. |
| El cliente de servidor usa `cookies()` y las páginas del catálogo pasan a ser dinámicas; `generateStaticParams` puede dejar de aplicar | Leer la doc local antes del paso 1 y ajustar o quitar `generateStaticParams` en el paso 4.                                                                          |
| Cualquiera puede llamar a `POST /api/puntuaciones` con puntuaciones falsas dentro del rango válido                                     | Se acepta en esta spec (sin auth ni rate limiting). La validación solo acota el daño; la defensa real va en la spec de auth.                                        |
| `/juegos/[id]` sigue mostrando `seededScores` mientras `/salon` muestra datos reales y puede estar vacío                               | Está fuera de alcance por decisión y queda documentado en `CLAUDE.md`; la siguiente spec debe reemplazarlo.                                                         |
| Los 7 juegos simulados guardan puntuaciones falsas en `scores`                                                                         | Se limpian con `delete` al terminar la verificación; cuando cada juego tenga motor real, las filas simuladas se purgan en su spec.                                  |
| Una tabla `health_check` creada por accidente rompería `/api/supabase/health`                                                          | La migración solo crea `games` y `scores`; documentado en `CLAUDE.md` desde la SPEC 04.                                                                             |
| Dejar claves inválidas o ausentes en `.env.local` tras las pruebas de fallo                                                            | Los pasos 8 y 9 de verificación indican restaurar el valor real al terminar.                                                                                        |
| Empates y condiciones de carrera en el rango al insertar a la vez                                                                      | El orden `score desc, created_at asc` es determinista; el rango se calcula en cada consulta, no se guarda.                                                          |

## Qué **no** está en este spec

- Autenticación real, `user_id` en `scores` y `proxy.ts`.
- `best` y `plays` calculados desde `scores`.
- Ranking real en `/juegos/[id]` y en el home.
- Posición del jugador en el modal de fin de partida.
- Rate limiting, captcha o anti-trampas.
- Paginación, filtros por fecha, ranking global o realtime.
- Tipos generados de Supabase.
- Motores reales para los otros siete juegos.
- Tests automatizados en el repositorio.

Cada uno, si llega, va en su propio spec.
