/**
 * Pure and isomorphic -- no "server-only", no "use client" -- so it can be
 * imported directly (not through the `@/lib/domain` barrel, which pulls in
 * server-only modules) from client components as well as server code.
 */
export function isExerciseSetsDone(exercise: { targetSets: number; completedSets: number }): boolean {
  return exercise.completedSets >= exercise.targetSets;
}
