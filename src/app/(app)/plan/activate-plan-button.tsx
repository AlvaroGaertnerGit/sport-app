"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { ErrorText } from "@/components/ui/error-text";

import { activatePlanAction, type PlanActionState } from "./actions";

/**
 * Switching the active plan changes what Today/Workout operate on, so it
 * gets the same "are you sure" treatment `ArchivePlanButton` already
 * established on this exact screen -- not because activating is
 * destructive (it isn't; the previous plan is only archived-from-active,
 * never touched otherwise), but because it's a real state change the
 * user should see named before it happens, not just after.
 */
export function ActivatePlanButton({
  planId,
  planName,
  currentActivePlanName,
}: {
  planId: string;
  planName: string | null;
  currentActivePlanName: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<PlanActionState>(undefined);

  async function handleConfirm(formData: FormData) {
    const result = await activatePlanAction(undefined, formData);
    // activatePlanAction redirects on success, so reaching here means it failed.
    setState(result);
  }

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" onClick={() => setConfirming(true)} className="min-h-11 w-auto px-2">
        Activar
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ConfirmPanel
        onCancel={() => setConfirming(false)}
        message={
          <>
            <p className="font-medium">Activar {planName ? `"${planName}"` : "este plan"}</p>
            <p className="mt-1 text-muted-foreground">
              Este será tu plan de entrenamiento actual.
              {currentActivePlanName
                ? ` "${currentActivePlanName}" dejará de estar activo.`
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
            <Button type="submit">Activar</Button>
          </form>
        }
      />
      {state?.error && <ErrorText center>{state.error}</ErrorText>}
    </div>
  );
}
