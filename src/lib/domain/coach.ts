import "server-only";

import { summarizeNextTarget } from "./exercise-progress";
import { getProgressSummary } from "./progress";
import { getActivePlanExerciseProgressions, selectImprovingHighlights } from "./progression";
import type { CoachExerciseNote, CoachSummary } from "./types";

/**
 * A fixed, non-selectable window -- Coach isn't Progress (no period tabs).
 * 30d matches Progress's own default period, so "workoutsCompleted"/
 * "sessionsPerWeek" here read the same as what a user just saw on Progress
 * with no tab touched.
 */
const COACH_PERIOD = "30d" as const;

/** Coach must stay scannable (brief §20: never list every exercise) -- the same cap `selectImprovingHighlights` already applies to "Mejorando". */
const MAX_NOTES = 3;

/**
 * The first deterministic Coach: composes `getProgressSummary` (workout
 * counts, streak, frequency -- all already correct, already tested) and
 * `getActivePlanExerciseProgressions` (this phase's new plan-wide
 * progression read) into one structured summary. No new metric is
 * invented here, no AI, nothing persisted -- every field traces to an
 * existing domain read or the Progression Engine's own `status`/`next`.
 */
export async function getCoachSummary(userId: string): Promise<CoachSummary> {
  const [progress, planProgressions] = await Promise.all([
    getProgressSummary(userId, COACH_PERIOD),
    getActivePlanExerciseProgressions(userId),
  ]);

  const improving = selectImprovingHighlights(planProgressions);

  const maintaining: CoachExerciseNote[] = planProgressions
    .filter((p) => p.progression.status === "maintain")
    .map((p) => {
      const nextTarget = summarizeNextTarget(p.progression);
      return nextTarget ? { exerciseId: p.exerciseId, exerciseName: p.exerciseName, routineName: p.routineName, nextTarget } : null;
    })
    .filter((n): n is CoachExerciseNote => n !== null)
    .slice(0, MAX_NOTES);

  const insufficientData = planProgressions
    .filter((p) => p.progression.status === "insufficient_data")
    .map((p) => ({ exerciseId: p.exerciseId, exerciseName: p.exerciseName, routineName: p.routineName }))
    .slice(0, MAX_NOTES);

  return {
    hasData: progress.hasData,
    workoutsCompleted: progress.workoutsCompleted,
    sessionsPerWeek: progress.sessionsPerWeek,
    currentStreakDays: progress.currentStreakDays,
    improving,
    maintaining,
    insufficientData,
  };
}
