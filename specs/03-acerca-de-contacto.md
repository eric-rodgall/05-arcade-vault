# SPEC 03 — Página «Acerca de» con formulario de contacto (Resend)

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-09-28
> **Objective:** Portar la página «Acerca de» del prototipo `references/templates/home-about/about.jsx` a `/acerca`, con nav actualizado, y conectar su formulario de contacto a un envío real de correo vía Resend desde un Route Handler.

---

## Por qué existe este spec

SPEC 02 portó el home y dejó explícitamente fuera «la página Acerca de... ni su formulario de contacto» (`references/templates/home-about/about.jsx`, bloque de estilos `ABOUT PAGE` en `styles.css`). Este spec cierra ese pendiente: agrega la ruta, el enlace de nav y, a diferencia del prototipo (que solo simulaba el envío con un `setTimeout` visual), conecta el formulario a un envío real de correo con Resend.

Estado previo que ya existe y **no se rehace**:

- `components/nav.tsx`, `components/reveal.tsx`, `app/globals.css` (con los bloques ya portados en SPEC 01/02).
- El patrón de Server Component + piezas cliente mínimas (`components/home-page.tsx` + `components/reveal.tsx`) se repite aquí.

## Scope

**In:**

- Nueva ruta `/acerca` (Server Component `components/about-page.tsx`) con las dos secciones del prototipo, en este orden:

  | Sección  | Contenido                                                                                                   |
  | -------- | ------------------------------------------------------------------------------------------------------------ |
  | Hero     | Kicker «▸ ACERCA DE», título «ACERCA DE ARCADE VAULT», misión, y `highlight-row` con 3 tarjetas (❤️, navegador, crecimiento) |
  | Divisor  | Banda decorativa `.about-divider` con 24 píxeles animados                                                    |
  | Contacto | Kicker «▸ CONTACTO», título «CONTÁCTANOS», sub-texto, 3 tips, y el formulario (nombre, correo, mensaje)      |

- Enlace **«Acerca de»** en el nav de escritorio y en el panel móvil (`components/nav.tsx`), como último enlace antes de «Iniciar Sesión»/«Cuenta», igual que en `references/templates/home-about/nav.jsx`. Activo solo en `/acerca`.
- Animación `.reveal` → `.in` en el divisor y la sección de contacto, reutilizando `components/reveal.tsx` (sin duplicar el componente).
- Formulario de contacto como Client Component (`components/contact-form.tsx`) con los mismos tres campos y la misma validación de "no vacío" + `shake` del prototipo.
- Envío real de correo:
  - Route Handler `app/api/contacto/route.ts` (`POST`) que recibe `{ name, email, msg }`, valida que no estén vacíos, y llama a la API de Resend desde el servidor.
  - El remitente es `onboarding@resend.dev` (dominio de pruebas de Resend, sin verificación de dominio propio).
  - El destinatario se lee de la variable de entorno `RESEND_TO_EMAIL`, sin valor por defecto en código. Si falta, la ruta responde error 500 sin intentar llamar a Resend.
  - La API key se lee de `RESEND_API_KEY` (variable de entorno, ya existe en `.env.local` de este entorno).
  - Dependencia nueva: paquete `resend` en `package.json`.
  - `.env.example` documenta `RESEND_API_KEY` y `RESEND_TO_EMAIL` como placeholders vacíos.
- Estados del formulario en el cliente:
  - **Vacío / inválido:** igual que el prototipo — `shake` de 400ms, no se envía nada.
  - **Enviando:** el botón se deshabilita mientras espera la respuesta del `fetch`.
  - **Éxito:** se muestra el bloque `.terminal-success` del prototipo (idéntico texto y estructura).
  - **Error del servidor o de red:** el formulario permanece visible (no pasa a `.terminal-success`) y muestra una línea de error estilo terminal, ej. `[ERROR] NO SE PUDO ENVIAR. INTENTA DE NUEVO.`, sin perder lo ya escrito en los campos.
- Portar a `app/globals.css` el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas 1071–1150: `.about*`, `.highlight*`, `.about-divider`, `.div-*`, `.contact-*`, `.terminal-success`, `.term-*`, `.btn.press:active`, `.divider`), reutilizando clases ya existentes (`.btn`, `.pixel`, `.neon-*`, `.kicker`, `@keyframes blink`) sin duplicarlas.
- Validar la pantalla, el nav y el flujo de envío (éxito y error) con el **MCP de Playwright**, incluyendo una verificación real de envío usando la `RESEND_API_KEY` ya presente en `.env.local`.

**Out of scope (para futuros specs):**

- El gamepad decorativo (`.gp*`) del prototipo — sigue fuera, igual que en SPEC 02.
- Persistir los mensajes de contacto en algún lado (base de datos, `localStorage`, log estructurado). Solo se envían por correo.
- Rate limiting, protección anti-spam (captcha, honeypot) o límite de envíos.
- Validación de formato de email (regex). Se mantiene la validación de solo "no vacío" del prototipo.
- Panel de administración o listado de mensajes recibidos.
- Cambiar el remitente a un dominio propio verificado en Resend.
- Internacionalización o cambios de copy más allá de traducir literalmente el prototipo (que ya está en español).
- Suite de tests automatizados (`@playwright/test`): Playwright MCP sigue siendo solo verificación asistida, como en SPEC 01/02.

## Modelo de datos

No se introducen estructuras de datos persistentes. Solo tipos para el contrato del Route Handler:

```ts
// app/api/contacto/route.ts
interface ContactRequestBody {
  name: string;
  email: string;
  msg: string;
}

// Respuesta:
// 200 { ok: true }
// 400 { ok: false, error: "CAMPOS_VACIOS" }        — si falta algún campo
// 500 { ok: false, error: "ENVIO_FALLIDO" }        — si Resend falla o falta config
```

Convenciones:

- No hay persistencia nueva. No se tocan `av_user` ni `av_scores`.
- El estado del formulario (`form`, `sent`, `shake`, `sending`, `error`) vive solo en memoria del componente cliente, como en el prototipo — no se guarda en `localStorage`.

## Plan de implementación

Antes del paso 1, leer `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (AGENTS.md advierte que esta versión de Next tiene cambios incompatibles respecto al conocimiento previo).

1. **Dependencia.** Agregar `resend` a `package.json` (`npm install resend`). Verificación: `npm install` termina sin errores.
2. **Variables de entorno.** Crear/actualizar `.env.example` con `RESEND_API_KEY=` y `RESEND_TO_EMAIL=` vacíos. Confirmar que `.env.local` (ya existente, no versionado) tiene ambos valores reales para las pruebas de este spec. Verificación: `.env.local` no aparece en `git status` como archivo a commitear.
3. **Estilos.** Portar a `app/globals.css` el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas 1071–1150), sin el bloque `GAMEPAD`. Reutilizar clases existentes si ya están definidas. Verificación: `npm run build` compila.
4. **Route Handler.** Crear `app/api/contacto/route.ts` con `POST`: valida campos no vacíos → 400 si faltan; si falta `RESEND_TO_EMAIL` o `RESEND_API_KEY` → 500; si están, llama a `resend.emails.send` con remitente `onboarding@resend.dev`, destinatario `RESEND_TO_EMAIL`, asunto y cuerpo con `name`, `email`, `msg` → 200 en éxito, 500 si Resend devuelve error. Verificación: `npm run build` compila; probar con `curl` local que responde 400 con body vacío.
5. **Formulario cliente.** Crear `components/contact-form.tsx` (Client Component) con el mismo markup/estado que `about.jsx` (`form`, `sent`, `shake`), agregando `sending` y `error`. El `onSubmit` hace `fetch("/api/contacto", { method: "POST", body: JSON.stringify(form) })`; en éxito muestra `.terminal-success`; en error muestra la línea `[ERROR] ...` sin limpiar los campos. Verificación: `npm run build` compila.
6. **Página «Acerca de».** Crear `components/about-page.tsx` (Server Component) con el hero, el divisor `.reveal` y la sección de contacto `.reveal` (que renderiza `<ContactForm />`), reutilizando `components/reveal.tsx`. Crear `app/acerca/page.tsx` que renderiza `<AboutPage />`. Verificación: `/acerca` muestra las dos secciones completas.
7. **Nav.** En `components/nav.tsx` agregar «Acerca de» como último enlace (antes de auth) en escritorio y panel móvil, activo solo en `/acerca`. Verificación: el nav muestra Inicio · Biblioteca · Salón de la Fama · Acerca de, y el activo cambia correctamente.
8. **Documentación.** Actualizar «State of the codebase» en `CLAUDE.md`: nueva ruta `/acerca`, archivos nuevos, mención de la dependencia `resend` y de `RESEND_API_KEY`/`RESEND_TO_EMAIL` en `.env.example`. Verificación: `npm run build` y `npm run lint` sin errores.
9. **Verificación con Playwright MCP.** Ver sección «Cómo se verifica» abajo, incluyendo un envío real exitoso con la `RESEND_API_KEY` de `.env.local`.

## Criterios de aceptación

### Build y rutas

- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `/acerca` responde 200.
- [ ] `POST /api/contacto` con body vacío responde 400 con `{ ok: false, error: "CAMPOS_VACIOS" }`.
- [ ] Ninguna pantalla muestra errores de hidratación ni errores en la consola del navegador.

### Página «Acerca de» (`/acerca`)

- [ ] El hero muestra el kicker «▸ ACERCA DE», el título «ACERCA DE ARCADE VAULT», el texto de misión y las 3 tarjetas de `highlight-row`.
- [ ] El divisor con los 24 píxeles animados aparece entre el hero y la sección de contacto.
- [ ] La sección de contacto muestra el kicker «▸ CONTACTO», el título «CONTÁCTANOS», el sub-texto y los 3 tips.
- [ ] El formulario muestra los campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, y el botón «▶ ENVIAR MENSAJE».
- [ ] Enviar el formulario con algún campo vacío deja el formulario visible y aplica la animación `shake` (clase `.shake` presente brevemente).
- [ ] Enviar el formulario completo, con `RESEND_API_KEY` y `RESEND_TO_EMAIL` válidos en `.env.local`, reemplaza el formulario por el bloque `.terminal-success` con el nombre en mayúsculas en el mensaje final, y el correo llega realmente a `RESEND_TO_EMAIL` (verificación manual de bandeja de entrada, fuera del alcance de Playwright).
- [ ] Si `RESEND_API_KEY` es inválida o Resend responde error, el formulario NO pasa a `.terminal-success`, sigue mostrando los datos escritos y muestra la línea `[ERROR] ...`.
- [ ] «ENVIAR OTRO MENSAJE» desde `.terminal-success` vuelve a mostrar el formulario vacío.
- [ ] Las secciones con `.reveal` quedan visibles (`.in`) tras hacer scroll hasta ellas.

### Nav

- [ ] El nav de escritorio muestra, en este orden: «Inicio», «Biblioteca», «Salón de la Fama», «Acerca de».
- [ ] El panel móvil muestra las mismas cuatro opciones más «Iniciar Sesión» (o «Cuenta» con sesión), en ese orden.
- [ ] En `/acerca` solo «Acerca de» está activo; en las demás rutas «Acerca de» no está activo.

### Responsive

- [ ] A 375 px de ancho `/acerca` no tiene scroll horizontal.
- [ ] A 375 px `highlight-row` y `contact-grid` se apilan en una sola columna.

### Cómo se verifica (Playwright MCP)

Con `npm run dev` corriendo y `.env.local` con `RESEND_API_KEY` y `RESEND_TO_EMAIL` reales:

1. `browser_navigate` a `/acerca` y `browser_snapshot` para comprobar textos, tarjetas y formulario.
2. `browser_console_messages`: debe estar vacío de errores.
3. `browser_click` en «Acerca de» del nav desde otra ruta y comprobar con `browser_evaluate` (`location.pathname`) que llega a `/acerca`.
4. Enviar el formulario vacío: `browser_click` en «▶ ENVIAR MENSAJE» y comprobar con `browser_evaluate` que el formulario tiene la clase `shake`.
5. Llenar los tres campos y enviar: `browser_network_requests` para confirmar el `POST /api/contacto` con status 200, y `browser_snapshot` para confirmar que aparece `.terminal-success` con el nombre en mayúsculas.
6. Confirmar manualmente (fuera de Playwright) que el correo llegó a `RESEND_TO_EMAIL`.
7. Simular un fallo cambiando temporalmente `RESEND_API_KEY` a un valor inválido, reiniciar `npm run dev`, repetir el envío y comprobar que aparece la línea `[ERROR] ...` y no `.terminal-success`. Restaurar la key real al terminar.
8. `browser_evaluate` con `document.documentElement.scrollWidth <= window.innerWidth` tras `browser_resize` a 375×812.
9. `browser_take_screenshot` de `/acerca` en escritorio y a 375 px, comparados visualmente con `references/templates/home-about/arcade-vault-standalone.html`.

## Decisiones

- **Sí:** ruta `/acerca`, coincide con lo que SPEC 01/02 ya anticipaban (`/acerca` responde 404 hasta este spec) y con el copy «Acerca de» del nav del prototipo.
- **Sí:** Route Handler (`app/api/contacto/route.ts`) en vez de Server Action. Mantiene la API key en servidor y es el patrón estándar para que el cliente controle el estado de carga/error con `fetch`.
- **No:** Server Action. Funcionaría igual de bien, pero un Route Handler explícito es más fácil de probar con `curl` y de inspeccionar con `browser_network_requests`.
- **Sí:** remitente `onboarding@resend.dev`. No requiere verificar un dominio propio; correcto para un MVP.
- **No:** dominio propio verificado. Añadiría un paso de configuración externo fuera del control de este repo.
- **Sí:** destinatario solo por variable de entorno (`RESEND_TO_EMAIL`), sin valor por defecto en código. Evita hardcodear un correo personal en el repo.
- **Sí:** en error de envío, el formulario conserva los datos y muestra un mensaje de error inline, en vez de mostrar éxito falso. Es más honesto con el usuario y evita reportes de "dije que envié pero nunca llegó".
- **No:** mostrar siempre éxito (fire-and-forget). Engañaría al usuario si el envío realmente falla.
- **Sí:** mantener la validación de "solo no vacío" del prototipo, sin regex de email. Menor scope, consistente con que SPEC 01/02 tampoco añaden validaciones nuevas al formulario de auth.
- **Sí:** verificación real de envío con la `RESEND_API_KEY` ya presente en `.env.local` de este entorno, en vez de mockear Resend. Es la única forma de confirmar que el flujo funciona de punta a punta antes de aprobar el spec.
- **No:** persistir los mensajes de contacto en `localStorage` o una base de datos. Fuera del alcance: este spec solo cubre el envío de correo.

## Riesgos

| Riesgo                                                                                     | Mitigación                                                                                                      |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------|
| `RESEND_API_KEY` o `RESEND_TO_EMAIL` ausentes en el entorno de despliegue                   | El Route Handler responde 500 explícito (`ENVIO_FALLIDO`) en vez de fallar silenciosamente; documentado en `.env.example` y en CLAUDE.md. |
| Esta versión de Next cambia la forma de los Route Handlers                                  | Leer `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` antes de escribir la ruta.    |
| Estilos del bloque `ABOUT PAGE` chocan con clases ya existentes (`.divider`, `.kicker`)      | Revisar cada clase contra `globals.css` actual antes de pegarla; reutilizar la existente si ya está.            |
| Errores de hidratación por estado `sending`/`error` que difiere entre servidor y cliente    | `ContactForm` es 100% Client Component; el Server Component `AboutPage` no mantiene ese estado.                 |
| Probar el fallo de envío (paso 7 de Playwright) deja la key inválida puesta por accidente   | El paso de verificación indica explícitamente restaurar la key real al terminar.                                |

## Qué **no** está en este spec

- El gamepad decorativo del prototipo.
- Persistencia de mensajes de contacto, panel de administración o notificaciones adicionales.
- Rate limiting, captcha o cualquier protección anti-spam.
- Validación de formato de email o cualquier validación más allá de "no vacío".
- Dominio propio verificado en Resend.
- Tests automatizados (`@playwright/test`) en el repo.

Cada uno, si llega, va en su propio spec.
