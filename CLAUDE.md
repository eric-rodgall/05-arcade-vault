# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: a web platform to play arcade games online and compete for high scores. UI copy and URLs are in Spanish. Work follows Spec Driven Design: each feature is a spec in `specs/NN-slug.md` (template and rules in the `/spec` skill), implemented with `/spec-impl` on a `spec-NN-slug` branch (`specs/.spec-config.yml`: `AutoCreateBranch: true`).

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`). No test runner. Prettier is configured (`.prettierrc.json`).

## Stack

Next.js 16.3.6 (App Router, `app/` at repo root, no `src/`), React 19, TypeScript strict, Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` in `app/globals.css`, no tailwind config file), Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Resend. Path alias `@/*` → repo root. `app/layout.tsx` uses the `LayoutProps<"/">` global type. Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).

## Skills

Skills live in `.agents/skills/` (symlinked from `.claude/skills/`):

- `/frontend-design` — use it to build UI.
- `/spec` — design a spec, section by section.
- `/spec-impl` — implement an approved spec step by step.
- `/add-game` — add a playable game (engine + canvas + `games` row + leaderboard).

## Specs done

| #   | Spec                            | Result                                                               |
| --- | ------------------------------- | -------------------------------------------------------------------- |
| 01  | `mvp-pantallas`                 | Prototype screens ported to the App Router (visual MVP, mocked data) |
| 02  | `home-inicio`                   | Landing at `/`; library moved to `/biblioteca`                       |
| 03  | `acerca-de-contacto`            | `/acerca` with a contact form that sends email via Resend            |
| 04  | `conexion-supabase`             | Supabase clients + health check                                      |
| 05  | `juego-rocas-asteroids`         | `asteroides`, first real game                                        |
| 06  | `leaderboard-y-tabla-de-juegos` | `games` and `scores` tables; catalog and `/salon` read from Supabase |
| 07  | `juego-caida-tetris`            | `caida` (TETRIS) + engine registry                                   |
| 08  | `juego-bloque-buster-arkanoid`  | `bloque-buster` (ARKANOID)                                           |
| 09  | `juego-snake`                   | `serpentina` (SNAKE)                                                 |

## Routes

| Route                | Files                                                              | Notes                                                                                         |
| -------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `/`                  | `components/home-page.tsx`                                         | Server component; data mocked in `lib/home.ts`                                                |
| `/biblioteca`        | `components/library.tsx`, `game-card.tsx`                          | Category filter (`CATS`)                                                                      |
| `/juegos/[id]`       | `app/juegos/[id]/page.tsx`                                         | `getGame()` + `notFound()`; the "MEJORES PUNTUACIONES" aside still uses mocked `seededScores` |
| `/juegos/[id]/jugar` | `components/game-player.tsx`                                       | Real engine if registered, simulated score otherwise                                          |
| `/acceso`            | `components/auth-form.tsx`                                         | Login / sign-up / guest, simulated; navigates to `/`                                          |
| `/salon`             | `app/salon/page.tsx` + `components/hall-of-fame.tsx` (client tabs) | Top 12 per game; on error shows "NO SE PUDO CARGAR EL RANKING"                                |
| `/acerca`            | `components/about-page.tsx`, `contact-form.tsx`                    | Posts to `/api/contacto`                                                                      |

API (Route Handlers in `app/api/`):

- `POST /api/contacto` — sends email with Resend from `onboarding@resend.dev` to `RESEND_TO_EMAIL`. Nothing is stored; a failure shows an inline error.
- `POST /api/puntuaciones` — validates and inserts a score (`DATOS_INVALIDOS` 400, `JUEGO_NO_ENCONTRADO` 404, `CONFIG_FALTANTE`/`GUARDADO_FALLIDO` 500).
- `GET /api/puntuaciones?juego=&jugador=` — `{ ok: true, mejor: { rank, score, date } | null }`.
- `GET /api/supabase/health` — 200 `{ ok: true }` or 500 `CONFIG_FALTANTE`/`CONEXION_FALLIDA`. It queries the deliberately nonexistent table `health_check` and treats `PGRST205` as success: **never create a table with that name**.

## Shared code

- Layout: `components/nav.tsx` (Inicio · Biblioteca · Salón de la Fama · Acerca de; "Biblioteca" active on `/biblioteca` and `/juegos/*`) and `components/footer.tsx`, mounted in `app/layout.tsx`. "Back" links point to `/biblioteca`.
- Session: `components/session-provider.tsx` (`useSession()`), simulated in `localStorage` key `av_user`. There is no real auth yet. `av_scores` is no longer written.
- `lib/games.ts` — only the `Game` type, `Category`, `AccentColor` and `CATS`; the catalog lives in Supabase.
- `lib/data/games.ts` (`getGames()`, `getGame(id)`), `lib/data/scores.ts` (`getTopScores`, `getPlayerBest`, `normalizePlayerName`, `MAX_NAME_LENGTH`, `MAX_SCORE`).
- `lib/scores.ts` (`seededScores`, only for the `/juegos/[id]` aside), `lib/home.ts` (mocked home data).
- Client components besides the player/canvases: `reveal.tsx` (adds `.in` via `IntersectionObserver`), `contact-form.tsx`, `hall-of-fame.tsx`, `library.tsx`, `game-card.tsx`, `auth-form.tsx`, `session-provider.tsx`, `nav.tsx`. Everything else is a server component.
- Icons/decoration: `home-silhouettes.tsx`, `feature-icon.tsx`, `highlight-icon.tsx`, `mini-card.tsx`.

## Supabase

- Clients: `lib/supabase/client.ts` (browser `createClient()`), `lib/supabase/server.ts` (**async** `createClient()`; use `await createClient()`), `lib/supabase/admin.ts` (`createAdminClient()` with `SUPABASE_SECRET_KEY`, bypasses RLS). Never prefix the secret with `NEXT_PUBLIC_` and never import `admin.ts` from a client component.
- Tables (RLS on, `SELECT`-only policy for `anon`/`authenticated`; writes only via the admin client):
  - `games` — `id` (text slug), `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`, `sort_order`. `best`/`plays` are static seeded figures.
  - `scores` — `id` uuid, `game_id` → `games.id`, `player_name` (1–10 chars, trimmed and uppercased), `score` (1–9 999 999), `created_at`. No `user_id`. Ranking: `score` desc, then `created_at` asc.
- Pages read through `lib/data/*` with the server client (dynamic because of `cookies()`, no `generateStaticParams`). If Supabase fails, catalog pages throw; there is no mock fallback.
- No rate limiting on score posts until auth lands. The advisor warnings about `public.rls_auto_enable()` predate SPEC 06 and are left alone.
- Migrations in `supabase/migrations/`: `games_y_scores` (tables + seed of 8 games), and three title renames (`caida` → TETRIS, `bloque-buster` → ARKANOID, `serpentina` → SNAKE, which also fixes its `long`). Slugs never change. Note: `supabase/migrations/` is in `.gitignore`, so new migrations must be added with `git add -f`.
- The Supabase MCP server is configured in `.mcp.json`.

## Environment

`.env.template` is the only committed `.env*` file (real values in untracked `.env.local`): `RESEND_API_KEY`, `RESEND_TO_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server only).

## Games

Catalog (8 games): `asteroides`, `caida`, `bloque-buster`, `serpentina` are playable; `gloton`, `invasores`, `ranaria`, `duelo-pixel` still produce a simulated score in `.game-arena`. All eight save scores through `POST /api/puntuaciones`.

Architecture shared by every real game:

- Pure engine in `lib/games/<juego>/engine.ts` (no React): `create<Name>Game(canvas, callbacks)` owns the state, the `requestAnimationFrame` loop and keyboard input (ignores `<input>`/`<textarea>`, `preventDefault` only on its own keys). Callbacks `{ onStats(...), onGameOver(finalScore) }` (`onStats` fires only on change); returns `{ pause, resume, stop, destroy }`.
- Client canvas component in `components/<juego>-canvas.tsx`: mounts a fixed-size `<canvas>` (`object-fit: contain`) and calls `destroy()` on cleanup. The canvas draws no HUD or overlays.
- Registry `GAME_ENGINES` in `components/game-canvases.tsx` with `EngineProps { paused, onStats({ score, lives?, level? }), onGameOver }`. `GamePlayer` renders the engine with `key={runId}` (restart remounts), pauses it while paused or while the end modal is open, and fills the HUD from `onStats`. Games without lives show "—" in Vidas.
- New games: follow `/add-game`. Reference sources are in `references/started-games/` and `references/source-assets/` (never imported).

| Slug (title)               | Engine files                                                                                                                              | Canvas                                      | Controls                                           | Rules                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `asteroides` (ASTEROIDES)  | `lib/games/asteroids/entities.ts` (Bullet, Asteroid, PowerUp, Ship, Particle), `engine.ts`                                                | 800×600                                     | ←/→ rotate, ↑ thrust, Space fire                   | Lives + levels                                                                                                                       |
| `caida` (TETRIS)           | `lib/games/tetris/pieces.ts` (10×20 board, 8 pieces incl. "N", `LINE_SCORES`, `KICKS`, `rotateCW`, `collide`, `createBoard`), `engine.ts` | 420×600 (300×600 board + next-piece column) | ←/→ move, ↓ soft drop, ↑/X rotate, Space hard drop | No lives; `onStats({ score, level, lines })`                                                                                         |
| `bloque-buster` (ARKANOID) | `lib/games/arkanoid/levels.ts` (5 levels), `sprites.ts` (`loadSpritesheet()`), `engine.ts`                                                | 800×600                                     | ←/→ or mouse                                       | 3 lives, +10 per block; loop starts after the spritesheet loads; losing or clearing level 5 ends the game                            |
| `serpentina` (SNAKE)       | `lib/games/snake/fruits.ts` (22 sprites, `loadFruits()`), `engine.ts`                                                                     | 640×480 (16×12 cells of 40 px)              | Arrows / WASD                                      | Fixed step 0.125 s, +10 per fruit, dies on wall/body, turn queue of 2, filling the grid wins; magenta fallback while the atlas loads |

Assets: `public/games/bloque-buster/spritesheet-breakout.png`, `public/games/serpentina/fruits.png`.

## References

- `references/templates/` — original design prototype (in-browser Babel React + `styles.css`, now in `app/globals.css`). Visual reference only, excluded from ESLint. `references/templates/home-about/` is the home/about prototype; only the home was ported (the about page and the `.gp*` gamepad are out of scope).
- `references/started-games/` — original JS games ported to TypeScript (`02-asteroids`, `03-tetris`, `04-arkanoid`).
- `demos/Demo.tsx` is a placeholder; `resources/` holds a sound file not used by the app.
