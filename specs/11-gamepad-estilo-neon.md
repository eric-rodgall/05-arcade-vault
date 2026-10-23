# SPEC 11 — Gamepad con el estilo gráfico «MK-II» neón

> **Status:** Implemented
> **Depends on:** SPEC 10
> **Date:** 2026-10-22
> **Objective:** Restilar el gamepad virtual de los juegos (`TouchControls`) para que siga el estilo gráfico de `references/gamepad-assets/` (carcasa oscura con borde cian, D-pad de teclas 3D con hub y gema, botones A/B redondos con brillo y aro), sin cambiar su comportamiento.

---

## Por qué existe este spec

SPEC 10 dio un gamepad funcional pero con un estilo provisional: cuadrados con borde cian y círculos planos. `references/gamepad-assets/` (`gamepad.html` y la captura `gamepad-neon.png`) contiene el diseño final «Gamepad MK-II», coherente con el resto del portal (cian `#00f5ff`, magenta `#ff006e`, Press Start 2P). Este spec lo lleva al componente real.

Estado previo que ya existe y **no se rehace**:

- Toda la lógica de entrada de SPEC 10: `setInput`, `inputRef`, `TOUCH_LAYOUTS`, repetición de `caida`, liberación en pausa/fin/desmontaje, multitoque.
- Detección por CSS `(pointer: coarse)`, `position: sticky` al fondo en móvil, `touch-action: none` y `user-select: none`.
- El reproductor (HUD, `.crt`, modal de fin) y los motores/canvas.
- Las fuentes (`--pixel` = Press Start 2P, `--mono` = JetBrains Mono) y los tokens de color (`--cyan`, `--magenta`) ya cargados en `app/layout.tsx`/`globals.css`.

## Scope

**In:**

- Carcasa `.gp` alrededor de todo el mando, según la referencia: degradado `#1c1c28 → #0c0c14`, borde de 1 px cian tenue, radio 22 px (16 px a ≤ 620 px), borde interior inset de 4 px (`::before`), trama de puntos de 8 px (`::after`), sombras exteriores e interiores. Con padding compactado para no robar altura al canvas.
- D-pad restilado en `app/globals.css`:
  - Teclas 3D (degradado oscuro, borde tenue, sombra inferior sólida `0 4px 0`), flecha SVG triangular en lugar de texto (`←`, `→`, etc.).
  - Estado pulsado: la tecla baja 3 px, la flecha y el borde pasan a cian con resplandor.
  - Hub central con gema cian en rombo (`clip-path`) y animación `pulse-led`, siempre presente.
  - Solo se dibujan las teclas que usa el juego (`TOUCH_LAYOUTS`), en su posición de cruz.
- Botones A/B restilados:
  - Círculo con degradado radial, borde de 2 px, reflejo, resplandor y sombra `0 6px 0`, aro punteado (`.ab-ring`) que aparece al pulsar.
  - Letra «A»/«B» en Press Start 2P dentro del botón, con la acción del juego (`DISPARO`, `ROTAR`, `CAÍDA`) como texto pequeño bajo el botón.
  - Colores como la referencia: **A magenta, B cian**. Orden visual `B | A` cuando hay dos botones; con un solo botón (`asteroides`) solo A magenta.
- `components/touch-controls.tsx`: nuevo marcado (carcasa, SVG de flechas, hub, letra, aro y etiqueta) y clase `on` en el botón mientras está pulsado, controlada por estado de React (más fiable que `:active` con `setPointerCapture`). El `aria-label`, `type="button"`, pointer events, repetición y liberación no cambian.
- Estado deshabilitado (pausa o modal de fin): mando atenuado (`opacity` y sin resplandor), como hoy.
- Responsive: se conserva el criterio de SPEC 10 (teclas del D-pad y botones A/B ≥ 56 px y sin desbordar horizontalmente a 375 px). A ≤ 520 px, A/B se apilan en vertical si lado a lado no caben (`caida`).
- Eliminar los estilos `.touch-btn`, `.touch-dir*` y `.touch-action*` de SPEC 10 que queden sin uso.
- Actualizar «Shared code» de `CLAUDE.md` (descripción del gamepad y su estilo) y registrar la ruta de las referencias.

**Out of scope (para futuros specs):**

- Cambios en la lógica de entrada, `TOUCH_LAYOUTS`, motores, canvas o reglas de los juegos.
- Mostrar el gamepad con puntero fino (escritorio) o activar sus botones con el teclado (WASD/Z/X/J/K del `gamepad.html`). Sigue visible solo con `(pointer: coarse)`.
- Reasignar teclas o añadir botones nuevos (Start/Select, gatillos).
- Vibración háptica y sonido al pulsar.
- Aplicar el estilo a otros controles (HUD, botones `.btn`, modal).
- Skins del gamepad ni selector de tema del mando.
- Cruz completa con teclas inactivas apagadas.
- Copiar al repo `gamepad.html` o `gamepad-neon.png` (`references/` no se importa ni se modifica).
- Tests automatizados en el repo.

## Modelo de datos

No se añaden tablas, columnas, claves de `localStorage` ni tipos. `TouchLayout`/`TouchButton` (SPEC 10) no cambian.

Convenciones de estilo (solo CSS):

- Variables locales del botón A/B: `--ab-mid`, `--ab-deep`, `--ab-glow` por botón, como en la referencia.
- Clases nuevas: `.gp` (carcasa), `.gp-dpad`, `.dp` (+ `.dp-up/-down/-left/-right`), `.dp-hub`, `.dp-hub-gem`, `.gp-actions`, `.ab` (+ `.a`/`.b`), `.ab-letter`, `.ab-ring`, `.ab-label`; y `.on` para el estado pulsado.
- Las clases siguen bajo `.touch-controls`, que sigue siendo el contenedor oculto/visible por `(pointer: coarse)`.

## Plan de implementación

Antes del paso 1, abrir `references/gamepad-assets/gamepad.html` y releer `components/touch-controls.tsx` y el bloque `/* ===== controles táctiles ===== */` y `/* ===== reproductor en móvil ===== */` de `app/globals.css`.

1. **Marcado.** En `components/touch-controls.tsx`: envolver el mando en la carcasa `.gp`; renderizar flechas SVG, `.dp-hub` con gema, y A/B con `.ab-ring`, letra y etiqueta; estado `pressed` que añade `.on`. Verificación: `npm run build` y `npm run lint` sin errores; la lógica de entrada no se ha tocado (`git diff` solo marcado/estado visual).
2. **CSS base.** En `app/globals.css`: portar a `.touch-controls` los estilos de carcasa, D-pad y A/B de la referencia, usando `--pixel`, `--cyan` y `--magenta` ya definidos, más `@keyframes pulse-led`. Eliminar los estilos antiguos sin uso. Verificación: con emulación táctil el mando se parece a `gamepad-neon.png`.
3. **Responsive y estados.** Ajustar a ≤ 620 px y ≤ 520 px (tamaños ≥ 56 px, apilado de A/B si no caben, padding compacto de la carcasa), `:disabled` atenuado y mantener el `sticky` de SPEC 10. Verificación: a 375 × 667 `scrollWidth <= 375` en los 4 juegos y el canvas sigue visible junto al mando.
4. **Documentación.** Actualizar `CLAUDE.md` y pasar este spec a `Implemented`. Verificación: `npm run build` y `npm run lint` sin errores.
5. **Verificación.** Ver «Cómo se verifica».

## Criterios de aceptación

### Build

- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `git diff` en `lib/games/` y en `components/*-canvas.tsx` está vacío.
- [ ] `references/` no tiene cambios (`git status`).
- [ ] No quedan en `app/globals.css` ni en `components/` referencias a `.touch-btn`, `.touch-dir` ni `.touch-action`.

### Estilo

- [ ] Con emulación táctil existe la carcasa `.gp` con degradado oscuro, borde cian tenue y radio ≥ 16 px en los 4 juegos reales.
- [ ] El D-pad muestra flechas SVG (no texto), el hub con gema cian y solo las teclas del juego: `asteroides` ← → ↑; `caida` ← → ↓; `bloque-buster` ← →; `serpentina` ← → ↑ ↓.
- [ ] A es magenta y B es cian; con dos botones el orden visual es `B | A`; `asteroides` solo muestra A.
- [ ] Cada botón A/B muestra su letra en Press Start 2P y su acción debajo: `asteroides` A «DISPARO»; `caida` A «ROTAR», B «CAÍDA».
- [ ] Un botón pulsado tiene la clase `on` y se ve hundido con resplandor; al soltar la pierde.
- [ ] Con PAUSA activa o el modal de fin abierto el mando se ve atenuado y ningún botón conserva la clase `on`.
- [ ] La captura del mando a 375 px y la de `gamepad-neon.png` comparten paleta, carcasa, tipo de teclas y botones (revisión visual contra la referencia).

### Layout y detección

- [ ] Con puntero fino `.touch-controls` sigue con `display: none` en los 4 juegos reales.
- [ ] En juegos simulados (`/juegos/gloton/jugar`) no existe `.touch-controls`.
- [ ] A 375 × 667 `document.documentElement.scrollWidth <= 375` en `/juegos/<id>/jugar` de los 4 juegos.
- [ ] A 375 px las teclas del D-pad y los botones A/B miden ≥ 56 px.
- [ ] A 375 × 667 el mando sigue `sticky` al fondo y el canvas sigue visible sin desplazarse.

### Comportamiento sin regresiones (con emulación táctil)

- [ ] `caida`: ← → ↓ siguen moviendo y repitiendo (220 ms + 80 ms); A rota y B hace caída instantánea.
- [ ] `bloque-buster`: mantener ← o → mueve la paleta y se detiene al soltar.
- [ ] `serpentina`: un toque, un giro.
- [ ] `asteroides`: DISPARO dispara una bala por toque; ↑ da empuje.
- [ ] Soltar el dedo fuera del botón libera la tecla; pausar con un botón pulsado la libera.
- [ ] Con el modal «FIN DEL JUEGO» abierto el mando no responde y el campo de iniciales sigue siendo usable a 375 px.
- [ ] Teclado y ratón siguen funcionando en escritorio en los 4 juegos.
- [ ] Ninguna pantalla muestra errores de hidratación ni errores en la consola.


## Decisiones

- **Sí:** portar la carcasa `.gp` completa además de los botones. Es lo que muestra la captura de referencia; se compacta el padding para no quitar altura al canvas en móvil.
- **No:** solo restilar los botones sin carcasa. Menos altura pero se aleja de la captura.
- **Sí:** letra «A»/«B» dentro del botón y la acción en texto pequeño debajo. Respeta la referencia y conserva la información de SPEC 10 (DISPARO/ROTAR/CAÍDA), sin que el jugador tenga que adivinar.
- **No:** solo la letra, idéntico a la referencia. Dejaría la acción solo en `aria-label`.
- **Sí:** A magenta y B cian, orden `B | A`, como la referencia. Sustituye el amarillo de B de SPEC 10.
- **Sí:** D-pad con solo las teclas del juego + hub. Coherente con el mando contextual de SPEC 10; sin botones muertos.
- **No:** cruz completa con teclas inactivas apagadas.
- **Sí:** clase `on` por estado de React en lugar de `:active`. Con `setPointerCapture` y la liberación en pausa, el estado visual debe seguir al estado lógico de la tecla.
- **Sí:** mantener ≥ 56 px en móvil (criterio de SPEC 10) aunque la referencia usa teclas de 46 px a ≤ 620 px. Se prioriza la usabilidad táctil sobre la fidelidad en ese punto.
- **Sí:** reutilizar los tokens y fuentes ya cargados. No se enlaza Google Fonts ni se copia `gamepad.html`; `references/` es solo visual.
- **Sí:** el gamepad sigue visible solo con `(pointer: coarse)` y sin teclado. El soporte de WASD/Z/X de `gamepad.html` no aplica: el teclado ya controla los motores directamente.
- **Sí:** spec separado de SPEC 10 (ya `Implemented`) y limitado a presentación, sin tocar motores ni contratos.

## Riesgos

| Riesgo                                                                        | Mitigación                                                                                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| La carcasa y la etiqueta bajo A/B restan altura al canvas en 375 × 667        | Padding compacto, sticky sin cambios y criterio de que el canvas siga visible; si no cabe, reducir padding o etiqueta. |
| `caida` (3 teclas + 2 botones) desborda 375 px con carcasa y botones ≥ 56 px  | A/B apilados en vertical a ≤ 520 px (como hoy) y `scrollWidth <= 375` como criterio.                                   |
| Sombras, `filter` y animación `pulse-led` penalizan el rendimiento en móviles | Solo `transform`/`opacity` animados; `pulse-led` solo en el hub; sin `backdrop-filter`.                                |
| La clase `on` queda pegada tras pausa o `pointercancel`                       | Reutilizar los mismos puntos de liberación de SPEC 10 para el estado visual y probarlo en la verificación.             |
| El resplandor cian de la carcasa contrasta mal sobre el `.crt` o el fondo     | Revisar en captura a 375 px; ajustar la intensidad de `box-shadow` sin cambiar la paleta.                              |

## Qué **no** está en este spec

- Cambios de lógica de entrada, motores, canvas o reglas.
- Gamepad con puntero fino o activado por teclado.
- Botones nuevos (Start/Select, gatillos) o reasignación de teclas.
- Vibración háptica y sonido.
- Estilo de otros controles de la web.
- Skins o temas del mando.
- Tests automatizados en el repositorio.

Cada uno, si llega, va en su propio spec.
