import "server-only";

import { createClient } from "@/lib/supabase/server";

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
