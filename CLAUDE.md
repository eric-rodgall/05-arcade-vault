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

SPEC 01 (`specs/01-mvp-pantallas.md`) ported the five prototype screens to the App Router as a visual-only MVP: no backend and no real games. Data is mocked and the session is simulated in `localStorage`. SPEC 02 (`specs/02-home-inicio.md`) added the landing page at `/` and moved the library to `/biblioteca`. SPEC 03 (`specs/03-acerca-de-contacto.md`) added the "Acerca de" page at `/acerca` with a contact form that sends real email via Resend.

Routes (UI copy and URLs in Spanish):

- `/` — home / landing (`components/home-page.tsx`, a server component; only `components/reveal.tsx` is a client component)
- `/biblioteca` — library (`components/library.tsx`, `components/game-card.tsx`)
- `/juegos/[id]` — game detail (server component, `generateStaticParams` + `notFound()`)
- `/juegos/[id]/jugar` — player with simulated score (`components/game-player.tsx`)
- `/acceso` — login / sign-up / guest (`components/auth-form.tsx`)
- `/salon` — hall of fame (`components/hall-of-fame.tsx`)
- `/acerca` — about + contact form (`components/about-page.tsx`, a server component; `components/contact-form.tsx` is the only client piece besides `components/reveal.tsx`)

Shared pieces: `components/nav.tsx` and `components/footer.tsx` (mounted in `app/layout.tsx`), `components/session-provider.tsx` (`useSession()`, key `av_user`), `lib/games.ts` (`GAMES`, `CATS`, `getGame`), `lib/scores.ts` (`seededScores`), `lib/home.ts` (static home data: features, stats, recent scores, top players, plan features, FAQs). Home pieces: `components/home-silhouettes.tsx`, `components/feature-icon.tsx`, `components/mini-card.tsx`, `components/reveal.tsx` (adds `.in` via `IntersectionObserver`). About pieces: `components/highlight-icon.tsx`, `components/contact-form.tsx` (client, posts to `/api/contacto`). The nav lists Inicio · Biblioteca · Salón de la Fama · Acerca de; "Biblioteca" is active on `/biblioteca` and `/juegos/*`, "Acerca de" on `/acerca`. The "back" links (game detail, player modal, hall of fame) point to `/biblioteca`; login/guest still navigates to `/`. The player saves scores to `localStorage` key `av_scores`; nothing reads them back yet.

The contact form on `/acerca` posts to the Route Handler `app/api/contacto/route.ts`, which sends email through Resend (`resend` package) from `onboarding@resend.dev` to `RESEND_TO_EMAIL`, authenticated with `RESEND_API_KEY`. Both env vars are documented (empty) in `.env.template`, the only `.env*` file committed (see `.gitignore`); real values live only in the untracked `.env.local`. Nothing is persisted server-side — a failed send shows an inline error in the form instead of a false success.

`references/templates/` holds the original design prototype, kept as visual reference only (excluded from eslint). `references/templates/home-about/` is the prototype of the home and about pages; only the home was ported (the about page and the `.gp*` gamepad are out of scope). The prototype is a standalone, in-browser-Babel React app (`Arcade Vault.html` loads the `.jsx` files as globals, with no modules or build step) plus `styles.css`, whose styles now live in `app/globals.css`.
