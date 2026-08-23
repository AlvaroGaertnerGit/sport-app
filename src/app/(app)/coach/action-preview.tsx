"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { ErrorText } from "@/components/ui/error-text";
import type { CoachActionDraft, CoachActionOp } from "@/lib/ai/action-draft";

import { confirmCoachActionAction } from "./actions";

const INITIAL_STATE = undefined;

/** One line per op, matching `RoutineDraftPreview`'s own 04-index/name/detail row idiom -- plain, factual, no interpretation. */
function describeOp(op: CoachActionOp): string {
  switch (op.type) {
    case "add_routine_to_plan":
      return `Añadir "${op.routineName}" a ${op.planName}`;
    case "add_exercise":
      return `Añadir ${op.exerciseName} a ${op.routineName}`;
    case "remove_exercise":
      return `Quitar ${op.exerciseName} de ${op.routineName}`;
    case "replace_exercise":
      return `Cambiar ${op.fromExerciseName} por ${op.toExerciseName} en ${op.routineName}`;
    case "reorder_exercise":
      return `Mover ${op.exerciseName} a la posición ${op.toPosition} en ${op.routineName}`;
    case "update_exercise_target":
      return `${op.exerciseName} en ${op.routineName}: ${op.previousTargetSets} series → ${op.targetSets} series`;
  }
}

/**
 * The confirmation UI for a `CoachActionDraft` (brief §10/§24) -- built on
 * the same `ConfirmPanel` every other are-you-sure moment in the app
 * already uses, not a parallel modal system. Only Cancelar/Confirmar (an
 * action draft is "do this specific thing," not an iteratively-refined
 * document the way `RoutineDraftPreview`'s Draft is, so no third "Editar"
 * affordance). Cancel is entirely client-side -- dismissing never writes,
 * matching the "only the real confirm button executes anything" rule.
 */
export function ActionPreview({ draft, onSettled }: { draft: CoachActionDraft; onSettled?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const [state, confirmAction, pending] = useActionState(confirmCoachActionAction, INITIAL_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state?.executed) {
      router.refresh();
      onSettled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  function cancel() {
    setDismissed(true);
    onSettled?.();
  }

  if (dismissed) {
    return null;
  }

  if (state?.executed) {
    return <p className="text-sm text-muted-foreground">Hecho — {state.message ?? draft.summary}.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ConfirmPanel
        onCancel={cancel}
        message={
          <div className="flex flex-col gap-2">
            <p className="font-medium">{draft.summary}</p>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {draft.ops.map((op, index) => (
                <li key={index}>{describeOp(op)}</li>
              ))}
            </ul>
          </div>
        }
        cancelButton={
          <Button type="button" variant="ghost" onClick={cancel}>
            Cancelar
          </Button>
        }
        confirmButton={
          <form action={confirmAction}>
            <input type="hidden" name="actionDraftJson" value={JSON.stringify(draft)} />
            <Button type="submit" variant={draft.destructive ? "destructive-ghost" : "primary"} disabled={pending}>
              {pending ? "Aplicando…" : draft.destructive ? "Eliminar ejercicio" : "Confirmar"}
            </Button>
          </form>
        }
      />
      {state?.error && <ErrorText center>{state.error}</ErrorText>}
    </div>
  );
}
