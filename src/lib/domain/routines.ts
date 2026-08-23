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

/**
 * Re-inserts a specific exercise at an explicit `order` -- unlike
 * `addExerciseToRoutine`, which always appends at `max(order)+1`. Exists
 * solely so `executeCoachActionOps` (src/lib/ai/action-execution.ts) can
 * undo a `remove_exercise` op if a later op in the same batch fails,
 * without losing the exercise's original position. Never called from
 * manual UI and never exposed to the AI proposal layer directly --
 * compensation-only.
 */
export async function restoreRoutineExerciseAt(
  userId: string,
  routineId: string,
  exerciseId: string,
  order: number,
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
    throw new Error(`restoreRoutineExerciseAt: ${routineError.message}`);
  }
  if (!routine) {
    throw new Error("restoreRoutineExerciseAt: routine not found");
  }

  const { error } = await supabase.from("routine_exercises").insert({
    routine_id: routineId,
    exercise_id: exerciseId,
    order,
    target_sets: target.targetSets,
    target_type: target.targetType,
    target_reps_min: target.targetRepsMin,
    target_reps_max: target.targetRepsMax,
    target_duration_seconds: target.targetDurationSeconds,
    target_weight_kg: target.targetWeightKg,
  });
  if (error) {
    throw new Error(`restoreRoutineExerciseAt: ${error.message}`);
  }
}

/**
 * Swaps one exercise for another in place -- `order` and the whole target
 * (sets/reps/duration/weight) are untouched, only `exercise_id` changes.
 * Safe by construction: target shape lives entirely on `routine_exercises`,
 * never on `exercises` itself, so this can never violate
 * `routine_exercises_target_type_coherent` or any other CHECK. Duplicate
 * prevention mirrors `addExerciseToRoutine`'s own guard (the destination
 * exercise must not already be in the routine).
 */
export async function replaceExerciseInRoutine(
  userId: string,
  routineId: string,
  fromExerciseId: string,
  toExerciseId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle();
  if (routineError) {
    throw new Error(`replaceExerciseInRoutine: ${routineError.message}`);
  }
  if (!routine) {
    throw new Error("replaceExerciseInRoutine: routine not found");
  }

  const { data: existing, error: existingError } = await supabase
    .from("routine_exercises")
    .select("id, exercise_id")
    .eq("routine_id", routineId);
  if (existingError) {
    throw new Error(`replaceExerciseInRoutine: ${existingError.message}`);
  }
  const rows = existing ?? [];
  const target = rows.find((row) => row.exercise_id === fromExerciseId);
  if (!target) {
    throw new Error("replaceExerciseInRoutine: exercise not found in this routine");
  }
  if (rows.some((row) => row.exercise_id === toExerciseId)) {
    throw new Error("replaceExerciseInRoutine: destination exercise already in this routine");
  }

  const { error } = await supabase
    .from("routine_exercises")
    .update({ exercise_id: toExerciseId })
    .eq("id", target.id);
  if (error) {
    throw new Error(`replaceExerciseInRoutine: ${error.message}`);
  }
}

/**
 * Moves one exercise to an arbitrary 1-based position within its routine.
 * `movePlanItem`'s adjacent-swap sentinel trick doesn't generalize to an
 * arbitrary target position, so this recomputes the whole `order` sequence
 * in JS and writes it back in two passes -- every row first to a unique
 * negative sentinel, then every row to its real final order -- the only
 * way to avoid `routine_exercises_routine_id_order_key` (a plain,
 * non-deferrable unique constraint) regardless of write order. `toPosition`
 * out of range is defensively clamped here (the real rejection with a
 * clear message happens earlier, in `resolveAndValidateAction`).
 */
export async function reorderRoutineExercise(
  userId: string,
  routineId: string,
  exerciseId: string,
  toPosition: number,
): Promise<void> {
  const supabase = await createClient();

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle();
  if (routineError) {
    throw new Error(`reorderRoutineExercise: ${routineError.message}`);
  }
  if (!routine) {
    throw new Error("reorderRoutineExercise: routine not found");
  }

  const { data: existing, error: existingError } = await supabase
    .from("routine_exercises")
    .select("id, exercise_id")
    .eq("routine_id", routineId)
    .order("order", { ascending: true });
  if (existingError) {
    throw new Error(`reorderRoutineExercise: ${existingError.message}`);
  }
  const rows = existing ?? [];
  const fromIndex = rows.findIndex((row) => row.exercise_id === exerciseId);
  if (fromIndex === -1) {
    throw new Error("reorderRoutineExercise: exercise not found in this routine");
  }

  const [moved] = rows.splice(fromIndex, 1);
  const clampedIndex = Math.max(0, Math.min(rows.length, toPosition - 1));
  rows.splice(clampedIndex, 0, moved);

  const sentinelUpdates = rows.map((row, index) =>
    supabase.from("routine_exercises").update({ order: -(index + 1) }).eq("id", row.id),
  );
  for (const step of sentinelUpdates) {
    const { error } = await step;
    if (error) {
      throw new Error(`reorderRoutineExercise: ${error.message}`);
    }
  }

  const finalUpdates = rows.map((row, index) =>
    supabase.from("routine_exercises").update({ order: index + 1 }).eq("id", row.id),
  );
  for (const step of finalUpdates) {
    const { error } = await step;
    if (error) {
      throw new Error(`reorderRoutineExercise: ${error.message}`);
    }
  }
}

/**
 * Sets-only, deliberately: this is the one target field the Coach IA write
 * phase actually asks for ("pon 4 series de X"). Reps/duration/weight
 * editing is real domain capability (the columns and CHECKs already
 * support it) but adding it now would invent scope the brief never asked
 * for -- see CLAUDE.md §16. Extend the signature to a partial target
 * object if a future phase needs more, rather than adding a second
 * function.
 */
export async function updateRoutineExerciseTarget(
  userId: string,
  routineId: string,
  exerciseId: string,
  targetSets: number,
): Promise<void> {
  const supabase = await createClient();

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle();
  if (routineError) {
    throw new Error(`updateRoutineExerciseTarget: ${routineError.message}`);
  }
  if (!routine) {
    throw new Error("updateRoutineExerciseTarget: routine not found");
  }

  const { data, error } = await supabase
    .from("routine_exercises")
    .update({ target_sets: targetSets })
    .eq("routine_id", routineId)
    .eq("exercise_id", exerciseId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`updateRoutineExerciseTarget: ${error.message}`);
  }
  if (!data) {
    throw new Error("updateRoutineExerciseTarget: exercise not found in this routine");
  }
}

export type NewRoutineInput = {
  name: string;
  description: string | null;
  exercises: (NewRoutineExerciseTarget & { exerciseId: string; order: number })[];
};

/**
 * Creates a brand-new routine with its exercises in one call -- the
 * write-side counterpart of `RoutineDraft` (src/lib/ai/routine-draft.ts).
 * Same atomicity-via-compensation shape `createPlan` already uses: insert
 * the `routines` row, then one multi-row `routine_exercises` insert (atomic
 * as a single statement); if that second insert fails, the just-created
 * routine row is deleted as compensation so a failure never leaves an
 * empty, orphaned routine behind.
 */
export async function createRoutine(userId: string, input: NewRoutineInput): Promise<{ routineId: string }> {
  const supabase = await createClient();

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ user_id: userId, name: input.name, description: input.description })
    .select("id")
    .single();
  if (routineError || !routine) {
    throw new Error(`createRoutine: ${routineError?.message ?? "insert returned no row"}`);
  }

  const { error: exercisesError } = await supabase.from("routine_exercises").insert(
    input.exercises.map((exercise) => ({
      routine_id: routine.id,
      exercise_id: exercise.exerciseId,
      order: exercise.order,
      target_sets: exercise.targetSets,
      target_type: exercise.targetType,
      target_reps_min: exercise.targetRepsMin,
      target_reps_max: exercise.targetRepsMax,
      target_duration_seconds: exercise.targetDurationSeconds,
      target_weight_kg: exercise.targetWeightKg,
    })),
  );
  if (exercisesError) {
    await supabase.from("routines").delete().eq("id", routine.id);
    throw new Error(`createRoutine: ${exercisesError.message}`);
  }

  return { routineId: routine.id };
}
