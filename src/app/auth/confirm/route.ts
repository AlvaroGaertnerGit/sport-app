import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { safeRedirectTargetFromUrl } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * The email-confirmation (and password-reset) callback Supabase's own
 * email templates must link to. Verified against Supabase's current
 * official Next.js App Router tutorial (Context7, not assumed from
 * training data) -- this is the documented pattern for this exact stack
 * (`@supabase/ssr` + cookie-based sessions): confirmation happens
 * server-side, in our own app, via `verifyOtp({ type, token_hash })`, so
 * the resulting session cookie is set through our own SSR client rather
 * than relying on Supabase's hosted confirmation page (which doesn't
 * cooperate with cookie-based SSR sessions the way this app needs).
 *
 * The Supabase Dashboard's email template must be updated to link here --
 * see the phase's final report for the exact template string. This route
 * existing is necessary but not sufficient: without that dashboard change,
 * the default template still uses Supabase's own hosted confirmation URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // `next` is Supabase's own `{{ .RedirectTo }}` echoed back -- an
  // *absolute* URL (see signUpAction's `emailRedirectTo`), set by our own
  // code, never by the person clicking the link -- but it's still a URL
  // query param in a link that gets forwarded/copied, so it goes through
  // the same open-redirect guard as /login's `redirectTo`.
  const requestOrigin = new URL(request.url).origin;
  const next = safeRedirectTargetFromUrl(searchParams.get("next") ?? "/today", requestOrigin);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation_failed", request.url));
}
