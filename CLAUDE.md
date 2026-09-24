# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: a web platform to play arcade games online and compete for high scores. The README says the project follows Spec Driven Design (`/spec` and `/spec-impl` workflow), using skills installed via `npx skills@latest add Klerith/fernando-skills`. The UI copy is in Spanish.

## Stack

Next.js 16.3.6 (App Router, `app/` at repo root, no `src/`), React 19, TypeScript strict, Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` in `app/globals.css`, no tailwind config file). Path alias `@/*` maps to the repo root. `app/layout.tsx` uses the `LayoutProps<"/">` global type helper. Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).

## Skills
- Use /frontend-design for create the user interface. 
- /spec
- /spec-imp

## State of the codebase

SPEC 01 (`specs/01-mvp-pantallas.md`) ported the five prototype screens to the App Router as a visual-only MVP: no backend and no real games. Data is mocked and the session is simulated in `localStorage`.

Routes (UI copy and URLs in Spanish):

- `/` — library (`components/library.tsx`, `components/game-card.tsx`)
- `/juegos/[id]` — game detail (server component, `generateStaticParams` + `notFound()`)
- `/juegos/[id]/jugar` — player with simulated score (`components/game-player.tsx`)
- `/acceso` — login / sign-up / guest (`components/auth-form.tsx`)
- `/salon` — hall of fame (`components/hall-of-fame.tsx`)

Shared pieces: `components/nav.tsx` and `components/footer.tsx` (mounted in `app/layout.tsx`), `components/session-provider.tsx` (`useSession()`, key `av_user`), `lib/games.ts` (`GAMES`, `CATS`, `getGame`), `lib/scores.ts` (`seededScores`). The player saves scores to `localStorage` key `av_scores`; nothing reads them back yet.

`references/templates/` holds the original design prototype, kept as visual reference only (excluded from eslint). It is a standalone, in-browser-Babel React app (`Arcade Vault.html` loads the `.jsx` files as globals, with no modules or build step) plus `styles.css`, whose styles now live in `app/globals.css`.
