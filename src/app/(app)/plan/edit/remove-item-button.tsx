"use client";

import { useActionState } from "react";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";

import { removePlanItemAction, type PlanActionState } from "../actions";

const INITIAL_STATE: PlanActionState = undefined;

/**
 * Its own tiny client component (not a plain form) because this is the one
 * action in the editor that regularly and meaningfully fails: any plan_item
 * with real session history is protected by `ON DELETE RESTRICT` (see
 * `removePlanItem`), and that needs to surface as an actual message, not a
 * silent no-op or a generic Next.js error boundary.
 */
export function RemoveItemButton({ planId, planItemId }: { planId: string; planItemId: string }) {
  const [state, formAction, pending] = useActionState(removePlanItemAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="planItemId" value={planItemId} />
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
