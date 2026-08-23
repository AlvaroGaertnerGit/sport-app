/**
 * Only ever redirect within our own app. A redirect target arriving as
 * form data or a query param (the /login `redirectTo`, the email
 * confirmation callback's `next`) is attacker-visible/-editable, so it must
 * be treated as untrusted input — without this check it would be an
 * open-redirect vulnerability. Kept in its own plain module (not inside
 * `src/lib/auth/actions.ts`) because that file has `"use server"` at the
 * top, and a Next.js Server Actions file may only export async functions —
 * this one plain synchronous helper needs a home outside it, reused by
 * both `actions.ts` and `src/app/auth/confirm/route.ts`.
 */
export function safeRedirectTarget(path: string): string {
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/today";
}

/**
 * Same guarantee as `safeRedirectTarget`, but also accepts an *absolute*
 * URL as long as its origin matches `requestOrigin` exactly -- needed
 * because `src/app/auth/confirm/route.ts`'s `next` param comes from
 * Supabase's `{{ .RedirectTo }}` template variable, which echoes back
 * whatever `emailRedirectTo` was passed at signup (an absolute URL, e.g.
 * `https://sport-app-livid.vercel.app/today` -- see `signUpAction`). A
 * mismatched-origin absolute URL is exactly the open-redirect case both
 * functions exist to block, so it falls through to the same `/today`
 * default as any other invalid value.
 */
export function safeRedirectTargetFromUrl(raw: string, requestOrigin: string): string {
  try {
    const url = new URL(raw, requestOrigin);
    if (url.origin === requestOrigin) {
      return safeRedirectTarget(url.pathname + url.search);
    }
  } catch {
    // Not a parseable absolute URL -- fall through to treating it as a
    // plain (possibly relative) path.
  }
  return safeRedirectTarget(raw);
}
