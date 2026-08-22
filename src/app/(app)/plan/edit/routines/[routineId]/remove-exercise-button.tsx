"use client";

import { useActionState } from "react";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";

import { removeExerciseFromRoutineAction, type ExerciseActionState } from "./actions";

const INITIAL_STATE: ExerciseActionState = undefined;

/**
 * No confirmation step -- unlike removing a routine from a plan (which can
 * hit `ON DELETE RESTRICT` once sessions exist), removing an exercise from
 * a routine is always safe: `set_logs` has no foreign key to
 * `routine_exercises` at all, so past history is untouched either way.
 * Same plain-button pattern as `/plan/edit`'s own `RemoveItemButton`.
 */
export function RemoveExerciseButton({ routineId, exerciseId }: { routineId: string; exerciseId: string }) {
  const [state, formAction, pending] = useActionState(removeExerciseFromRoutineAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex min-h-11 items-center px-2 font-mono text-xs tracking-wide text-muted-foreground uppercase transition duration-150 hover:text-destructive active:scale-95 disabled:text-muted-foreground/50 ${FOCUS_RING_CLASSNAME} focus-visible:outline-destructive`}
      >
        {pending ? "Quitando…" : "Quitar"}
      </button>
      {state?.error && <ErrorText center>{state.error}</ErrorText>}
    </form>
  );
}
