# Checklist de cumplimiento — Sport Coach

Documento interno. NO publicar. Estado a 2026-08-25, tras la fase de auditoría + corrección ("Legal Hardening"). Cada punto se clasifica como uno de:

- **IMPLEMENTADO** — existe en el código/producto tal como se describe.
- **PENDIENTE** — no existe todavía, funcionalidad real a construir.
- **REQUIERE REVISIÓN LEGAL** — la implementación técnica está hecha o decidida, pero su validez jurídica definitiva debe confirmarla un profesional.
- **NO APLICA** — analizado y descartado para la situación actual del producto, con motivo.

Este documento **no afirma cumplimiento al 100%** de ninguna normativa. Es un mapa de estado técnico para guiar la revisión jurídica y el trabajo pendiente.

## LSSI (Ley 34/2002)

| Punto | Estado | Detalle |
|---|---|---|
| Aviso legal | **IMPLEMENTADO** (contenido) / **PENDIENTE** (identidad) | `/legal/aviso-legal` existe con la estructura del art. 10 LSSI; los datos del titular son `[COMPLETAR]` en `src/lib/legal/config.ts` |
| Identificación del prestador | **PENDIENTE** | Requiere que se rellenen `legalName`, `taxId`, `address`, `email`, `website` en `src/lib/legal/config.ts` |
| Cookies — información | **IMPLEMENTADO** | `/legal/cookies`, inventario real, sin categorías inventadas |
| Cookies — primera capa sin "Rechazar" | **REQUIERE REVISIÓN LEGAL** | Ver `legal-audit.md` §9 — decisión razonada, no confirmada jurídicamente |
| Comunicaciones comerciales | **NO APLICA** | No existe ninguna funcionalidad de marketing/newsletter en el producto actual (`providers.md` §5) |

## RGPD (Reglamento UE 2016/679) + LOPDGDD 3/2018

| Punto | Estado | Detalle |
|---|---|---|
| Identidad del responsable | **PENDIENTE** | `[COMPLETAR]` en `src/lib/legal/config.ts`, reflejado en todas las páginas legales |
| Tratamientos declarados | **IMPLEMENTADO** | `/legal/privacidad` §2, basado en `data-map.md` (verificado tabla por tabla) |
| Bases jurídicas por tratamiento | **IMPLEMENTADO** | `/legal/privacidad` §4 — no se usa "consentimiento" de forma indiscriminada (ejecución de contrato para el núcleo del servicio, consentimiento explícito solo para el supuesto de salud incidental, interés legítimo para rate-limiting) |
| Derechos del interesado (acceso/rectificación/supresión/oposición/limitación/portabilidad) | **IMPLEMENTADO** (vía email) / **PENDIENTE** (autoservicio) | `/legal/privacidad` §9-10 — hoy se ejercen escribiendo a `LEGAL_ENTITY.email`; no existe todavía un botón de "Eliminar cuenta"/"Exportar datos" en Perfil |
| Proveedores/encargados documentados | **IMPLEMENTADO** | `providers.md` — Supabase y OpenAI, ninguno inventado |
| Transferencias internacionales — Supabase | **IMPLEMENTADO** (confirmado) | Región `eu-west-1` (UE), verificado por lectura directa del proyecto (`mcp__supabase__get_project`, 2026-08-25) — sin transferencia fuera del EEE |
| Transferencias internacionales — OpenAI | **REQUIERE REVISIÓN LEGAL** | EE.UU. confirmado; mecanismo de cobertura vigente (SCC/Data Privacy Framework) pendiente de validar en el momento de publicar |
| Conservación | **IMPLEMENTADO** (declarado) | `/legal/privacidad` §8 — mientras la cuenta esté activa, sin obligación fiscal adicional hoy (no hay facturación) |
| Seguridad (RLS, no exposición de claves) | **IMPLEMENTADO** | Verificado tabla por tabla en `data-map.md`; `OPENAI_API_KEY` server-only, nunca logueada; errores nunca reenvían detalle crudo del proveedor |
| Registro/prueba del consentimiento | **IMPLEMENTADO** | Tabla `public.consent_log` (RLS, insert-only, versionado) — ver §Consentimiento abajo |
| Consentimiento explícito para datos de salud incidentales | **REQUIERE REVISIÓN LEGAL** | Ver `legal-audit.md` §2 — mecanismo implementado como cláusula informativa en `/legal/privacidad` §3, no como acción afirmativa discreta; calificación como categoría especial no afirmada de forma definitiva |
| Privacidad desde el diseño | **IMPLEMENTADO** | RLS por usuario desde la primera tabla, sin denormalización innecesaria (`set_logs.user_id` deliberadamente ausente), sin persistencia de conversaciones SCOPE, sin captura de IP/user-agent |
| Decisiones automatizadas / perfilado | **NO APLICA** | SCOPE nunca escribe sin confirmación humana explícita — no hay decisión totalmente automatizada con efecto jurídico/significativo (art. 22 RGPD) |
| Menores | **IMPLEMENTADO** (declarado) | Servicio dirigido a mayores de 18 años, reflejado de forma consistente en Términos/Privacidad/registro; sin verificación de edad activa (no exigible para este tipo de producto) |

## Cookies

| Punto | Estado | Detalle |
|---|---|---|
| Inventario real | **IMPLEMENTADO** | `cookie-inventory.md` — 1 cookie técnica + 2 claves `localStorage` + 1 `sessionStorage`, todas necesarias |
| Cookies necesarias | **IMPLEMENTADO** | Cookie de sesión Supabase Auth, exenta del art. 22.2 LSSI |
| Tecnologías equivalentes (localStorage/sessionStorage) | **IMPLEMENTADO** | Documentadas en `/legal/cookies` §2, mismo tratamiento que las cookies |
| Consentimiento | **NO APLICA** (para lo existente) | No hay nada opcional que aceptar/rechazar hoy — ver `legal-audit.md` §9 sobre el riesgo de esta lectura |
| Revocación | **IMPLEMENTADO** | "Olvidar que he visto el aviso" en `CookieSettingsPanel`, reaparece el aviso |
| Persistencia de preferencias | **IMPLEMENTADO** | `localStorage` (`sc-cookie-notice-ack`), versionado — un cambio de `LEGAL_VERSION` reactiva el aviso |
| Bloqueo previo de tecnologías no necesarias | **NO APLICA** | No hay ninguna tecnología no necesaria que bloquear (0 analítica, 0 publicidad, 0 terceros — `providers.md` §5) |

## Consumidores

| Punto | Estado | Detalle |
|---|---|---|
| Términos y condiciones | **IMPLEMENTADO** | `/legal/terminos`, cubre objeto, cuenta, uso permitido/prohibido, IA, disclaimer, disponibilidad, responsabilidad, modificaciones |
| Información precontractual | **IMPLEMENTADO** | Servicio gratuito hoy — sin condiciones de pago que informar todavía |
| Futura contratación PRO | **PENDIENTE** (deliberadamente) | `/legal/terminos` §10 deja la estructura FREE/PRO anunciada, sin inventar precio/periodicidad/Stripe (brief §18) |
| Cancelación | **NO APLICA** (todavía) | No hay suscripción de pago que cancelar hoy |
| Desistimiento | **NO APLICA** (todavía) | Solo aplicable a contratación de pago, inexistente hoy — a redactar junto con PRO |

## IA (SCOPE + AI Act, Reglamento UE 2024/1689)

| Punto | Estado | Detalle |
|---|---|---|
| Identificación de SCOPE como IA en la interfaz | **IMPLEMENTADO** | Etiqueta cambiada de "Tu Coach" a "Coach IA" en `coach/page.tsx` y `coach-chat.tsx` (junto al nombre "Scope" ya visible) — art. 50.1 AI Act |
| Transparencia (documento dedicado) | **IMPLEMENTADO** | `/legal/scope-ia` — qué es, qué hace, qué no hace, límites |
| Funcionamiento general explicado | **IMPLEMENTADO** | `/legal/scope-ia` §2-3, `/legal/privacidad` §7 |
| Limitaciones ("puede equivocarse") | **IMPLEMENTADO** | `/legal/scope-ia` §4 |
| Disclaimer de entrenamiento | **IMPLEMENTADO** | `/legal/scope-ia` §5 (id `disclaimer`, enlazable directamente desde Perfil) — equilibrado, no exculpatorio absoluto |
| Clasificación de riesgo AI Act | **REQUIERE REVISIÓN LEGAL** | Análisis funcional en `legal-audit.md` §4 no encuentra indicios de "alto riesgo" (Anexo III) — SCOPE nunca decide, siempre propone con confirmación humana — pero la calificación definitiva y el calendario de aplicación del art. 50 deben confirmarse antes de publicar |
| Etiquetado de cada respuesta individual | **NO APLICA** | SCOPE genera solo texto conversacional, no imagen/audio/vídeo sintético — el art. 50.2/50.4 no aplica; el art. 50.1 se satisface identificando la interfaz, no cada mensaje |

## Accesibilidad

| Punto | Estado | Detalle |
|---|---|---|
| Ley 11/2023 de accesibilidad — aplicabilidad | **REQUIERE REVISIÓN LEGAL** | No puede determinarse con certeza solo mediante lectura de código: la ley aplica principalmente a organismos del sector público y a determinadas entidades privadas de cierto tamaño o que prestan servicios específicos (banca, transporte, comercio electrónico, telecomunicaciones). Sport Coach, tal como está descrito en este repositorio (producto de un titular a determinar, sin indicación de tamaño de empresa ni de los sectores regulados), no presenta indicios claros de estar dentro del ámbito obligatorio — pero esa determinación depende de datos societarios que no están en el código (tamaño de la entidad, facturación, sector). **No se afirma que la ley no aplique.** |
| Accesibilidad de las superficies nuevas (cookie banner, cookie settings, páginas legales, registro, Perfil) | **IMPLEMENTADO** (verificado en esta fase) | Ver el informe final de la fase — touch targets ≥44px, foco visible, `aria-label`/`aria-invalid`/`aria-describedby`, sin dependencia exclusiva del color |

## Placeholders `[COMPLETAR]` pendientes (lista exacta)

Todos centralizados en `src/lib/legal/config.ts` — rellenar ahí, no en las páginas:

- `legalName` — nombre o razón social del titular
- `taxId` — NIF/CIF
- `address` — domicilio completo a efectos de notificaciones
- `email` — email de contacto legal/privacidad (usado también para ejercer derechos RGPD y solicitar borrado/exportación de datos)
- `website` — dominio de producción de Sport Coach (también pendiente como `NEXT_PUBLIC_SITE_URL`)
- `registryData` — datos registrales, si aplica
- `dpo` — Delegado de Protección de Datos, si existe (a valorar si es obligatorio para este responsable)

Adicionalmente, fuera de `config.ts`:

- Confirmar la plataforma de hosting real de producción (se asume Vercel por convención, no confirmado — `providers.md` §3).
- Confirmar el nombre literal exacto de la cookie de sesión de Supabase en DevTools (patrón `sb-<project-ref>-auth-token` documentado, no confirmado carácter a carácter).
- Configurar en el Dashboard de Supabase que la plantilla de email de confirmación de registro apunte a `/auth/confirm` (el código ya está preparado — `src/app/auth/confirm/route.ts` — pero la plantilla del Dashboard debe actualizarse manualmente; ver `docs/email-templates/confirm-signup.html`).
