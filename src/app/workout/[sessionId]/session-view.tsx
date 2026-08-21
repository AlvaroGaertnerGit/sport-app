"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { isExerciseSetsDone } from "@/lib/domain/exercise-progress";
import type { WorkoutSessionDetail } from "@/lib/domain";

import {
  abandonSessionAction,
  completeSessionAction,
  logSetAction,
  type LogSetActionState,
  type WorkoutActionState,
} from "./actions";
import { ConfirmPanel } from "./confirm-panel";
import { ExercisePanel, type ExercisePanelPhase } from "./exercise-panel";
import { ProgressBar } from "./progress-bar";
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
export function WorkoutSessionView({ session }: { session: WorkoutSessionDetail }) {
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

  // Rest starts automatically the moment a set is logged successfully --
  // no second confirmation. Detected as a pending->!pending transition
  // with no error, rather than the action returning extra data beyond
  // which exercise it was for.
  const wasLogPending = useRef(logPending);
  useEffect(() => {
    if (wasLogPending.current && !logPending && !logState?.error && exercise && logState?.exerciseId === exercise.exerciseId) {
      restTimer.start(exercise.exerciseId, exercise.restSeconds ?? DEFAULT_REST_SECONDS);
    }
    wasLogPending.current = logPending;
    // restTimer.start is stable (see use-rest-timer.ts); depending on the
    // whole `restTimer` object would re-run this on every render, since a
    // fresh object is returned each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPending, logState, exercise]);

  // Shared by "Siguiente" (once the exercise is done) and the post-rest
  // "Siguiente ejercicio"/"Continuar" button -- Math.min already no-ops
  // when there's nothing after the last exercise, so one function covers
  // both without a separate isLastExercise branch.
  function advanceToNextExercise() {
    restTimer.clear();
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Link
            href="/today"
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            ← Salir
          </Link>
          <p className="text-sm font-medium text-muted-foreground">
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
          />

          {showBrowseNav &&
            (confirming === "skip" ? (
              <ConfirmPanel
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
              <div className="flex gap-3">
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
        <section className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Esta rutina no tiene ejercicios</h1>
          <p className="text-sm text-muted-foreground">Puedes finalizar el entrenamiento.</p>
        </section>
      )}

      <div className="flex flex-col gap-2">
        {confirming === "finish" ? (
          <ConfirmPanel
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
            <Button type="submit" disabled={completePending || abandonPending || confirming === "abandon"}>
              {completePending ? "Finalizando…" : "Finalizar entrenamiento"}
            </Button>
          </form>
        )}
        {completeState?.error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {completeState.error}
          </p>
        )}

        {confirming === "abandon" ? (
          <ConfirmPanel
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
            className="inline-flex min-h-11 items-center justify-center text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:text-muted-foreground/50"
          >
            Abandonar entrenamiento
          </button>
        )}
        {abandonState?.error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {abandonState.error}
          </p>
        )}
      </div>
    </div>
  );
}
