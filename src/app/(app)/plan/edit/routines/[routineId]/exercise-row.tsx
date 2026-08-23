"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";
import { Input } from "@/components/ui/input";
import { formatExerciseTarget, formatWeightKg } from "@/lib/domain/exercise-progress";
import type { RoutineDetailExercise } from "@/lib/domain";

import {
  reorderRoutineExerciseAction,
  updateExerciseTargetAction,
  type ExerciseActionState,
} from "./actions";
import { RemoveExerciseButton } from "./remove-exercise-button";

const INITIAL_STATE: ExerciseActionState = undefined;

/** Same toggle idiom as `add-exercise-flow.tsx`'s own `ToggleButton` -- kept local rather than shared since this is only the second use (CLAUDE.md's "regla de tres": extract on a third real case, not before). */
function ToggleButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border px-4 font-mono text-xs tracking-widest uppercase transition duration-150 active:scale-[0.98] ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary ${
        active ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      <span aria-hidden="true">{active ? "✓" : "○"}</span>
      {label}
    </button>
  );
}

/** ↑/↓, the required accessible alternative to drag & drop -- one form, one `useActionState`, the clicked button's own `name="toPosition"` value tells the server action which direction. `reorderRoutineExercise` clamps out-of-range positions itself, so disabling at the ends is a UX nicety, not a safety requirement. */
function MoveButtons({
  routineId,
  exerciseId,
  exerciseName,
  order,
  isFirst,
  isLast,
}: {
  routineId: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [, formAction, pending] = useActionState(reorderRoutineExerciseAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex shrink-0 flex-col gap-1">
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <button
        type="submit"
        name="toPosition"
        value={order - 1}
        disabled={isFirst || pending}
        aria-label={`Mover ${exerciseName} arriba`}
        className={`flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition duration-150 hover:text-foreground active:scale-95 disabled:opacity-30 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        ↑
      </button>
      <button
        type="submit"
        name="toPosition"
        value={order + 1}
        disabled={isLast || pending}
        aria-label={`Mover ${exerciseName} abajo`}
        className={`flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition duration-150 hover:text-foreground active:scale-95 disabled:opacity-30 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        ↓
      </button>
    </form>
  );
}

/**
 * Series/reps/weight/duration, editable in place -- only the fields
 * relevant to the exercise's own `targetType` are shown (brief: "no
 * mostrar campos irrelevantes"). Prefilled from the exercise's current
 * target, submitted only on "Guardar" (never per-keystroke), and validated
 * server-side by the exact same `parseTargetFromForm` the add-exercise flow
 * already uses.
 */
function EditTargetForm({
  routineId,
  exercise,
  onDone,
}: {
  routineId: string;
  exercise: RoutineDetailExercise;
  onDone: () => void;
}) {
  const [targetType, setTargetType] = useState<"reps" | "duration">(exercise.targetType);
  const [hasWeight, setHasWeight] = useState(exercise.targetWeightKg != null);
  const [state, formAction, pending] = useActionState(updateExerciseTargetAction, INITIAL_STATE);

  const wasPending = useRef(pending);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      onDone();
    }
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4 border-b border-border py-4">
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="exerciseId" value={exercise.exerciseId} />
      <input type="hidden" name="targetType" value={targetType} />

      <p className="font-sans font-bold text-foreground uppercase">{exercise.exerciseName}</p>

      <div className="flex gap-2">
        <ToggleButton label="Reps" active={targetType === "reps"} onClick={() => setTargetType("reps")} />
        <ToggleButton label="Duración" active={targetType === "duration"} onClick={() => setTargetType("duration")} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`sets-${exercise.exerciseId}`} className="text-sm font-medium text-foreground">
          Series
        </label>
        <Input id={`sets-${exercise.exerciseId}`} name="targetSets" type="text" inputMode="numeric" defaultValue={exercise.targetSets} required />
      </div>

      {targetType === "reps" ? (
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor={`reps-min-${exercise.exerciseId}`} className="text-sm font-medium text-foreground">
              Reps mín.
            </label>
            <Input
              id={`reps-min-${exercise.exerciseId}`}
              name="targetRepsMin"
              type="text"
              inputMode="numeric"
              defaultValue={exercise.targetType === "reps" ? (exercise.targetRepsMin ?? undefined) : undefined}
              required
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor={`reps-max-${exercise.exerciseId}`} className="text-sm font-medium text-foreground">
              Reps máx.
            </label>
            <Input
              id={`reps-max-${exercise.exerciseId}`}
              name="targetRepsMax"
              type="text"
              inputMode="numeric"
              defaultValue={exercise.targetType === "reps" ? (exercise.targetRepsMax ?? undefined) : undefined}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={`duration-${exercise.exerciseId}`} className="text-sm font-medium text-foreground">
            Segundos
          </label>
          <Input
            id={`duration-${exercise.exerciseId}`}
            name="targetDurationSeconds"
            type="text"
            inputMode="numeric"
            defaultValue={exercise.targetType === "duration" ? (exercise.targetDurationSeconds ?? undefined) : undefined}
            required
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <ToggleButton label="Con peso" active={hasWeight} onClick={() => setHasWeight((v) => !v)} />
        {hasWeight && (
          <div className="flex flex-col gap-2">
            <label htmlFor={`weight-${exercise.exerciseId}`} className="text-sm font-medium text-foreground">
              Kg
            </label>
            <Input
              id={`weight-${exercise.exerciseId}`}
              name="targetWeightKg"
              type="text"
              inputMode="decimal"
              defaultValue={exercise.targetWeightKg ?? undefined}
            />
          </div>
        )}
      </div>

      {state?.error && <ErrorText center>{state.error}</ErrorText>}

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending} className="min-h-11 w-auto flex-1 border border-border">
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="min-h-11 flex-1 text-base">
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

export function ExerciseRow({
  routineId,
  exercise,
  isFirst,
  isLast,
}: {
  routineId: string;
  exercise: RoutineDetailExercise;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <EditTargetForm routineId={routineId} exercise={exercise} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <MoveButtons
        routineId={routineId}
        exerciseId={exercise.exerciseId}
        exerciseName={exercise.exerciseName}
        order={exercise.order}
        isFirst={isFirst}
        isLast={isLast}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span title={exercise.exerciseName} className="truncate font-sans font-bold text-foreground uppercase">
          {exercise.exerciseName}
        </span>
        <span className="font-mono text-xs text-muted-foreground uppercase">
          {exercise.targetSets} × {formatExerciseTarget(exercise)}
          {exercise.targetWeightKg != null && ` · ${formatWeightKg(exercise.targetWeightKg)} KG`}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`inline-flex min-h-11 shrink-0 items-center px-2 font-mono text-xs tracking-wide text-muted-foreground uppercase transition duration-150 hover:text-foreground active:scale-95 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        Editar
      </button>
      <RemoveExerciseButton routineId={routineId} exerciseId={exercise.exerciseId} />
    </div>
  );
}
