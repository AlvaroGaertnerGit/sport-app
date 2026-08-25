# Auditoría legal — Sport Coach

Documento interno. NO publicar. Análisis derivado de `data-map.md`, `cookie-inventory.md` y `providers.md`. Marco: RGPD, LOPDGDD 3/2018, LSSI-CE 34/2002, Ley 11/2023 de accesibilidad (cuando aplique), Reglamento (UE) 2024/1689 de IA ("AI Act"). Este documento distingue explícitamente **IMPLEMENTADO**, **PENDIENTE DE INFORMACIÓN DEL TITULAR**, **REQUIERE REVISIÓN DE ABOGADO/PROFESIONAL** y **NO APLICA** — nunca afirma cumplimiento al 100%.

## 1. Identidad del responsable

**PENDIENTE DE INFORMACIÓN DEL TITULAR.** No existe en el repositorio ningún dato de identidad legal: no hay nombre/razón social, CIF/NIF, domicilio, teléfono, ni datos registrales en ningún archivo, commit, variable de entorno o documentación. Tampoco hay un dominio de producción confirmado (`NEXT_PUBLIC_SITE_URL` no está definido en `.env.local`; el código cae a `localhost:3000`). Todas las páginas legales usan `[COMPLETAR: ...]` para estos datos — ver `compliance-checklist.md` para la lista exacta.

Decisión razonable tomada sin inventar datos: se asume que el titular es una persona física (autónomo/desarrollador individual) u una entidad por determinar — el propio texto legal se ha redactado de forma neutra ("el Titular", "Sport Coach") para no forzar una forma jurídica no confirmada. **Debe revisarse y completarse antes de publicar.**

## 2. Datos de salud — análisis funcional (brief §3)

**No se afirma automáticamente que sí. No se afirma automáticamente que no.**

### Lo que el esquema NO hace
Sport Coach no tiene ningún campo estructurado destinado a datos de salud: no hay diagnósticos, no hay historial médico, no hay campos de "lesión", "condición médica", "medicación", ni un sistema de perfil de salud. `weight_unit` es una preferencia de unidad (kg/lb), no un peso. `weight_kg` en `set_logs`/`routine_exercises` es una carga de entrenamiento (cuánto peso se levanta), no el peso corporal del usuario — **no se almacena el peso corporal del usuario en ningún sitio del schema auditado**.

### Lo que SÍ introduce un riesgo funcional real
1. **Campos de texto libre sin restricción de contenido** (`data-map.md` §10: `user_sports.notes`, `goals.description`, `routine_exercises.notes`, `workout_sessions.notes`, `set_logs.notes`, `activities.notes`) — el usuario puede escribir literalmente cualquier cosa. Un objetivo ("quiero perder 10kg por recomendación médica tras una lesión de rodilla") o una nota de sesión ("hoy me ha dolido el hombro, sigo con la rehabilitación") constituyen, en el momento en que se escriben, datos relativos a la salud en el sentido del art. 4.15 RGPD y art. 9 (categoría especial).
2. **`overall_rpe` / `perceived_effort` / `perceived_intensity` (escalas 1–10)**: son métricas de esfuerzo subjetivo de rendimiento deportivo, análogas a las que cualquier app de fitness mainstream recoge. Por sí solas, sin combinarlas con más contexto, la interpretación mayoritaria (no unánime) es que no constituyen "datos de salud" en el sentido estricto del art. 9 — son datos de rendimiento, no clínicos. **Esto es un juicio interpretativo, no una certeza legal.**
3. **El chat con SCOPE**: el mensaje del usuario es texto completamente libre (`providers.md` §2) — el propio prompt de sistema instruye a SCOPE a "responder con cautela y sugerir evaluación profesional" si el usuario menciona dolor/lesión (`src/lib/ai/prompts.ts`, ya implementado), lo cual confirma que el propio diseño del producto anticipa que los usuarios mencionarán salud en la conversación.

### Conclusión
Sport Coach **no recoge sistemáticamente** categorías especiales de datos por diseño de schema, pero **crea una posibilidad realista y previsible** de que datos de salud aparezcan de forma incidental en campos de texto libre y en la conversación con SCOPE — no es un evento hipotético remoto, es una consecuencia directa de ofrecer campos abiertos en una app de entrenamiento.

**REQUIERE VALIDACIÓN LEGAL** para la calificación definitiva, pero la postura de diseño recomendada (y aplicada en esta fase) es tratar este riesgo con dos medidas, sin sobre-reaccionar convirtiendo la app en un sistema de salud que no es:

- **Base jurídica reforzada**: la Política de Privacidad declara expresamente esta posibilidad y recaba consentimiento explícito (art. 9.2.a RGPD) para el caso de que el usuario decida voluntariamente introducir información de salud en un campo de texto libre o en la conversación con SCOPE — en lugar de asumir que el interés legítimo o la ejecución de contrato bastan para categoría especial (no bastan).
- **Mitigación en la UI**: un aviso breve, no intrusivo, junto a los campos de texto libre relevantes y en la propia superficie de SCOPE, recomendando no introducir información médica/de salud sensible innecesaria — ver `compliance-checklist.md`. Esto es una medida de minimización razonable (brief §35), no una prohibición imposible de hacer cumplir técnicamente.

## 3. Bases jurídicas por tratamiento (brief §34 — no usar "consentimiento" para todo)

| Tratamiento | Base jurídica | Nota |
|---|---|---|
| Cuenta (email, autenticación) | Ejecución de contrato (art. 6.1.b) | Necesario para prestar el servicio solicitado |
| Perfil, deportes, objetivos, rutinas, planes, sesiones, series, actividades | Ejecución de contrato (art. 6.1.b) | Es el propio servicio — sin estos datos la app no funciona |
| Conversación con SCOPE / envío de contexto a OpenAI | Ejecución de contrato (art. 6.1.b) | Funcionalidad del servicio que el usuario activa voluntariamente al usar el chat |
| Contenido de salud incidental en texto libre (notas/objetivos/chat) | Consentimiento explícito (art. 9.2.a) | Ver §2 — base reforzada, específica para este supuesto |
| Cookie de sesión / localStorage funcional | Ejecución de contrato / interés legítimo en prestar el servicio solicitado | Exenta de consentimiento (LSSI art. 22.2) — igualmente se informa |
| Emails transaccionales (confirmación de registro) | Ejecución de contrato / obligación derivada de la relación contractual | No es marketing |
| Comunicaciones de marketing (si se implementan en el futuro) | Consentimiento (art. 6.1.a) | No existe hoy ninguna funcionalidad de marketing/newsletter — no se declara nada de esto todavía, ver `providers.md` §5 |
| Seguridad y prevención de abuso (rate limiting del Coach) | Interés legítimo (art. 6.1.f) | Limitador en memoria, sin persistencia, sin IP — impacto mínimo sobre el interesado |

## 4. AI Act (Reglamento (UE) 2024/1689) — transparencia de SCOPE

Análisis funcional: SCOPE es un sistema de IA que interactúa directamente con personas físicas mediante una interfaz conversacional (chat). El art. 50.1 del AI Act (obligación de transparencia para sistemas destinados a interactuar con personas físicas) exige que quede claro que la persona está interactuando con un sistema de IA, salvo que resulte evidente por el contexto. **Esta obligación es de transparencia, no de clasificación de alto riesgo** — SCOPE no toma decisiones automatizadas con efecto legal/significativo sobre el usuario (nunca escribe directamente, siempre requiere confirmación humana explícita — ver `data-map.md` §11 y `providers.md` §2), por lo que no se ha identificado ningún indicio de que caiga en las categorías de "alto riesgo" del Anexo III.

**Hallazgo original (2026-08-25, primera pasada)**: la etiqueta visible junto al chat era "Tu Coach" (`src/app/(app)/coach/page.tsx:37`, `src/app/(app)/coach/coach-chat.tsx:258`) — sin ninguna indicación explícita de que se trata de un sistema de IA. No era evidente por el contexto para un usuario nuevo (la app también tiene un "Coach V1" determinista sin IA, lo que hacía la distinción menos obvia todavía).

**Corregido (2026-08-25, segunda pasada)**: la etiqueta se cambió de "Tu Coach" a "Coach IA" en ambos puntos de entrada a la conversación (eyebrow "Scope" + título "Coach IA" — se lee como "SCOPE · Coach IA"), sin tocar el personaje, su SVG, sus animaciones ni su personalidad — solo el texto. Un texto breve y accesible desde Perfil ("SCOPE y la IA", enlace en la sección "Información legal") explica en una o dos frases que es un sistema de IA, que puede cometer errores, y que no sustituye asesoramiento profesional — sin convertirlo en un aviso legal aparatoso. Estado: **IMPLEMENTADO**.

**No se ha identificado** una obligación adicional de etiquetado de cada respuesta individual de SCOPE (no genera imagen/audio/vídeo sintético que requeriría el etiquetado del art. 50.2/50.4 — solo texto conversacional) — el art. 50.1 se satisface con la identificación de la interfaz como IA, no con marcar cada mensaje. **REQUIERE VALIDACIÓN LEGAL** para confirmar esta lectura conforme evolucione la guía de aplicación del AI Act (las obligaciones de transparencia del art. 50 entran en aplicación progresiva; confirmar la fecha de aplicación vigente en el momento de publicar).

## 5. Menores (brief §20)

Análisis del producto: Sport Coach recoge datos de entrenamiento, permite conversación libre con una IA, y (en el futuro) contratará planes de pago — no hay ningún mecanismo de verificación de edad, consentimiento parental, ni diseño pensado para menores (contenido, tono, tipografía, disclaimers, todo asume un usuario adulto que gestiona su propio entrenamiento de forma autónoma). Recoger datos de menores sin las garantías reforzadas del art. 8 RGPD/LOPDGDD (consentimiento parental por debajo de 14 años en España) sería un riesgo significativo que el producto actual no está diseñado para gestionar.

**Decisión razonable tomada**: Sport Coach se dirige exclusivamente a **mayores de 18 años**. Se refleja de forma consistente en Términos, Privacidad, y el registro (brief §20 exige esta coherencia). No se implementa verificación de edad activa (no es proporcionado para una app de este tipo ni lo pide el brief) — es una declaración contractual, reforzada por el hecho de que el registro ya exige aceptar los Términos que la contienen.

## 6. Decisiones automatizadas / perfilado

SCOPE genera recomendaciones (progresión de series/repeticiones/peso) a partir de un motor determinista (Progression Engine, no IA) y una IA conversacional que interpreta esos datos pero **nunca escribe directamente** — toda propuesta pasa por confirmación humana explícita (`propose_routine_draft`/`propose_action`/`propose_plan_draft`, nunca una escritura directa — confirmado en `src/lib/ai/tools.ts` y `src/lib/ai/action-execution.ts`, que reutiliza las mismas funciones de dominio que una edición manual). **No hay decisión totalmente automatizada con efecto legal o significativo en el sentido del art. 22 RGPD** — hay una recomendación, siempre sujeta a decisión y confirmación humana. Se declara así en la Política de Privacidad, explicando el mecanismo brevemente (no como una advertencia de "perfilado" que no aplica).

## 7. Seguridad (brief §23)

Revisado, no como auditoría de ciberseguridad completa sino centrado en si las nuevas funcionalidades legales introducen riesgo:

- RLS: revisado tabla por tabla en `data-map.md` — correcto y consistente (`user_id = auth.uid()` o comprobación vía join, con el hallazgo ya documentado en el propio SQL de `plan_items` sobre comprobar ambas FKs).
- Claves: `OPENAI_API_KEY` solo se lee server-side (`"server-only"` en `config.ts`), nunca se loggea, nunca se expone al cliente — confirmado. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` está diseñada para ser pública (confirmado por el propio comentario del `.env.local.example` y el uso de RLS como límite real de seguridad, no la clave).
- Errores: `src/lib/auth/actions.ts` mapea errores de Supabase a mensajes cortos y seguros, nunca reenvía `error.message` crudo — correcto. `src/app/api/coach/route.ts` nunca reenvía detalles del proveedor/stack trace al cliente — correcto.
- **No se ha auditado** (fuera de alcance de esta fase, y el brief lo pide explícitamente así): penetration testing, revisión de dependencias por CVE, configuración de infraestructura de Supabase/hosting más allá de lo visible en el código de la app.

## 9. Primera capa de cookies — ausencia de "Rechazar"

No existen actualmente en Sport Coach cookies no esenciales que requieran consentimiento (ver `cookie-inventory.md`: 1 cookie de sesión + `localStorage`/`sessionStorage` estrictamente funcionales, cero analítica, cero publicidad, cero terceros). Por eso el aviso implementado (`CookieNotice`) es puramente informativo, con un único botón "Entendido", en vez del clásico banner "Aceptar/Rechazar/Configurar" — mostrar un "Rechazar" que no rechazaría nada real sería en sí mismo un patrón engañoso (una elección falsa).

**REQUIERE VALIDACIÓN LEGAL**: esta lectura (que el art. 22.2 LSSI exime tanto de consentimiento como de la obligación de ofrecer un mecanismo de rechazo cuando no hay ninguna cookie no esencial) es razonable y no se ha inventado, pero su validez definitiva —especialmente si en algún momento se interpreta que la sola cookie de sesión debería ofrecer igualmente un "Rechazar" simbólico— debe confirmarla un profesional antes de considerar cerrado este punto. Si en el futuro se añade cualquier cookie no esencial, el banner debe rediseñarse ese mismo día con Aceptar/Rechazar al mismo nivel de visibilidad (ver `cookie-inventory.md` §7).

## 8. Resumen de lo que requiere revisión jurídica profesional

1. Calificación definitiva de los campos de texto libre / conversación de SCOPE como categoría especial de datos (§2).
2. Mecanismo de transferencia internacional vigente con OpenAI (SCC/Data Privacy Framework) y con Supabase según región confirmada (`providers.md`).
3. Redacción final de la limitación de responsabilidad y el disclaimer de entrenamiento (se ha redactado de forma equilibrada, no exculpatoria absoluta, pero su validez frente a normativa de consumidores debe confirmarla un profesional).
4. Aplicación exacta y calendario de entrada en vigor del art. 50 AI Act a la fecha de publicación real.
5. Estructura de futuras condiciones de suscripción Pro (desistimiento, excepciones de contenido digital) cuando Stripe se implemente — no redactado todavía, deliberadamente (brief §18).
6. Cualquier dato de identidad del responsable una vez completado (§1) — verificar que la forma jurídica declarada en las páginas legales coincide con la realidad registral.
7. Ausencia de "Rechazar" en la primera capa del aviso de cookies (§9) — confirmar que la exención del art. 22.2 LSSI cubre también no ofrecer ese botón cuando no hay nada que rechazar.
8. Suficiencia de gestionar las solicitudes de eliminación de cuenta/exportación de datos por email (privacidad.md §10) como vía transitoria mientras no exista autoservicio en Perfil.

**Nota de estado (2026-08-25, segunda pasada)**: `docs/legal/data-map.md`, `cookie-inventory.md` y `providers.md` se mantienen sin cambios estructurales — siguen siendo una fotografía precisa del código a esta fecha. La región de Supabase (§4 `providers.md`) ya no está pendiente: confirmada en UE (`eu-west-1`) mediante lectura directa del proyecto.
