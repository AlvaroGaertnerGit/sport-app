"use client";

import { useActionState } from "react";

import { Button, ButtonArrow } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";

import { startWorkoutAction, type StartWorkoutState } from "./actions";

const INITIAL_STATE: StartWorkoutState = undefined;

export function StartWorkoutButton({ planItemId }: { planItemId: string }) {
  const [state, formAction, pending] = useActionState(startWorkoutAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <input type="hidden" name="planItemId" value={planItemId} />
      <Button type="submit" disabled={pending}>
        {pending ? (
          "Empezando…"
        ) : (
          <>
            Empezar entrenamiento <ButtonArrow />
          </>
        )}
      </Button>
      {state?.error && <ErrorText center>{state.error}</ErrorText>}
    </form>
  );
}
