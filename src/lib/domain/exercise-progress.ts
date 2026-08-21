/**
 * Pure and isomorphic -- no "server-only", no "use client" -- so it can be
 * imported directly (not through the `@/lib/domain` barrel, which pulls in
 * server-only modules) from client components as well as server code.
 */
export function isExerciseSetsDone(exercise: { targetSets: number; completedSets: number }): boolean {
  return exercise.completedSets >= exercise.targetSets;
}

type TargetShape = {
  targetType: "reps" | "duration";
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetDurationSeconds: number | null;
};

/**
 * "4 × 6-8 reps" / "45s" -- shared by Workout's exercise panel and History's
 * read-only session detail (same `WorkoutSessionExercise` shape, same
 * target-string rule; extracted here once it was copy-pasted a second
 * time rather than duplicated a third).
 */
export function formatExerciseTarget(exercise: TargetShape): string {
  if (exercise.targetType === "duration") {
    return exercise.targetDurationSeconds ? `${exercise.targetDurationSeconds}s` : "—";
  }
  const { targetRepsMin, targetRepsMax } = exercise;
  if (targetRepsMin != null && targetRepsMax != null && targetRepsMin !== targetRepsMax) {
    return `${targetRepsMin}–${targetRepsMax} reps`;
  }
  return `${targetRepsMax ?? targetRepsMin ?? "—"} reps`;
}
