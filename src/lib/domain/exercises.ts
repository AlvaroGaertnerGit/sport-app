import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ExerciseSearchResult } from "./types";

const RESULT_LIMIT = 30;

/**
 * The one exercise catalog search, for the "añadir ejercicio" step of
 * configuring a routine (and, later, the AI Coach's own routine drafts --
 * same catalog, same function, never a second list). `exercises` is a
 * shared, unowned reference table (RLS: `exercises_select_all`, `qual:
 * true`), so this takes no `userId` -- there is nothing to scope by.
 *
 * `query` empty or blank returns the first `RESULT_LIMIT` by name (never a
 * blank screen before the user types anything); non-blank does a
 * case-insensitive partial match on `name` via `ilike`. `excludeExerciseIds`
 * (already in the target routine) is filtered out in JS after the fetch --
 * the result set is capped small enough (≤30) that this is cheap, and it
 * avoids PostgREST's fragile `not.in` list-literal syntax.
 */
export async function searchExercises(
  query: string,
  excludeExerciseIds: readonly string[] = [],
): Promise<ExerciseSearchResult[]> {
  const supabase = await createClient();
  const trimmed = query.trim();

  let exercisesQuery = supabase
    .from("exercises")
    .select("id, name, primary_muscles")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(RESULT_LIMIT);
  if (trimmed) {
    exercisesQuery = exercisesQuery.ilike("name", `%${trimmed}%`);
  }

  const { data, error } = await exercisesQuery;
  if (error) {
    throw new Error(`searchExercises: ${error.message}`);
  }

  const excluded = new Set(excludeExerciseIds);
  return (data ?? [])
    .filter((exercise) => !excluded.has(exercise.id))
    .map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      primaryMuscles: exercise.primary_muscles ?? [],
    }));
}
