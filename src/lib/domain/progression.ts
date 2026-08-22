import "server-only";

import { createClient } from "@/lib/supabase/server";
import { describeProgressionDelta } from "./exercise-progress";
import { getActivePlan, getPlanItems } from "./plans";
import type { ExerciseHighlight } from "./types";

/**
 * The first Training Progression Engine: deterministic, explainable, no AI.
 * `computeExerciseProgression` is pure (same spirit as `pickNextPlanItem` in
 * plans.ts) so the rule can be reasoned about and verified independently of
 * data access; `getRoutineExerciseProgressions` is the only piece that talks
 * to Supabase, in exactly two queries regardless of how many exercises a
 * routine has (see its own doc comment).
 */

export type ProgressionStatus = "progress" | "maintain" | "complete" | "insufficient_data";

export type ProgressionTarget =
  | { targetType: "reps"; sets: number; reps: number[]; weightKg: number | null }
  | { targetType: "duration"; sets: number; durationSeconds: number; weightKg: number | null };

export type ExerciseProgression = {
  status: ProgressionStatus;
  sessionsConsidered: number;
  /** What actually happened in the most recent completed session -- null only when there's no history at all. */
  last: ProgressionTarget | null;
  /** Always populated -- falls back to the routine's own current target when there isn't enough evidence to change it. */
  next: ProgressionTarget;
  /** Plain, technical, explains the *why* -- no AI voice, matches the brief's own "herramienta técnica" rule. */
  reason: string;
  /**
   * Detected, never acted on: true when the weakest set of the last 3
   * completed sessions has been strictly declining. Not surfaced as a
   * recommendation in this phase (no deload logic yet) -- kept for a future
   * Coach/Wrapped consumer that needs it (brief §15, §23).
   */
  decliningTrend: boolean;
};

/** A routine_exercise's target, in the same shape `getWorkoutSession`/`getRoutineDetail` already read from `routine_exercises`. */
export type ProgressionExerciseTarget = {
  targetType: "reps" | "duration";
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetDurationSeconds: number | null;
  /** Orthogonal to targetType, not a third exclusive category -- a duration exercise can carry a weight too (e.g. a loaded kettlebell swing), confirmed against real seeded data. */
  targetWeightKg: number | null;
};

type LoggedSet = { reps: number | null; durationSeconds: number | null; weightKg: number | null };

/** One completed session's logged sets for one exercise, in the order they were logged. */
export type ProgressionSession = { sets: readonly LoggedSet[] };

/** Reuses the exact 2.5kg step already established by `SetValueStepper` in `exercise-panel.tsx` -- not a new invented increment. */
const WEIGHT_STEP_KG = 2.5;

/** Target-relative, not a magic constant: 10% of the current target, rounded to the nearest 5s, floor 5s. Reproduces the brief's own worked example exactly (30s -> +5s -> 35s). */
function durationStepSeconds(targetDurationSeconds: number): number {
  return Math.max(5, Math.round(targetDurationSeconds * 0.1 / 5) * 5);
}

function primaryValues(sets: readonly LoggedSet[], targetType: "reps" | "duration"): number[] {
  return sets.map((s) => (targetType === "duration" ? s.durationSeconds : s.reps) ?? 0);
}

function weightOf(sets: readonly LoggedSet[]): number | null {
  return sets.find((s) => s.weightKg != null)?.weightKg ?? null;
}

function toProgressionTarget(
  targetType: "reps" | "duration",
  sets: number,
  values: number[],
  weightKg: number | null,
): ProgressionTarget {
  return targetType === "reps"
    ? { targetType: "reps", sets, reps: values, weightKg }
    : { targetType: "duration", sets, durationSeconds: values.length > 0 ? Math.min(...values) : 0, weightKg };
}

/**
 * The state machine. `recentCompletedSessions` must already be filtered to
 * `status === "completed"` (an `abandoned` session is never evidence of
 * anything, brief §10) and ordered most-recent-first, capped to the last 3
 * -- both the caller's job (`getRoutineExerciseProgressions` below), kept
 * out of this function so it stays a pure function of its inputs.
 */
export function computeExerciseProgression(
  target: ProgressionExerciseTarget,
  recentCompletedSessions: readonly ProgressionSession[],
): ExerciseProgression {
  const sessionsConsidered = recentCompletedSessions.length;

  const routineTarget: ProgressionTarget =
    target.targetType === "reps"
      ? {
          targetType: "reps",
          sets: target.targetSets,
          reps: Array.from({ length: target.targetSets }, () => target.targetRepsMin ?? 0),
          weightKg: target.targetWeightKg,
        }
      : {
          targetType: "duration",
          sets: target.targetSets,
          durationSeconds: target.targetDurationSeconds ?? 0,
          weightKg: target.targetWeightKg,
        };

  if (sessionsConsidered === 0) {
    return {
      status: "insufficient_data",
      sessionsConsidered,
      last: null,
      next: routineTarget,
      reason: "Sin historial para este ejercicio en esta rutina.",
      decliningTrend: false,
    };
  }

  const latest = recentCompletedSessions[0];
  const latestValues = primaryValues(latest.sets, target.targetType);
  const latestWeight = weightOf(latest.sets);
  const lastTarget = toProgressionTarget(target.targetType, latest.sets.length, latestValues, latestWeight);

  if (sessionsConsidered === 1) {
    return {
      status: "insufficient_data",
      sessionsConsidered,
      last: lastTarget,
      next: routineTarget,
      reason: "Solo hay una sesión registrada. Necesitamos más datos para proponer un cambio.",
      decliningTrend: false,
    };
  }

  // Duration has no range (a single target_duration_seconds, unlike reps'
  // min/max) -- treating floor and ceiling as the same value means "below
  // target" and "at/above target" are the only two reachable states for a
  // duration exercise, which is correct: there is no "within range but not
  // maxed" state to fall into for it.
  const floor = target.targetType === "reps" ? target.targetRepsMin ?? 0 : target.targetDurationSeconds ?? 0;
  const ceiling = target.targetType === "reps" ? target.targetRepsMax ?? target.targetRepsMin ?? 0 : target.targetDurationSeconds ?? 0;
  const unit = target.targetType === "duration" ? "s" : "";

  const weakestLatest = latestValues.length > 0 ? Math.min(...latestValues) : 0;
  const setsLoggedLatest = latest.sets.length;
  // "completed" the session (brief §11) never implies every set was logged
  // for every exercise -- a session can finish with only 2 of 4 target sets
  // touched for this exercise, which must read as "didn't meet the target,"
  // not silently ignored.
  const incompleteOrBelowFloor = setsLoggedLatest < target.targetSets || weakestLatest < floor;
  const ceilingMetLatest = !incompleteOrBelowFloor && weakestLatest >= ceiling;

  let status: ProgressionStatus;
  let reason: string;

  if (incompleteOrBelowFloor) {
    status = "maintain";
    reason =
      setsLoggedLatest < target.targetSets
        ? `La última sesión no completó las ${target.targetSets} series objetivo.`
        : `La última sesión quedó por debajo del objetivo (mínimo ${floor}${unit}).`;
  } else if (ceilingMetLatest) {
    // The strongest claim ("you've mastered this, raise the difficulty")
    // needs two consecutive sessions at the ceiling, not one -- a single
    // excellent session stays "progress" until confirmed (brief §12-13's
    // own consistency rule, applied to the highest-stakes recommendation).
    const previous = recentCompletedSessions[1];
    const previousValues = previous ? primaryValues(previous.sets, target.targetType) : [];
    const previousWeight = previous ? weightOf(previous.sets) : null;
    // A weight change between the two sessions means they aren't evidence
    // of mastery *at the same difficulty* -- only count it if the load
    // (when this exercise has one) matches.
    const weightConsistent = target.targetWeightKg == null || previousWeight === latestWeight;
    const previousCeilingMet =
      previous != null &&
      previous.sets.length >= target.targetSets &&
      previousValues.length > 0 &&
      Math.min(...previousValues) >= ceiling &&
      weightConsistent;

    if (previousCeilingMet) {
      status = "complete";
      reason =
        target.targetWeightKg != null
          ? `Completaste el objetivo en las últimas 2 sesiones a ${latestWeight} KG — sube el peso.`
          : target.targetType === "reps"
            ? `Alcanzaste el máximo del rango (${ceiling}) en todas las series, dos sesiones seguidas — intenta superarlo.`
            : `Alcanzaste el objetivo (${ceiling}s) en todas las series, dos sesiones seguidas — sube el tiempo.`;
    } else {
      status = "progress";
      reason = "Completaste el objetivo la última vez — confírmalo una vez más para subir de nivel.";
    }
  } else {
    status = "progress";
    reason =
      target.targetType === "reps"
        ? `Última sesión dentro del rango (mínimo ${floor}) pero sin llegar al máximo (${ceiling}) — sube 1 por serie.`
        : "Última sesión por debajo del objetivo — sigue intentándolo.";
  }

  let next: ProgressionTarget;
  if (status === "maintain") {
    next = routineTarget;
  } else if (status === "complete") {
    const nextWeight = target.targetWeightKg != null ? (latestWeight ?? target.targetWeightKg) + WEIGHT_STEP_KG : null;
    if (target.targetType === "reps") {
      const nextReps =
        nextWeight != null
          ? Array.from({ length: target.targetSets }, () => floor) // new weight tier -- back to the range floor
          : Array.from({ length: target.targetSets }, () => ceiling + 1); // bodyweight -- push past the routine's own ceiling
      next = { targetType: "reps", sets: target.targetSets, reps: nextReps, weightKg: nextWeight };
    } else {
      const nextDuration =
        nextWeight != null
          ? target.targetDurationSeconds ?? 0 // new weight tier -- no floor to reset a single-value duration target to
          : (target.targetDurationSeconds ?? 0) + durationStepSeconds(target.targetDurationSeconds ?? 0);
      next = { targetType: "duration", sets: target.targetSets, durationSeconds: nextDuration, weightKg: nextWeight };
    }
  } else {
    // progress
    if (target.targetType === "reps") {
      const nextReps = latestValues.map((v) => Math.min(v + 1, ceiling));
      next = { targetType: "reps", sets: nextReps.length, reps: nextReps, weightKg: target.targetWeightKg };
    } else {
      const nextDuration = Math.min(weakestLatest + durationStepSeconds(target.targetDurationSeconds ?? 0), ceiling);
      next = { targetType: "duration", sets: target.targetSets, durationSeconds: nextDuration, weightKg: target.targetWeightKg };
    }
  }

  const weakestPerSession = recentCompletedSessions
    .slice(0, 3)
    .map((s) => {
      const values = primaryValues(s.sets, target.targetType);
      return values.length > 0 ? Math.min(...values) : null;
    })
    .filter((v): v is number => v != null);
  const decliningTrend =
    weakestPerSession.length === 3 && weakestPerSession[2] > weakestPerSession[1] && weakestPerSession[1] > weakestPerSession[0];

  return { status, sessionsConsidered, last: lastTarget, next, reason, decliningTrend };
}

export type ProgressionExerciseInput = ProgressionExerciseTarget & { exerciseId: string };

/**
 * One `ExerciseProgression` per exercise in `exercises`, in exactly two
 * queries total regardless of how many exercises the routine has (brief
 * §28 -- never one query per exercise):
 *
 *   1. This user's `workout_sessions` for this routine (capped, most
 *      recent first) -- just enough to know which are `completed` (kept)
 *      vs `abandoned` (dropped entirely, never evidence of anything).
 *   2. Every relevant `set_logs` row across those *completed* sessions in
 *      one call, grouped in JS by exercise then by session.
 */
export async function getRoutineExerciseProgressions(
  userId: string,
  routineId: string,
  exercises: readonly ProgressionExerciseInput[],
): Promise<Map<string, ExerciseProgression>> {
  const result = new Map<string, ExerciseProgression>();
  if (exercises.length === 0) {
    return result;
  }

  const supabase = await createClient();

  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("routine_id", routineId)
    .in("status", ["completed", "abandoned"])
    .order("started_at", { ascending: false })
    .limit(20);
  if (sessionsError) {
    throw new Error(`getRoutineExerciseProgressions: ${sessionsError.message}`);
  }

  // Order preserved from the query (most-recent-first) -- used below to
  // sort each exercise's sessions without a second ORDER BY round trip.
  const completedSessionIds = (sessions ?? []).filter((s) => s.status === "completed").map((s) => s.id);
  if (completedSessionIds.length === 0) {
    for (const exercise of exercises) {
      result.set(exercise.exerciseId, computeExerciseProgression(exercise, []));
    }
    return result;
  }
  const sessionRank = new Map(completedSessionIds.map((id, index) => [id, index]));

  const { data: setLogs, error: setLogsError } = await supabase
    .from("set_logs")
    .select("exercise_id, workout_session_id, reps, duration_seconds, weight_kg")
    .in("workout_session_id", completedSessionIds)
    .in(
      "exercise_id",
      exercises.map((e) => e.exerciseId),
    )
    .order("order", { ascending: true });
  if (setLogsError) {
    throw new Error(`getRoutineExerciseProgressions: ${setLogsError.message}`);
  }

  const setsByExerciseBySession = new Map<string, Map<string, LoggedSet[]>>();
  for (const log of setLogs ?? []) {
    let bySession = setsByExerciseBySession.get(log.exercise_id);
    if (!bySession) {
      bySession = new Map();
      setsByExerciseBySession.set(log.exercise_id, bySession);
    }
    const list = bySession.get(log.workout_session_id) ?? [];
    list.push({ reps: log.reps, durationSeconds: log.duration_seconds, weightKg: log.weight_kg });
    bySession.set(log.workout_session_id, list);
  }

  for (const exercise of exercises) {
    const bySession = setsByExerciseBySession.get(exercise.exerciseId);
    const recentSessions: ProgressionSession[] = bySession
      ? [...bySession.entries()]
          .sort((a, b) => (sessionRank.get(a[0]) ?? 0) - (sessionRank.get(b[0]) ?? 0))
          .slice(0, 3)
          .map(([, sets]) => ({ sets }))
      : [];
    result.set(exercise.exerciseId, computeExerciseProgression(exercise, recentSessions));
  }

  return result;
}

/** One exercise from the active plan, resolved against whichever of its routines is training it, with its computed progression attached. */
export type PlanExerciseProgression = {
  exerciseId: string;
  exerciseName: string;
  routineId: string;
  routineName: string;
  progression: ExerciseProgression;
};

/**
 * `ExerciseProgression`, for every exercise across the user's *entire
 * active plan* — the one entry point Progress ("Mejorando") and Coach both
 * need, neither of which is scoped to a single routine the way Workout is.
 * Reuses `getActivePlan`/`getPlanItems` (plans.ts) and
 * `getRoutineExerciseProgressions` (above) completely unchanged -- no
 * second engine, no new rule.
 *
 * Query shape: `getActivePlan` (1) + `getPlanItems` (1) + one single
 * `routine_exercises` fetch across *every* routine in the plan at once (1,
 * not one per routine) + `getRoutineExerciseProgressions` once per routine
 * (2 each -- its own existing, unmodified query pair). For a typical 3-5
 * routine plan that's ~9-13 queries total, bounded by the plan's own size
 * (never by exercise count, never N+1).
 */
export async function getActivePlanExerciseProgressions(userId: string): Promise<PlanExerciseProgression[]> {
  const plan = await getActivePlan(userId);
  if (!plan) {
    return [];
  }
  const items = await getPlanItems(userId, plan.id);
  if (items.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const routineIds = items.map((item) => item.routineId);
  const { data: routineExerciseRows, error } = await supabase
    .from("routine_exercises")
    .select(
      "routine_id, exercise_id, target_sets, target_type, target_reps_min, target_reps_max, target_duration_seconds, target_weight_kg, exercises(name)",
    )
    .in("routine_id", routineIds);
  if (error) {
    throw new Error(`getActivePlanExerciseProgressions: ${error.message}`);
  }

  const exercisesByRoutine = new Map<string, ProgressionExerciseInput[]>();
  const exerciseNames = new Map<string, string>();
  for (const row of routineExerciseRows ?? []) {
    const list = exercisesByRoutine.get(row.routine_id) ?? [];
    list.push({
      exerciseId: row.exercise_id,
      targetType: row.target_type as "reps" | "duration",
      targetSets: row.target_sets,
      targetRepsMin: row.target_reps_min,
      targetRepsMax: row.target_reps_max,
      targetDurationSeconds: row.target_duration_seconds,
      targetWeightKg: row.target_weight_kg,
    });
    exercisesByRoutine.set(row.routine_id, list);
    exerciseNames.set(row.exercise_id, row.exercises?.name ?? "Ejercicio");
  }

  const results: PlanExerciseProgression[] = [];
  for (const item of items) {
    const exercises = exercisesByRoutine.get(item.routineId) ?? [];
    if (exercises.length === 0) {
      continue;
    }
    const progressions = await getRoutineExerciseProgressions(userId, item.routineId, exercises);
    for (const exercise of exercises) {
      const progression = progressions.get(exercise.exerciseId);
      if (progression) {
        results.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exerciseNames.get(exercise.exerciseId) ?? "Ejercicio",
          routineId: item.routineId,
          routineName: item.routineName,
          progression,
        });
      }
    }
  }
  return results;
}

const MAX_HIGHLIGHTS = 3;

/**
 * The at-most-3 exercises worth calling out as "improving" right now --
 * `progress` or `complete`, `complete` first (the stronger claim), each
 * with its pre-formatted delta. The one selection rule shared verbatim by
 * Progress's "Mejorando" and Coach, so the two never show different
 * answers to the same question.
 */
export function selectImprovingHighlights(planProgressions: readonly PlanExerciseProgression[]): ExerciseHighlight[] {
  return planProgressions
    .filter((p) => p.progression.status === "progress" || p.progression.status === "complete")
    .sort((a, b) => {
      if (a.progression.status === b.progression.status) return 0;
      return a.progression.status === "complete" ? -1 : 1;
    })
    .map((p): ExerciseHighlight | null => {
      const delta = describeProgressionDelta(p.progression);
      return delta ? { exerciseId: p.exerciseId, exerciseName: p.exerciseName, routineName: p.routineName, delta } : null;
    })
    .filter((h): h is ExerciseHighlight => h !== null)
    .slice(0, MAX_HIGHLIGHTS);
}
