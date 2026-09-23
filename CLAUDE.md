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

`app/` is still the untouched create-next-app scaffold (default `page.tsx`, "Create Next App" metadata). The real product has not been ported yet.

`resources/templates/` holds the design prototype to port into Next.js. It is a standalone, in-browser-Babel React app (`Arcade Vault.html` loads the `.jsx` files as globals, with no modules or build step) plus `styles.css` (~950 lines). Structure:

- `app.jsx` — root `App`: hash-based router (`route` = `{name, id?}` JSON-encoded in `location.hash`; names: `biblioteca`, `detalle`, `player`, `auth`, `salon`) and `localStorage` persistence (`av_user` for session, `av_scores` for score list).
- `data.jsx` — shared mock data (`GAMES` etc.); no backend exists yet.
- `biblioteca.jsx` (library), `detalle.jsx` (game detail), `reproductor.jsx` (player), `salon.jsx` (hall of fame / leaderboard), `auth.jsx`, `nav.jsx` — one screen/component per file.

When porting, convert these to App Router routes and components, in TypeScript, rather than copying the global-scope/hash-routing patterns. The templates use suffixed hook aliases (e.g. `useStateApp`) only to avoid global name clashes, which don't apply in modules.
