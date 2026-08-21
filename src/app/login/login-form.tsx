"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, ButtonArrow, TEXT_LINK_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";
import { Input } from "@/components/ui/input";
import { signInAction, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = undefined;
const ERROR_ID = "login-form-error";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const hasError = Boolean(state?.error);

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <input type="hidden" name="redirectTo" value={redirectTo} />

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
          minLength={6}
          autoComplete="current-password"
          aria-invalid={hasError}
          aria-describedby={hasError ? ERROR_ID : undefined}
        />
      </div>

      {state?.error && <ErrorText id={ERROR_ID}>{state.error}</ErrorText>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? (
          "Iniciando sesión…"
        ) : (
          <>
            Iniciar sesión <ButtonArrow />
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className={TEXT_LINK_CLASSNAME}>
          Regístrate
        </Link>
      </p>
    </form>
  );
}
