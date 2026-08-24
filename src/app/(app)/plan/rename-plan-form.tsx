"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";
import { Input } from "@/components/ui/input";

import { renamePlanAction, type PlanActionState } from "./actions";

const INITIAL_STATE: PlanActionState = undefined;

export function RenamePlanForm({ planId, currentName }: { planId: string; currentName: string | null }) {
  const [state, formAction, pending] = useActionState(renamePlanAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="planId" value={planId} />
      <label htmlFor="plan-name" className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        Nombre del plan
      </label>
      <Input id="plan-name" name="name" defaultValue={currentName ?? ""} required />
      <Button type="submit" variant="ghost" disabled={pending} className="mt-1">
        {pending ? "Guardando…" : "Guardar nombre"}
      </Button>
      {state?.error && <ErrorText>{state.error}</ErrorText>}
    </form>
  );
}
