import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { formatDurationMinutes } from "@/lib/format";
import type { ExerciseHighlight, ProgressSummary } from "@/lib/domain";

/**
 * Renders exactly the summary the domain gave us -- no aggregation here.
 * Two hero stats (workouts, training time) both get the same Geist Sans
 * 800 display treatment as Today's routine name (just smaller for the
 * second one) -- "métricas principales" is explicitly a Sans-800 case per
 * the design direction, not a mono one; mono is reserved for the smaller
 * readout-style numbers below (frequency counts, PR values, consistency
 * stats). No card anywhere -- sections separated by a thin top border,
 * same convention as Workout's technique disclosure.
 *
 * `improving` is deliberately not part of `summary`: it comes from the
 * Training Progression Engine (`getActivePlanExerciseProgressions`), which
 * reads the *last few sessions* regardless of the period tab, not the
 * period-filtered `set_logs` `summary` is built from -- passing it
 * separately keeps that distinction honest instead of pretending it's
 * period-scoped data it isn't.
 */
export function ProgressView({ summary, improving }: { summary: ProgressSummary; improving: ExerciseHighlight[] }) {
  if (!summary.hasData) {
    return (
      <section className="mt-10 flex animate-fade-in flex-col gap-3">
        <h2 className="text-2xl font-bold text-foreground">Aún no hay datos</h2>
        <p className="text-sm text-muted-foreground">
          Completa tu primer entrenamiento para empezar a ver tu progreso.
        </p>
      </section>
    );
  }

  const consistencyParts = [
    `${summary.activeDays} ${summary.activeDays === 1 ? "día activo" : "días activos"}`,
    `Racha ${summary.currentStreakDays}`,
    `Mejor racha ${summary.bestStreakDays}`,
  ];
  if (summary.sessionsPerWeek != null) {
    consistencyParts.push(`${summary.sessionsPerWeek}/semana`);
  }

  return (
    <div className="flex flex-col gap-8 pb-4">
      <div className="flex flex-col gap-1">
        <p className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(2.75rem, 13vw, 4.75rem)" }}>
          {summary.workoutsCompleted}
        </p>
        <p className={EYEBROW_CLASSNAME}>
          {summary.workoutsCompleted === 1 ? "Entrenamiento" : "Entrenamientos"}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(1.5rem, 7vw, 2.25rem)" }}>
          {formatDurationMinutes(summary.trainingMinutes)}
        </p>
        <p className={EYEBROW_CLASSNAME}>Entrenando</p>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <p className={EYEBROW_CLASSNAME}>Constancia</p>
        {summary.activityBuckets && (
          <div
            aria-hidden="true"
            className="flex h-6 items-stretch gap-1"
          >
            {summary.activityBuckets.map((bucket) => (
              <span
                key={bucket.label}
                className={`flex-1 rounded-sm ${bucket.active ? "bg-success" : "bg-muted"}`}
              />
            ))}
          </div>
        )}
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {consistencyParts.join(" · ")}
        </p>
      </div>

      {summary.topExercises.length > 0 && (
        <div className="flex flex-col border-t border-border pt-6">
          <p className={`mb-1 ${EYEBROW_CLASSNAME}`}>Ejercicios principales</p>
          <div className="flex flex-col">
            {summary.topExercises.map((exercise) => (
              <div
                key={exercise.exerciseId}
                className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
              >
                <span className="flex-1 truncate font-sans font-bold text-foreground uppercase">
                  {exercise.name}
                </span>
                <span className="font-mono text-lg font-semibold text-foreground tabular-nums">
                  {exercise.timesPerformed}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.personalBests.length > 0 && (
        <div className="flex flex-col border-t border-border pt-6">
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <p className={EYEBROW_CLASSNAME}>Mejores marcas</p>
            {/* Quiet, secondary to the PR list itself -- a running total, not a competing hero number. */}
            {summary.totalVolumeKg > 0 && (
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                Volumen {Math.round(summary.totalVolumeKg)} KG
              </p>
            )}
          </div>
          <div className="flex flex-col">
            {summary.personalBests.map((best) => (
              <div
                key={best.exerciseId}
                className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
              >
                <span className="flex-1 truncate font-sans font-bold text-foreground uppercase">
                  {best.name}
                </span>
                <span className="font-mono text-lg font-semibold text-foreground tabular-nums">
                  {best.targetType === "weight"
                    ? best.repsAtBestWeight != null
                      ? `${best.bestValue} KG × ${best.repsAtBestWeight}`
                      : `${best.bestValue} KG`
                    : best.targetType === "reps"
                      ? `${best.bestValue} REPS`
                      : `${best.bestValue}S`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {improving.length > 0 && (
        <div className="flex flex-col border-t border-border pt-6">
          <p className={`mb-1 ${EYEBROW_CLASSNAME}`}>Mejorando</p>
          <div className="flex flex-col">
            {improving.map((exercise) => (
              <div
                key={exercise.exerciseId}
                className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
              >
                <span className="flex-1 truncate font-sans font-bold text-foreground uppercase">
                  {exercise.exerciseName}
                </span>
                <span className="font-mono text-lg font-semibold text-success tabular-nums">{exercise.delta}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
