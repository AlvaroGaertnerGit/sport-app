import { ErrorText } from "@/components/ui/error-text";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { redirectTo, error } = await props.searchParams;
  const target = typeof redirectTo === "string" ? redirectTo : "/today";
  // Only one caller sets this today: src/app/auth/confirm/route.ts, on a
  // failed/expired confirmation link. A fixed message, not the raw
  // Supabase error -- matches mapAuthError's own "never forward internals"
  // rule in src/lib/auth/actions.ts.
  const confirmationFailed = error === "confirmation_failed";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-10 px-5 py-16">
      <div className="flex flex-col gap-1">
        <p className={EYEBROW_CLASSNAME}>Sport Coach</p>
        <h1 className={`${DISPLAY_HEADING_CLASSNAME} text-5xl`}>
          Iniciar
          <br />
          sesión
        </h1>
      </div>
      {confirmationFailed && (
        <ErrorText>El enlace de confirmación no es válido o ha caducado. Inicia sesión o regístrate de nuevo.</ErrorText>
      )}
      <LoginForm redirectTo={target} />
    </main>
  );
}
