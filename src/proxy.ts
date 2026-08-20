import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed `middleware.ts`/`export function middleware` to
 * `proxy.ts`/`export function proxy` — verified against this project's own
 * installed Next.js docs (middleware.js is documented as deprecated).
 * Placed at `src/proxy.ts`, sibling to `src/app`, per the current file
 * convention.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
