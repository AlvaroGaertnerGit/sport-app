# Sport Coach — Supabase

Esquema inicial de persistencia. Implementa el diseño de dominio y de datos
cerrado en las sesiones de diseño previas (modelo de entidades, motor de
planificación, arquitectura `id`/`code`, RLS). No incluye todavía Coach IA,
UI ni PWA — solo la capa de datos.

## Estructura

```
supabase/
  config.toml           generado por `supabase init`
  migrations/            10 migraciones, aplicadas en orden por timestamp
  seed.sql               datos de referencia + biblioteca pequeña de ejercicios
```

### Migraciones

| Archivo | Contenido |
|---|---|
| `..._extensions_and_helpers` | `pgcrypto`; funciones genéricas `generate_code`, `set_updated_at`, `prevent_code_update` |
| `..._profiles` | `profiles` (vinculado a `auth.users`), trigger de creación de perfil, RLS |
| `..._sports_equipment` | Catálogos `sports`/`equipment`, RLS de solo lectura |
| `..._user_sports_goals` | `user_sports`, `goals` (privadas por usuario), RLS |
| `..._exercises` | `exercises`, `exercise_equipment`, RLS de solo lectura |
| `..._routines` | `routines`, `routine_exercises`, RLS con comprobación de propiedad |
| `..._plans` | `plans` (un activo por usuario), `plan_items`, RLS con doble comprobación de propiedad |
| `..._workout_sessions` | `workout_sessions`, modelo temporal, constraint de concurrencia, RLS |
| `..._set_logs` | `set_logs`, RLS |
| `..._activities` | `activities`, RLS |

## Convenciones `id` / `code`

- `id` (uuid) es la única moneda de las foreign keys en todo el esquema. Nunca se usa `code` como FK.
- `code` (`text`, `<prefijo>_<18 hex>`, generado con `gen_random_bytes(9)` + `encode(..., 'hex')` de `pgcrypto`, `UNIQUE`, inmutable) es un identificador público independiente, solo en las entidades con consumidor externo real: `profiles` (`usr_`), `exercises` (`ex_`), `routines` (`rtn_`), `plans` (`pln_`), `workout_sessions` (`ses_`), `activities` (`act_`).
- `goals`, `user_sports`, `routine_exercises`, `plan_items`, `set_logs` no tienen `code` — nunca se acceden de forma independiente.
- `sports`/`equipment` usan su `slug` como identificador público — no necesitan `code` adicional.
- `code` es inmutable por trigger (`prevent_code_update`), no por convención únicamente.

## RLS

Todas las tablas tienen RLS habilitada. Catálogos (`sports`, `equipment`, `exercises`, `exercise_equipment`) son de lectura pública para cualquier usuario autenticado; sin política de escritura para `authenticated` — solo `service_role` puede escribir. El resto son privadas por `user_id = auth.uid()`, con una particularidad importante: `plan_items` y `workout_sessions` tienen más de una FK privada (a `plans`/`routines` y a `routines`/`plan_items` respectivamente) y sus políticas comprueban la propiedad de **todas**, no solo de la tabla padre inmediata — sin esto, un usuario podría enlazar una rutina ajena a su propio plan.

**Importante, verificado durante la implementación**: en las versiones actuales del CLI de Supabase, las tablas nuevas **no son alcanzables vía API sin `GRANT` explícito**, aunque tengan RLS. Cada migración incluye los `GRANT` correspondientes a `authenticated`/`service_role` — sin ellos, las políticas de RLS nunca llegarían a evaluarse.

## Cómo aplicar

Requiere Docker (para el stack local de Supabase). **No disponible en este entorno de implementación** — ver "Verificación" abajo.

```bash
npx supabase start        # levanta Postgres + servicios locales
npx supabase db reset      # aplica todas las migraciones + seed.sql desde cero
```

Contra un proyecto remoto ya vinculado (`npx supabase link`):

```bash
npx supabase db push
```

## Seeds

`seed.sql` contiene únicamente datos de referencia: 11 deportes (los 10 pedidos + `other` como escape hatch ya aprobado en el diseño de producto), 10 elementos de equipamiento, y una biblioteca pequeña de 15 ejercicios (no cientos) que cubre los 8 patrones de movimiento, las 3 dificultades, ambos `target_type` y una cadena real de variantes fácil/difícil — suficiente para validar el sistema. `image_url`/`video_url` quedan `NULL`: no se han inventado URLs. `goals`, `movement_patterns` y `muscle_groups` no tienen seed porque no son tablas — son dominios `text`+`CHECK` ya definidos en las propias migraciones.

## Verificación realizada

Sin Docker ni proyecto vinculado disponibles en este entorno (comprobado: `npx supabase db start` falla por ausencia de Docker; `npx supabase migration list` requiere un proyecto vinculado). **No ha sido posible aplicar las migraciones contra un Postgres real ni confirmar en ejecución que RLS/constraints se comportan como se espera.** En su lugar se ha hecho:

- Revisión manual línea a línea de las 10 migraciones y el seed.
- Verificación contra documentación oficial (Context7: `postgresql.org`, `supabase/cli`, `supabase/supabase`) de cada función usada: `gen_random_bytes`, `encode`, `gen_random_uuid`, `cardinality` vs. `array_length` (este último tiene una trampa real con arrays vacíos — devuelve `NULL`, no `0`, lo que habría dejado pasar un `primary_muscles` vacío silenciosamente), el patrón `SECURITY DEFINER set search_path = ''`, y la necesidad de `GRANT` explícito además de RLS.
- Comprobación de consistencia: toda columna `"order"` citada entre comillas dobles de forma consistente; todo texto con apóstrofe (`Farmer''s carry`) escapado correctamente; cadena de variantes fácil/difícil en el seed verificada a mano.

**Pendiente de verificación real** cuando haya Docker o un proyecto Supabase enlazado disponible: aplicar `supabase db reset` y confirmar en ejecución los puntos 1–10 de la tarea (migraciones aplican, PK/FK/UNIQUE/CHECK se comportan, RLS bloquea cruces entre usuarios, el índice de una sesión `in_progress` rechaza el duplicado, `code` se genera y es único, `auth.users` no se expone).

## Desviaciones respecto al mensaje de la tarea

- **`goals`**: se mantuvo como tabla privada única (sin `user_goals`, sin `code`), tal como estaba cerrado en la auditoría previa, en vez del patrón catálogo+unión que describía este último mensaje — resuelto explícitamente contigo antes de escribir código (regla 33), no de forma silenciosa.
- **`routines.difficulty`**: no se añadió — la auditoría anterior la había descartado explícitamente para el MVP; el propio mensaje la condicionaba a "si está aprobada".
- **`activities.duration_minutes` nullable**: instrucción explícita de este mensaje, relaja el `NOT NULL` que tenía el diseño anterior — adoptado sin objeción, es un cambio menor sin impacto estructural.
- **`set_logs` con `UNIQUE(workout_session_id, "order")`**: no se pidió por nombre, pero es la extensión directa de "order válido" ya aplicada de forma consistente en `routine_exercises`/`plan_items`.
- **Inmutabilidad de `code` vía trigger, no vía `GRANT` a nivel de columna**: la auditoría anterior dejaba ambas como opciones; se implementó el trigger por ser verificable con confianza sin una base de datos real contra la que probar los `GRANT` a nivel de columna.

## Qué NO se ha hecho todavía (fuera de alcance de esta tarea)

Autenticación en UI, páginas, componentes, PWA, Coach IA, subida/gestión de ejercicios, dashboard. La siguiente fase se decide después de verificar Supabase en un entorno con Docker o un proyecto enlazado.
