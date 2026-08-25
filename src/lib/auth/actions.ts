"use server";

import { redirect } from "next/navigation";

import { safeRedirectTarget } from "@/lib/auth/safe-redirect";
import { LEGAL_VERSION } from "@/lib/legal/version";
import { SITE_URL } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth Server Actions — the only place sign-up/sign-in/sign-out are called
 * from. Every mutation goes through Supabase Auth itself (no password
 * handling, no custom session/JWT logic of our own). Errors are mapped to a
 * short, user-facing message; the underlying Supabase/Postgres error is
 * never forwarded to the client.
 */

export type AuthFormState =
  | {
      error?: string;
      message?: string;
    }
  | undefined;

/**
 * Maps a Supabase Auth error to a short, safe message. Never forwards
 * `error.message` directly -- GoTrue messages are reasonable but not
 * guaranteed stable/user-facing across versions, and this keeps SQL/internal
 * detail out of the response by construction rather than by care.
 */
function mapAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;

  switch (code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "user_already_exists":
      return "Ya existe una cuenta con este email.";
    case "weak_password":
      return "La contraseña es demasiado débil — usa al menos 8 caracteres, combinando letras y números.";
    case "email_not_confirmed":
      return "Confirma tu email antes de iniciar sesión.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    default:
      break;
  }

  // No `code` at all (thrown, not returned by the SDK) almost always means
  // the request never reached Supabase -- a network/fetch failure.
  if (error instanceof TypeError || (error instanceof Error && !code)) {
    return "Error de red. Comprueba tu conexión e inténtalo de nuevo.";
  }

  return "Algo ha salido mal. Inténtalo de nuevo.";
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const termsAccepted = formData.get("terms") === "on";

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }
  if (!termsAccepted) {
    return { error: "Debes aceptar los Términos y condiciones y la Política de privacidad para crear una cuenta." };
  }

  const supabase = await createClient();

  try {
    // `emailRedirectTo` becomes the confirmation email template's
    // `{{ .RedirectTo }}` variable -- the final in-app destination after
    // `/auth/confirm` verifies the token. The email's *domain* comes from
    // Supabase Dashboard's own "Site URL" setting (not overridable per
    // call, see the README/final report for why) -- this only controls
    // the path Supabase appends after that.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${SITE_URL}/today` },
    });

    if (error) {
      return { error: mapAuthError(error) };
    }

    // GoTrue's documented anti-enumeration behavior: signing up with an
    // email that already belongs to a confirmed account returns a 200 with
    // an obfuscated user (empty `identities`), not an error -- verified
    // against Supabase's Identity Linking docs before relying on it here.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: "Ya existe una cuenta con este email." };
    }

    if (data.session) {
      // Email confirmation is disabled for this project (or already
      // satisfied) -- signUp() signed the user in immediately, so this same
      // (now-authenticated) client can record consent right away. When
      // confirmation IS required, data.session is null here and this client
      // is still anonymous -- consent is recorded instead in
      // src/app/auth/confirm/route.ts, the first moment that user's session
      // actually exists.
      const { error: consentError } = await supabase
        .from("consent_log")
        .insert({ user_id: data.user!.id, consent_type: "terms_and_privacy", version: LEGAL_VERSION });
      if (consentError) {
        console.error("[auth] failed to record terms/privacy consent:", consentError.message);
      }
      redirect("/today");
    }

    return {
      message: "Cuenta creada. Revisa tu email para confirmarla antes de iniciar sesión.",
    };
  } catch (thrown) {
    return { error: mapAuthError(thrown) };
  }
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(String(formData.get("redirectTo") ?? "/today"));

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: mapAuthError(error) };
    }
  } catch (thrown) {
    return { error: mapAuthError(thrown) };
  }

  redirect(redirectTo);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
