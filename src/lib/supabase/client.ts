import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * The ONE place the browser Supabase client is created. Client Components
 * call this directly — never `supabase.from(...)` scattered across the app.
 * No business logic, no Sport Coach-specific queries here.
 *
 * Verified against the current official pattern (Supabase docs, "Correct
 * Browser Client Implementation"): a plain factory, no manual singleton
 * caching — `createBrowserClient` is safe/cheap to call where needed.
 *
 * Only the publishable key and public URL ever reach this file — both are
 * safe to expose to the browser. `service_role` must never appear here.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
