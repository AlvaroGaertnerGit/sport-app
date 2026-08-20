import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * The ONE place the server Supabase client is created, for use from Server
 * Components, Server Actions, and Route Handlers. Works with the
 * authenticated user's own session and RLS — never with `service_role`.
 *
 * The `setAll` try/catch is the officially documented pattern: Server
 * Components cannot write cookies (Next.js throws if you try), and that's
 * fine here because `src/proxy.ts` is what actually refreshes and persists
 * the session cookie on every request. Silently swallowing that specific
 * error is intentional, not a bug — verified against Supabase's current
 * SSR docs, not invented.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore because
            // src/proxy.ts refreshes the session on every request.
          }
        },
      },
    },
  );
}
