"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { ErrorText } from "@/components/ui/error-text";

import { archivePlanAction, type PlanActionState } from "../actions";

/**
 * "Delete Plan" is really an archive under the hood (see `archivePlan` --
 * a real DELETE is blocked by `ON DELETE RESTRICT` the moment any session
 * has ever been logged, which is the normal case). The confirmation says
 * exactly that, plainly, including that there's currently no way back
 * since plan *creation* doesn't exist yet either -- an informed choice,
 * not a hidden one.
 */
export function ArchivePlanButton({ planId }: { planId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<PlanActionState>(undefined);

  async function handleConfirm(formData: FormData) {
    const result = await archivePlanAction(undefined, formData);
    // archivePlanAction redirects on success, so reaching here means it failed.
    setState(result);
  }

  if (!confirming) {
    return (
      <Button type="button" variant="destructive-ghost" onClick={() => setConfirming(true)}>
        Eliminar plan
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ConfirmPanel
        onCancel={() => setConfirming(false)}
        message={
          <>
            <p className="font-medium">¿Eliminar tu plan actual?</p>
            <p className="mt-1 text-muted-foreground">
              Tu plan se archivará: dejará de estar activo, pero tu historial y tus rutinas se conservan
              intactos. Crear un plan nuevo todavía no es posible desde la app, así que hasta entonces no
              podrás entrenar desde Hoy.
            </p>
          </>
        }
        cancelButton={
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        }
        confirmButton={
          <form action={handleConfirm}>
            <input type="hidden" name="planId" value={planId} />
            <Button type="submit" variant="destructive-ghost">
              Eliminar
            </Button>
          </form>
        }
      />
      {state?.error && <ErrorText center>{state.error}</ErrorText>}
    </div>
  );
}
