# Mapa de datos — Sport Coach

Documento interno. NO publicar. Generado a partir de una auditoría real del schema (`supabase/migrations/*.sql`), del código (`src/lib/**`, `src/app/**`) y de los flujos de autenticación/IA. Refleja el estado del código en la fecha de la auditoría (2026-08-25). Cuando el dominio cambie (nueva tabla, nueva columna, nuevo campo libre), este documento debe revisarse — ver regla de dominio en `.claude/CLAUDE.md` §16.

## 1. Identidad — `auth.users` (gestionada por Supabase Auth, no es una tabla de la app)

| Dato | Origen | Base jurídica |
|---|---|---|
| Email | Registro (`signUpAction`) | Ejecución de contrato (art. 6.1.b RGPD) |
| Contraseña (hash, gestionado por GoTrue) | Registro | Ejecución de contrato |
| Estado de confirmación de email | Flujo `/auth/confirm` | Ejecución de contrato |
| Timestamps de sesión/login (gestionados internamente por GoTrue) | Login | Ejecución de contrato |

Sport Coach no implementa su propio hashing/gestión de sesión — delega 100% en Supabase Auth (`@supabase/ssr`). No hay tabla `users` propia con contraseñas.

## 2. `public.profiles`

Identidad de aplicación 1:1 con `auth.users` (`id` es la misma PK, `on delete cascade`).

| Columna | Tipo | Personal | Notas |
|---|---|---|---|
| id | uuid | Sí (identificador) | = auth.users.id |
| code | text | Pseudónimo | generado, único, inmutable |
| display_name | text | Sí | opcional |
| timezone | text | Indirecto | preferencia |
| weight_unit | text (kg/lb) | No | preferencia de unidad, no un dato de salud |
| created_at / updated_at | timestamptz | Metadato | |

RLS: `select`/`update` solo del propio usuario. Sin política `insert` (la fila nace vía trigger `handle_new_user`, `security definer`) ni `delete` (el borrado de cuenta pasa por la Auth Admin API con `service_role`, fuera de RLS).

## 3. `public.user_sports` / `public.goals`

| Tabla | Columnas relevantes | Personal | Texto libre |
|---|---|---|---|
| user_sports | sport_id, level, started_at, **notes** | Sí | `notes` — sin restricción de contenido |
| goals | category (enum), **description**, target_date, status | Sí | `description` — texto libre, obligatorio |

RLS: CRUD propio en ambas (`user_id = auth.uid()`), correctamente delimitado.

**`description`/`notes` son campos de texto libre sin validación de contenido** — el usuario puede escribir cualquier cosa, incluida información de salud incidental ("estoy recuperándome de una lesión de rodilla", objetivos de pérdida de peso vinculados a una condición médica, etc.). Ver `legal-audit.md` §Datos de salud.

## 4. `public.routines` / `public.routine_exercises`

Plantillas propiedad del usuario. `routines.notes`-equivalente: `routine_exercises.notes` (texto libre por ejercicio dentro de una rutina — mismo riesgo que arriba, en menor medida). `target_weight_kg` es un objetivo de entrenamiento, no un dato de salud.

RLS: CRUD propio, correctamente delimitado vía `routine_id -> routines.user_id`.

## 5. `public.plans` / `public.plan_items`

Estructura de rotación. Sin campos de texto libre relevantes (`name`/`description` del plan son metadatos, no datos sensibles por sí mismos). RLS correcta (dos FKs privadas comprobadas en `plan_items`, hallazgo explícito documentado en el propio SQL).

## 6. `public.workout_sessions`

| Columna | Personal | Notas |
|---|---|---|
| started_at / completed_at | Sí | timestamps de actividad física |
| overall_rpe (1–10) | Sí | esfuerzo subjetivo percibido — métrica de rendimiento, no diagnóstico |
| **notes** | Sí | texto libre — mismo riesgo que §3 |
| status | Sí | in_progress / completed / abandoned |

RLS: CRUD propio, con comprobación de propiedad de `routine_id` y `plan_item_id` en insert/update (no solo `user_id`) — correcto.

## 7. `public.set_logs`

| Columna | Personal | Notas |
|---|---|---|
| reps, weight_kg, duration_seconds | Sí | rendimiento — no salud por sí solos |
| perceived_effort (1–10) | Sí | esfuerzo subjetivo — mismo estatus que overall_rpe |
| **notes** | Sí | texto libre — mismo riesgo que §3 |

RLS: vía `workout_session_id -> workout_sessions.user_id` — correcto. `user_id` deliberadamente no denormalizado (evaluado y descartado en el diseño).

## 8. `public.activities`

| Columna | Personal | Notas |
|---|---|---|
| performed_at, duration_minutes, distance_km | Sí | rendimiento |
| perceived_intensity (1–10) | Sí | esfuerzo subjetivo |
| **notes** | Sí | texto libre |
| details (jsonb) | Sí | específico de deporte (marcador de pádel, splits de running) — solo si el usuario lo introduce |

RLS: CRUD propio, correcto.

## 9. Catálogos públicos (SIN datos personales)

`public.sports`, `public.equipment`, `public.exercises`, `public.routine_exercises` (targets, no texto de usuario salvo `notes` ya cubierto). Datos de referencia, gestionados por `service_role`, legibles por cualquier usuario autenticado (`select_all`). `supabase/seed.sql` y la migración de expansión del catálogo solo insertan estos datos de referencia — confirmado, no contienen datos de usuarios reales.

## 10. Campos de texto libre — inventario completo

Todos son opcionales salvo `goals.description` (obligatorio):

- `user_sports.notes`
- `goals.description` (obligatorio)
- `routine_exercises.notes`
- `workout_sessions.notes`
- `set_logs.notes`
- `activities.notes`

Ninguno tiene validación de contenido ni longitud máxima a nivel de dominio conocida. Ver `legal-audit.md` para el análisis de categoría especial.

## 11. SCOPE (Coach IA) — qué se envía a OpenAI

Ver `providers.md` §OpenAI para el detalle completo. Resumen: contexto base agregado (contadores, nunca texto libre de notas/objetivos) + lo que las *tools* de solo lectura devuelven bajo demanda (nombres de ejercicios/rutinas/planes, fechas, estados, series, repeticiones, pesos objetivo, RPE agregado en `topExercises`/`personalBests`). **No se ha encontrado ningún tool que envíe `notes`/`description` (texto libre) a OpenAI** — los tools proyectan campos estructurados específicos, no un `select *`. El mensaje del usuario en el chat (texto libre, sin restricción) sí se envía tal cual, por diseño (es una conversación).

No hay persistencia de conversaciones con SCOPE en Supabase (confirmado: ningún tool, ninguna migración, ninguna tabla `coach_messages`/`conversations`). El historial de chat vive únicamente en memoria del componente cliente (`coach-chat.tsx`, estado de React) durante la sesión de navegador — no en `localStorage`, no en `sessionStorage`, no en el servidor. Se pierde al recargar o cerrar la pestaña.

## 12. Identificadores de dispositivo / red

No se ha encontrado ningún punto del código que registre IP, user-agent o geolocalización (grep exhaustivo sobre `src/`, sin resultados). Supabase Auth puede registrar esta información internamente para sus propios fines de seguridad (fuera del control de código de esta app) — ver `providers.md`.

## 13. Cascada de borrado de cuenta

`auth.users` → `on delete cascade` → `profiles` → `on delete cascade` → `user_sports`, `goals`, `routines` (→ cascade → `routine_exercises`), `plans` (→ cascade → `plan_items`, pero **RESTRICT** si algún `plan_item` tiene `workout_sessions` histórico), `workout_sessions` (→ cascade → `set_logs`), `activities`.

**Hallazgo importante**: `plan_items.routine_id` es `ON DELETE RESTRICT` y `workout_sessions.plan_item_id` también es `RESTRICT`. Esto significa que **borrar un usuario vía Auth Admin API en cascada podría fallar** si Postgres intenta primero borrar `profiles` (cascade) pero encuentra una `routine` con `plan_item`s restringidos por historial de sesiones — en la práctica, como todo pertenece al mismo usuario y se borra en la misma transacción de cascada, Postgres resuelve el orden dentro de la transacción; **esto no se ha probado end-to-end en este proyecto (no existe todavía ninguna función de borrado de cuenta)** y debe verificarse al implementar el borrado (§21 del brief) — ver `compliance-checklist.md`.

No se ha encontrado ninguna función de borrado de cuenta implementada hoy (`grep` de `auth.admin`/`deleteUser` sin resultados) — es una funcionalidad nueva a construir, no una a auditar.
