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
  "/dashboard",
  "/workout",
  "/routines",
  "/plans",
  "/profile",
] as const;

/** Where an authenticated user lands if they try to visit /login again. */
const DEFAULT_AUTHENTICATED_ROUTE = "/dashboard";

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
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AUTHENTICATED_ROUTE;
    return NextResponse.redirect(url);
  }

  // Must return supabaseResponse as-is (with its cookies) — see Supabase's
  // docs for why constructing a fresh response here breaks session sync.
  return supabaseResponse;
}
