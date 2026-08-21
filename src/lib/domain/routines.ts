import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { RoutineDetail, RoutineDetailExercise } from "./types";

/**
 * How many exercises a routine has — for display only (e.g. "5 ejercicios"
 * on Today), never used to decide the day's recommendation. `userId` scopes
 * the count to routines the caller owns; RLS enforces this independently,
 * this is defense-in-depth query shaping, not a re-implementation of it
 * (see src/lib/README.md).
 */
export async function getRoutineExerciseCount(
  userId: string,
  routineId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("routine_exercises")
    .select("id, routines!inner(user_id)", { count: "exact", head: true })
    .eq("routine_id", routineId)
    .eq("routines.user_id", userId);

  if (error) {
    throw new Error(`getRoutineExerciseCount: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * A routine's full read-only detail for Plan (name, sport, exercises with
 * their target) — never a session, never set logs, never a stepper. Two
 * independent reads (routine+sport, then its exercises) run concurrently
 * rather than sequentially. Returns null for "doesn't exist or isn't
 * yours" (RLS would block the read either way; folding both into one
 * outcome avoids leaking which one it was — same rule `getWorkoutSession`
 * already follows).
 */
export async function getRoutineDetail(userId: string, routineId: string): Promise<RoutineDetail | null> {
  const supabase = await createClient();

  const [routineResult, exercisesResult] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, sports(name)")
      .eq("id", routineId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("routine_exercises")
      .select("order, exercise_id, target_sets, target_type, target_reps_min, target_reps_max, target_duration_seconds, exercises(name)")
      .eq("routine_id", routineId)
      .order("order", { ascending: true }),
  ]);

  const { data: routine, error: routineError } = routineResult;
  if (routineError) {
    throw new Error(`getRoutineDetail: ${routineError.message}`);
  }
  if (!routine) {
    return null;
  }

  const { data: exercises, error: exercisesError } = exercisesResult;
  if (exercisesError) {
    throw new Error(`getRoutineDetail: ${exercisesError.message}`);
  }

  return {
    routineId: routine.id,
    name: routine.name,
    sportName: routine.sports?.name ?? null,
    exercises: (exercises ?? []).map((re) => ({
      order: re.order,
      exerciseId: re.exercise_id,
      exerciseName: re.exercises?.name ?? "Ejercicio",
      targetSets: re.target_sets,
      targetType: re.target_type as RoutineDetailExercise["targetType"],
      targetRepsMin: re.target_reps_min,
      targetRepsMax: re.target_reps_max,
      targetDurationSeconds: re.target_duration_seconds,
    })),
  };
}
