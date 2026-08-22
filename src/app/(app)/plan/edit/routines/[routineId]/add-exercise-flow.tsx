"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button, ButtonArrow, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";
import { Input } from "@/components/ui/input";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import type { ExerciseSearchResult } from "@/lib/domain";

import { addExerciseToRoutineAction, searchExercisesForRoutineAction, type ExerciseActionState } from "./actions";

const BACK_LINK_CLASSNAME = `inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;
const SEARCH_DEBOUNCE_MS = 250;
const INITIAL_STATE: ExerciseActionState = undefined;

/**
 * Debounced calls to the *server* action (never a direct Supabase call from
 * here) -- the same "Client Component calls a Server Action directly"
 * pattern already used by `CreatePlanWizard`/`ArchivePlanButton`, just
 * triggered by typing instead of a tap. Empty query still returns the
 * catalog's first page (see `searchExercises`), so there's never a blank
 * screen before the user types anything.
 */
function SearchStep({ routineId, onSelect }: { routineId: string; onSelect: (exercise: ExerciseSearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseSearchResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      searchExercisesForRoutineAction(routineId, query).then((found) => {
        if (!cancelled) {
          setResults(found);
          setLoaded(true);
        }
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [routineId, query]);

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="exercise-search" className={EYEBROW_CLASSNAME}>
        Buscar ejercicio
      </label>
      <Input
        id="exercise-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Bench press…"
        autoComplete="off"
        autoFocus
      />
      {loaded && results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No se encontraron ejercicios.</p>
      ) : (
        <div className="flex flex-col border-t border-border">
          {results.map((exercise) => (
            <button
              key={exercise.exerciseId}
              type="button"
              onClick={() => onSelect(exercise)}
              className={`flex min-h-14 items-center gap-4 border-b border-border py-3 text-left transition duration-150 active:scale-[0.98] ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
            >
              <span className="min-w-0 flex-1 truncate font-sans font-bold text-foreground uppercase">
                {exercise.name}
              </span>
              {exercise.primaryMuscles[0] && (
                <span className="shrink-0 font-mono text-xs text-muted-foreground uppercase">
                  {exercise.primaryMuscles[0]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

/**
 * `routine_exercises` has real, non-nullable, checked target fields --
 * this step exists because there is no honest default to invent for them
 * (a duration exercise silently defaulted to "3x10" would be wrong). Only
 * ever reached after picking a real exercise from the catalog.
 */
function ConfigureStep({
  routineId,
  exercise,
  onBack,
  onAdded,
}: {
  routineId: string;
  exercise: ExerciseSearchResult;
  onBack: () => void;
  onAdded: () => void;
}) {
  const [targetType, setTargetType] = useState<"reps" | "duration">("reps");
  const [hasWeight, setHasWeight] = useState(false);
  const [state, formAction, pending] = useActionState(addExerciseToRoutineAction, INITIAL_STATE);

  // Same "pending -> !pending, no error" success detection session-view.tsx
  // already uses for the rest timer -- resets back to the search step once
  // the add genuinely succeeded, not on every unrelated re-render.
  const wasPending = useRef(pending);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      onAdded();
    }
    wasPending.current = pending;
  }, [pending, state, onAdded]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="exerciseId" value={exercise.exerciseId} />
      <input type="hidden" name="targetType" value={targetType} />

      <button type="button" onClick={onBack} className={BACK_LINK_CLASSNAME}>
        ← Atrás
      </button>

      <div className="flex flex-col gap-1">
        <p className={EYEBROW_CLASSNAME}>Configurar</p>
        <p className="font-sans text-xl font-bold text-foreground uppercase">{exercise.name}</p>
      </div>

      <div className="flex gap-2">
        <ToggleButton label="Reps" active={targetType === "reps"} onClick={() => setTargetType("reps")} />
        <ToggleButton label="Duración" active={targetType === "duration"} onClick={() => setTargetType("duration")} />
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="target-sets" className="text-sm font-medium text-foreground">
          Series
        </label>
        <Input id="target-sets" name="targetSets" type="text" inputMode="numeric" defaultValue={3} required />
      </div>

      {targetType === "reps" ? (
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-3">
            <label htmlFor="target-reps-min" className="text-sm font-medium text-foreground">
              Reps mín.
            </label>
            <Input id="target-reps-min" name="targetRepsMin" type="text" inputMode="numeric" defaultValue={8} required />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <label htmlFor="target-reps-max" className="text-sm font-medium text-foreground">
              Reps máx.
            </label>
            <Input id="target-reps-max" name="targetRepsMax" type="text" inputMode="numeric" defaultValue={12} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label htmlFor="target-duration" className="text-sm font-medium text-foreground">
            Segundos
          </label>
          <Input id="target-duration" name="targetDurationSeconds" type="text" inputMode="numeric" defaultValue={30} required />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <ToggleButton label="Con peso" active={hasWeight} onClick={() => setHasWeight((v) => !v)} />
        {hasWeight && (
          <div className="flex flex-col gap-3">
            <label htmlFor="target-weight" className="text-sm font-medium text-foreground">
              Kg
            </label>
            <Input id="target-weight" name="targetWeightKg" type="text" inputMode="decimal" placeholder="20" />
          </div>
        )}
      </div>

      {state?.error && <ErrorText center>{state.error}</ErrorText>}
      <Button type="submit" disabled={pending}>
        {pending ? "Añadiendo…" : <>Añadir ejercicio <ButtonArrow /></>}
      </Button>
    </form>
  );
}

export function AddExerciseFlow({ routineId }: { routineId: string }) {
  const [selected, setSelected] = useState<ExerciseSearchResult | null>(null);

  if (selected) {
    return (
      <ConfigureStep
        routineId={routineId}
        exercise={selected}
        onBack={() => setSelected(null)}
        onAdded={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className={EYEBROW_CLASSNAME}>Añadir ejercicio</p>
      <SearchStep routineId={routineId} onSelect={setSelected} />
    </div>
  );
}
