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

export type PlanItemSummary = {
  planItemId: string
  routineId: string
  routineName: string
  order: number
}

/** Alias, not a second type — `getNextPlanItem` returns exactly one `PlanItemSummary`; the name documents intent at its call sites. */
export type NextPlanItem = PlanItemSummary

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

/**
 * History/Progress types — read-only aggregates over the same
 * workout_sessions/set_logs data WorkoutSessionDetail already reads.
 * Deliberately does NOT include a weight/volume field anywhere here: the
 * current Workout UI never writes `set_logs.weight_kg` (SetValueStepper
 * logs exactly one value, reps or seconds), so a volume metric would have
 * nothing real to compute from. See docs/... note in progress.ts.
 */

export type HistorySessionSummary = {
  sessionId: string
  routineName: string | null
  status: WorkoutSessionStatus
  startedAt: string
  /** Only ever set for `status: "completed"` — abandoned sessions have no reliable end time. */
  completedAt: string | null
  durationMinutes: number | null
  /** Distinct exercises actually logged in this session (not the routine's template count). */
  exerciseCount: number
}

export type ProgressPeriod = "7d" | "30d" | "3m" | "1y" | "all"

export type TopExerciseStat = {
  exerciseId: string
  name: string
  timesPerformed: number
}

export type PersonalBestStat = {
  exerciseId: string
  name: string
  targetType: "reps" | "duration"
  /** Best single-set value: reps for a reps exercise, seconds for a duration exercise — never mixed. */
  bestValue: number
}

export type ActivityBucket = {
  label: string
  active: boolean
}

export type ProgressSummary = {
  period: ProgressPeriod
  /** False when there is no session (of any status) at all in the period — drives the empty state. */
  hasData: boolean
  workoutsCompleted: number
  workoutsAbandoned: number
  /** Sum of (completed_at - started_at) over completed sessions only, in whole minutes. */
  trainingMinutes: number
  averageDurationMinutes: number | null
  /** Sum of set_logs.reps over completed sessions, reps-type sets only. */
  totalReps: number
  /** Sum of set_logs.duration_seconds over completed sessions, duration-type sets only. */
  totalDurationSeconds: number
  /** Distinct UTC calendar days with a session of ANY status (including in_progress) — showing up counts. */
  activeDays: number
  currentStreakDays: number
  bestStreakDays: number
  sessionsPerWeek: number | null
  topExercises: TopExerciseStat[]
  personalBests: PersonalBestStat[]
  /** Daily blocks, 7d/30d only — null for 3m/1y/all (not legible at that density on a phone). */
  activityBuckets: ActivityBucket[] | null
}

/**
 * Plan's read-only routine detail -- the routine's template (target sets/
 * reps/duration), not a session. No set logs, no completion state: that's
 * WorkoutSessionExercise's job, for an actual in-progress/finished session.
 */
export type RoutineDetailExercise = {
  order: number
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetType: "reps" | "duration"
  targetRepsMin: number | null
  targetRepsMax: number | null
  targetDurationSeconds: number | null
}

export type RoutineDetail = {
  routineId: string
  name: string
  sportName: string | null
  exercises: RoutineDetailExercise[]
}
