import Link from "next/link";
import { notFound } from "next/navigation";

import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { formatDurationMinutes, formatShortDate } from "@/lib/format";
import { formatExerciseTarget, getWorkoutSession } from "@/lib/domain";
import type { WorkoutSessionExercise } from "@/lib/domain";

/**
 * Read-only. No stepper, no register-set form, no edit affordance -- the
 * brief is explicit that history doesn't support editing the past yet.
 * Reuses `getWorkoutSession` as-is (it already returns routine, exercises,
 * targets and set logs for any status, not just in_progress) instead of a
 * new domain function.
 */
function ExerciseSummary({ exercise }: { exercise: WorkoutSessionExercise }) {
  const rowCount = Math.max(exercise.targetSets, exercise.setLogs.length);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <p className="font-sans text-xl font-black text-foreground uppercase leading-tight">
          {exercise.exerciseName}
        </p>
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {exercise.targetSets} × {formatExerciseTarget(exercise)}
        </p>
      </div>
      <div className="flex flex-col border-t border-border">
        {Array.from({ length: rowCount }, (_, i) => exercise.setLogs[i]).map((log, i) => (
          <div key={i} className="flex min-h-11 items-center gap-4 border-b border-border py-2">
            <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            {log ? (
              <>
                <span aria-hidden="true" className="text-lg text-success">
                  ✓
                </span>
                <span className="sr-only">Completada</span>
                <span className="ml-auto font-mono text-lg font-semibold text-foreground tabular-nums">
                  {exercise.targetType === "duration" ? `${log.durationSeconds}s` : log.reps}
                </span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="text-lg text-muted-foreground/50">
                  ○
                </span>
                <span className="sr-only">No registrada</span>
                <span className="ml-auto font-mono text-lg text-muted-foreground/50 tabular-nums">—</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SessionDetailPage(props: PageProps<"/history/sessions/[sessionId]">) {
  const user = await requireUser();
  const { sessionId } = await props.params;
  const session = await getWorkoutSession(user.id, sessionId);

  if (!session || session.status === "in_progress") {
    // in_progress isn't "history" yet -- it belongs to Today/Workout.
    notFound();
  }

  const durationMinutes =
    session.status === "completed" && session.completedAt
      ? Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
      : null;

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-6 pb-10">
      <Link
        href="/history/sessions"
        className="inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← Volver
      </Link>

      <div className="flex flex-col gap-2">
        <p className={EYEBROW_CLASSNAME}>{formatShortDate(session.startedAt)}</p>
        <h1 className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(2rem, 10vw, 3.25rem)" }}>
          {session.routineName ?? "Entrenamiento libre"}
        </h1>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {durationMinutes != null && <>{formatDurationMinutes(durationMinutes)} · </>}
          {session.status === "completed" ? "Completado" : "Abandonado"}
        </p>
      </div>

      {session.exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta sesión no tiene ejercicios registrados.</p>
      ) : (
        session.exercises.map((exercise) => (
          <ExerciseSummary key={exercise.exerciseId} exercise={exercise} />
        ))
      )}
    </div>
  );
}
