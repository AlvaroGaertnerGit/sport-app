"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { signOutAction } from "@/lib/auth/actions";

/**
 * Logout is destructive-adjacent (ends the session) but not data-destructive
 * -- same weight Workout already gives "Abandonar": a ghost trigger, gated
 * by the existing `ConfirmPanel` (focus-on-open, Escape-to-cancel already
 * built in), confirming into the *existing* `signOutAction` directly. No
 * second sign-out implementation.
 */
export function LogoutButton() {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <ConfirmPanel
        onCancel={() => setConfirming(false)}
        message={
          <>
            <p className="font-medium">¿Cerrar sesión?</p>
            <p className="mt-1 text-muted-foreground">Podrás volver a iniciar sesión cuando quieras.</p>
          </>
        }
        cancelButton={
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        }
        confirmButton={
          <form action={signOutAction}>
            <Button type="submit" variant="destructive-ghost">
              Cerrar sesión
            </Button>
          </form>
        }
      />
    );
  }

  return (
    <Button type="button" variant="destructive-ghost" onClick={() => setConfirming(true)}>
      Cerrar sesión
    </Button>
  );
}
