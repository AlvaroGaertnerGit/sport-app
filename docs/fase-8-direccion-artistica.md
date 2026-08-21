# Sport Coach — Fase 8: Auditoría visual y dirección artística

> Auditoría realizada en vivo contra la app real (Supabase, usuario y rutina de prueba reales) y contra Vercel, Apple y alvarogaertner.com. Sin cambios de código en esta fase.

**Palabras clave de la dirección:** Athletic · Premium · Technical · Confident · Modern · Focused

---

## 1. Auditoría — lo que hay ahora mismo

Sesión real contra Supabase: usuario con perfil, plan activo "Plan Rotación", rutina "Espalda" con 4 ejercicios (Flexiones, Dominadas, Farmer's carry + uno más). Flujo completo recorrido: login → today → empezar → registrar serie → descanso → serie completada → ejercicio completado.

### Composición

Todo vive dentro de una columna `max-w-md` centrada, con un único patrón de tarjeta repetido en cada pantalla: borde de 1px casi invisible, esquinas muy redondeadas, mucho espacio en blanco alrededor. El problema no es la disciplina — es que **todo tiene el mismo peso**. La tarjeta de login y la tarjeta de "empezar tu entrenamiento de espalda" ocupan proporciones casi idénticas de la pantalla, con la misma jerarquía visual. No hay ningún momento que se sienta "más importante" que el resto: ni el saludo de Today, ni el nombre del ejercicio en Workout, ni el propio timer de descanso.

### Tipografía

Una sola familia (Geist Sans) en un rango de tamaños muy estrecho: prácticamente todo cae entre `text-sm` y `text-2xl`, casi siempre en `font-semibold`. El título más grande de toda la app — el nombre del ejercicio en Workout — mide lo mismo que un título de sección cualquiera. No existe ningún salto de escala real, ningún momento "display". Los números (series, repeticiones, el propio timer) usan la misma tipografía de texto corrido que las etiquetas que los acompañan, así que "12" y "Repeticiones" compiten por la misma atención en vez de que el número gane.

### Color

Un verde plano (`oklch(0.55 0.14 149)` en claro) hace *todos* los trabajos a la vez: CTA principal, texto activo de navegación, enlaces, foco de teclado. Cuando un solo color cubre cinco funciones distintas, ninguna de ellas se distingue de las demás — pulsar "Iniciar sesión" y ver "Hoy" resaltado en la barra inferior son, visualmente, el mismo evento. Además la superficie de las tarjetas (`oklch(0.21...)`) y el fondo (`oklch(0.16...)`) en modo oscuro están tan cerca en luminancia que las tarjetas casi no se separan del fondo — se nota en cualquier captura: hay que mirar dos veces para encontrar el borde de la tarjeta.

### Componentes

| Componente | Estado actual |
|---|---|
| Cards | Correctas técnicamente (radius/border/shadow consistentes), pero sin ninguna variación de "elevación" — todas se ven igual de planas, tengan el contenido que tengan. |
| Botones | Un único estilo primario (verde, ancho completo, `rounded-xl`) reutilizado sin distinción entre "iniciar sesión" y "finalizar todo el entrenamiento". |
| Inputs | Campo de texto genérico, borde sutil — el input por defecto de cualquier plantilla shadcn/Tailwind. |
| Navegación | Cuatro etiquetas de texto en una barra inferior. Sin iconos, sin forma para el estado activo, solo un cambio de color. Es el componente que menos se siente "parte de un producto diseñado". |
| Progreso | Barra de segmentos correcta funcionalmente pero puramente decorativa — no comunica nada que el texto "1/4" de al lado no diga ya. |
| Timer | Una tarjeta más, del mismo tamaño y peso que cualquier otra, con un número de ~48px. Es el momento más importante de la sesión y es indistinguible de un formulario esperando datos. |
| Exercise media | No evaluable con datos reales — ningún ejercicio del catálogo actual tiene `image_url`/`video_url`. El bloque de media nunca se renderiza hoy. |

### Motion

Existe (fade-in en tarjetas, scale-in en confirmaciones, un "pop" al marcar una serie) y está bien implementado técnicamente (transform/opacity, respeta `prefers-reduced-motion`). Pero es puramente decorativo: ninguna animación comunica jerarquía ni intención — todas duran ~200-300ms y se sienten intercambiables. No hay ninguna transición que haga que pasar de "registrando una serie" a "descansando" se sienta como un cambio de *modo*, que es exactamente lo que es.

### Workout — ¿herramienta o formulario?

**Formulario.** La jerarquía de información es correcta en el código (ejercicio → objetivo → series → acción), pero visualmente todo compite al mismo nivel: el nombre del ejercicio, el "3 × 8-12 reps", la lista de series y el botón están en tonos de gris/blanco muy similares, tamaños parecidos, mismo peso de tarjeta. Nada le dice al ojo "empieza aquí". Un usuario a mitad de una flexión tiene que *leer* la pantalla para saber qué hacer — no puede simplemente verla.

### Today — ¿"esto es lo que tienes que hacer"?

Casi. "¿Qué toca hoy?" es la pregunta correcta, pero la respuesta (el nombre de la rutina) no tiene más protagonismo visual que la pregunta misma — ambas rondan los mismos 20-24px. La tarjeta ocupa una fracción pequeña de la pantalla con mucho espacio vacío sin razón compositiva. Comunica la información correcta, pero no con *confianza*.

---

## 2. Por qué se siente "fea" — observaciones concretas

- La jerarquía tipográfica es plana: casi todo el texto cae en una banda de 14–24px con el mismo peso (`font-semibold`); no hay ningún salto de escala que señale "esto importa más".
- Un solo color hace cinco trabajos a la vez (CTA, nav activo, enlaces, foco, éxito), así que ningún uso se distingue de los demás — el color deja de comunicar nada específico.
- Las superficies (fondo vs. tarjeta) tienen demasiado poco contraste de luminancia en modo oscuro; las tarjetas no se sienten "elevadas", se sienten "un poco más claras por accidente".
- Los números — lo único que realmente importa en Workout — se tratan igual que las etiquetas de texto que los acompañan, en vez de ser el elemento dominante.
- El timer de descanso, el momento más cargado emocionalmente de la sesión, tiene el mismo peso visual que un campo de formulario.
- Los botones no tienen jerarquía de intención: "Iniciar sesión" y "Finalizar entrenamiento" son visualmente el mismo componente con texto distinto.
- La navegación inferior es texto plano sin forma ni icono — el componente que más se siente sin terminar.
- Login/Register son, literalmente, el patrón por defecto de cualquier plantilla shadcn: card + label + input + botón ancho. Cero personalidad deportiva, siendo la primera impresión del producto.

---

## 3. Dirección artística — de "app CRUD" a "instrumento de rendimiento"

**Tesis:** Sport Coach no debe parecer una lista de tareas con forma de app — debe parecer el panel de un instrumento que llevas puesto mientras entrenas. Piensa en la cara de un reloj deportivo o el display de un cronómetro de pista, no en el dashboard de una startup SaaS. Fondo casi negro que se siente como una superficie de instrumento (no un "dark mode" por defecto), números tratados como lo más importante de la pantalla, y un vocabulario de color con exactamente dos acentos con trabajos distintos — nunca uno solo haciendo todo.

| Palabra | Traducción visual concreta |
|---|---|
| Athletic | Tipografía condensada/bold en títulos cortos, números tabulares grandes, mucho contraste de peso entre lo importante y lo secundario. |
| Premium | Superficies con verdadera separación de elevación (no solo un tono más claro), bordes casi invisibles, sombras muy sutiles. |
| Technical | Números y datos en monoespaciada tabular (Geist Mono), etiquetas en mayúsculas con tracking, patrón "etiqueta pequeña + valor grande". |
| Confident | Un único CTA por pantalla con peso visual inequívoco; todo lo demás se retira deliberadamente. |
| Modern | Paleta con dos acentos con significado semántico (verde = acción, ámbar = esfuerzo/descanso) en vez de un solo color reciclado. |
| Focused | Una sola cosa dominante por pantalla; todo lo demás reducido a texto auxiliar pequeño y silencioso. |

---

## 4. Paleta — superficie de instrumento, dos acentos

No es "dark mode + blanco + gris". El fondo es un grafito casi negro con una pizca de calidez (no el azul-frío del token actual), y cada acento tiene **un solo trabajo**: el verde significa "acción / listo / adelante" — nunca aparece en otro contexto. El ámbar significa "esfuerzo / descanso / recuperación" — solo en el timer y estados de intensidad, nunca en un botón de formulario.

### Oscuro (por defecto)

| Token | Hex | Uso |
|---|---|---|
| Background | `#0A0B0D` | Fondo de instrumento — grafito cálido, no azul-frío ni negro puro. |
| Surface | `#15171A` | Tarjetas — un paso de luminancia real por encima del fondo. |
| Elevated surface | `#1C1F24` | Bloques con foco activo: el timer, el ejercicio actual. |
| Primary — acción | `#2FE28F` | Verde fósforo, más saturado y técnico que un verde SaaS genérico. Solo CTA principal + estado activo real. |
| Ember — esfuerzo | `#FF8A3D` | Ámbar cálido. Solo timer/descanso/intensidad. Nunca en un botón de formulario. |
| Text | `#F4F3F0` | Blanco roto, no blanco puro. |
| Muted | `#8B8F96` | Texto secundario, etiquetas, captions bajo los números. |
| Destructive | `#E1594A` | Abandonar / errores. Rojo controlado, no alarmista. |

### Claro

No es la inversión mecánica del oscuro. Fondo "chalk/hormigón" cálido en vez de blanco de hospital.

| Token | Hex | Uso |
|---|---|---|
| Background | `#F3F1EC` | Hormigón/chalk cálido — no blanco puro ni gris neutro de plantilla. |
| Surface | `#FFFFFF` | Tarjetas — blanco limpio, contraste real contra el fondo cálido. |
| Elevated surface | `#FBFAF7` | Timer / bloque activo — un matiz cálido apenas perceptible. |
| Primary — acción | `#1A9E63` | Verde oscurecido para AA sobre fondo claro. |
| Ember — esfuerzo | `#D9601C` | Ámbar oscurecido para contraste. |
| Text | `#1B1B18` | Grafito cálido, no negro puro. |
| Muted | `#6B6B66` | Texto secundario. |
| Destructive | `#C6432E` | Abandonar / errores. |

*Valores indicativos para revisar dirección, no tokens finales — se afinarán (incl. verificación AA exacta) en implementación.*

---

## 5. Tipografía — dos familias, cero dependencias nuevas

El proyecto ya auto-hospeda **Geist Sans** y **Geist Mono** vía `next/font` (Geist Mono apenas se usa hoy). En vez de añadir una tercera familia "display", la propuesta es exprimir las dos que ya existen dándoles roles claramente distintos — cero coste de rendimiento, cero dependencia nueva:

- **Display / headings — Geist Sans 800.** Títulos cortos, mucho más grandes y con más peso de lo que se usa hoy (p. ej. "ESPALDA", "FLEXIONES") — deben ganar la pantalla, no compartirla.
- **Body / UI — Geist Sans 400–500.** Texto corrido, labels, copy auxiliar — se queda exactamente donde está hoy. No es el problema.
- **Números / datos — Geist Mono, tabular.** Cualquier cifra medible (repeticiones, series, segundos del timer, "2/4 ejercicios") pasa a monoespaciada tabular. Es el acento visual más barato y más efectivo posible: convierte cada número en una "lectura de instrumento" en vez de una palabra más dentro de una frase.

Ejemplo del patrón de timer:

```
01:24
DESCANSO
```

(dígitos grandes en Geist Mono tabular, etiqueta pequeña en mayúsculas debajo)

---

## 6. Acento visual — la firma reconocible

No un solo elemento — una combinación disciplinada y repetible en toda la app:

1. **Números tabulares grandes** (Geist Mono) para todo lo medible — reps, series, segundos, progreso.
2. **Etiqueta pequeña en mayúsculas + tracking** justo encima o debajo del número (el patrón "DESCANSO / 01:24"), nunca al mismo tamaño que el dato.
3. **Dos acentos con un solo trabajo cada uno**: verde = acción, ámbar = esfuerzo/descanso. Nunca se mezclan ni se reciclan para otra cosa.

Nada de gradientes, glow ni neón. La sofisticación viene de la restricción: dos colores, una combinación tipográfica, aplicados con total consistencia — no de efectos añadidos.

---

## 7. Componentes — jerarquía real, no un solo estilo repetido

| Componente | Dirección propuesta |
|---|---|
| Botón primario | Se mantiene lleno + verde, pero solo para el *único* CTA de más peso de la pantalla (Empezar / Registrar serie / Finalizar). Nunca dos botones primarios visibles a la vez. |
| Botón secundario | Ghost real (solo texto + hover), como ya existe — se mantiene, es correcto. |
| Botón "esfuerzo" | Nuevo: contorno ámbar para acciones ligadas al descanso (+30s) — hoy son indistinguibles de cualquier otro botón ghost. |
| Card | Dos niveles de elevación reales (surface / surface elevada), no uno. La tarjeta activa (ejercicio en curso, timer) usa la superficie elevada; el resto usa la base. |
| Input | Mismo patrón funcional, pero integrado en una tarjeta con más carácter en Login/Register en vez de flotar sola en una página vacía. |
| Progreso | Se mantiene la barra de segmentos, pero el contador "2/4" pasa a Geist Mono tabular. |

---

## 8. Today — propuesta

"Esto es lo que tienes que hacer" en menos de un segundo. El saludo se retira (letra pequeña, mono, silenciosa) para dejar sitio a la rutina de hoy como el verdadero titular de la pantalla — display grande, mayúsculas, el nombre real del entrenamiento. El contador de ejercicios pasa a mono. Un único CTA, sin competencia.

```
┌─────────────────────────────┐
│ hola, álvaro                 │  ← mono, pequeño, silencioso
│                               │
│ ROTACIÓN · DÍA 1              │  ← eyebrow ámbar
│ ESPALDA                       │  ← display 44px+, bold
│                               │
│ 04 ejercicios                 │  ← mono tabular
│                               │
│ ┌───────────────────────────┐│
│ │      EMPEZAR               ││  ← único CTA, verde lleno
│ └───────────────────────────┘│
└─────────────────────────────┘
[ hoy ] [ plan ] [ historial ] [ coach ]
```

---

## 9. Workout — propuesta

La pantalla más importante de la app. El nombre del ejercicio gana la pantalla (display, mayúsculas). El objetivo y el checklist de series pasan a mono tabular — "12 reps" deja de ser una frase y pasa a ser una lectura. El stepper se mantiene (ya cumple 44px y evita el zoom de iOS, eso ya estaba bien resuelto). La media: cuando exista `image_url`/`video_url`, ocupa un bloque contenido con esquinas suaves, nunca hero a pantalla completa. Sin media, el hueco simplemente no se reserva (como ahora).

```
┌─────────────────────────────┐
│ ← salir          espalda·1/4 │
│ ▬▬▬▬▬▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭  │
│                               │
│ FLEXIONES                     │  ← display 32px+
│ 3 × 8–12 reps                 │  ← mono, muted
│                               │
│ ○ serie 1        ·· ··       │
│ ○ serie 2        ·· ··       │
│ ○ serie 3        ·· ··       │
│                               │
│   [-]      12      [+]       │  ← mono tabular grande
│ ┌───────────────────────────┐│
│ │     REGISTRAR SERIE        ││
│ └───────────────────────────┘│
└─────────────────────────────┘
```

### Timer

**No es una tarjeta más — es un cambio de pantalla.** Cuando empieza el descanso, el bloque se convierte en la superficie elevada (ámbar como acento, no como fondo saturado) y los dígitos crecen hasta dominar la vista: de los ~48px actuales a algo del orden de 64–80px, mono, tabular. Una barra de progreso lineal fina en ámbar bajo el número. "+30s" y "Saltar" bajan de peso — son ajustes, no la protagonista. El objetivo: que quien mire el móvil de reojo, sudando, entienda el número sin tener que enfocar la vista en nada más.

```
┌───────────────────┐
│      DESCANSO       │
│                     │
│       00:34         │  ← 64-80px, mono tabular
│  ▬▬▬▬▬▬▭▭▭▭▭▭▭▭▭    │  ← barra fina ámbar
│                     │
│   [+30s]  [saltar]  │  ← peso reducido
└───────────────────┘
```

---

## 10. Navigation — propuesta

Que se sienta parte del producto. Hoy son cuatro palabras y un cambio de color. Propuesta: cada ítem obtiene una marca geométrica simple (no un set de iconos genérico tipo Lucide por defecto — formas propias, mínimas, en línea) y el estado activo se comunica con *forma* además de color (la marca se rellena, no solo cambia de tono) — así el color deja de ser la única señal, que además es un requisito de accesibilidad que ya persigue el proyecto.

```
[■ hoy]   [□ plan]   [□ historial]   [□ coach]
  ▲ relleno = activo, no solo texto verde
```

---

## 11. Motion — microinteracciones con propósito

| Momento | Trigger | Animación | Duración | Propósito |
|---|---|---|---|---|
| Entrar en Today | Montaje de la card | Fade + subida de 6px | 220ms | "Esto acaba de llegar para ti" |
| Empezar Workout | Tap en Empezar | La card de Today se contrae hacia el punto de origen del tap mientras la pantalla de Workout entra | 240ms | Sensación de "entrar" a un modo, no navegar a otra página |
| Registrar serie | Submit del stepper | El círculo de la serie se rellena con un pequeño overshoot de escala | 280ms | Confirmación táctil e inequívoca sin depender del color |
| Iniciar descanso | Tras registrar serie (automático) | Cross-fade: la card se re-tinta hacia la superficie elevada + ámbar; los dígitos hacen scale-in | 320ms | Comunicar cambio de modo: "ya no estás registrando" |
| Terminar descanso | Contador llega a 0 / Saltar | Los dígitos hacen un pulso de escala único (no en bucle) + vibración corta | 200ms | Un solo aviso claro, nunca ansiedad de parpadeo constante |
| Completar ejercicio | Última serie registrada | El check grande hace scale-in con un pequeño rebote | 340ms | Momento de logro — el único punto donde se permite algo de celebración contenida |
| Finalizar Workout | Confirmar Finalizar | Fade a negro breve + fade-in de Today con la siguiente rutina de la rotación | 260ms | Cierre claro de la sesión antes de volver al punto de partida |
| Foco de teclado | Tab / focus-visible | Anillo de foco instantáneo, sin transición | 0ms | El foco nunca debe sentirse "en camino" — accesibilidad antes que pulido |

Todo transform/opacity, todo respeta `prefers-reduced-motion` — mismo enfoque técnico ya validado en el proyecto, solo con intención añadida.

---

## 12. Referencias utilizadas

Las tres se visitaron en vivo en el navegador para esta auditoría — nada de lo siguiente está inventado de memoria.

### Vercel

- **Sí:** Cifras grandes con caption pequeña debajo (450K+ / Agents built). Ritmo de secciones con headline propio cada vez. Ese patrón es directamente el molde para "01:24 / DESCANSO".
- **No:** El glow radial enorme del triángulo del hero, la negrura absoluta sin ningún matiz de calidez, la densidad de producto B2B (tabs, sidebars).

### Apple

- **Sí:** La cara del Apple Watch: números enormes, mono/tabular, con una unidad pequeña justo al lado ("1.8 FT"). Es literalmente la referencia del timer propuesto.
- **No:** Fondos de producto ultra-claros y fotografía de estudio — no encaja con "instrumento que llevas puesto entrenando".

### alvarogaertner.com

- **Sí:** Fondo casi negro con calidez (no azul-frío), un único acento cálido usado con moderación, eyebrows en mono mayúsculas con guion ("— NOW TEACHING") como patrón repetible de estructura, mezclar un peso display muy bold con texto ligero en la misma composición.
- **No:** El mascot ilustrado en sí (decisión de marca personal, no aplica a Sport Coach), las ilustraciones vectoriales decorativas por proyecto — Workout necesita datos legibles al primer vistazo, no arte.

---

## 13. Responsive y accesibilidad

**Responsive.** Mobile-first se mantiene intacto — nada de lo propuesto necesita un breakpoint nuevo. Los números más grandes se prueban explícitamente a 375px (el ancho real más ajustado) antes de aprobarse: si un timer de 80px no cabe cómodo en 375px, se ajusta la escala, no al revés.

**Accesibilidad.** Todo color nuevo se verifica contra AA antes de convertirse en token (igual que en la fase de design-system ya cerrada). El estado activo de navegación gana forma, no solo color. Los dos acentos (verde/ámbar) se combinan siempre con texto o forma — nunca son la única señal.

---

## 14. Principios que no debemos romper

- Cero dependencias nuevas — Geist Sans/Mono ya están instaladas y auto-hospedadas.
- Sin tocar Supabase, esquema, RLS ni el dominio — esto es 100% visual.
- Reutilizar `Button`/`Input`/`Card` existentes, extender variantes, no reescribir desde cero.
- Objetivos táctiles ≥44×44px en cualquier control, especialmente durante una sesión guiada.
- `prefers-reduced-motion` respetado en cada animación nueva, sin excepción.
- Un único color nunca vuelve a hacer más de un trabajo a la vez.
- El color nunca es la única señal de estado.
- Verificación visual real en navegador (375/390/430 + desktop, claro/oscuro) antes de dar nada por cerrado.
