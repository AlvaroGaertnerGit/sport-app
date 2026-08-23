import Link from "next/link";
import { notFound } from "next/navigation";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { formatExerciseTarget, getRoutineDetail } from "@/lib/domain";

/**
 * Read-only -- the routine's template, not a session. No stepper, no
 * register-set form, no edit affordance (the brief is explicit: this
 * phase is visualization + navigation, not a routine editor).
 */
export default async function RoutineDetailPage(props: PageProps<"/plan/routines/[routineId]">) {
  const user = await requireUser();
  const { routineId } = await props.params;
  const routine = await getRoutineDetail(user.id, routineId);

  if (!routine) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pt-6 pb-10">
      <Link
        href="/plan"
        className={`inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        ← Volver
      </Link>

      <div className="flex animate-fade-in flex-col gap-2">
        {routine.sportName && <p className={EYEBROW_CLASSNAME}>{routine.sportName}</p>}
        <h1 className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(2rem, 10vw, 3.25rem)" }}>
          {routine.name}
        </h1>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {String(routine.exercises.length).padStart(2, "0")}{" "}
          {routine.exercises.length === 1 ? "ejercicio" : "ejercicios"}
        </p>
      </div>

      {routine.exercises.length === 0 ? (
        <p className="animate-fade-in text-sm text-muted-foreground">Esta rutina no tiene ejercicios todavía.</p>
      ) : (
        <div className="flex animate-fade-in flex-col border-t border-border">
          {routine.exercises.map((exercise) => (
            <div key={exercise.exerciseId} className="flex items-center gap-4 border-b border-border py-4">
              <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                {String(exercise.order).padStart(2, "0")}
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-sans font-black text-foreground uppercase leading-tight">
                  {exercise.exerciseName}
                </p>
                <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  {exercise.targetSets} × {formatExerciseTarget(exercise)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
