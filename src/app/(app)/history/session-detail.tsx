import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { formatDurationMinutes, formatShortDate } from "@/lib/format";
import { formatExerciseTarget } from "@/lib/domain";
import { formatSetLogValue } from "@/lib/domain/exercise-progress";
import type { WorkoutSessionDetail, WorkoutSessionExercise } from "@/lib/domain";

/**
 * Shared by the full-page session detail (`/history/sessions/[sessionId]`)
 * and the Calendar's inline day detail -- one implementation, not two. Read-
 * only: no stepper, no register-set form, no edit affordance.
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
                  {formatSetLogValue(exercise, log)}
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

export function SessionDetail({
  session,
  headingSize = "clamp(2rem, 10vw, 3.25rem)",
}: {
  session: WorkoutSessionDetail
  /** Smaller when embedded inline (Calendar's day detail) than as a full page heading. */
  headingSize?: string
}) {
  const durationMinutes =
    session.status === "completed" && session.completedAt
      ? Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className={EYEBROW_CLASSNAME}>{formatShortDate(session.startedAt)}</p>
        <h2 className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: headingSize }}>
          {session.routineName ?? "Entrenamiento libre"}
        </h2>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {durationMinutes != null && <>{formatDurationMinutes(durationMinutes)} · </>}
          {session.status === "completed" ? "Completado" : "Abandonado"}
        </p>
      </div>

      {session.exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta sesión no tiene ejercicios registrados.</p>
      ) : (
        session.exercises.map((exercise) => <ExerciseSummary key={exercise.exerciseId} exercise={exercise} />)
      )}
    </div>
  );
}
