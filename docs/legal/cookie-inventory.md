# Inventario de cookies y almacenamiento — Sport Coach

Documento interno. NO publicar. Auditoría real de `src/lib/supabase/*`, `src/proxy.ts`, `public/sw.js` y grep exhaustivo de `localStorage`/`sessionStorage`/`indexedDB`/`document.cookie` sobre `src/`. Sin analytics, sin marketing, sin scripts de terceros en el cliente — confirmado por `package.json` (única dependencia de red: `@supabase/ssr`, `@supabase/supabase-js`, `openai` — esta última solo se usa server-side, nunca en el navegador) y por ausencia de cualquier `<script src=...>` externo o `next/script` en `src/app/layout.tsx`.

## 1. Cookies

| Nombre | Origen | Finalidad | Duración | Tipo | ¿Requiere consentimiento? |
|---|---|---|---|---|---|
| `sb-<project-ref>-auth-token` (y posibles fragmentos `.0`, `.1`... si el token excede el tamaño de una cookie) | `@supabase/ssr` (Supabase Auth), gestionada automáticamente por `createServerClient`/`createBrowserClient`/`updateSession` en `src/lib/supabase/{server,client,proxy}.ts` | Mantener la sesión de usuario autenticado (RLS depende de ella) | Sesión / hasta expiración del refresh token de Supabase (configuración del proyecto Supabase) | Propia (first-party), técnica/estrictamente necesaria | **No** — exenta por LSSI art. 22.2 / ePrivacy (estrictamente necesaria para prestar el servicio solicitado por el usuario: iniciar sesión) |

No se ha encontrado ninguna otra cookie: ni analítica, ni publicitaria, ni de personalización, ni de terceros. **Nota de verificación pendiente**: el nombre exacto lo genera `@supabase/ssr` siguiendo su convención documentada (`sb-<ref>-auth-token`); confirmar el nombre literal inspeccionando el navegador (DevTools → Application → Cookies) durante el testing de la fase (§37 del brief) antes de publicar la Política de Cookies como definitiva.

## 2. `localStorage`

| Clave | Archivo | Contenido | Personal | Finalidad |
|---|---|---|---|---|
| `sport-coach:rest-timer:<sessionId>:<exerciseId>` (patrón) | `src/app/workout/[sessionId]/use-rest-timer.ts` | Timestamp/estado del temporizador de descanso en curso | No (efímero, ligado a una sesión de entrenamiento en curso) | Recuperar el temporizador si el usuario recarga la página a mitad de un descanso — funcional, no de seguimiento |
| `sport-coach:exercise-timer:<sessionId>:<exerciseId>` (patrón) | `src/app/workout/[sessionId]/use-exercise-timer.ts` | Igual que arriba, para el temporizador de ejercicio por tiempo | No | Igual que arriba |

Ambas claves son estrictamente funcionales (parte del mecanismo de la sesión guiada, no de seguimiento/analítica) y se limpian activamente (`removeItem`) al terminar el temporizador correspondiente. No requieren consentimiento — exentas igual que la cookie de sesión, por ser necesarias para una funcionalidad que el usuario ha solicitado activamente (registrar una serie/descanso en curso).

## 3. `sessionStorage`

| Clave | Archivo | Contenido | Finalidad |
|---|---|---|---|
| `GREETING_STORAGE_KEY` (ver `src/components/scope/companion/scope-greeting.tsx`) | Mismo archivo | Flag booleano: "el saludo de SCOPE ya se mostró en esta pestaña" | Evitar repetir la animación de saludo en la misma sesión de navegador — puramente de UI, no personal, se borra al cerrar la pestaña |

## 4. IndexedDB

No se ha encontrado ningún uso de IndexedDB en el código.

## 5. Service Worker (`public/sw.js`)

Escrito a mano (sin Workbox/next-pwa). Solo intercepta peticiones `GET` cuyo origen es el propio dominio y cuya ruta coincide con un allowlist de activos estáticos: `/_next/static/*`, `/manifest.webmanifest`, `/favicon.ico`, iconos (`/icon*.png`, `/apple-icon.png`), `.svg`/`.woff2`. **Por diseño, nunca cachea**: ninguna navegación de página (cada página es SSR con datos reales por petición) ni `/api/coach` (la respuesta real del Coach). Esto está garantizado por construcción — el propio archivo documenta que esta app no hace llamadas Supabase desde el cliente, así que no hay un origen Supabase que el worker pudiera interceptar por error. Estrategia: *stale-while-revalidate* solo sobre esos activos estáticos. No almacena ningún dato personal.

## 6. Fuentes (`next/font/google`)

`Geist`/`Geist_Mono` vía `next/font/google` en `src/app/layout.tsx`. `next/font` descarga y autohospeda los archivos de fuente en tiempo de build — **no hay ninguna petición en tiempo de ejecución a Google Fonts desde el navegador del usuario**, y por tanto no hay cookie ni IP compartida con Google por este concepto. Comportamiento estándar de Next.js, no específico de este proyecto.

## 7. Conclusión para la Política de Cookies / banner

Inventario real: **cero cookies no necesarias, cero tecnologías de seguimiento de terceros**. Todo lo encontrado (1 cookie de sesión + 2 claves de `localStorage` + 1 de `sessionStorage`) es estrictamente necesario/funcional y está exento de consentimiento previo bajo el art. 22.2 LSSI-CE (transposición del art. 5.3 de la Directiva ePrivacy).

Implicación de diseño (brief §33: "si no hay cookies no técnicas, NO crear un banner gigantesco pidiendo consentimiento para cosas inexistentes"): no se implementa un banner de 3 botones (Aceptar/Rechazar/Configurar) con categorías Analíticas/Publicidad que no existen — hacerlo sería presentar una elección falsa (dark pattern inverso: fingir que hay algo que rechazar cuando no lo hay). En su lugar se implementa:
1. Un aviso informativo breve, no bloqueante, en la primera visita, que informa de que se usan cookies técnicas y enlaza a la Política de Cookies completa.
2. Un panel de "Configurar cookies" real y accesible en todo momento (footer + `/legal/cookies`), con una única categoría hoy (**Necesarias**, activada y no desactivable, con explicación de por qué), construido de forma que añadir una categoría real en el futuro (si se incorpora analítica) solo requiere añadir un toggle — no rediseñar el sistema.
3. Registro local (localStorage) de que el aviso fue mostrado/reconocido, con fecha y versión de la política — ver §15 del brief, implementado de forma mínima.

Si en el futuro se añade cualquier cookie no necesaria (analítica, publicidad, personalización), este documento y el banner deben actualizarse ese mismo día — no antes.
