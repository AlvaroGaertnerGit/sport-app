import Image from "next/image";

import { Button, ButtonArrow, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { CheckBadge } from "@/components/ui/check-badge";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
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
    return exercise.targetDurationSeconds ? `${exercise.targetDurationSeconds}s` : "—";
  }
  const { targetRepsMin, targetRepsMax } = exercise;
  if (targetRepsMin != null && targetRepsMax != null && targetRepsMin !== targetRepsMax) {
    return `${targetRepsMin}–${targetRepsMax} reps`;
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
  return exercise.targetType === "duration" ? `${log.durationSeconds}s` : `${log.reps}`;
}

/** Nivel 1-2: nombre del ejercicio + objetivo -- domina la pantalla, sin caja. */
function ExerciseHeader({ exercise }: { exercise: WorkoutSessionExercise }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(2rem, 10vw, 3.25rem)" }}>
        {exercise.exerciseName}
      </h1>
      <p className="font-mono text-sm tracking-wide text-muted-foreground uppercase">
        {exercise.targetSets} × {formatTarget(exercise)}
      </p>
    </div>
  );
}

/**
 * Nivel 3: las series como datos, no como cajas -- filas separadas por
 * líneas finas (ver docs/style-reference), no círculos rellenos ni cards.
 * La fila activa (la próxima serie sin registrar) incrusta el stepper en
 * lugar de un placeholder "○", exactamente como en la referencia.
 */
function SetRows({
  exercise,
  editable,
}: {
  exercise: WorkoutSessionExercise;
  /** When false (already-done / read-only), no row gets a stepper. */
  editable: boolean;
}) {
  const rows = Math.max(exercise.targetSets, exercise.setLogs.length);
  const activeIndex = exercise.completedSets;

  return (
    <div className="flex flex-col border-t border-border">
      {Array.from({ length: rows }, (_, i) => exercise.setLogs[i]).map((log, i) => {
        const isActive = editable && !log && i === activeIndex;
        const setNumber = i + 1;
        return (
          <div key={i} className="flex min-h-14 items-center gap-4 border-b border-border py-2">
            <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
              <span className="sr-only">Serie </span>
              {String(setNumber).padStart(2, "0")}
            </span>
            {log ? (
              <>
                <span aria-hidden="true" className="animate-check-pop text-lg text-success">
                  ✓
                </span>
                <span className="sr-only">Completada</span>
                <span className="ml-auto font-mono text-lg font-semibold text-foreground tabular-nums">
                  {formatSetValue(exercise, log)}
                </span>
              </>
            ) : isActive ? (
              <div className="ml-auto">
                <span className="sr-only">En curso</span>
                <SetValueStepper
                  compact
                  label={`Serie ${setNumber}, ${exercise.targetType === "duration" ? "segundos" : "repeticiones"}`}
                  defaultValue={defaultSetValue(exercise)}
                />
              </div>
            ) : (
              <>
                <span aria-hidden="true" className="text-lg text-muted-foreground/50">
                  ○
                </span>
                <span className="sr-only">Pendiente</span>
                <span className="ml-auto font-mono text-lg text-muted-foreground/50 tabular-nums">—</span>
              </>
            )}
          </div>
        );
      })}
    </div>
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
        className="aspect-video w-full rounded-md bg-muted object-cover"
      >
        <track kind="captions" />
      </video>
    );
  }
  if (exercise.imageUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
        <Image src={exercise.imageUrl} alt={exercise.exerciseName} fill className="object-cover" />
      </div>
    );
  }
  return null;
}

/** Nivel 5: técnica — auxiliar, nunca compite con la serie. Native <details> for a11y and zero JS. */
function TechniqueDisclosure({ exercise }: { exercise: WorkoutSessionExercise }) {
  if (!exercise.instructions) return null;
  return (
    <details className="group border-t border-border pt-3">
      <summary
        className={`flex min-h-11 cursor-pointer list-none items-center justify-between font-mono text-xs tracking-wide text-muted-foreground uppercase [&::-webkit-details-marker]:hidden ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        Ver técnica
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="flex flex-col gap-2 pt-3 text-sm text-muted-foreground">
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
    <div className="flex flex-col gap-6">
      <ExerciseHeader exercise={exercise} />
      <ExerciseMedia exercise={exercise} />
      {readOnly ? (
        <>
          <SetRows exercise={exercise} editable={false} />
          <p className="text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Ejercicio completado
          </p>
        </>
      ) : (
        <form action={logAction} className="flex flex-col gap-6">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="exerciseId" value={exercise.exerciseId} />
          <SetRows key={exercise.exerciseId} exercise={exercise} editable />
          {logState?.error && (
            <p role="alert" className="text-sm text-destructive">
              {logState.error}
            </p>
          )}
          <Button type="submit" disabled={logPending}>
            {logPending ? (
              "Guardando…"
            ) : (
              <>
                Registrar serie <ButtonArrow />
              </>
            )}
          </Button>
        </form>
      )}
      <TechniqueDisclosure exercise={exercise} />
    </div>
  );
}

/** El anillo se drena a medida que pasa el tiempo -- rojo mientras cuenta, ver RestDone* para el estado "listo" en lima. */
function RestRing({ remainingSeconds, totalSeconds }: { remainingSeconds: number; totalSeconds: number }) {
  const ratio = totalSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);

  return (
    <div className="relative mx-auto flex size-60 items-center justify-center">
      <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="100" cy="100" r={radius} strokeWidth="8" className="fill-none stroke-border" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          strokeWidth="8"
          strokeLinecap="round"
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <span className="font-mono text-5xl font-bold text-foreground tabular-nums">
        {formatRestClock(remainingSeconds)}
      </span>
    </div>
  );
}

function RestingBlock({
  remainingSeconds,
  totalSeconds,
  nextSetLabel,
  onAddRest,
  onSkipRest,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  nextSetLabel: string;
  onAddRest: () => void;
  onSkipRest: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 py-4 text-center">
      <p className={EYEBROW_CLASSNAME}>Descanso</p>
      <RestRing remainingSeconds={remainingSeconds} totalSeconds={totalSeconds} />
      <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{nextSetLabel}</p>
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={onAddRest}
          className={`min-h-11 px-2 font-mono text-sm tracking-wide text-muted-foreground uppercase hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          +30s
        </button>
        <button
          type="button"
          onClick={onSkipRest}
          className={`min-h-11 px-2 font-mono text-sm tracking-wide text-muted-foreground uppercase hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          Saltar descanso →
        </button>
      </div>
    </div>
  );
}

function RestDoneContinueBlock({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <span aria-hidden="true" className="animate-check-pop text-4xl text-success">
        ✓
      </span>
      <p className="text-2xl font-bold text-foreground">Descanso terminado</p>
      <p className="text-sm text-muted-foreground">Prepárate para la siguiente serie.</p>
      <Button type="button" onClick={onContinue} className="mt-2">
        Empezar <ButtonArrow />
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
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <CheckBadge />
      <p className="text-2xl font-bold text-foreground">Ejercicio completado</p>
      {isLastExercise && (
        <p className="text-sm text-muted-foreground">Ya puedes finalizar tu entrenamiento.</p>
      )}
      {/* isLastExercise doesn't navigate anywhere -- there's no summary
          screen (out of scope this phase); it just dismisses this panel
          and reveals the always-present "Finalizar entrenamiento" button
          below, so the label says what actually happens. */}
      <Button type="button" variant={isLastExercise ? "ghost" : "primary"} onClick={onNext} className="mt-2">
        {isLastExercise ? (
          "Continuar"
        ) : (
          <>
            Siguiente ejercicio <ButtonArrow />
          </>
        )}
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
 * to draw each one. No card wrapper -- a top divider line separates this
 * from the progress strip above (see docs/style-reference: rows and lines,
 * not boxes).
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
  const nextSetNumber = Math.min(exercise.completedSets + 1, exercise.targetSets);
  const nextSetLabel = `Siguiente: serie ${nextSetNumber}/${exercise.targetSets} · ${formatTarget(exercise)}`;

  return (
    <div key={phase} className="flex animate-fade-in flex-col gap-6 pt-6">
      {phase === "resting" && (
        <RestingBlock
          remainingSeconds={restRemainingSeconds}
          totalSeconds={restTotalSeconds}
          nextSetLabel={nextSetLabel}
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
  );
}
