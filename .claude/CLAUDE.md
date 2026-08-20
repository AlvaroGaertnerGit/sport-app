# Sport Coach

## 1. Mission

Construir una PWA mobile-first de entrenamiento deportivo, genérica para múltiples deportes, con un Coach IA especializado exclusivamente en deporte y entrenamiento que puede consultar el contexto del usuario y, solo con confirmación explícita, proponer cambios sobre su planificación.

Cada decisión prioriza corrección del dominio, comportamiento predecible y una experiencia móvil rápida y accesible — no velocidad de entrega.

## 2. Product context

El producto gestiona: usuarios y perfiles deportivos, objetivos, deportes, actividades deportivas, rutinas, ejercicios, sesiones de entrenamiento guiadas, registro de series/repeticiones/pesos/tiempos/sensaciones, historial, progreso, una planificación por rotación y un Coach IA.

Debe ser genérico para múltiples deportes (pádel, running, calistenia, fútbol, ciclismo, natación, tenis, fuerza, senderismo, otros) sin construir una arquitectura distinta por deporte. La genericidad se resuelve con un núcleo de datos tipado común + un escape hatch flexible (JSONB en `Activity.details`), nunca con plugins o herencia por deporte.

El modelo de dominio y el motor de planificación ya están cerrados en el diseño conceptual del proyecto (12 entidades, motor en capas, taxonomías definidas). Cualquier trabajo de implementación debe partir de ese diseño, no reinventarlo.

## 3. Core principles

- Pensar antes de programar. Analizar antes de implementar.
- Reutilizar antes de crear. Simplicidad sobre ingenio.
- Calidad sobre velocidad. Accesibilidad obligatoria. Mobile first.
- Componentes reutilizables. Nunca duplicar lógica ni fuentes de verdad.
- Type safety estricto — nada de `any`.
- Diseñar primero, implementar después.

## 4. Architecture principles

- Separación clara entre **UI**, **dominio** y **datos**. Ningún componente visual contiene lógica de negocio — la UI llama a servicios/hooks de dominio, nunca implementa reglas del dominio inline.
- Fronteras Server/Client explícitas en cada archivo: Server Component por defecto, `"use client"` solo cuando hay estado/efectos/eventos/API de navegador reales.
- Arquitectura escalable sin sobreingeniería: extraer una abstracción cuando exista un tercer caso real (regla de tres), no antes.
- Una única fuente de verdad por dato. Si algo puede derivarse de datos existentes, se deriva — no se persiste ni se duplica (ver §16).

## 5. Domain principles

- El dominio está definido por 12 entidades: `User`, `Sport`, `UserSport`, `Goal`, `Exercise`, `Routine`, `RoutineExercise`, `Plan`, `PlanItem`, `WorkoutSession`, `SetLog`, `Activity` (+ `Equipment` como tabla de referencia). No se añaden entidades nuevas sin una necesidad real y justificada.
- Distinciones que nunca deben difuminarse:
  - **`Activity`** — actividad deportiva no estructurada (pádel, running, fútbol). Nunca contiene series/ejercicios. Nunca avanza un `Plan` — estructuralmente no puede, porque no tiene `plan_item_id`.
  - **`Routine`** — plantilla reutilizable de entrenamiento. No es lo mismo que una ejecución real.
  - **`WorkoutSession`** — ejecución real, fechada, de una rutina o de una sesión libre (`routine_id` nullable).
  - **`SetLog`** — lo que realmente ocurrió en una serie dentro de una `WorkoutSession`.
- Las taxonomías del dominio (dificultad, patrón de movimiento, grupo muscular, equipamiento, deporte, categoría de objetivo, tipos de estado) ya están cerradas — ver el diseño conceptual del proyecto antes de inventar un nuevo valor o campo.

## 6. Planning rules

- La planificación es una **rotación** (`ESPALDA → PECHO → PIERNAS → HOMBROS/CORE → repetir`), no un calendario semanal rígido.
- `Plan` **nunca** guarda un puntero mutable de posición (`current_position`, `current_index` o similar). El siguiente `PlanItem` se **deriva** del historial: la `WorkoutSession` completada más reciente que esté vinculada explícitamente a un `PlanItem` de ese plan determina la posición; el siguiente es el `PlanItem` inmediatamente posterior.
- **Regla fundamental**: una `WorkoutSession` solo avanza la rotación cuando `plan_item_id` no es null **y** `status = completed`. Nunca se infiere el vínculo por coincidencia de `routine_id`, por pertenencia de la rutina al usuario, o porque la rutina aparezca en el plan — la intención de vincular una sesión al plan es siempre una decisión explícita del usuario (automática solo cuando nace del flujo "Empezar" sobre la recomendación).
- Cuatro capas, siempre en este orden y sin mezclarse:
  1. **Plan (determinista)** — responde "¿cuál es el siguiente `PlanItem`?" sin IA y sin verse afectada por fatiga/recuperación.
  2. **Contexto** — agrega actividades y sesiones recientes, intensidad, grupos musculares, tiempo transcurrido.
  3. **Recomendación** — combina las dos capas anteriores en un mensaje con opciones para el usuario. Nunca sobreescribe lo que dice la Capa 1.
  4. **Coach IA** — explica, sugiere, propone cambios. Nunca decide por sí sola el siguiente `PlanItem`, nunca escribe directamente.
- Un único `Plan` con `status = active` por usuario. El motor "¿qué me toca hoy?" solo consulta el plan activo.
- Reordenar un plan (`PlanItem.position`) es una acción de dominio explícita y deliberada del usuario (o propuesta confirmada de la IA) — nunca una consecuencia automática de completar una sesión.

## 7. AI rules

- El Coach IA es **exclusivamente deportivo**: ejercicios, técnica, entrenamiento, rutinas, progresión, planificación, descanso/recuperación relacionados con entrenamiento, equipamiento, actividades deportivas, rendimiento. Rechaza explícitamente cualquier pregunta fuera de ese ámbito — no es un chatbot generalista.
- La IA **nunca** tiene una vía directa de escritura a la base de datos. Toda acción de escritura sigue el mismo flujo: **propuesta estructurada → validación → confirmación del usuario → acción de dominio → persistencia**, reutilizando exactamente la misma capa de validación/acción que usaría una edición manual. La IA es un actor más del sistema, nunca un camino paralelo.
- Lectura de contexto del usuario (objetivos, deportes, plan, rutinas, historial, progreso) mediante herramientas explícitas y acotadas — nunca un volcado completo de la base de datos en el prompt.
- Cada acción de escritura propuesta (`replace_exercise`, `modify_routine`, `postpone_workout`, `add_exercise`, `reorder_plan`, `modify_plan`, ...) debe mostrar al usuario exactamente qué va a cambiar antes de confirmar.
- No implementar todavía herramientas ni integración real con ningún proveedor de IA hasta que el diseño de esa capa esté cerrado y aprobado.

## 8. UI/UX philosophy

La aplicación debe sentirse rápida, clara e intencional — usada a menudo con una mano, en movimiento, con las manos sudadas o guantes. Legibilidad y objetivos táctiles grandes priman sobre densidad visual. Las animaciones dan feedback de interacción y progreso (series completadas, timers, transición entre estados de sesión); nunca son decorativas.

## 9. Coding standards

Preferir: Server Components, composición, archivos pequeños, nombres claros, type safety, código explícito.

Evitar: `any`, componentes grandes, prop drilling profundo, estilos duplicados, optimización prematura.

## 10. Mobile/PWA principles

- Mobile-first real: las clases sin prefijo son el layout móvil; se progresa hacia `sm:`/`md:`/`lg:`, nunca al revés.
- PWA y (eventual) soporte offline son decisiones de **arquitectura de datos**, no una capa añadida al final — si una sesión debe poder registrarse sin conexión, eso condiciona el diseño de la capa de datos desde que se diseña, no cuando se instala un Service Worker.
- Objetivos táctiles ≥44×44px en cualquier elemento interactivo, especialmente durante una sesión guiada (registrar una serie debe poder hacerse con el pulgar, sin precisión quirúrgica).

## 11. Accessibility

Obligatoria, no opcional. Elementos interactivos reales (`<button>`, no `<div onClick>`), estado de foco visible siempre (`focus-visible:`), nombres accesibles en controles solo-icono, el color nunca es la única señal, contraste AA vía los pares de tokens semánticos.

## 12. Performance

Server Component por defecto; `next/image` y `next/font` siempre; `next/dynamic` para lo pesado o bajo el pliegue; sin lecturas de `Date.now()`/`window` directamente en el cuerpo de un componente que renderiza en servidor y cliente. Medir antes de optimizar — no asumir.

## 13. Security

- Los datos de entrenamiento son datos personales: aislamiento por usuario (RLS) desde la primera tabla, nunca exponer datos de un usuario a otro.
- Todo dato que entra desde el usuario o desde la IA se valida en el límite, antes de tocar la capa de datos.
- Ningún secreto (claves de proveedor de IA, etc.) en código cliente ni en literales — siempre `process.env`, leído solo en servidor.
- Ninguna acción de escritura de la IA se ejecuta sin confirmación explícita y auditable (ver §7).

## 14. Development workflow

Para cualquier feature:

1. Understand — entender el problema real.
2. Plan — diseñar el enfoque (Plan Agent).
3. Search documentation / existing solutions — Context7 para librerías, buscar en el propio código antes de crear.
4. Design — arquitectura, fronteras server/client, impacto en el dominio.
5. Relevant Skills — cargar las skills que apliquen.
6. Worker Agent — implementación incremental, alcance acotado al plan.
7. Observer Agent — opcional, solo en trabajo paralelo/largo/de riesgo.
8. Verify — verificación runtime real, no solo tests/typecheck.
9. Code Review — obligatorio antes de cerrar la tarea.
10. Refactor si el Code Review o el Verify lo piden.

Nunca saltar directamente a programar.

## 15. Agent workflow

Mismo orden que el workflow de desarrollo. Para cualquier tarea que toque una entidad, relación, estado, enum o regla de planificación del dominio, el Plan Agent debe dejar explícito el modelo afectado y las decisiones de arquitectura **antes** de que el Worker Agent escriba una sola línea — nunca se permite que un agente empiece a construir una feature compleja (auth, planificación automática, endpoints de IA con escritura) sin ese paso previo aprobado.

## 16. Rules for modifying the domain

Cualquier cambio en entidades, relaciones, estados, enums, planificación, recuperación, progresión, permisos o IA se trata como **cambio de dominio**. Antes de implementarlo:

1. Identificar el impacto (qué entidades/reglas toca).
2. Revisar el modelo conceptual aprobado — no reinventar sobre la marcha.
3. Comprobar fuentes de verdad — evitar que el mismo dato viva en dos sitios.
4. Evitar duplicaciones.
5. Actualizar la documentación del dominio si el cambio la invalida.

Regla especial de derivación — antes de crear una columna persistida, preguntar: *¿este dato puede derivarse de otros datos existentes?* Si sí, derivarlo, no almacenarlo. Ejemplos ya decididos: progreso de un ejercicio (derivado de `SetLog`), grupos musculares de una rutina (derivados de sus ejercicios), conflicto de recuperación y fatiga estimada (calculados, no almacenados), siguiente `PlanItem` (calculado, nunca un puntero). No persistir una agregación sin una necesidad de rendimiento demostrada, no hipotética.

Regla especial del Plan — nunca introducir `current_position`, `current_index` ni ningún puntero mutable en `Plan` (ver §6).

Regla especial de la IA — nunca implementar una acción de IA que modifique datos persistentes directamente; siempre `propuesta → validación → confirmación → acción de dominio → persistencia`, con la UI manual y la IA compartiendo las mismas reglas de dominio (ver §7).

## 17. Rules against premature abstraction

Nunca, sin un consumidor real y actual:

- Crear abstracciones genéricas sin caso de uso concreto.
- Crear interfaces o capas "por si acaso" pensando en funcionalidades futuras.
- Crear un sistema de plugins o estrategias distintas por deporte.
- Crear jerarquías o entidades adicionales al modelo de dominio cerrado.
- Crear tablas para datos que pueden derivarse (ver §16).
- Introducir un sistema universal que soporte cualquier modalidad de ejercicio imaginable (reps, tiempo, distancia, ...) cuando el caso de uso actual solo necesita una o dos.

Si una funcionalidad futura necesita una abstracción, se introduce cuando exista el caso real que la justifique — nunca antes.

## 18. Verification requirements

Todo cambio con superficie runtime (no solo docs/tests) se verifica ejecutando la app real, no solo con tests o typecheck — usar la skill `verify`. Antes de dar una tarea de dominio por cerrada, comprobar explícitamente que las invariantes del modelo se mantienen (p. ej.: una `Activity` nunca tiene `plan_item_id`; un `PlanItem` nunca tiene estado propio; una sesión `abandoned`/`in_progress` nunca avanza el plan).

## 19. Communication style

Al proponer una solución: explicar el razonamiento, mencionar trade-offs, preferir cambios incrementales, evitar complejidad innecesaria. Actuar como un ingeniero senior de producto, no como un generador de código — si algo del enunciado es una mala idea para el dominio ya cerrado, decirlo explícitamente en vez de aceptarlo sin más.

## Documentation & MCP

1. Context7 → documentación oficial de librerías/SDKs, siempre antes de asumir un API por memoria.
2. Playwright / claude-in-chrome → validación end-to-end real, viewport móvil primero.

No usar una herramienta MCP porque exista — usarla cuando aporte información verificable. Nunca inventar comportamiento de una librería si existe una fuente consultable.
