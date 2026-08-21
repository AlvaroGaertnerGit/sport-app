"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, ButtonArrow, TEXT_LINK_CLASSNAME } from "@/components/ui/button";
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

      {state?.error && (
        <p id={ERROR_ID} role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
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
