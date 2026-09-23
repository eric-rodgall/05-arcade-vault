# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Status:** Approved
> **Depends on:** ninguna
> **Date:** 2026-09-23
> **Objective:** Portar a Next.js las cinco pantallas del prototipo `references/templates/` (biblioteca, detalle, reproductor, acceso y salón de la fama) como MVP visual con datos simulados y sin ningún juego real.

---

## Por qué existe este spec

`app/` sigue siendo el scaffold de create-next-app. El prototipo vive en `references/templates/` como app React con Babel en el navegador, scope global y router por hash. Este spec lo convierte en rutas del App Router, componentes TypeScript y módulos, sin backend y sin lógica de juego.

Estado previo que ya existe y **no se rehace**:

- `app/globals.css` ya contiene el tema y los estilos portados de `references/templates/styles.css` (variables, `.av-*`, `.card`, `.crt`, `.podium`, etc.).
- `app/layout.tsx` ya carga las fuentes (`--font-press-start`, `--font-jetbrains-mono`, `--font-courier-prime`) y renderiza `.av-bg`, `.av-noise` y `.av-app`.

## Scope

**In:**

- Cinco rutas del App Router con el contenido visual del prototipo, en español:

  | Pantalla      | Ruta                  | Prototipo          |
  | ------------- | --------------------- | ------------------ |
  | Biblioteca    | `/`                   | `biblioteca.jsx`   |
  | Detalle       | `/juegos/[id]`        | `detalle.jsx`      |
  | Reproductor   | `/juegos/[id]/jugar`  | `reproductor.jsx`  |
  | Acceso        | `/acceso`             | `auth.jsx`         |
  | Salón         | `/salon`              | `salon.jsx`        |

- Barra de navegación (con menú móvil) y pie de página compartidos desde `app/layout.tsx`, portados de `nav.jsx` y del footer de `app.jsx`.
- Biblioteca con búsqueda por nombre, filtro por categoría, tarjetas con efecto tilt y estado "NO HAY RESULTADOS".
- Detalle con portada, etiquetas, estadísticas, botones y tabla "MEJORES PUNTUACIONES" sembrada.
- Reproductor con HUD (jugador, puntuación, vidas, nivel), arena CRT decorativa, puntuación simulada que sube sola, pausa, botón FIN, modal de fin de juego y guardado de la puntuación en `localStorage`.
- Acceso con pestañas "INICIAR SESIÓN" / "CREAR CUENTA", botón "JUGAR COMO INVITADO" y sesión simulada en `localStorage`.
- Salón con pestañas por juego, podio top 3, tabla de 12 filas y fila "TU MEJOR MARCA" si hay sesión.
- Datos simulados tipados en `lib/` (juegos, categorías, puntuaciones sembradas).
- Ruta inexistente de juego (`/juegos/xyz`) responde 404.

**Out of scope (para futuros specs):**

- Cualquier juego real (motor, lógica, controles, colisiones). La arena del reproductor es decorativa.
- Backend, base de datos, API routes o route handlers.
- Autenticación real: validación de contraseña, correo, OAuth con Google/GitHub, cookies o sesión en servidor.
- Mezclar las puntuaciones guardadas en `av_scores` con el salón o el detalle.
- Contador de créditos funcional (queda fijo en "CRÉDITOS · 03").
- Tests automatizados.
- Internacionalización (la UI queda solo en español).
- Rediseño: la apariencia debe coincidir con el prototipo.

## Modelo de datos

Estructuras nuevas, todas en TypeScript. Los datos de `GAMES`, `CATS` y `PLAYERS` se copian tal cual desde `references/templates/data.jsx`.

```ts
// lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Filter = "TODOS" | Category;
export type AccentColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;          // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;       // clase CSS existente: "cover-bricks", ...
  color: AccentColor;
  best: number;
  plays: string;       // "12.4K"
}
export const GAMES: Game[];
export const CATS: Filter[];
export function getGame(id: string): Game | undefined;

// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/2026"
}
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Persistencia en `localStorage` (solo cliente, siempre dentro de `try/catch`):

```ts
// clave "av_user": sesión simulada. Ausente = invitado.
interface SessionUser { name: string }            // MAYÚSCULAS, máx. 10 caracteres

// clave "av_scores": lista de puntuaciones guardadas desde el reproductor.
interface SavedScore { game: string; score: number; name: string; at: number }
```

Convenciones:

- Las claves `av_user` y `av_scores` son las mismas del prototipo; no llevan versión en este MVP.
- Números con `toLocaleString("es-ES")`.
- `seededScores` es determinista: mismo `seed` produce las mismas filas, para evitar errores de hidratación.
- Seeds del prototipo: detalle `id.length * 17 + 3` (10 filas), salón `tab.length * 23 + 7` (12 filas).

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` las guías de routing dinámico, `Link`, `notFound`, `generateStaticParams` y `params` (AGENTS.md advierte que esta versión de Next tiene cambios incompatibles).

1. **Datos.** Crear `lib/games.ts` y `lib/scores.ts` portando `data.jsx` a TypeScript. Verificación: `npm run build` compila.
2. **Sesión.** Crear `components/session-provider.tsx` (client) con contexto `{ user, signIn, signOut }` que lee y escribe `av_user`, tolerante a `localStorage` no disponible, y el hook `useSession`. Verificación: compila y el provider no rompe el render del scaffold.
3. **Shell.** Crear `components/nav.tsx` (client, con menú móvil y estado activo por `usePathname`) y `components/footer.tsx`. Envolver `children` en `app/layout.tsx` con `SessionProvider`, `Nav`, `<main className="av-main">` y `Footer`. Verificación: `npm run dev`, el nav y el pie se ven sobre el scaffold.
4. **Biblioteca.** Reemplazar `app/page.tsx` por la biblioteca. Crear `components/game-card.tsx` (client, tilt) y `components/library.tsx` (client, búsqueda y filtro). La tarjeta y el botón JUGAR enlazan a `/juegos/[id]`. Verificación: `/` muestra 8 tarjetas y los filtros funcionan.
5. **Detalle.** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams`, `notFound()` para ids inválidos y tabla sembrada. JUGAR AHORA enlaza a `/juegos/[id]/jugar`; VOLVER AL VAULT a `/`. Verificación: `/juegos/caida` renderiza; `/juegos/xyz` da 404.
6. **Salón.** Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (client, pestañas por juego, podio, tabla, fila del usuario si hay sesión). Verificación: cambiar de pestaña cambia podio y tabla.
7. **Acceso.** Crear `app/acceso/page.tsx` y `components/auth-form.tsx` (client). Entrar o crear cuenta llama a `signIn({ name })` y navega a `/`; invitado llama a `signOut()` y navega a `/`. Verificación: tras entrar, el nav muestra el nombre; recargar conserva la sesión.
8. **Reproductor.** Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (client) con HUD, arena, pausa, FIN, modal y guardado en `av_scores`. Verificación: la puntuación sube, la pausa la detiene, FIN abre el modal, guardar escribe en `av_scores`.
9. **Limpieza.** Borrar los SVG del scaffold en `public/` que ya no se usan y actualizar la sección "State of the codebase" de `CLAUDE.md` (la ruta correcta del prototipo es `references/templates/`, y `app/` ya no es el scaffold). Verificación: `npm run build` y `npm run lint` sin errores.

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] Las rutas `/`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar`, `/acceso` y `/salon` responden 200.
- [ ] `/juegos/xyz` y `/juegos/xyz/jugar` responden 404.
- [ ] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.
- [ ] La biblioteca muestra 8 tarjetas con `TODOS` activo.
- [ ] Escribir "gl" en el buscador deja solo la tarjeta GLOTÓN.
- [ ] Filtrar por `SHOOTER` deja exactamente INVASORES y ROCAS.
- [ ] Buscar "zzz" muestra el texto "NO HAY RESULTADOS".
- [ ] Hacer clic en una tarjeta o en su botón JUGAR navega a `/juegos/[id]`.
- [ ] El detalle muestra título, descripción larga, etiquetas, estadísticas y 10 filas de puntuaciones.
- [ ] Las puntuaciones del detalle son iguales tras recargar la página.
- [ ] El botón JUGAR AHORA navega a `/juegos/[id]/jugar` y VOLVER AL VAULT a `/`.
- [ ] En el reproductor la puntuación aumenta sola; con PAUSA deja de aumentar y aparece "EN PAUSA"; REANUDAR la retoma.
- [ ] El nivel se calcula como `Math.floor(puntuación / 2500) + 1` y se muestra con dos dígitos.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] GUARDAR PUNTUACIÓN agrega un elemento a `localStorage["av_scores"]` con `game`, `score`, `name` y `at`, y muestra "PUNTUACIÓN GUARDADA_".
- [ ] JUGAR DE NUEVO reinicia puntuación, vidas y nivel; VOLVER AL VAULT navega a `/`; SALIR navega a `/juegos/[id]`.
- [ ] Sin sesión, el reproductor muestra el jugador "INVITADO"; con sesión, muestra el nombre del usuario.
- [ ] En `/acceso`, la pestaña "CREAR CUENTA" muestra el campo de correo y "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario con usuario "px_kai" guarda `av_user` como `{"name":"PX_KAI"}` y navega a `/`.
- [ ] Enviar el formulario vacío inicia sesión como "PLAYER1".
- [ ] JUGAR COMO INVITADO elimina `av_user` y navega a `/`.
- [ ] Con sesión, el nav muestra el nombre del usuario; al hacer clic se elimina `av_user` y el nav vuelve a mostrar "Iniciar Sesión".
- [ ] La sesión persiste tras recargar la página.
- [ ] El salón muestra 8 pestañas (una por juego), el podio con 3 puestos y 12 filas en la tabla.
- [ ] Cambiar de pestaña en el salón cambia los nombres y puntuaciones mostrados.
- [ ] La fila "TU MEJOR MARCA EN {JUEGO}" aparece solo con sesión iniciada.
- [ ] El nav marca como activo "Biblioteca" en `/`, `/juegos/*` y "Salón de la Fama" en `/salon`.
- [ ] A 375 px de ancho el nav muestra el botón hamburguesa y el panel móvil abre y cierra, sin scroll horizontal en ninguna pantalla.
- [ ] El pie de página aparece en las cinco pantallas.
- [ ] No queda referencia a `Create Next App` ni a los SVG del scaffold en el código.

## Decisiones

- **Sí:** rutas en español (`/juegos/[id]`, `/juegos/[id]/jugar`, `/acceso`, `/salon`). Coherente con el copy de la UI y con los nombres del prototipo.
- **No:** rutas en inglés ni el mapeo 1:1 del hash del prototipo (`/detalle/[id]`, `/player/[id]`). Se prefieren URLs REST legibles.
- **Sí:** sesión simulada en `localStorage` con `av_user`, sin validar contraseña, como en el prototipo. Suficiente para un MVP visual.
- **No:** cookie de sesión leída en servidor. Evitaría el parpadeo del nav, pero añade complejidad sin backend.
- **Sí:** el reproductor conserva la simulación del prototipo (puntuación aleatoria, modal, guardado local) para poder validar el flujo completo de la interfaz.
- **No:** reproductor estático ni sin persistencia.
- **Sí:** datos simulados tipados en `lib/`, portados de `data.jsx`. El salón y el detalle usan solo datos sembrados.
- **No:** mezclar `av_scores` con el salón. La fila "TU MEJOR MARCA" sigue el prototipo (valor derivado de la tabla sembrada) y se resuelve con un backend real en otro spec.
- **No:** route handlers para servir los datos. No aportan valor hasta que exista backend.
- **Sí:** `app/juegos/[id]/page.tsx` como Server Component con `generateStaticParams` y `notFound()`. Solo los componentes con estado o eventos (nav, biblioteca, tarjeta, salón, acceso, reproductor) son Client Components.
- **Sí:** navegación con `next/link` y `useRouter` en lugar del estado `route` y el hash del prototipo.
- **Sí:** el nivel del reproductor es `Math.floor(puntuación / 2500) + 1`. El prototipo usa `score % 2500 < 100`, que puede incrementar el nivel varias veces seguidas y no es determinista.
- **Sí:** los botones de Google y GitHub en `/acceso` son decorativos y no hacen nada.
- **Sí:** el contador "CRÉDITOS · 03" es texto fijo.
- **Sí:** los estilos ya portados en `app/globals.css` se reutilizan tal cual; solo se ajustan si un componente lo exige.

## Riesgos

| Riesgo                                                                                | Mitigación                                                                                                          |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Errores de hidratación por leer `localStorage` durante el render                      | El provider lee `av_user` en un `useEffect` y el nav renderiza el estado de invitado hasta que la sesión esté lista. |
| Errores de hidratación por `Math.random` o fechas en el render                        | Solo se usa `Math.random` dentro de efectos (puntuación simulada). `seededScores` es determinista.                   |
| `localStorage` bloqueado (modo privado, sitio bloqueado)                              | Todo acceso va en `try/catch`; la app sigue funcionando sin persistir.                                               |
| Esta versión de Next cambia APIs (por ejemplo `params` asíncrono)                     | Leer `node_modules/next/dist/docs/01-app/` antes de escribir las rutas dinámicas.                                    |
| Los estilos de `globals.css` dependen de clases del prototipo que un componente omita | Reutilizar los mismos nombres de clase y comparar visualmente cada pantalla con `references/templates/Arcade Vault.html`. |
| `setInterval` de la puntuación simulada sigue corriendo al salir de la pantalla       | El efecto devuelve `clearInterval` en su cleanup y se detiene con pausa o fin de juego.                              |

## Qué **no** está en este spec

- Ningún juego real: ni motor, ni controles, ni colisiones (cada juego irá en su propio spec).
- Backend, base de datos o autenticación real (spec aparte).
- OAuth con Google o GitHub.
- Puntuaciones reales en el salón y el detalle, y ranking real del usuario.
- Créditos funcionales.
- Tests automatizados.
- Internacionalización.
- Rediseño visual respecto al prototipo.

Cada uno, si llega, va en su propio spec.
