"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { ErrorText } from "@/components/ui/error-text";

import { archivePlanAction, type PlanActionState } from "./actions";

/**
 * "Delete Plan" is really an archive under the hood (see `archivePlan` --
 * a real DELETE is blocked by `ON DELETE RESTRICT` the moment any session
 * has ever been logged, which is the normal case). The confirmation says
 * exactly that, plainly -- and, now that "Mis Planes" is a real library,
 * names the plan and warns explicitly when it's the active one (archiving
 * it leaves the user with no active plan until they activate another,
 * same as archiving always could, just no longer softened by "you can't
 * create a new one anyway").
 */
export function ArchivePlanButton({
  planId,
  planName,
  isActive,
}: {
  planId: string;
  planName: string | null;
  isActive: boolean;
}) {
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
            <p className="font-medium">¿Eliminar {planName ? `"${planName}"` : "este plan"}?</p>
            <p className="mt-1 text-muted-foreground">
              Se archivará: dejará de aparecer en Mis Planes, pero tu historial y tus rutinas se conservan
              intactos.
              {isActive
                ? " Es tu plan activo -- al eliminarlo te quedarás sin plan activo hasta que actives otro."
                : ""}
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
