"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import type { PlanDraft } from "@/lib/ai/plan-draft";

import { confirmCreatePlanAction } from "./actions";

const INITIAL_STATE = undefined;

/**
 * The Plan Draft preview -- a direct twin of `RoutineDraftPreview`'s own
 * layout and lifecycle (lines, not a chat bubble; "Crear plan" is a real
 * write, confirmed via `confirmCreatePlanAction`, which re-resolves/
 * re-validates fresh before creating anything). Each routine line is
 * tagged "nueva" when it's a brand-new routine the plan will create
 * alongside itself, distinguishing it from one of the user's existing
 * routines being reused.
 */
export function PlanDraftPreview({
  draft,
  onEditRequested,
  onSettled,
}: {
  draft: PlanDraft;
  onEditRequested: () => void;
  onSettled?: () => void;
}) {
  const [state, confirmAction, pending] = useActionState(confirmCreatePlanAction, INITIAL_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state?.executed) {
      router.refresh();
      onSettled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  return (
    <div className="flex flex-col gap-4 border border-border p-4">
      <div className="flex flex-col gap-1">
        <p className={EYEBROW_CLASSNAME}>Plan draft</p>
        <p className="font-sans text-xl font-black text-foreground uppercase leading-tight">{draft.name}</p>
        {draft.activateOnCreate && (
          <p className="font-mono text-xs tracking-wide text-primary uppercase">Se activará al crearlo</p>
        )}
      </div>

      <div className="flex flex-col border-t border-border">
        {draft.routines.map((ref, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-border py-3 last:border-b-0">
            <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              title={ref.kind === "existing" ? ref.routineName : ref.name}
              className="min-w-0 flex-1 truncate font-sans font-bold text-foreground uppercase"
            >
              {ref.kind === "existing" ? ref.routineName : ref.name}
            </span>
            {ref.kind === "new" ? (
              <span className="shrink-0 font-mono text-xs tracking-wide text-primary uppercase">
                Nueva · {ref.exercises.length} ej.
              </span>
            ) : (
              <span className="shrink-0 font-mono text-xs tracking-wide text-muted-foreground uppercase">Existente</span>
            )}
          </div>
        ))}
      </div>

      {state?.executed ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onEditRequested}
              disabled={pending}
              className={`min-h-11 w-auto flex-1 border border-border ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
            >
              Editar
            </Button>
            <form action={confirmAction} className="flex-1">
              <input type="hidden" name="planDraftJson" value={JSON.stringify(draft)} />
              <Button type="submit" disabled={pending} className="min-h-11 w-full text-base">
                {pending ? "Creando…" : "Crear plan"}
              </Button>
            </form>
          </div>
          {state?.error && <ErrorText center>{state.error}</ErrorText>}
        </div>
      )}
    </div>
  );
}
