import Image from "next/image";

import { Button } from "@/components/ui/button";
import { formatRestClock } from "@/lib/rest-timer";
import type { WorkoutSessionExercise } from "@/lib/domain";

import type { LogSetActionState } from "./actions";
import { SetValueStepper } from "./set-value-stepper";

/** The bound dispatcher useActionState returns — not the raw server action. */
type FormActionDispatch = (formData: FormData) => void;

export type ExercisePanelPhase =
  | "logging"
  | "already-done"
  | "resting"
  | "rest-done-continue"
  | "rest-done-exercise";

function formatTarget(exercise: WorkoutSessionExercise): string {
  if (exercise.targetType === "duration") {
    return exercise.targetDurationSeconds ? `${exercise.targetDurationSeconds} s` : "—";
  }
  const { targetRepsMin, targetRepsMax } = exercise;
  if (targetRepsMin != null && targetRepsMax != null && targetRepsMin !== targetRepsMax) {
    return `${targetRepsMin}-${targetRepsMax} reps`;
  }
  return `${targetRepsMax ?? targetRepsMin ?? "—"} reps`;
}

function defaultSetValue(exercise: WorkoutSessionExercise): number {
  if (exercise.targetType === "duration") {
    return exercise.targetDurationSeconds ?? 0;
  }
  return exercise.targetRepsMax ?? exercise.targetRepsMin ?? 0;
}

function formatSetValue(
  exercise: WorkoutSessionExercise,
  log: WorkoutSessionExercise["setLogs"][number],
): string {
  return exercise.targetType === "duration" ? `${log.durationSeconds} s` : `${log.reps} reps`;
}

function ExerciseHeader({ exercise }: { exercise: WorkoutSessionExercise }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-wide text-foreground uppercase">
        {exercise.exerciseName}
      </h1>
      <p className="text-sm text-muted-foreground">
        {exercise.targetSets} × {formatTarget(exercise)}
      </p>
    </div>
  );
}

/** Nivel 3: progreso de series — the thing the user actually glances at between sets. */
function SetChecklist({ exercise }: { exercise: WorkoutSessionExercise }) {
  const rows = Math.max(exercise.targetSets, exercise.setLogs.length);
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => exercise.setLogs[i]).map((log, i) => (
        <li key={i} className="flex items-center gap-3 text-sm">
          <span
            aria-hidden="true"
            className={
              log
                ? "flex size-6 shrink-0 animate-check-pop items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                : "flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs text-muted-foreground"
            }
          >
            {log ? "✓" : ""}
          </span>
          <span className="text-muted-foreground">
            Serie {i + 1}
            <span className="sr-only">{log ? ", completada" : ", pendiente"}</span>
          </span>
          <span className="ml-auto font-medium text-foreground">
            {log ? formatSetValue(exercise, log) : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Nivel 4: media — bounded, aspect-ratio preserved, never a full-bleed hero. */
function ExerciseMedia({ exercise }: { exercise: WorkoutSessionExercise }) {
  if (exercise.videoUrl) {
    return (
      <video
        src={exercise.videoUrl}
        poster={exercise.imageUrl ?? undefined}
        controls
        className="aspect-video w-full rounded-2xl bg-muted object-cover"
      >
        <track kind="captions" />
      </video>
    );
  }
  if (exercise.imageUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
        <Image src={exercise.imageUrl} alt={exercise.exerciseName} fill className="object-cover" />
      </div>
    );
  }
  return null;
}

/** Nivel 5: técnica — present but never competing with the set, native <details> for a11y and zero JS. */
function TechniqueDisclosure({ exercise }: { exercise: WorkoutSessionExercise }) {
  if (!exercise.instructions) return null;
  return (
    <details className="group rounded-2xl border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        Ver técnica
        <span
          aria-hidden="true"
          className="text-muted-foreground transition-transform group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4 text-sm text-muted-foreground">
        <p>{exercise.instructions}</p>
        {exercise.commonMistakes && (
          <p className="text-xs">
            <span className="font-medium text-foreground">Errores comunes: </span>
            {exercise.commonMistakes}
          </p>
        )}
      </div>
    </details>
  );
}

function LoggingContent({
  sessionId,
  exercise,
  readOnly,
  logAction,
  logState,
  logPending,
}: {
  sessionId: string;
  exercise: WorkoutSessionExercise;
  readOnly: boolean;
  logAction: FormActionDispatch;
  logState: LogSetActionState;
  logPending: boolean;
}) {
  return (
    <>
      <ExerciseHeader exercise={exercise} />
      <SetChecklist exercise={exercise} />
      <ExerciseMedia exercise={exercise} />
      <TechniqueDisclosure exercise={exercise} />
      {readOnly ? (
        <p className="text-center text-sm text-muted-foreground">Ejercicio completado.</p>
      ) : (
        <form action={logAction} className="flex flex-col gap-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="exerciseId" value={exercise.exerciseId} />
          <SetValueStepper
            key={exercise.exerciseId}
            label={exercise.targetType === "duration" ? "Segundos" : "Repeticiones"}
            defaultValue={defaultSetValue(exercise)}
          />
          {logState?.error && (
            <p role="alert" className="text-sm text-destructive">
              {logState.error}
            </p>
          )}
          <Button type="submit" disabled={logPending}>
            {logPending ? "Guardando…" : "Registrar serie"}
          </Button>
        </form>
      )}
    </>
  );
}

function RestingBlock({
  remainingSeconds,
  totalSeconds,
  onAddRest,
  onSkipRest,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  onAddRest: () => void;
  onSkipRest: () => void;
}) {
  const elapsedRatio = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 1;
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Descanso</p>
      <p className="text-6xl font-semibold text-foreground tabular-nums">
        {formatRestClock(remainingSeconds)}
      </p>
      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
        <div
          className="h-full origin-left rounded-full bg-primary transition-transform duration-1000 ease-linear"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, elapsedRatio))})` }}
        />
      </div>
      <div className="flex w-full gap-3">
        <Button type="button" variant="ghost" onClick={onAddRest}>
          +30 s
        </Button>
        <Button type="button" variant="ghost" onClick={onSkipRest}>
          Saltar
        </Button>
      </div>
    </div>
  );
}

function RestDoneContinueBlock({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <p className="text-lg font-semibold text-foreground">Descanso terminado</p>
      <p className="text-sm text-muted-foreground">Prepárate para la siguiente serie.</p>
      <Button type="button" onClick={onContinue} className="mt-2">
        Empezar
      </Button>
    </div>
  );
}

function RestDoneExerciseBlock({
  isLastExercise,
  onNext,
}: {
  isLastExercise: boolean;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
      >
        ✓
      </span>
      <p className="text-lg font-semibold text-foreground">Ejercicio completado</p>
      {isLastExercise && (
        <p className="text-sm text-muted-foreground">Ya puedes finalizar tu entrenamiento.</p>
      )}
      {/* isLastExercise doesn't navigate anywhere -- there's no summary
          screen (out of scope this phase); it just dismisses this panel
          and reveals the always-present "Finalizar entrenamiento" button
          below, so the label says what actually happens. */}
      <Button type="button" variant={isLastExercise ? "ghost" : "primary"} onClick={onNext} className="mt-2">
        {isLastExercise ? "Continuar" : "Siguiente ejercicio"}
      </Button>
    </div>
  );
}

type ExercisePanelProps = {
  sessionId: string;
  exercise: WorkoutSessionExercise;
  phase: ExercisePanelPhase;
  isLastExercise: boolean;
  restRemainingSeconds: number;
  restTotalSeconds: number;
  onAddRest: () => void;
  onSkipRest: () => void;
  onContinueAfterRest: () => void;
  onNextExerciseAfterRest: () => void;
  logAction: FormActionDispatch;
  logState: LogSetActionState;
  logPending: boolean;
};

/**
 * One exercise, one of five phases. Which phase is active (and what each
 * phase's buttons do) is entirely the parent's job — this only knows how
 * to draw each one, same split as Today's recommendation-card.tsx.
 */
export function ExercisePanel({
  sessionId,
  exercise,
  phase,
  isLastExercise,
  restRemainingSeconds,
  restTotalSeconds,
  onAddRest,
  onSkipRest,
  onContinueAfterRest,
  onNextExerciseAfterRest,
  logAction,
  logState,
  logPending,
}: ExercisePanelProps) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div key={phase} className="flex animate-fade-in flex-col gap-5">
        {phase === "resting" && (
          <RestingBlock
            remainingSeconds={restRemainingSeconds}
            totalSeconds={restTotalSeconds}
            onAddRest={onAddRest}
            onSkipRest={onSkipRest}
          />
        )}
        {phase === "rest-done-continue" && <RestDoneContinueBlock onContinue={onContinueAfterRest} />}
        {phase === "rest-done-exercise" && (
          <RestDoneExerciseBlock isLastExercise={isLastExercise} onNext={onNextExerciseAfterRest} />
        )}
        {(phase === "logging" || phase === "already-done") && (
          <LoggingContent
            sessionId={sessionId}
            exercise={exercise}
            readOnly={phase === "already-done"}
            logAction={logAction}
            logState={logState}
            logPending={logPending}
          />
        )}
      </div>
    </section>
  );
}
