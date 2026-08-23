/**
 * Sport Coach's service worker -- hand-written, no Workbox/next-pwa.
 *
 * Why no library: this app has no build-time integration point that could
 * hand a library an accurate, versioned precache manifest of Next.js's own
 * content-hashed `/_next/static/*` bundle filenames (they change on every
 * build); a library's main value -- automating that manifest -- doesn't
 * apply without deeper build tooling this phase doesn't add (brief:
 * justify a dependency before adding it, prefer the simplest thing that
 * works). What's actually needed here is small enough to write directly
 * and keep fully auditable: cache static assets as they're requested,
 * never touch anything else.
 *
 * ARCHITECTURAL FACT THIS RELIES ON (verified by inspection, not assumed):
 * this app makes zero client-side Supabase calls -- every domain read/
 * write goes through a Server Component, Server Action, or the one
 * `/api/coach` route, all running server-side (see src/lib/README.md /
 * CLAUDE.md's own architecture rule). There is no separate Supabase
 * origin for this worker to accidentally intercept. The real private data
 * this worker must never cache is: (a) any navigation/document request
 * (every page is server-rendered per-request with real user data baked
 * into the HTML/RSC payload -- /today, /coach, /history, /plan are never
 * the same response twice), and (b) /api/coach itself (the Coach's real
 * reply). Both are excluded below by construction: this worker only ever
 * intercepts a request if its pathname matches the static-asset allowlist
 * -- everything else (including every page navigation and every API call)
 * is never even looked at, just passed straight to the network.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `sport-coach-shell-${CACHE_VERSION}`;

/** Same-origin, content-hashed or effectively-static GET requests only -- the allowlist IS the privacy boundary, not an afterthought. */
function isCacheableStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    /^\/(icon(-\d+)?(-maskable-\d+)?|apple-icon)\.png$/.test(url.pathname) ||
    /\.(?:svg|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("install", () => {
  // No precache list (see file doc comment above) -- assets populate the
  // cache as they're actually requested. skipWaiting() so a newly
  // installed worker doesn't sit "waiting" behind still-open tabs running
  // the old one (brief §20: never trap a user on a stale version).
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never touch a mutation

  const url = new URL(request.url);
  if (!isCacheableStaticAsset(url)) return; // let the browser handle everything else untouched -- every page, every API call

  // Stale-while-revalidate: instant from cache when present, and always
  // re-fetches in the background to catch a genuinely changed asset (a
  // non-hashed one like favicon.ico/manifest.webmanifest can change
  // between deploys; the hashed /_next/static/* ones never do, so for
  // those this just re-validates for free).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached); // offline and never cached -- nothing more this worker can do for a static asset it never saw
      return cached ?? networkFetch;
    })(),
  );
});
