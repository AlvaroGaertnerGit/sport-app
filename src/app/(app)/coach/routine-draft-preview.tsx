"use client";

import { useState } from "react";

import { Button, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { formatExerciseTarget, formatWeightKg } from "@/lib/domain/exercise-progress";
import type { RoutineDraft } from "@/lib/ai/routine-draft";

/**
 * The Draft preview -- lines, not a chat bubble, matching every other list
 * in the app (session detail, routine config). "CREAR" does NOT write to
 * Supabase this phase (brief §35/§38): it only marks the draft as
 * confirmed-in-conversation, a purely local UI state. The real write is
 * next phase's job.
 */
export function RoutineDraftPreview({ draft, onEditRequested }: { draft: RoutineDraft; onEditRequested: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="flex flex-col gap-4 border border-border p-4">
      <div className="flex flex-col gap-1">
        <p className={EYEBROW_CLASSNAME}>Routine draft</p>
        <p className="font-sans text-xl font-black text-foreground uppercase leading-tight">{draft.name}</p>
        {draft.description && <p className="text-sm text-muted-foreground">{draft.description}</p>}
      </div>

      <div className="flex flex-col border-t border-border">
        {[...draft.exercises]
          .sort((a, b) => a.order - b.order)
          .map((exercise) => (
            <div key={`${exercise.order}-${exercise.exerciseId}`} className="flex items-center gap-4 border-b border-border py-3 last:border-b-0">
              <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {String(exercise.order).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate font-sans font-bold text-foreground uppercase">
                {exercise.exerciseName}
              </span>
              <span className="shrink-0 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                {exercise.sets} × {formatExerciseTarget(exercise)}
                {exercise.targetWeightKg != null && ` · ${formatWeightKg(exercise.targetWeightKg)} KG`}
              </span>
            </div>
          ))}
      </div>

      {confirmed ? (
        <p className="text-sm text-muted-foreground">
          Borrador listo. La creación real de la rutina llega en la próxima fase — de momento queda aquí, pendiente de
          confirmación.
        </p>
      ) : (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onEditRequested}
            className={`min-h-11 w-auto flex-1 border border-border ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            Editar
          </Button>
          <Button type="button" onClick={() => setConfirmed(true)} className="min-h-11 w-auto flex-1 text-base">
            Crear
          </Button>
        </div>
      )}
    </div>
  );
}
