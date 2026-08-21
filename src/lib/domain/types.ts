/**
 * Small, purpose-built return types for the domain layer — not full
 * generated `Row` types (see src/types/database.ts). Each shape carries
 * only what its known caller (Today, for now) needs, in camelCase to match
 * the TodayRecommendation contract these compose into.
 */

export type ActivePlan = {
  id: string
  name: string | null
}

export type InProgressSession = {
  sessionId: string
  planItemId: string | null
  routineId: string | null
  routineName: string | null
  status: "in_progress"
  startedAt: string
}

export type NextPlanItem = {
  planItemId: string
  routineId: string
  routineName: string
  order: number
}

export type TodayRecommendation =
  | { type: "no_plan" }
  | { type: "empty_plan"; planId: string }
  | {
      type: "in_progress"
      sessionId: string
      planItemId: string | null
      routineId: string | null
      routineName: string | null
    }
  | {
      type: "ready"
      planId: string
      planItemId: string
      routineId: string
      routineName: string
    }
  | { type: "error"; reason: string }

export type WorkoutSessionStatus = "in_progress" | "completed" | "abandoned"

export type WorkoutSetLog = {
  id: string
  /** Position across the whole session (set_logs.order is unique per session, not per exercise) — not a display index. */
  order: number
  reps: number | null
  weightKg: number | null
  durationSeconds: number | null
}

export type WorkoutSessionExercise = {
  routineExerciseId: string
  exerciseId: string
  exerciseName: string
  imageUrl: string | null
  videoUrl: string | null
  instructions: string
  commonMistakes: string | null
  order: number
  targetSets: number
  targetType: "reps" | "duration"
  targetRepsMin: number | null
  targetRepsMax: number | null
  targetDurationSeconds: number | null
  targetWeightKg: number | null
  restSeconds: number | null
  /** Derived: setLogs.length. Never persisted separately. */
  completedSets: number
  /** Already-logged sets for this exercise, in the order they were logged. */
  setLogs: WorkoutSetLog[]
}

export type WorkoutSessionDetail = {
  sessionId: string
  status: WorkoutSessionStatus
  routineId: string | null
  routineName: string | null
  planItemId: string | null
  startedAt: string
  completedAt: string | null
  exercises: WorkoutSessionExercise[]
  /**
   * Index into `exercises` of the first one not yet at its target set count.
   * Derived from routine_exercises + set_logs on every read — never a
   * stored pointer. Null when every exercise has met its target (the
   * session is ready to be completed).
   */
  currentExerciseIndex: number | null
}
