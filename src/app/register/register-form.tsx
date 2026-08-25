"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, ButtonArrow, FOCUS_RING_CLASSNAME, TEXT_LINK_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";
import { Input } from "@/components/ui/input";
import { signUpAction, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = undefined;
const ERROR_ID = "register-form-error";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const hasError = Boolean(state?.error);

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={hasError}
          aria-describedby={hasError ? ERROR_ID : undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={hasError}
          aria-describedby={hasError ? ERROR_ID : undefined}
        />
      </div>

      {/* Separate, unticked-by-default consent (RGPD/LSSI: never bundled
          with account creation itself, never pre-checked) -- min-h-11 on
          the label so the whole row is a >=44px touch target, not just the
          16px checkbox square. */}
      <label
        htmlFor="terms"
        className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-muted-foreground"
      >
        <input
          id="terms"
          name="terms"
          type="checkbox"
          required
          aria-invalid={hasError}
          aria-describedby={hasError ? ERROR_ID : undefined}
          className={`mt-0.5 size-5 shrink-0 border-2 border-border bg-transparent accent-primary ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        />
        <span>
          He leído y acepto los{" "}
          <Link href="/legal/terminos" target="_blank" className={TEXT_LINK_CLASSNAME}>
            Términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/legal/privacidad" target="_blank" className={TEXT_LINK_CLASSNAME}>
            Política de privacidad
          </Link>
          .
        </span>
      </label>

      {state?.error && <ErrorText id={ERROR_ID}>{state.error}</ErrorText>}
      {state?.message && (
        // text-foreground, not the success accent: the message itself
        // already says "creada" -- success doesn't need to lean on color,
        // and the lime accent is reserved for status glyphs (checkmarks,
        // the rest-ring), not body copy.
        <p role="status" className="text-sm text-foreground">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? (
          "Creando cuenta…"
        ) : (
          <>
            Crear cuenta <ButtonArrow />
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className={TEXT_LINK_CLASSNAME}>
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
