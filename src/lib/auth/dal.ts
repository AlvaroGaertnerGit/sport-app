import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Auth Data Access Layer — the only place Server Components/Actions/Route
 * Handlers should ask "who is the current user?". Not coupled to any
 * visual component (no JSX here); `import "server-only"` makes it a build
 * error to accidentally import this from a Client Component.
 *
 * Domain-specific reads (getActivePlan, getNextWorkout, ...) do NOT belong
 * here — they belong in a future `src/lib/domain/` (or per-feature) layer
 * that itself calls `getCurrentUser()`/`requireUser()` from this file
 * rather than re-deriving auth state. Not built yet — out of scope for
 * this phase.
 *
 * Each export is wrapped in React's `cache()`, matching Next.js's own
 * documented DAL pattern: multiple calls within the same request/render
 * pass reuse one result instead of re-hitting Supabase Auth per call site.
 */

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  // getUser() (not getSession()) is the deliberate choice here: it
  // re-validates the token against Supabase Auth instead of trusting the
  // locally-decoded cookie, per Supabase's own long-standing guidance for
  // anything running on the server.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
});

/**
 * For Server Components/Actions/Route Handlers that require a signed-in
 * user to proceed at all. Redirects rather than throwing a generic error —
 * matches the Next.js-documented DAL pattern (`verifySession`). Proxy
 * already redirects most unauthenticated visits away from protected
 * routes before this ever runs; this is the second, authoritative check —
 * proxy's is optimistic only (see src/lib/supabase/proxy.ts).
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
