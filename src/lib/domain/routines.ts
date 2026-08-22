import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NewRoutineExerciseTarget, RoutineDetail, RoutineDetailExercise, RoutineSummary } from "./types";

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
      .select(
        "order, exercise_id, target_sets, target_type, target_reps_min, target_reps_max, target_duration_seconds, target_weight_kg, exercises(name)",
      )
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
      targetWeightKg: re.target_weight_kg,
    })),
  };
}

/**
 * Flat list of the caller's own routines, for Plan's "add routine" picker
 * and the plan-creation wizard's routine selector. Deliberately does not
 * exclude routines already in a plan — the same routine can legitimately
 * appear twice (see `addRoutineToPlan`).
 *
 * Two queries total, never N+1: the routines themselves, then every
 * `routine_exercises` row across all of them in one call, reduced to a
 * per-routine count in JS — same two-query-then-merge shape
 * `getRoutineDetail` already uses, just merging by id instead of running
 * concurrently for a single routine.
 */
export async function getUserRoutines(userId: string): Promise<RoutineSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, name, sports(name)")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`getUserRoutines: ${error.message}`);
  }

  const routines = data ?? [];
  if (routines.length === 0) {
    return [];
  }

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("routine_exercises")
    .select("routine_id, routines!inner(user_id)")
    .eq("routines.user_id", userId);
  if (exerciseError) {
    throw new Error(`getUserRoutines: ${exerciseError.message}`);
  }

  const exerciseCounts = new Map<string, number>();
  for (const row of exerciseRows ?? []) {
    exerciseCounts.set(row.routine_id, (exerciseCounts.get(row.routine_id) ?? 0) + 1);
  }

  return routines.map((routine) => ({
    routineId: routine.id,
    name: routine.name,
    sportName: routine.sports?.name ?? null,
    exerciseCount: exerciseCounts.get(routine.id) ?? 0,
  }));
}

/**
 * Appends an exercise (found via `searchExercises`) to a routine, at the
 * next `order` slot -- same "verify ownership, then `max(order)+1`" shape
 * `addRoutineToPlan` already uses for `plan_items`. `target` is never
 * defaulted here: the caller (the UI's target-config step) always supplies
 * a real one, since `routine_exercises` has real check constraints
 * (target_type coherence, sets > 0, ...) a silent default could violate or
 * misrepresent.
 *
 * Duplicate prevention (a routine shouldn't contain the same exercise
 * twice -- `set_logs` links to `exercise_id` directly, not a specific
 * `routine_exercises` row, so two copies would be indistinguishable in
 * history) is enforced by `searchExercises` excluding exercises already in
 * the routine from its results -- there is no DB constraint for it (only
 * `UNIQUE(routine_id, order)` exists), so it's re-checked here too as the
 * real guard, not just a UI nicety.
 */
export async function addExerciseToRoutine(
  userId: string,
  routineId: string,
  exerciseId: string,
  target: NewRoutineExerciseTarget,
): Promise<void> {
  const supabase = await createClient();

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle();
  if (routineError) {
    throw new Error(`addExerciseToRoutine: ${routineError.message}`);
  }
  if (!routine) {
    throw new Error("addExerciseToRoutine: routine not found");
  }

  const { data: existing, error: existingError } = await supabase
    .from("routine_exercises")
    .select("id, order, exercise_id")
    .eq("routine_id", routineId);
  if (existingError) {
    throw new Error(`addExerciseToRoutine: ${existingError.message}`);
  }
  const currentRows = existing ?? [];
  if (currentRows.some((row) => row.exercise_id === exerciseId)) {
    throw new Error("addExerciseToRoutine: exercise already in this routine");
  }
  const nextOrder = currentRows.length === 0 ? 1 : Math.max(...currentRows.map((row) => row.order)) + 1;

  const { error: insertError } = await supabase.from("routine_exercises").insert({
    routine_id: routineId,
    exercise_id: exerciseId,
    order: nextOrder,
    target_sets: target.targetSets,
    target_type: target.targetType,
    target_reps_min: target.targetRepsMin,
    target_reps_max: target.targetRepsMax,
    target_duration_seconds: target.targetDurationSeconds,
    target_weight_kg: target.targetWeightKg,
  });
  if (insertError) {
    throw new Error(`addExerciseToRoutine: ${insertError.message}`);
  }
}

/**
 * Removes one exercise from a routine. Always safe regardless of history:
 * `set_logs` has no foreign key to `routine_exercises` at all (only to
 * `exercise_id`), so there is no `has_history`-style rejection to handle
 * here the way `removePlanItem` has to for `plan_items` -- past sessions
 * and their logged sets are untouched either way.
 */
export async function removeExerciseFromRoutine(userId: string, routineId: string, exerciseId: string): Promise<void> {
  const supabase = await createClient();

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle();
  if (routineError) {
    throw new Error(`removeExerciseFromRoutine: ${routineError.message}`);
  }
  if (!routine) {
    throw new Error("removeExerciseFromRoutine: routine not found");
  }

  const { error } = await supabase.from("routine_exercises").delete().eq("routine_id", routineId).eq("exercise_id", exerciseId);
  if (error) {
    throw new Error(`removeExerciseFromRoutine: ${error.message}`);
  }
}
