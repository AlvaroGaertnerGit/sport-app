"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button, ButtonArrow, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { ErrorText } from "@/components/ui/error-text";
import { playCompletionChime, unlockAudioCue } from "@/lib/audio-cue";
import { isExerciseSetsDone } from "@/lib/domain/exercise-progress";
import type { ExerciseProgression, WorkoutSessionDetail } from "@/lib/domain";
import type { ExerciseTimerPhase } from "@/lib/exercise-timer";

import {
  abandonSessionAction,
  completeSessionAction,
  logSetAction,
  type LogSetActionState,
  type WorkoutActionState,
} from "./actions";
import { ExercisePanel, type ExercisePanelPhase } from "./exercise-panel";
import { ProgressBar } from "./progress-bar";
import { useExerciseTimer } from "./use-exercise-timer";
import { DEFAULT_REST_SECONDS, useRestTimer } from "./use-rest-timer";

const INITIAL_STATE: WorkoutActionState = undefined;
const INITIAL_LOG_STATE: LogSetActionState = undefined;

/** Which confirmation dialog (if any) is open -- one at a time, structurally. */
type ConfirmKind = "finish" | "skip" | "abandon" | null;

/**
 * Owns view/browsing state (`viewIndex`) and the rest-timer phase — both
 * client-only, neither `current_exercise_index` persisted anywhere. Which
 * exercise the domain considers "current" (for gating "Finalizar" and for
 * where a fresh page load starts) is re-derived server-side after every
 * mutation and read from `session.currentExerciseIndex`.
 *
 * "Salir" (the back link) is plain navigation to /today — no action
 * fires, so the session stays `in_progress` exactly as it was. Only the
 * explicit, confirmed "Abandonar" button below ever sets `abandoned`.
 */
export function WorkoutSessionView({
  session,
  progressions,
}: {
  session: WorkoutSessionDetail;
  /** Keyed by exerciseId -- the Training Progression Engine's read-only "what to aim for next" per exercise (src/lib/domain/progression.ts). */
  progressions: Map<string, ExerciseProgression>;
}) {
  const [viewIndex, setViewIndex] = useState(session.currentExerciseIndex ?? 0);
  const [confirming, setConfirming] = useState<ConfirmKind>(null);

  const [logState, logAction, logPending] = useActionState(logSetAction, INITIAL_LOG_STATE);
  const [completeState, completeAction, completePending] = useActionState(
    completeSessionAction,
    INITIAL_STATE,
  );
  const [abandonState, abandonAction, abandonPending] = useActionState(
    abandonSessionAction,
    INITIAL_STATE,
  );

  const exercises = session.exercises;
  const exercise = exercises[viewIndex];
  const exerciseDone = exercise ? isExerciseSetsDone(exercise) : false;
  const isLastExercise = viewIndex >= exercises.length - 1;
  const readyToFinish = session.currentExerciseIndex === null;
  const pendingSets = exercise ? Math.max(0, exercise.targetSets - exercise.completedSets) : 0;

  // logState is shared across every exercise (one useActionState at this
  // level) -- only surface it under the exercise it actually belongs to,
  // otherwise an error from exercise A keeps showing after navigating to
  // untouched exercise B.
  const logStateForExercise = logState?.exerciseId === exercise?.exerciseId ? logState : undefined;

  const restTimer = useRestTimer(session.sessionId, exercise?.exerciseId);
  const exerciseTimer = useExerciseTimer(session.sessionId, exercise?.exerciseId);

  // Rest starts automatically the moment a set is logged successfully --
  // no second confirmation. Detected as a pending->!pending transition
  // with no error, rather than the action returning extra data beyond
  // which exercise it was for. The exercise-duration timer is cleared in
  // the same moment: it's scoped per exercise (not per set), so without
  // this a second/third set of the same timed exercise would reopen
  // already showing "Tiempo terminado" from the set that was just logged.
  const wasLogPending = useRef(logPending);
  useEffect(() => {
    if (wasLogPending.current && !logPending && !logState?.error && exercise && logState?.exerciseId === exercise.exerciseId) {
      restTimer.start(exercise.exerciseId, exercise.restSeconds ?? DEFAULT_REST_SECONDS);
      exerciseTimer.clear();
    }
    wasLogPending.current = logPending;
    // restTimer.start/exerciseTimer.clear are stable (see the hooks'
    // own files); depending on the whole objects would re-run this on
    // every render, since a fresh object is returned each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPending, logState, exercise]);

  // One place both timers' completion chime fires from -- never inside
  // either hook itself (use-rest-timer.ts already owns its own
  // vibrate-once effect; this only adds the sound, brief §13/§17: exactly
  // once per real completion, never on an unrelated re-render).
  const prevRestPhaseRef = useRef(restTimer.phase);
  useEffect(() => {
    if (prevRestPhaseRef.current !== "done" && restTimer.phase === "done") {
      playCompletionChime();
    }
    prevRestPhaseRef.current = restTimer.phase;
  }, [restTimer.phase]);

  const prevExerciseTimerPhaseRef = useRef<ExerciseTimerPhase>(exerciseTimer.phase);
  useEffect(() => {
    if (prevExerciseTimerPhaseRef.current !== "done" && exerciseTimer.phase === "done") {
      playCompletionChime();
    }
    prevExerciseTimerPhaseRef.current = exerciseTimer.phase;
  }, [exerciseTimer.phase]);

  // Shared by "Siguiente" (once the exercise is done) and the post-rest
  // "Siguiente ejercicio"/"Continuar" button -- Math.min already no-ops
  // when there's nothing after the last exercise, so one function covers
  // both without a separate isLastExercise branch. Both timers are
  // cleared for the exercise being left -- brief §9/§10: no timer or
  // sound belonging to an abandoned exercise may keep running or fire later.
  function advanceToNextExercise() {
    restTimer.clear();
    exerciseTimer.clear();
    setViewIndex((i) => Math.min(exercises.length - 1, i + 1));
  }

  function handleSiguienteClick() {
    if (!exercise) return;
    if (exerciseDone) {
      advanceToNextExercise();
    } else {
      setConfirming("skip");
    }
  }

  // unlockAudioCue() runs synchronously inside each of these real click
  // handlers, never from an effect -- mobile browsers only allow
  // AudioContext.resume() to actually take effect inside a genuine user
  // gesture's own call stack (brief §15). Idempotent and cheap, so it's
  // safe to call from every one of the timer's own controls rather than
  // trying to guess which single tap "counts".
  function handleStartDurationTimer() {
    if (!exercise || exercise.targetDurationSeconds == null) return;
    unlockAudioCue();
    exerciseTimer.start(exercise.exerciseId, exercise.targetDurationSeconds);
  }
  function handlePauseDurationTimer() {
    unlockAudioCue();
    exerciseTimer.pause();
  }
  function handleResumeDurationTimer() {
    unlockAudioCue();
    exerciseTimer.resume();
  }
  function handleRestartDurationTimer() {
    unlockAudioCue();
    exerciseTimer.restart();
  }

  const panelPhase: ExercisePanelPhase =
    restTimer.phase === "resting"
      ? "resting"
      : restTimer.phase === "done"
        ? exerciseDone
          ? "rest-done-exercise"
          : "rest-done-continue"
        : exerciseDone
          ? "already-done"
          : "logging";

  // The "Anterior"/"Siguiente" browsing row is a shortcut around the
  // guided flow's explicit-tap rest gate -- only show it once the panel
  // itself isn't asking for that tap, so it can't be used to skip past a
  // running countdown or stack a second confirmation over it.
  const showBrowseNav = panelPhase === "logging" || panelPhase === "already-done";

  const segments = exercises.map((ex, i): "done" | "current" | "pending" => {
    if (i === viewIndex) return "current";
    return isExerciseSetsDone(ex) ? "done" : "pending";
  });

  return (
    // Workout has no bottom nav (it's outside the `(app)` route group's
    // fixed bar, by design -- a full-screen guided flow) and its own
    // action buttons (Registrar serie, Finalizar, Abandonar) are in normal
    // flow, not fixed -- but in a PWA standalone window with
    // `viewport-fit: cover` (see layout.tsx), the app renders all the way
    // under the home indicator, so the last bit of scrollable content
    // still needs real clearance there. `pb-10` alone was already correct
    // for a normal browser tab; this adds the device's own inset on top of
    // it (0 wherever there's no notch/indicator, so nothing changes there).
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2 px-6 pt-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between font-mono text-xs tracking-wide uppercase">
          <Link
            href="/today"
            className={`inline-flex min-h-11 items-center text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            ← Salir
          </Link>
          <p className="text-muted-foreground tabular-nums">
            {session.routineName ?? "Entrenamiento"}
            {exercises.length > 0 && ` · ${viewIndex + 1}/${exercises.length}`}
          </p>
        </div>
        {exercises.length > 0 && <ProgressBar segments={segments} />}
      </div>

      {exercise ? (
        <>
          <ExercisePanel
            sessionId={session.sessionId}
            exercise={exercise}
            progression={progressions.get(exercise.exerciseId) ?? null}
            phase={panelPhase}
            isLastExercise={isLastExercise}
            restRemainingSeconds={restTimer.remainingSeconds}
            restTotalSeconds={restTimer.totalSeconds}
            onAddRest={() => restTimer.addSeconds(30)}
            onSkipRest={() => restTimer.skip()}
            onContinueAfterRest={() => restTimer.clear()}
            onNextExerciseAfterRest={advanceToNextExercise}
            logAction={logAction}
            logState={logStateForExercise}
            logPending={logPending}
            durationTimerPhase={exerciseTimer.phase}
            durationTimerRemainingSeconds={exerciseTimer.remainingSeconds}
            onStartDurationTimer={handleStartDurationTimer}
            onPauseDurationTimer={handlePauseDurationTimer}
            onResumeDurationTimer={handleResumeDurationTimer}
            onRestartDurationTimer={handleRestartDurationTimer}
          />

          {showBrowseNav &&
            (confirming === "skip" ? (
              <ConfirmPanel
                onCancel={() => setConfirming(null)}
                message={
                  <>
                    <p className="font-medium">
                      Te queda{pendingSets === 1 ? "" : "n"} {pendingSets} serie{pendingSets === 1 ? "" : "s"}{" "}
                      pendiente{pendingSets === 1 ? "" : "s"}.
                    </p>
                    <p className="mt-1 text-muted-foreground">¿Quieres pasar al siguiente ejercicio?</p>
                  </>
                }
                cancelButton={
                  <Button type="button" variant="ghost" onClick={() => setConfirming(null)}>
                    Cancelar
                  </Button>
                }
                confirmButton={
                  // No arrow here -- ConfirmPanel splits this button into a
                  // half-width flex-1 slot next to "Cancelar"; the primary
                  // variant's large AA-driven text (see button.tsx) already
                  // fills that space, an appended glyph risks wrapping on
                  // narrow phones.
                  <Button
                    type="button"
                    onClick={() => {
                      advanceToNextExercise();
                      setConfirming(null);
                    }}
                  >
                    Continuar
                  </Button>
                }
              />
            ) : (
              <div className="mt-2 flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={viewIndex === 0 || logPending}
                  onClick={() => setViewIndex((i) => Math.max(0, i - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLastExercise || logPending}
                  onClick={handleSiguienteClick}
                >
                  Siguiente
                </Button>
              </div>
            ))}
        </>
      ) : (
        <section className="mt-10 flex flex-col gap-2 text-center">
          <h1 className="text-xl font-bold text-foreground">Esta rutina no tiene ejercicios</h1>
          <p className="text-sm text-muted-foreground">Puedes finalizar el entrenamiento.</p>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {confirming === "finish" ? (
          <ConfirmPanel
            onCancel={() => setConfirming(null)}
            message={
              <>
                <p className="font-medium">Te quedan ejercicios o series pendientes.</p>
                <p className="mt-1 text-muted-foreground">¿Quieres finalizar el entrenamiento igualmente?</p>
              </>
            }
            cancelButton={
              <Button type="button" variant="ghost" onClick={() => setConfirming(null)}>
                Cancelar
              </Button>
            }
            confirmButton={
              <form action={completeAction}>
                <input type="hidden" name="sessionId" value={session.sessionId} />
                <Button type="submit" disabled={completePending}>
                  {completePending ? "Finalizando…" : "Finalizar"}
                </Button>
              </form>
            }
          />
        ) : (
          <form
            action={completeAction}
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              if (!readyToFinish) {
                event.preventDefault();
                setConfirming("finish");
              }
            }}
          >
            <input type="hidden" name="sessionId" value={session.sessionId} />
            {/* Ghost until every exercise is done -- otherwise this sits solid-red
                right under the real primary CTA (Registrar serie / Siguiente
                ejercicio), which is exactly the "two primary buttons at once"
                the design direction rules out. Same condition ExercisePanel
                already uses for "Continuar" vs "Siguiente ejercicio". */}
            <Button
              type="submit"
              variant={readyToFinish ? "primary" : "ghost"}
              disabled={completePending || abandonPending || confirming === "abandon"}
            >
              {completePending ? (
                "Finalizando…"
              ) : (
                <>
                  Finalizar entrenamiento <ButtonArrow />
                </>
              )}
            </Button>
          </form>
        )}
        {completeState?.error && <ErrorText center>{completeState.error}</ErrorText>}

        {confirming === "abandon" ? (
          <ConfirmPanel
            onCancel={() => setConfirming(null)}
            message={
              <>
                <p className="font-medium">¿Abandonar entrenamiento?</p>
                <p className="mt-1 text-muted-foreground">
                  Tu progreso se conservará en el historial, pero esta sesión no se marcará como
                  completada.
                </p>
              </>
            }
            cancelButton={
              <Button type="button" variant="ghost" onClick={() => setConfirming(null)}>
                Seguir entrenando
              </Button>
            }
            confirmButton={
              <form action={abandonAction}>
                <input type="hidden" name="sessionId" value={session.sessionId} />
                <Button type="submit" variant="destructive-ghost" disabled={abandonPending}>
                  {abandonPending ? "Abandonando…" : "Abandonar"}
                </Button>
              </form>
            }
          />
        ) : (
          <button
            type="button"
            onClick={() => setConfirming("abandon")}
            disabled={completePending}
            className={`inline-flex min-h-11 items-center justify-center text-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition duration-150 hover:text-destructive active:scale-95 disabled:active:scale-100 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary disabled:text-muted-foreground/50`}
          >
            Abandonar entrenamiento
          </button>
        )}
        {abandonState?.error && <ErrorText center>{abandonState.error}</ErrorText>}
      </div>
    </main>
  );
}
