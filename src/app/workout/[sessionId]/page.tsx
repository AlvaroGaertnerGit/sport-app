import Link from "next/link";
import { notFound } from "next/navigation";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { getRoutineExerciseProgressions, getWorkoutSession, type ExerciseProgression } from "@/lib/domain";

import { WorkoutSessionView } from "./session-view";

/**
 * Deliberately outside the (app) route group: no bottom nav here. A
 * workout in progress should be a focused, full-screen task, not another
 * screen competing with the app shell's chrome.
 */
export default async function WorkoutSessionPage(props: PageProps<"/workout/[sessionId]">) {
  const { sessionId } = await props.params;
  const user = await requireUser();

  // null covers "doesn't exist" and "isn't yours" alike (RLS would block
  // the read either way) -- never distinguish the two to the client.
  const session = await getWorkoutSession(user.id, sessionId);

  if (!session) {
    notFound();
  }

  if (session.status !== "in_progress") {
    const isCompleted = session.status === "completed";
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        {isCompleted && (
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-success text-2xl font-bold text-success-foreground">
            ✓
          </span>
        )}
        <h1 className="text-2xl font-bold text-foreground">
          {isCompleted ? "Entrenamiento completado" : "Entrenamiento abandonado"}
        </h1>
        <p className="text-sm text-muted-foreground">Esta sesión ya ha terminado.</p>
        <Link
          href="/today"
          className={`mt-2 font-mono text-sm tracking-wide text-primary uppercase ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          Volver a Hoy →
        </Link>
      </main>
    );
  }

  // Needs session.exercises (the routine's targets), so it can't run
  // alongside getWorkoutSession itself -- still just one extra query pair
  // total (see getRoutineExerciseProgressions), not one per exercise.
  //
  // A recommendation is a bonus, never a requirement to train: if this
  // throws for any reason, Workout must still render with the routine's
  // own original targets rather than taking the whole page down with it.
  let progressions = new Map<string, ExerciseProgression>();
  if (session.routineId && session.exercises.length > 0) {
    try {
      progressions = await getRoutineExerciseProgressions(
        user.id,
        session.routineId,
        session.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          targetType: exercise.targetType,
          targetSets: exercise.targetSets,
          targetRepsMin: exercise.targetRepsMin,
          targetRepsMax: exercise.targetRepsMax,
          targetDurationSeconds: exercise.targetDurationSeconds,
          targetWeightKg: exercise.targetWeightKg,
        })),
      );
    } catch (err) {
      console.error("getRoutineExerciseProgressions failed:", err);
    }
  }

  return <WorkoutSessionView session={session} progressions={progressions} />;
}
