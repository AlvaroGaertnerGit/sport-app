import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

/**
 * Routes that require a signed-in user. Prefix-matched against the request
 * path. Pages for most of these don't exist yet (this phase is
 * infrastructure only) — add a page under any of these paths and it is
 * already protected. Add a new prefix here when a new private area is
 * introduced.
 */
const PROTECTED_ROUTE_PREFIXES = [
  "/today",
  "/workout",
  "/routines",
  "/plans",
  "/profile",
] as const;

/** Where an authenticated user lands if they try to visit /login again. */
const DEFAULT_AUTHENTICATED_ROUTE = "/today";

const AUTH_ROUTE_PREFIXES = ["/login", "/auth"] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Refreshes the Supabase session on every matched request and redirects
 * based on the *optimistic* auth check only (cookie-derived claims, no
 * database round trip — Proxy must stay fast, per Next.js's own guidance
 * that Proxy is not a full session/authorization solution). Real
 * authorization for data access still comes from RLS; real per-request
 * auth verification for privileged reads still comes from
 * `requireUser()`/`getCurrentUser()` in Server Components/Actions — this
 * function only decides whether to redirect before a page even renders.
 *
 * Verified against Supabase's current SSR docs: `getClaims()` (not
 * `getUser()`) is what they now document for this specific call site, with
 * an explicit warning that removing it can cause random logouts under SSR.
 *
 * One deliberate exception to "optimistic only", see the AUTH_ROUTE_PREFIXES
 * branch below: bouncing away from /login on the optimistic signal alone is
 * what caused a real infinite-redirect bug for orphaned sessions (a JWT
 * that's still locally "valid" but whose session/user no longer exists
 * server-side) — requireUser() correctly sends them back to /login, Proxy
 * optimistically sends them right back to /today, forever. Proxy can't fix
 * this from the Server Component side (Next.js forbids writing cookies
 * during a Server Component render — see the try/catch in
 * src/lib/supabase/server.ts — so requireUser() has no way to clear a stale
 * cookie itself). Proxy/middleware is the one place allowed to write
 * cookies, so the real check — and the sign-out that breaks the loop —
 * belongs here, scoped to just this one cold path.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims() — see the
  // comment above. This call both refreshes the token and gives us the
  // (optimistic) authenticated-or-not signal for the redirect below.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname } = request.nextUrl;

  if (!isAuthenticated && matchesPrefix(pathname, PROTECTED_ROUTE_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && matchesPrefix(pathname, AUTH_ROUTE_PREFIXES)) {
    // Re-verify for real before bouncing away from /login -- see the
    // function comment. getUser() re-validates against Supabase Auth
    // itself (same call requireUser() makes), so this reuses the existing,
    // official mechanism rather than guessing from an error code/string.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = DEFAULT_AUTHENTICATED_ROUTE;
      return NextResponse.redirect(url);
    }

    // The claim looked valid but there's no real user/session behind it
    // (e.g. an orphaned session). Clear it so this stops recurring on every
    // subsequent request, and let the request continue on to /login as an
    // unauthenticated visitor instead of bouncing away from it again.
    // scope: "local" is deliberate -- signOut()'s default is "global", which
    // revokes the user's sessions on every device they're signed in on, not
    // just this stale one. All we want here is to stop clearing this one
    // browser's cookie from re-triggering the loop.
    await supabase.auth.signOut({ scope: "local" });
  }

  // Must return supabaseResponse as-is (with its cookies) — see Supabase's
  // docs for why constructing a fresh response here breaks session sync.
  return supabaseResponse;
}
