# Proveedores / encargados del tratamiento — Sport Coach

Documento interno. NO publicar. Basado en `package.json`, variables de entorno (`.env.local.example`), y grep exhaustivo de `process.env` sobre `src/`. **Proveedores confirmados en el código: Supabase, OpenAI, y el hosting (Vercel, por convención de despliegue de Next.js — sin paquete `@vercel/*` instalado, sin analítica de Vercel).** No se ha encontrado Stripe, Sentry, Google Analytics, ni ningún otro proveedor — no se documentan porque no existen todavía.

## 1. Supabase

- **Qué recibe**: toda la base de datos de la aplicación (§ ver `data-map.md`) — email/autenticación (Supabase Auth/GoTrue), y todas las tablas `public.*` (perfil, deportes, objetivos, rutinas, planes, sesiones, series, actividades). También el envío de los emails transaccionales de autenticación (confirmación de registro; recuperación de contraseña si se activa esa plantilla) a través de Supabase Auth's propio servicio de email.
- **Para qué**: es la base de datos y el sistema de autenticación de la aplicación — infraestructura central, no un servicio accesorio.
- **¿Es necesario?**: Sí — es el backend de la aplicación.
- **¿Actúa como encargado del tratamiento (art. 28 RGPD)?**: Sí.
- **Transferencia internacional**: **confirmado mediante `mcp__supabase__get_project` (2026-08-25, solo lectura) — el proyecto `pjbzqmroevruukxqfjet` está desplegado en la región `eu-west-1` (AWS, Irlanda, UE).** No hay transferencia internacional de datos personales fuera del EEE por este proveedor. Esto aplica al proyecto usado hoy en desarrollo/pruebas — **[COMPLETAR: confirmar que el proyecto Supabase de producción, si es distinto de este, usa la misma región `eu-west-1` o equivalente UE/EEE]**.
- **Documentación necesaria**: DPA de Supabase (lo ofrecen de forma estándar, aceptable via su Dashboard/Terms) — **REQUIERE VALIDACIÓN LEGAL** para confirmar que el DPA vigente cubre el uso real de este proyecto.
- **Qué debe reflejar la Política de Privacidad**: Supabase como encargado (hosting de base de datos + autenticación + envío de emails transaccionales), base jurídica ejecución de contrato, posible transferencia internacional pendiente de confirmar región.

## 2. OpenAI (Coach IA / SCOPE)

- **Qué recibe** (ver `docs/legal/legal-audit.md` §IA y el propio código en `src/lib/ai/`): en cada turno de conversación con SCOPE, la API de OpenAI (`responses.create`, SDK oficial `openai`, sin `baseURL` alternativo — confirmado en `src/lib/ai/provider.ts`, va directo a la API de OpenAI) recibe:
  - El mensaje del usuario (texto libre) y el historial reciente de la conversación (hasta 20 mensajes, reenviado por el propio cliente en cada petición — no se guarda en Supabase).
  - Un contexto base agregado: fecha, si tiene datos, nº de entrenamientos en 30 días, racha actual, sesiones/semana, nº de ejercicios mejorando/manteniendo — **contadores, nunca texto libre de notas/objetivos**.
  - Cuando el modelo llama a una *tool* de solo lectura: nombres de ejercicios/rutinas/planes, fechas de sesiones, estado, series/repeticiones/pesos objetivo, RPE agregado, nombres de grupos musculares — datos estructurados y proyectados explícitamente por cada tool (nunca un volcado de tabla).
  - **No se ha encontrado ningún tool que envíe los campos de texto libre `notes`/`description` de `data-map.md` §10** — pero el propio mensaje de chat del usuario sí es texto libre sin restricción, y el usuario podría escribir en él cualquier cosa, incluida información de salud.
- **Modelo/config**: `COACH_MODEL` (env var) o por defecto `gpt-5.6`, vía la API oficial de OpenAI (Responses API). La clave `OPENAI_API_KEY` solo se lee server-side (`src/lib/ai/config.ts`, `"server-only"`), nunca se expone al cliente ni se loggea.
- **¿Es necesario?**: Sí, para la funcionalidad de conversación con SCOPE (no para el resto de la app — el Coach V1 determinista sigue funcionando sin OpenAI configurado, confirmado en `isCoachAIConfigured()`).
- **¿Actúa como encargado del tratamiento?**: Sí, respecto a los datos de entrenamiento/mensajes que se le envían para procesar la petición.
- **Retención en OpenAI**: OpenAI aplica su propia política de retención de la API (distinta de ChatGPT) — a fecha de esta auditoría, la política pública de OpenAI para la API es no usar los datos enviados vía API para entrenar sus modelos por defecto, con una retención limitada por abuso/seguridad. **REQUIERE VALIDACIÓN LEGAL**: confirmar la política de retención/uso vigente en el momento de publicar (puede cambiar) y si existe un DPA/Business Associate Agreement firmable con OpenAI para este proyecto.
- **Transferencia internacional**: OpenAI, L.L.C. tiene sede en EE.UU. — **transferencia internacional de datos personales fuera del EEE**. Requiere una base válida (Cláusulas Contractuales Tipo de la Comisión Europea, que OpenAI ofrece como parte de su DPA). **REQUIERE VALIDACIÓN LEGAL** para confirmar el mecanismo vigente y si aplica el Data Privacy Framework UE-EE.UU.
- **No hay almacenamiento propio de conversaciones** (ver `data-map.md` §11) — reduce el riesgo de retención pero no elimina el hecho de que los datos se transmiten y se procesan en OpenAI en el momento de cada petición.

## 3. Hosting (Vercel, por convención — no confirmado con paquete instalado)

- El `README.md` generado por defecto de `create-next-app` menciona Vercel como plataforma de despliegue recomendada, y `src/lib/site-url.ts` referencia explícitamente "producción (Vercel)" en sus comentarios — pero **no hay ningún paquete `@vercel/analytics` ni `@vercel/speed-insights` instalado** (confirmado en `package.json`) y no hay ninguna otra evidencia en el código de qué plataforma aloja el proyecto en producción.
- **[COMPLETAR: confirmar la plataforma de hosting real de producción y su región]** — si es Vercel, actúa como encargado del tratamiento respecto al tráfico HTTP (logs de acceso a nivel de infraestructura), sujeto a su propio DPA estándar.
- No hay analítica de Vercel activa — no se envían métricas de uso a Vercel más allá de lo que su infraestructura de hosting registra por defecto (fuera del control de este código).

## 4. Proveedor de email

No existe un proveedor de email transaccional independiente (Resend, SendGrid, Postmark, etc.) — **confirmado, no está en `package.json` ni referenciado por ningún `process.env`**. Los emails transaccionales (confirmación de registro) los envía el propio Supabase Auth con su servicio de email integrado, usando la plantilla en `docs/email-templates/confirm-signup.html` (que debe pegarse manualmente en el Dashboard de Supabase — ver el comentario del propio archivo). Esto se documenta como parte de "Supabase" (§1), no como un proveedor separado.

## 5. Proveedores explícitamente NO presentes (no inventar, no documentar como si existieran)

Analytics (Google Analytics, PostHog, Plausible...), Sentry/error tracking de terceros, Stripe/cualquier procesador de pago, CDN de terceros para fuentes/scripts, cualquier red social/login social. Ninguno está en `package.json`, ninguno está referenciado por variable de entorno, ninguno tiene código que lo invoque. Si se añade alguno de estos en el futuro, este documento y la Política de Privacidad deben actualizarse ese mismo día.

## 6. Resumen para la Política de Privacidad

Encargados del tratamiento a día de hoy: **Supabase** (infraestructura completa: BD, autenticación, emails transaccionales) y **OpenAI** (procesamiento de las conversaciones con SCOPE). Ambos deben figurar explícitamente. Transferencias internacionales: Supabase confirmado en UE (`eu-west-1`, sin transferencia); OpenAI confirmada fuera del EEE (EE.UU., con mecanismo de cobertura por validar). Ver `compliance-checklist.md` para el listado de placeholders `[COMPLETAR]`.
