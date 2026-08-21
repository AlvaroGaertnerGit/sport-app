"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { startWorkoutAction, type StartWorkoutState } from "./actions";

const INITIAL_STATE: StartWorkoutState = undefined;

export function StartWorkoutButton({ planItemId }: { planItemId: string }) {
  const [state, formAction, pending] = useActionState(startWorkoutAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="planItemId" value={planItemId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Empezando…" : "Empezar entrenamiento"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
