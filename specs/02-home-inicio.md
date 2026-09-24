# SPEC 02 — Home de la aplicación y opción «Inicio» en el menú

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-09-24
> **Objective:** Crear la pantalla de inicio (landing) de Arcade Vault en `/`, mover la biblioteca a `/biblioteca` y agregar la opción «Inicio» al menú, validando las pantallas nuevas con el MCP de Playwright.

---

## Por qué existe este spec

SPEC 01 dejó la biblioteca en `/`, así que la app no tiene una portada que explique qué es Arcade Vault. El prototipo `references/templates/home-about/` (archivos `home.jsx`, `nav.jsx` y `styles.css`) ya trae el diseño de esa portada y un nav con «Inicio». Este spec porta solo el home; la página «Acerca de» del mismo prototipo queda fuera.

Este spec **cambia rutas de SPEC 01**: la biblioteca pasa de `/` a `/biblioteca`. Donde un criterio de SPEC 01 diga que la biblioteca o «VOLVER AL VAULT» apuntan a `/`, manda este spec.

Estado previo que ya existe y **no se rehace**:

- `lib/games.ts` (`GAMES`, `getGame`), `components/library.tsx`, `components/game-card.tsx` y `components/session-provider.tsx`.
- Los estilos base de `app/globals.css` (`.btn`, `.btn.xl`, `.btn.pulse`, `.neon-*`, `.pixel`, `.fade-in`, `@keyframes blink`, variables de color `--gold`, `--silver`, `--bronze`).

## Scope

**In:**

- Ruta `/` con el home del prototipo `home.jsx`, en español, con estas secciones en orden:

  | Sección                | Contenido                                                                                       |
  | ---------------------- | ----------------------------------------------------------------------------------------------- |
  | Hero                   | Siluetas pixel flotantes, «INSERTA UNA MONEDA_», título de tres líneas, subtítulo, CTAs, «DESLIZA» |
  | `// 01` ¿POR QUÉ…?     | 4 tarjetas de características con icono pixel                                                   |
  | `// 02` JUEGOS AHORA   | 6 mini-tarjetas (`GAMES.slice(0, 6)`) y botón «VER TODOS LOS JUEGOS →»                           |
  | Estadísticas           | 3 bloques: «12+ JUEGOS», «MILES DE PARTIDAS», «GLOBAL RANKING»                                   |
  | `// 03` ACTIVIDAD      | «ÚLTIMAS PUNTUACIONES» (7 filas) y «TOP JUGADORES · HOY» (5 filas) con enlace «VER SALÓN →»      |
  | `// 04` PRECIOS        | Tarjeta «PLAN ÚNICO · JUGADOR VAULT · $0», botón «EMPEZAR GRATIS →» y 3 preguntas frecuentes     |
  | CTA final              | «¿LISTO PARA JUGAR?» y botón «INSERTAR MONEDA →»                                                 |

- Nueva ruta `/biblioteca` que renderiza el componente `Library` existente.
- Opción **«Inicio»** en el nav de escritorio y en el panel móvil, como primer enlace: Inicio · Biblioteca · Salón de la Fama.
- Estado activo del nav: «Inicio» solo en `/`; «Biblioteca» en `/biblioteca` y `/juegos/*`; «Salón de la Fama» en `/salon`.
- El logo del nav sigue llevando a `/` (ahora el home).
- Actualizar los enlaces que apuntaban a la biblioteca en `/`: «VOLVER AL VAULT» (detalle y reproductor) y «VOLVER A LA BIBLIOTECA» (salón) pasan a `/biblioteca`.
- Animación de aparición al hacer scroll (`.reveal` → `.in`) con `IntersectionObserver`.
- Portar a `app/globals.css` los estilos del home desde `references/templates/home-about/styles.css`: bloque `HOME PAGE` (`.home*`, `.home-silos`, `.section-*`, `.feature-*`, `.mini-*`, `.home-stats`, `.stat-*`, `.home-final`, `.final-*`, `.reveal`) y bloques `ACTIVITY` y `PRICING` (`.activity-*`, `.ac-*`, `.ticker`, `.tick-row`, `.tk-*`, `.top-*`, `.tp-*`, `.lb-link`, `.pricing-grid`, `.price-card`, `.pc-*`, `.faq-*`).
- Datos simulados del home en `lib/home.ts`, copiados del prototipo.
- Validar las pantallas nuevas (`/` y `/biblioteca`) y el nav con el **MCP de Playwright**, siguiendo la sección «Cómo se verifica».

**Out of scope (para futuros specs):**

- La página «Acerca de»: no se crea la ruta `/acerca`, ni el enlace «Acerca de» en el nav, ni su formulario de contacto, ni sus estilos (`.about*`, `.contact*`, `.terminal-success`).
- El gamepad decorativo (`.gp*`) del prototipo `home-about/styles.css`.
- Suite de tests Playwright en el repo: no se instala `@playwright/test` ni se añaden archivos de test. Playwright MCP se usa solo como verificación asistida.
- Datos reales en «ÚLTIMAS PUNTUACIONES» y «TOP JUGADORES» (siguen siendo texto fijo, no se leen de `av_scores`).
- Cambiar la CTA «CREAR CUENTA» según haya sesión o no.
- Contador de créditos funcional y cualquier cambio de backend o autenticación.
- Rediseño: el home debe coincidir con `home.jsx` y su CSS.

## Modelo de datos

Estructuras nuevas, solo tipadas y estáticas, en `lib/home.ts`. Los valores se copian tal cual desde `home.jsx`.

```ts
// lib/home.ts
import type { AccentColor } from "@/lib/games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature {
  icon: FeatureIconKind;
  title: string;          // "JUEGOS CLÁSICOS"
  desc: string;
  color: AccentColor;     // clase CSS: feature-card cyan | yellow | magenta | green
}

export interface HomeStat { n: string; u: string; s: string }   // "12+", "JUEGOS", "Y CONTANDO"

export interface RecentScore {
  player: string;         // "NEONFOX"
  game: string;           // nombre visible, "Caída"
  score: number;
  ago: string;            // "hace 2 min"
  color: AccentColor;
}

export interface TopPlayer { rank: number; player: string; score: number }

export interface Faq { q: string; a: string }

export const FEATURES: Feature[];            // 4
export const HOME_STATS: HomeStat[];         // 3
export const RECENT_SCORES: RecentScore[];   // 7
export const TOP_PLAYERS: TopPlayer[];       // 5
export const PLAN_FEATURES: string[];        // 6, cada una con prefijo "✔ "
export const FAQS: Faq[];                    // 3
```

Convenciones:

- No hay persistencia nueva. No se tocan las claves `av_user` ni `av_scores`.
- Números con `toLocaleString("es-ES")`, igual que SPEC 01.
- Los datos son constantes: el render del servidor y el del cliente coinciden, sin `Math.random` ni fechas.
- Las mini-tarjetas usan `GAMES` de `lib/games.ts`; no se duplica esa lista.

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` las guías de Server y Client Components, `Link` y `usePathname` (AGENTS.md advierte que esta versión de Next tiene cambios incompatibles).

1. **Estilos.** Portar a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` de `references/templates/home-about/styles.css`, sin los bloques `ABOUT` ni `GAMEPAD`. Si un nombre de clase ya existe en `globals.css`, reutilizar el existente y no duplicarlo. Verificación: `npm run build` compila y las pantallas de SPEC 01 se ven igual.
2. **Datos.** Crear `lib/home.ts` con los tipos y constantes del modelo de datos. Verificación: `npm run build` compila.
3. **Biblioteca en `/biblioteca`.** Crear `app/biblioteca/page.tsx` que renderiza `<Library />`. Cambiar a `/biblioteca` los enlaces «VOLVER AL VAULT» en `app/juegos/[id]/page.tsx` y `components/game-player.tsx`, y «VOLVER A LA BIBLIOTECA» en `components/hall-of-fame.tsx`. Ajustar en `components/nav.tsx` el enlace «Biblioteca» (escritorio y móvil) a `/biblioteca`, con estado activo en `/biblioteca` y `/juegos/*`. `app/page.tsx` sigue mostrando la biblioteca hasta el paso 6. Verificación: `/biblioteca` muestra las 8 tarjetas y «Biblioteca» aparece activo.
4. **Piezas del home.** Crear `components/home-silhouettes.tsx` (SVG decorativos `s1`–`s8`), `components/feature-icon.tsx` (4 iconos), `components/mini-card.tsx` (`Link` a `/juegos/[id]`) y `components/reveal.tsx` (Client Component con `IntersectionObserver` que añade `in`; si `IntersectionObserver` no existe, añade `in` de inmediato). Verificación: `npm run build` compila.
5. **Página home.** Crear `components/home-page.tsx` (Server Component) con las siete secciones y reemplazar `app/page.tsx` para que renderice el home en lugar de la biblioteca. Los botones son `Link`: «EXPLORAR JUEGOS», «VER TODOS LOS JUEGOS →» e «INSERTAR MONEDA →» a `/biblioteca`; «CREAR CUENTA» y «EMPEZAR GRATIS →» a `/acceso`; «VER SALÓN →» a `/salon`. Verificación: `/` muestra el home completo.
6. **Opción «Inicio» en el menú.** En `components/nav.tsx` agregar «Inicio» como primer enlace en escritorio y panel móvil, activo solo con `pathname === "/"`. Verificación: el nav muestra Inicio · Biblioteca · Salón de la Fama y el activo cambia según la ruta.
7. **Documentación.** Actualizar la sección «State of the codebase» de `CLAUDE.md`: nueva tabla de rutas (`/` home, `/biblioteca`), archivos nuevos y mención de `references/templates/home-about/` como referencia visual (excluida de eslint). Verificación: `npm run build` y `npm run lint` sin errores.

## Criterios de aceptación

### Build y rutas

- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] Las rutas `/`, `/biblioteca`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar`, `/acceso` y `/salon` responden 200.
- [ ] `/acerca` responde 404.
- [ ] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.

### Home (`/`)

- [ ] El hero muestra «INSERTA UNA MONEDA_», las tres líneas «EL ARCADE», «CLÁSICO ESTÁ», «DE VUELTA», y 8 siluetas SVG.
- [ ] «EXPLORAR JUEGOS» navega a `/biblioteca` y «CREAR CUENTA» a `/acceso`.
- [ ] La sección `// 01` muestra 4 tarjetas de características con icono.
- [ ] La sección `// 02` muestra exactamente 6 mini-tarjetas, en el orden de `GAMES`.
- [ ] Hacer clic en una mini-tarjeta navega a `/juegos/[id]` de ese juego.
- [ ] «VER TODOS LOS JUEGOS →» navega a `/biblioteca`.
- [ ] La sección de estadísticas muestra 3 bloques: «12+», «MILES» y «GLOBAL».
- [ ] «ÚLTIMAS PUNTUACIONES» muestra 7 filas y «TOP JUGADORES · HOY» muestra 5, con NEONFOX en primer lugar y `312.840` como su puntuación.
- [ ] «VER SALÓN →» navega a `/salon`.
- [ ] La sección de precios muestra «$0», 6 ventajas y 3 preguntas frecuentes; «EMPEZAR GRATIS →» navega a `/acceso`.
- [ ] «INSERTAR MONEDA →» navega a `/biblioteca`.
- [ ] Las secciones con `.reveal` quedan visibles (`.in`) tras hacer scroll hasta ellas.
- [ ] El pie de página aparece al final del home.

### Menú y rutas movidas

- [ ] El nav de escritorio muestra, en este orden, «Inicio», «Biblioteca» y «Salón de la Fama», y no muestra «Acerca de».
- [ ] El panel móvil muestra las mismas tres opciones más «Iniciar Sesión» (o «Cuenta» con sesión), en ese orden, y no muestra «Acerca de».
- [ ] En `/` solo «Inicio» está activo; en `/biblioteca` y `/juegos/bloque-buster` solo «Biblioteca»; en `/salon` solo «Salón de la Fama».
- [ ] El logo navega a `/`.
- [ ] `/biblioteca` muestra 8 tarjetas con `TODOS` activo; escribir «gl» deja solo GLOTÓN; filtrar por `SHOOTER` deja INVASORES y ROCAS; buscar «zzz» muestra «NO HAY RESULTADOS».
- [ ] «VOLVER AL VAULT» en `/juegos/[id]` y en el modal del reproductor, y «VOLVER A LA BIBLIOTECA» en `/salon`, navegan a `/biblioteca`.
- [ ] Tras iniciar sesión o entrar como invitado en `/acceso`, la app navega a `/`.
- [ ] La sesión persiste al pasar de `/` a `/biblioteca` y tras recargar.

### Responsive

- [ ] A 375 px de ancho `/` y `/biblioteca` no tienen scroll horizontal.
- [ ] A 375 px el nav muestra la hamburguesa y el panel móvil abre, muestra «Inicio» y cierra al elegir una opción.
- [ ] A 375 px las tarjetas de características ocupan una columna y las mini-tarjetas dos.

### Cómo se verifica (Playwright MCP)

Con `npm run dev` corriendo, se usan las herramientas `mcp__playwright__*` en este orden. Cada resultado alimenta los criterios de arriba:

1. `browser_navigate` a cada ruta de la lista de rutas y `browser_snapshot` para comprobar textos y enlaces.
2. `browser_console_messages` después de cada navegación: debe estar vacío de errores.
3. `browser_click` en el enlace «Inicio», «Biblioteca» y «Salón de la Fama» del nav, y en los CTAs del home, comprobando la URL final con `browser_evaluate` (`location.pathname`).
4. `browser_evaluate` con `document.querySelectorAll(".mini-card").length`, `.feature-card` y `.tick-row` para los conteos.
5. `browser_evaluate` con `document.documentElement.scrollWidth <= window.innerWidth` tras `browser_resize` a 375×812.
6. `browser_take_screenshot` de `/` en escritorio y a 375 px, comparados visualmente con `references/templates/home-about/arcade-vault-standalone.html`.

## Decisiones

- **Sí:** home en `/` y biblioteca en `/biblioteca`. Es el mapeo del prototipo (Inicio y Biblioteca son pantallas distintas) y hace que la raíz de la app sea la portada.
- **No:** home en `/inicio` con la biblioteca en `/`. No tocaría SPEC 01, pero la raíz no sería la portada y el logo apuntaría a una pantalla que no es «Inicio».
- **Sí:** portar todas las secciones de `home.jsx`. Son el diseño ya aprobado en el prototipo y el costo de recortarlas es rehacer el layout después.
- **No:** una versión corta (hero + juegos + CTA). Deja el home a medias respecto a la referencia.
- **Sí:** añadir solo «Inicio» al nav. El about se decidió fuera de este spec.
- **No:** dejar «Acerca de» como enlace deshabilitado. Es UI muerta que confunde.
- **Sí:** Playwright MCP como verificación asistida durante la implementación, con pasos concretos en el spec.
- **No:** instalar `@playwright/test` y crear tests e2e. SPEC 01 dejó los tests automatizados fuera y añadiría dependencias y configuración nuevas.
- **Sí:** `components/home-page.tsx` como Server Component. Solo `Reveal` es cliente, porque solo necesita el `IntersectionObserver`.
- **No:** convertir todo el home en Client Component. No hay estado ni eventos que lo justifiquen.
- **Sí:** enlaces con `next/link` en vez de los `navigate()` y `onClick` del prototipo.
- **Sí:** «VOLVER AL VAULT» pasa a `/biblioteca`, porque su destino natural es la lista de juegos y no la portada.
- **Sí:** tras iniciar sesión o entrar como invitado, `/acceso` sigue navegando a `/`, que ahora es el home. No se reabre esa decisión de SPEC 01.
- **Sí:** el copy del home se copia tal cual del prototipo, incluido «12+ JUEGOS» aunque hoy haya 8 juegos. Es texto de marketing y cambiarlo es rediseño.
- **Sí:** los datos de actividad y top jugadores son constantes y no leen `av_scores`, igual que la decisión de SPEC 01 para el salón.
- **Sí:** «CREAR CUENTA» y «EMPEZAR GRATIS →» se muestran siempre, con o sin sesión. Variarlos obligaría a leer `localStorage` en el home y reintroducir riesgo de hidratación.

## Riesgos

| Riesgo                                                                                     | Mitigación                                                                                                      |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Enlaces a `/` de SPEC 01 que se olvidan y llevan al home en vez de a la biblioteca         | El paso 3 lista los tres archivos; verificar con `grep` que no quedan `href="/"` de «volver» y con Playwright.  |
| `.reveal` deja las secciones invisibles si el observador no corre (JS deshabilitado, error) | `Reveal` añade `in` de inmediato si `IntersectionObserver` no existe; verificar el scroll con Playwright.        |
| Estilos del home chocan con clases existentes de `globals.css` (`.section-title`, `.ticker`) | En el paso 1 buscar cada clase antes de pegarla; reutilizar la existente si ya está y comparar capturas.        |
| Desbordamiento horizontal en móvil por siluetas absolutas y `.hero-scroll` con `bottom: -20px` | `.home-hero` ya trae `overflow: hidden`; comprobar `scrollWidth` a 375 px en el paso de verificación.           |
| Errores de hidratación por contenido distinto entre servidor y cliente                     | Datos constantes, sin `Math.random` ni fechas; el nav sigue mostrando el estado invitado hasta cargar la sesión. |
| Esta versión de Next cambia APIs                                                           | Leer `node_modules/next/dist/docs/01-app/` antes de escribir componentes y rutas.                                |

## Qué **no** está en este spec

- La página «Acerca de», su ruta, su enlace en el nav y su formulario de contacto.
- El gamepad decorativo del prototipo.
- Tests automatizados en el repo (Playwright MCP solo se usa como verificación).
- Puntuaciones reales en el home, backend o autenticación real.
- Una CTA distinta según haya sesión.
- Créditos funcionales, internacionalización y rediseño visual.

Cada uno, si llega, va en su propio spec.
