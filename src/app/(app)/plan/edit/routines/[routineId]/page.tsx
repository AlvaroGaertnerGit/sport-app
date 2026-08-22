import Link from "next/link";
import { notFound } from "next/navigation";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { formatExerciseTarget, formatWeightKg } from "@/lib/domain/exercise-progress";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { getRoutineDetail } from "@/lib/domain";

import { AddExerciseFlow } from "./add-exercise-flow";
import { RemoveExerciseButton } from "./remove-exercise-button";

/**
 * "Configurar rutina" -- the missing step of the already-existing chain
 * Plan → Editar plan → Rutinas del plan → **aquí** → Ejercicios. Add/remove
 * only (no reordering, no editing an existing exercise's target) --
 * reusing `getRoutineDetail` (Plan's own read-only routine viewer already
 * built it) rather than a second routine-reading query.
 */
export default async function ConfigureRoutinePage(props: PageProps<"/plan/edit/routines/[routineId]">) {
  const user = await requireUser();
  const { routineId } = await props.params;
  const routine = await getRoutineDetail(user.id, routineId);

  if (!routine) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-5 pt-6 pb-10">
      <Link
        href="/plan/edit"
        className={`inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        ← Volver
      </Link>

      <div className="flex flex-col gap-1">
        {routine.sportName && <p className={EYEBROW_CLASSNAME}>{routine.sportName}</p>}
        <h1 className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(1.75rem, 8vw, 2.5rem)" }}>
          {routine.name}
        </h1>
      </div>

      <div className="flex flex-col border-t border-border pt-6">
        <p className={`mb-3 ${EYEBROW_CLASSNAME}`}>Ejercicios</p>
        {routine.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esta rutina no tiene ejercicios todavía.</p>
        ) : (
          <div className="flex flex-col">
            {routine.exercises.map((exercise) => (
              <div key={exercise.exerciseId} className="flex items-center gap-3 border-b border-border py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-sans font-bold text-foreground uppercase">
                    {exercise.exerciseName}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground uppercase">
                    {exercise.targetSets} × {formatExerciseTarget(exercise)}
                    {exercise.targetWeightKg != null && ` · ${formatWeightKg(exercise.targetWeightKg)} KG`}
                  </span>
                </div>
                <RemoveExerciseButton routineId={routine.routineId} exerciseId={exercise.exerciseId} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-6">
        <AddExerciseFlow routineId={routine.routineId} />
      </div>
    </div>
  );
}
