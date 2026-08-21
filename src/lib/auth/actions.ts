"use server";

import { redirect } from "next/navigation";

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
 * Only ever redirect within our own app. `redirectTo` arrives as form data
 * (ultimately from a query param on /login), so it must be treated as
 * untrusted input — without this check it would be an open-redirect
 * vulnerability.
 */
function safeRedirectTarget(path: string): string {
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/today";
}

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
      return "Incorrect email or password.";
    case "user_already_exists":
      return "An account with this email already exists.";
    case "weak_password":
      return "Password is too weak — use at least 8 characters, mixing letters and numbers.";
    case "email_not_confirmed":
      return "Please confirm your email before signing in.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      break;
  }

  // No `code` at all (thrown, not returned by the SDK) almost always means
  // the request never reached Supabase -- a network/fetch failure.
  if (error instanceof TypeError || (error instanceof Error && !code)) {
    return "Network error. Check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { error: mapAuthError(error) };
    }

    // GoTrue's documented anti-enumeration behavior: signing up with an
    // email that already belongs to a confirmed account returns a 200 with
    // an obfuscated user (empty `identities`), not an error -- verified
    // against Supabase's Identity Linking docs before relying on it here.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: "An account with this email already exists." };
    }

    if (data.session) {
      // Email confirmation is disabled for this project (or already
      // satisfied) -- signUp() signed the user in immediately.
      redirect("/today");
    }

    return {
      message: "Account created. Check your email to confirm your account before signing in.",
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
    return { error: "Email and password are required." };
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
