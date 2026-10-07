# SPEC 04 — Conexión de Next.js con Supabase

> **Status:** Implemented
> **Depends on:** SPEC 03
> **Date:** 2026-10-02
> **Objective:** Conectar la aplicación Next.js al proyecto de Supabase (clientes de navegador y de servidor con `@supabase/ssr`, variables de entorno y un Route Handler de salud), sin crear tablas ni migrar ningún dato.

---

## Por qué existe este spec

Hoy toda la app usa datos simulados (`lib/games.ts`, `lib/scores.ts`, `lib/home.ts`) y una sesión falsa en `localStorage` (`av_user`, `av_scores`). El camino hacia datos reales y autenticación pasa por Supabase, pero mezclar en una sola spec la conexión, el esquema, la migración de datos y la auth toca cuatro áreas a la vez. Este spec cubre solo el primer escalón: dejar la conexión lista y comprobada, para que las specs siguientes (esquema y datos, auth) partan de una base que ya funciona.

Estado previo que ya existe y **no se rehace**:

- El proyecto de Supabase (`project_ref` `klbftgoitzogabsskomp`), hoy con el esquema `public` vacío, y el MCP de Supabase configurado en `.mcp.json`.
- `.env.template` como único archivo `.env*` versionado, y `.env.local` (no versionado) con los valores reales.
- El patrón de Route Handler de `app/api/contacto/route.ts` (SPEC 03).
- Todas las pantallas, `lib/games.ts`, `lib/scores.ts`, `lib/home.ts` y la sesión simulada: **no cambian**.

## Scope

**In:**

- Dependencias nuevas en `package.json`: `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno documentadas (vacías) en `.env.template`, reemplazando el placeholder actual `SUPABASE_KEY=XXXXXX`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Valores reales en `.env.local` (no versionado), obtenidos con las herramientas `get_project_url` y `get_publishable_keys` del MCP de Supabase.
- `lib/supabase/client.ts`: cliente de navegador (`createBrowserClient`).
- `lib/supabase/server.ts`: cliente de servidor (`createServerClient`) para Server Components y Route Handlers, con las cookies de `next/headers`.
- Route Handler `app/api/supabase/health/route.ts` (`GET`) que usa el cliente de servidor para comprobar que la URL y la publishable key son válidas y que Supabase responde.
- Actualizar la sección «State of the codebase» de `CLAUDE.md`.
- Verificar el endpoint de salud con `curl` y con el **MCP de Playwright**, incluido un caso de fallo con una key inválida.

**Out of scope (para futuros specs):**

- Crear tablas, migraciones o datos semilla. El esquema `public` queda vacío; va en otra spec.
- Mover a Supabase el catálogo de juegos, las puntuaciones, el Salón de la Fama o los datos del home.
- Autenticación real (login, registro, invitado, `av_user`). La sesión sigue simulada en `localStorage`.
- `proxy.ts` (antes middleware) para refrescar la sesión en cada request: sin auth no hay sesión que refrescar.
- Políticas RLS, que dependen de las tablas que aún no existen.
- Claves secretas o `service_role` en la app.
- Tipos generados (`generate_typescript_types`): no hay tablas que tipar.
- Uso del cliente de navegador desde algún componente: queda creado pero sin consumidores hasta la spec de datos o de auth.
- Tests automatizados (`@playwright/test`): Playwright MCP sigue siendo solo verificación asistida.

## Modelo de datos

Este spec no introduce estructuras de datos persistentes ni toca `av_user` ni `av_scores`. Solo define el contrato de entorno y la respuesta del endpoint de salud.

```ts
// Variables de entorno (.env.template, valores reales en .env.local)
// NEXT_PUBLIC_SUPABASE_URL=              https://<project_ref>.supabase.co
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  clave pública (publishable)

// app/api/supabase/health/route.ts
// Respuesta:
// 200 { ok: true }
// 500 { ok: false, error: "CONFIG_FALTANTE" }   — falta alguna variable de entorno
// 500 { ok: false, error: "CONEXION_FALLIDA" }  — Supabase no responde o rechaza la key
```

Convenciones:

- Solo variables `NEXT_PUBLIC_*`: son públicas por diseño y la seguridad real la dará RLS en la spec de datos.
- El valor de la publishable key nunca se escribe en archivos versionados ni se imprime en logs.
- Los dos clientes se crean con una función (`createClient()`) por llamada, sin singleton compartido entre requests.

## Plan de implementación

Antes del paso 1, leer en `node_modules/next/dist/docs/01-app/` las guías de Route Handlers y de la API `cookies` de `next/headers` (AGENTS.md advierte que esta versión de Next tiene cambios incompatibles; en especial, comprobar si `cookies()` es asíncrona). Para el uso de `@supabase/ssr` con Next.js, consultar `search_docs` del MCP de Supabase.

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr`. Verificación: `npm install` termina sin errores y ambas aparecen en `package.json`.
2. **Variables de entorno.** En `.env.template`, quitar `SUPABASE_KEY=XXXXXX` y agregar `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` vacías. Poner los valores reales en `.env.local`, obtenidos con `get_project_url` y `get_publishable_keys`. Verificación: `.env.local` no aparece en `git status` y `.env.template` no contiene ningún valor real.
3. **Cliente de navegador.** Crear `lib/supabase/client.ts` que exporta `createClient()` con `createBrowserClient` y las dos variables. Verificación: `npm run build` compila.
4. **Cliente de servidor.** Crear `lib/supabase/server.ts` que exporta `createClient()` con `createServerClient`, leyendo y escribiendo cookies mediante `cookies()` de `next/headers`. Verificación: `npm run build` compila.
5. **Route Handler de salud.** Crear `app/api/supabase/health/route.ts` (`GET`): si falta alguna variable responde 500 `CONFIG_FALTANTE` sin llamar a Supabase; si están, crea el cliente de servidor y hace una consulta a una tabla inexistente a propósito (`supabase.from("health_check").select("*").limit(1)`). Si el error devuelto es `PGRST205` (tabla no encontrada en el esquema), la conexión y la key son válidas y responde 200 `{ ok: true }`; cualquier otro error o excepción de red responde 500 `CONEXION_FALLIDA`. Verificación: `curl` a `/api/supabase/health` responde 200.
6. **Documentación.** Actualizar «State of the codebase» en `CLAUDE.md`: nueva dependencia, `lib/supabase/{client,server}.ts`, la ruta `/api/supabase/health`, las dos variables en `.env.template` y la nota de que aún no hay tablas ni consumidores. Verificación: `npm run build` y `npm run lint` sin errores.
7. **Verificación con Playwright MCP.** Ver «Cómo se verifica».

## Criterios de aceptación

### Build y dependencias

- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`.

### Entorno

- [ ] `.env.template` contiene `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` sin valor, y ya no contiene `SUPABASE_KEY`.
- [ ] `git status` no muestra `.env.local` como archivo a commitear.
- [ ] Ningún archivo versionado contiene el valor real de la publishable key.

### Conexión

- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen y cada uno exporta `createClient()`.
- [ ] `GET /api/supabase/health` con las variables correctas responde 200 con `{ ok: true }`.
- [ ] Con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` inválida, `GET /api/supabase/health` responde 500 con `{ ok: false, error: "CONEXION_FALLIDA" }`.
- [ ] Sin `NEXT_PUBLIC_SUPABASE_URL`, `GET /api/supabase/health` responde 500 con `{ ok: false, error: "CONFIG_FALTANTE" }`.
- [ ] `list_tables` del MCP de Supabase sigue devolviendo el esquema `public` vacío tras la verificación.

### Sin regresiones

- [ ] `/`, `/biblioteca`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar`, `/acceso`, `/salon` y `/acerca` responden 200.
- [ ] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.
- [ ] El inicio de sesión simulado sigue funcionando (`av_user` en `localStorage`).

### Cómo se verifica (Playwright MCP y curl)

Con `npm run dev` corriendo y `.env.local` con las dos variables reales:

1. `curl -i http://localhost:3000/api/supabase/health` → status 200 y cuerpo `{"ok":true}`.
2. `browser_navigate` a `/api/supabase/health` y `browser_snapshot`: el cuerpo muestra `{"ok":true}`.
3. `browser_navigate` a cada ruta de «Sin regresiones» y `browser_console_messages`: sin errores.
4. Cambiar temporalmente `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a un valor inválido, reiniciar `npm run dev`, repetir el paso 1 y comprobar 500 `CONEXION_FALLIDA`. Restaurar la key real al terminar.
5. Quitar temporalmente `NEXT_PUBLIC_SUPABASE_URL`, reiniciar, repetir el paso 1 y comprobar 500 `CONFIG_FALTANTE`. Restaurar el valor al terminar.
6. `list_tables` del MCP de Supabase con `schemas: ["public"]`: debe devolver `[]`.

## Decisiones

- **Sí:** esta spec cubre solo la conexión. Esquema, datos y auth van en specs separadas; mezclarlos tocaría cuatro áreas a la vez.
- **No:** crear una tabla o datos de prueba. El usuario decidió que no se agregan tablas ni datos en esta spec.
- **Sí:** `@supabase/ssr` con `createBrowserClient` y `createServerClient`. Es el camino que luego soporta auth con cookies en Next.js, y evita rehacer los clientes en la spec de auth.
- **No:** `@supabase/supabase-js` solo, sin helpers de SSR. Serviría hoy, pero no con sesión en cookies.
- **No:** clave `service_role` o secreta. La app solo usa la publishable key; el acceso a datos lo restringirá RLS.
- **Sí:** variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, que reemplazan al placeholder `SUPABASE_KEY=XXXXXX`, un nombre ambiguo que no distingue URL de clave ni es accesible desde el navegador.
- **Sí:** dos archivos, `lib/supabase/client.ts` y `lib/supabase/server.ts`, porque navegador y servidor manejan las cookies de forma distinta.
- **Sí:** Route Handler de salud como prueba de conexión de punta a punta, igual que el patrón de `app/api/contacto/route.ts` y fácil de probar con `curl`.
- **Sí (ajuste respecto a la propuesta de la conversación):** la comprobación consulta una tabla inexistente y acepta el error `PGRST205` como señal de éxito, en vez de usar `supabase.auth.getSession()`. Sin sesión, `getSession()` solo lee cookies y no llama a la red, así que respondería OK aunque la URL o la key fueran inválidas. Una key inválida da un error distinto (rechazo de autenticación), y eso es lo que el paso 4 de verificación comprueba.
- **No:** `proxy.ts` en esta spec. Sin auth no hay sesión que refrescar y se evita ejecutar código en cada request sin necesidad; entra con la spec de auth.
- **Sí:** conservar el endpoint de salud tras esta spec. Es una pieza pequeña y útil para diagnosticar despliegues; si se decide quitarlo, se hace en una spec posterior.
- **Sí:** crear `lib/supabase/client.ts` aunque nadie lo use todavía. Es parte de la conexión pedida y queda listo para la spec de datos o de auth.

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Esta versión de Next cambia `cookies()` u otras APIs respecto a la documentación de Supabase | Leer `node_modules/next/dist/docs/01-app/` antes del paso 3 y adaptar `lib/supabase/server.ts` a lo que indique la doc local.        |
| `PGRST205` no es el código que devuelve esta versión de PostgREST para una tabla inexistente | El paso 5 se valida con `curl`; si el código difiere, ajustar la comparación y reflejarlo en la spec antes de dar el paso por hecho. |
| Una key inválida también termina en un error que se confunde con `PGRST205`                  | El paso 4 de verificación prueba explícitamente una key inválida y exige 500.                                                        |
| Cuando se creen tablas, la tabla `health_check` inexistente podría crearse por accidente     | El nombre es deliberadamente reservado; la spec de esquema debe evitarlo. Documentado en `CLAUDE.md` en el paso 6.                   |
| Dejar la key inválida o la URL borrada tras probar los fallos                                | Los pasos 4 y 5 indican restaurar el valor real al terminar.                                                                         |
| Exponer la publishable key en el repositorio                                                 | Solo se escribe en `.env.local` (no versionado); `.env.template` queda con valores vacíos.                                           |

## Qué **no** está en este spec

- Tablas, migraciones, datos semilla o RLS.
- Mover juegos, puntuaciones, Salón de la Fama o datos del home a Supabase.
- Autenticación real, `proxy.ts` y cookies de sesión.
- Claves secretas o `service_role`.
- Tipos TypeScript generados desde la base de datos.
- Tests automatizados (`@playwright/test`) en el repo.

Cada uno, si llega, va en su propio spec.
