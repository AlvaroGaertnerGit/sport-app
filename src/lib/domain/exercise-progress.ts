/**
 * Pure and isomorphic -- no "server-only", no "use client" -- so it can be
 * imported directly (not through the `@/lib/domain` barrel, which pulls in
 * server-only modules) from client components as well as server code.
 *
 * `ExerciseProgression` is imported `type`-only from `./progression` (a
 * "server-only" module) below -- type-only imports are erased at compile
 * time, so this stays safely isomorphic without pulling that guard in.
 */
import type { ExerciseProgression } from "./progression";

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

/** "52.5" / "20" -- one decimal only when the value actually has one, shared everywhere a kg figure is rendered next to a rep/duration value. */
export function formatWeightKg(weightKg: number): string {
  return Number.isInteger(weightKg) ? `${weightKg}` : weightKg.toFixed(1);
}

/** "20 KG × 10" / "45s" -- shared by Workout's exercise panel and History's read-only session detail for a logged set's value. */
export function formatSetLogValue(
  exercise: { targetType: "reps" | "duration" },
  log: { reps: number | null; durationSeconds: number | null; weightKg: number | null },
): string {
  const base = exercise.targetType === "duration" ? `${log.durationSeconds}s` : `${log.reps}`;
  if (log.weightKg == null) return base;
  return `${formatWeightKg(log.weightKg)} KG × ${base}`;
}

/** One display line ("52.5 KG × 9", "35s") for the lowest (bottleneck) value in a progression's `next` target -- null when there's nothing worth showing yet (no history to base it on). */
export function summarizeNextTarget(progression: ExerciseProgression): string | null {
  if (progression.status === "insufficient_data") {
    return null;
  }
  const { next } = progression;
  const base = next.targetType === "duration" ? `${next.durationSeconds}s` : `${Math.min(...next.reps)}`;
  return next.weightKg == null ? base : `${formatWeightKg(next.weightKg)} KG × ${base}`;
}

/**
 * The initial value to seed one active set's input(s) with — the
 * Progression Engine's own recommendation when there's one to trust
 * (`status !== "insufficient_data"`), the routine's own template target
 * otherwise. A pure lookup into an already-computed `ExerciseProgression`,
 * not a second progression rule: reps use `next.reps[setIndex]` — the
 * engine already computes one target per set (e.g. `[9,8,8]`), not
 * collapsed to a single number the way `summarizeNextTarget`'s headline
 * is — while duration/weight fall back to the single `next` value since
 * neither varies per set in this model.
 *
 * Only ever read once, to seed `SetValueStepper`'s `useState(defaultValue)`
 * — after that the stepper is the user's own uncontrolled input; nothing
 * here runs again until a genuinely different set/exercise mounts a new
 * stepper instance (see `SetValueStepper`'s own doc comment).
 */
export function smartSetDefaults(
  exercise: TargetShape & { targetWeightKg: number | null },
  progression: ExerciseProgression | null,
  setIndex: number,
): { value: number; weightKg: number | null } {
  const fallbackValue =
    exercise.targetType === "duration" ? (exercise.targetDurationSeconds ?? 0) : (exercise.targetRepsMax ?? exercise.targetRepsMin ?? 0);

  if (!progression || progression.status === "insufficient_data") {
    return { value: fallbackValue, weightKg: exercise.targetWeightKg };
  }

  const { next } = progression;
  const value =
    next.targetType === "duration" ? next.durationSeconds : (next.reps[setIndex] ?? next.reps[next.reps.length - 1] ?? fallbackValue);
  return { value, weightKg: next.weightKg };
}

/**
 * "+2.5 KG" / "+1 REP" / "+5S" — what actually got better between the most
 * recent completed session (`last`) and the engine's recommendation
 * (`next`), for `status: "progress" | "complete"` only. `null` for every
 * other status (there is nothing to claim improved on `maintain` or
 * `insufficient_data`) or when the two genuinely tie (defensive — shouldn't
 * happen for these two statuses, but never show a "+0").
 *
 * Weight is checked first: a weight bump (the `complete` + weighted case)
 * is the more meaningful axis whenever it happened, over the reps that
 * reset alongside it. Shared verbatim by Progress's "Mejorando" and Coach
 * (`selectImprovingHighlights` below) so the two can never disagree.
 */
export function describeProgressionDelta(progression: ExerciseProgression): string | null {
  if (progression.status !== "progress" && progression.status !== "complete") {
    return null;
  }
  const { last, next } = progression;
  if (!last) {
    return null;
  }

  if (next.weightKg != null && last.weightKg != null && next.weightKg > last.weightKg) {
    return `+${formatWeightKg(next.weightKg - last.weightKg)} KG`;
  }
  if (next.targetType === "duration" && last.targetType === "duration") {
    const delta = next.durationSeconds - last.durationSeconds;
    return delta > 0 ? `+${delta}S` : null;
  }
  if (next.targetType === "reps" && last.targetType === "reps") {
    const delta = Math.min(...next.reps) - Math.min(...last.reps);
    return delta > 0 ? `+${delta} REP${delta === 1 ? "" : "S"}` : null;
  }
  return null;
}
