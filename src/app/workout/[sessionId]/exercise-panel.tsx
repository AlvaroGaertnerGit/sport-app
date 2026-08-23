import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button, ButtonArrow, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { CheckBadge } from "@/components/ui/check-badge";
import { ErrorText } from "@/components/ui/error-text";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { unlockAudioCue } from "@/lib/audio-cue";
import type { ExerciseTimerPhase } from "@/lib/exercise-timer";
import { formatRestClock } from "@/lib/rest-timer";
import {
  formatExerciseTarget as formatTarget,
  formatSetLogValue,
  smartSetDefaults,
  summarizeNextTarget,
} from "@/lib/domain/exercise-progress";
import type { ExerciseProgression, WorkoutSessionExercise } from "@/lib/domain";

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

/**
 * Nivel 1-2: nombre del ejercicio + objetivo -- domina la pantalla, sin caja.
 * `nextTarget` (from the Training Progression Engine, src/lib/domain/progression.ts)
 * is a quiet secondary line under the routine's own target -- it never
 * becomes a second CTA; "Registrar serie" stays the one dominant action.
 */
function ExerciseHeader({ exercise, nextTarget }: { exercise: WorkoutSessionExercise; nextTarget: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(2rem, 10vw, 3.25rem)" }}>
        {exercise.exerciseName}
      </h1>
      <p className="font-mono text-sm tracking-wide text-muted-foreground uppercase">
        {exercise.targetSets} × {formatTarget(exercise)}
      </p>
      {nextTarget && <p className="font-mono text-xs tracking-wide text-primary uppercase">Recomendado: {nextTarget}</p>}
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
  progression,
  editable,
}: {
  exercise: WorkoutSessionExercise;
  /** null when there's no progression data (falls back to the routine's own template target — see `smartSetDefaults`). */
  progression: ExerciseProgression | null;
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
        // Seeded once from the Progression Engine's own recommendation for
        // *this* set (falls back to the routine's template target when
        // there's none to trust) -- purely an initial value, never
        // re-applied after the stepper mounts (see smartSetDefaults' own
        // doc comment). Only computed when it'll actually be used.
        const smart = isActive ? smartSetDefaults(exercise, progression, i) : null;
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
                  {formatSetLogValue(exercise, log)}
                </span>
              </>
            ) : isActive && smart ? (
              <div className="ml-auto flex flex-col items-end gap-2">
                <span className="sr-only">En curso</span>
                {exercise.targetWeightKg != null && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Kg</span>
                    <SetValueStepper
                      compact
                      label={`Serie ${setNumber}, kilos`}
                      defaultValue={smart.weightKg ?? exercise.targetWeightKg}
                      step={2.5}
                      decimals={1}
                      name="weightKg"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {exercise.targetWeightKg != null && (
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                      {exercise.targetType === "duration" ? "Seg" : "Reps"}
                    </span>
                  )}
                  <SetValueStepper
                    compact
                    label={`Serie ${setNumber}, ${exercise.targetType === "duration" ? "segundos" : "repeticiones"}`}
                    defaultValue={smart.value}
                  />
                </div>
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
        className={`flex min-h-11 cursor-pointer list-none items-center justify-between font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground [&::-webkit-details-marker]:hidden ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
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
  progression,
  readOnly,
  nextTarget,
  logAction,
  logState,
  logPending,
  durationTimerPhase,
  durationTimerRemainingSeconds,
  onStartDurationTimer,
  onPauseDurationTimer,
  onResumeDurationTimer,
  onRestartDurationTimer,
}: {
  sessionId: string;
  exercise: WorkoutSessionExercise;
  progression: ExerciseProgression | null;
  readOnly: boolean;
  /** Only shown while the exercise is still actionable -- once every set is logged, the target line stops mattering. */
  nextTarget: string | null;
  logAction: FormActionDispatch;
  logState: LogSetActionState;
  logPending: boolean;
  durationTimerPhase: ExerciseTimerPhase;
  durationTimerRemainingSeconds: number;
  onStartDurationTimer: () => void;
  onPauseDurationTimer: () => void;
  onResumeDurationTimer: () => void;
  onRestartDurationTimer: () => void;
}) {
  // Only for a timed exercise's active set -- `targetDurationSeconds` is
  // null for a reps-based exercise, and this never renders once read-only
  // (every set already logged; there's nothing left to time).
  const showDurationTimer = !readOnly && exercise.targetType === "duration" && (exercise.targetDurationSeconds ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <ExerciseHeader exercise={exercise} nextTarget={readOnly ? null : nextTarget} />
      <ExerciseMedia exercise={exercise} />
      {showDurationTimer && (
        <DurationTimerBlock
          targetSeconds={exercise.targetDurationSeconds ?? 0}
          phase={durationTimerPhase}
          remainingSeconds={durationTimerRemainingSeconds}
          onStart={onStartDurationTimer}
          onPause={onPauseDurationTimer}
          onResume={onResumeDurationTimer}
          onRestart={onRestartDurationTimer}
        />
      )}
      {readOnly ? (
        <>
          <SetRows exercise={exercise} progression={null} editable={false} />
          <p className="text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Ejercicio completado
          </p>
        </>
      ) : (
        <form action={logAction} className="flex flex-col gap-6">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="exerciseId" value={exercise.exerciseId} />
          <SetRows key={exercise.exerciseId} exercise={exercise} progression={progression} editable />
          {logState?.error && <ErrorText>{logState.error}</ErrorText>}
          {/* onClick alongside the real form submission, never preventing it --
              this is the one gesture guaranteed to happen right before the rest
              timer auto-starts, so it's the most useful place to unlock audio
              (brief §15) even for an exercise with no duration timer of its own. */}
          <Button type="submit" disabled={logPending} onClick={() => unlockAudioCue()}>
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

/**
 * El anillo se drena a medida que pasa el tiempo -- rojo mientras cuenta,
 * ver RestDone* para el estado "listo" en lima. Exported: the single
 * countdown-ring mechanism the brief asks for, shared verbatim by the
 * rest timer (below) and the exercise-duration timer (`DurationTimerBlock`)
 * -- one drawing, two different surrounding blocks/controls, never a
 * second ring implementation.
 */
export function RestRing({ remainingSeconds, totalSeconds }: { remainingSeconds: number; totalSeconds: number }) {
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

/**
 * The countdown for a `targetType: "duration"` exercise (Plank 45s, etc.)
 * -- purely additive above the existing `SetRows`/stepper below it (brief
 * §12/§25: never changes how a set actually gets registered). "Iniciar"
 * is the one real user gesture this component's own click handlers get,
 * so audio unlocking (see session-view.tsx) piggybacks on it along with
 * Pausar/Reanudar/Reiniciar.
 *
 * `aria-live` only announces on a phase *change* (start/pause/resume/done),
 * never the ticking seconds themselves (brief §22: "no anunciar cada
 * segundo") -- the visible ring still updates every second, only the
 * screen-reader announcement is throttled to real transitions.
 */
function DurationTimerBlock({
  targetSeconds,
  phase,
  remainingSeconds,
  onStart,
  onPause,
  onResume,
  onRestart,
}: {
  targetSeconds: number;
  phase: ExerciseTimerPhase;
  remainingSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
}) {
  const displaySeconds = phase === "idle" ? targetSeconds : remainingSeconds;

  const [announcement, setAnnouncement] = useState("");
  const prevPhaseRef = useRef<ExerciseTimerPhase>(phase);
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      if (phase === "running") {
        setAnnouncement(prevPhaseRef.current === "paused" ? "Reanudado." : `Iniciado, ${targetSeconds} segundos.`);
      } else if (phase === "paused") {
        setAnnouncement(`Pausado, ${remainingSeconds} segundos restantes.`);
      } else if (phase === "done") {
        setAnnouncement("Tiempo terminado.");
      }
      prevPhaseRef.current = phase;
    }
  }, [phase, remainingSeconds, targetSeconds]);

  return (
    <div className="flex flex-col items-center gap-6 border-b border-border pb-6 text-center">
      <RestRing remainingSeconds={displaySeconds} totalSeconds={targetSeconds} />
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {phase === "done" && (
        <p className="font-mono text-sm tracking-widest text-success uppercase">Tiempo terminado — registra la serie abajo</p>
      )}
      <div className="flex items-center gap-4">
        {phase === "idle" && (
          <Button type="button" onClick={onStart} className="min-h-11 w-auto px-8 text-base">
            Iniciar
          </Button>
        )}
        {phase === "running" && (
          <Button
            type="button"
            variant="ghost"
            onClick={onPause}
            className="min-h-11 w-auto border border-border px-8"
          >
            Pausar
          </Button>
        )}
        {phase === "paused" && (
          <Button type="button" onClick={onResume} className="min-h-11 w-auto px-8 text-base">
            Reanudar
          </Button>
        )}
        {(phase === "paused" || phase === "done") && (
          <button
            type="button"
            onClick={onRestart}
            className={`min-h-11 px-2 font-mono text-sm tracking-wide text-muted-foreground uppercase transition duration-150 hover:text-foreground active:scale-95 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            Reiniciar
          </button>
        )}
      </div>
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
  // "+30s" already updates the ring/digits via the totalSeconds prop --
  // this only adds the *event* feedback the brief asks for (the user
  // should feel the tap happened, not just read a new number). Bumping a
  // key remounts the ring so `animate-pulse-once` restarts every press,
  // without needing to track previous totalSeconds across renders.
  const [pulseKey, setPulseKey] = useState(0);

  return (
    <div className="flex flex-col items-center gap-8 py-4 text-center">
      <p className={EYEBROW_CLASSNAME}>Descanso</p>
      <div key={pulseKey} className="animate-pulse-once">
        <RestRing remainingSeconds={remainingSeconds} totalSeconds={totalSeconds} />
      </div>
      <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{nextSetLabel}</p>
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={() => {
            onAddRest();
            setPulseKey((k) => k + 1);
          }}
          className={`min-h-11 px-2 font-mono text-sm tracking-wide text-muted-foreground uppercase transition duration-150 hover:text-foreground active:scale-95 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          +30s
        </button>
        <button
          type="button"
          onClick={onSkipRest}
          className={`min-h-11 px-2 font-mono text-sm tracking-wide text-muted-foreground uppercase transition duration-150 hover:text-foreground active:scale-95 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
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
  /** null when there's no progression data yet (e.g. insufficient history) -- see src/lib/domain/progression.ts. */
  progression: ExerciseProgression | null;
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
  durationTimerPhase: ExerciseTimerPhase;
  durationTimerRemainingSeconds: number;
  onStartDurationTimer: () => void;
  onPauseDurationTimer: () => void;
  onResumeDurationTimer: () => void;
  onRestartDurationTimer: () => void;
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
  progression,
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
  durationTimerPhase,
  durationTimerRemainingSeconds,
  onStartDurationTimer,
  onPauseDurationTimer,
  onResumeDurationTimer,
  onRestartDurationTimer,
}: ExercisePanelProps) {
  // The "resting" phase also covers the rest taken after an exercise's
  // LAST set (before rest-timer.phase flips to "done" and the panel
  // switches to RestDoneExerciseBlock) -- without this branch the label
  // below would claim "Siguiente: serie 3/3" for a set that was already
  // just logged, since Math.min's clamp has nothing left to distinguish
  // "about to do set 3" from "just finished set 3".
  const exerciseSetsDone = exercise.completedSets >= exercise.targetSets;
  const nextSetNumber = Math.min(exercise.completedSets + 1, exercise.targetSets);
  const nextSetLabel = exerciseSetsDone
    ? isLastExercise
      ? "Descanso final"
      : "Siguiente: nuevo ejercicio"
    : `Siguiente: serie ${nextSetNumber}/${exercise.targetSets} · ${formatTarget(exercise)}`;

  return (
    // Keyed on exercise + phase, not phase alone -- browsing to a different
    // exercise via "Anterior"/"Siguiente" while both stay in the "logging"
    // phase (the common case) used to skip this remount entirely, so the
    // panel just snapped to the new exercise with no transition at all.
    <div key={`${exercise.exerciseId}-${phase}`} className="flex animate-fade-in flex-col gap-6 pt-6">
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
          progression={progression}
          readOnly={phase === "already-done"}
          nextTarget={progression ? summarizeNextTarget(progression) : null}
          logAction={logAction}
          logState={logState}
          logPending={logPending}
          durationTimerPhase={durationTimerPhase}
          durationTimerRemainingSeconds={durationTimerRemainingSeconds}
          onStartDurationTimer={onStartDurationTimer}
          onPauseDurationTimer={onPauseDurationTimer}
          onResumeDurationTimer={onResumeDurationTimer}
          onRestartDurationTimer={onRestartDurationTimer}
        />
      )}
    </div>
  );
}
