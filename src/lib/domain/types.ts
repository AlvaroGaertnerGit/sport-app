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

/**
 * Calendar types — a temporal-spatial view of the exact same
 * workout_sessions data HistorySessionSummary already reads, grouped by
 * UTC calendar day instead of listed chronologically. `sessionsByDate` can
 * hold more than one entry per key -- real accounts have multiple sessions
 * on the same day, and none of them get silently dropped.
 */

export type CalendarDaySession = {
  sessionId: string
  routineName: string | null
  status: WorkoutSessionStatus
  startedAt: string
}

export type TrainingCalendarMonth = {
  year: number
  /** 1-12 */
  month: number
  sessionsByDate: Record<string, CalendarDaySession[]>
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
  targetType: "reps" | "duration" | "weight"
  /** Best single-set value: reps for a reps exercise, seconds for a duration exercise, kg for a weighted exercise — never mixed. */
  bestValue: number
  /** Only set when targetType is "weight" — the reps performed at that heaviest logged set (e.g. "80 kg x 5"). */
  repsAtBestWeight?: number
}

export type ActivityBucket = {
  label: string
  active: boolean
}

/**
 * One exercise the Training Progression Engine considers `progress` or
 * `complete` right now, scoped to the user's active plan — shared verbatim
 * by Progress's "Mejorando" and Coach (`selectImprovingHighlights` in
 * progression.ts is the one place this is built, so the two can never
 * disagree). `delta` is pre-formatted ("+2 REPS", "+2.5 KG", "+5S") via
 * `describeProgressionDelta` — never a raw number a component would have
 * to unit-label itself.
 */
export type ExerciseHighlight = {
  exerciseId: string
  exerciseName: string
  routineName: string
  delta: string
}

/** One exercise the engine says `maintain` on — Coach's "a tener en cuenta": what to aim for next time, not yet a win. */
export type CoachExerciseNote = {
  exerciseId: string
  exerciseName: string
  routineName: string
  /** Formatted via `summarizeNextTarget` — the exact same string Workout itself would show. */
  nextTarget: string
}

/**
 * The first deterministic Coach: composed entirely from `getProgressSummary`
 * and `getActivePlanExerciseProgressions` — no new metric invented, no AI.
 * `hasData` mirrors `ProgressSummary.hasData` (no session at all yet).
 */
export type CoachSummary = {
  hasData: boolean
  workoutsCompleted: number
  sessionsPerWeek: number | null
  currentStreakDays: number
  improving: ExerciseHighlight[]
  maintaining: CoachExerciseNote[]
  /** Exercises in the active plan the engine can't say anything about yet (0 or 1 completed sessions) — named, not silently dropped. */
  insufficientData: { exerciseId: string; exerciseName: string; routineName: string }[]
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
  /** Sum of weight_kg * reps over completed sessions, only for sets that logged both — never blended with duration or bodyweight reps. */
  totalVolumeKg: number
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
  targetWeightKg: number | null
}

export type RoutineDetail = {
  routineId: string
  name: string
  sportName: string | null
  exercises: RoutineDetailExercise[]
}

/** One row in Plan's "add routine"/"create plan" picker -- no exercise detail, just enough to pick one. */
export type RoutineSummary = {
  routineId: string
  name: string
  sportName: string | null
  exerciseCount: number
}

/** One row in the exercise search picker (`searchExercises`) -- the shared, unowned catalog, never a per-routine or per-user list. */
export type ExerciseSearchResult = {
  exerciseId: string
  name: string
  primaryMuscles: string[]
}

/**
 * What `addExerciseToRoutine` needs beyond the exercise id -- the routine's
 * *own* target for it, same shape `routine_exercises` itself requires
 * (target_type coherence, sets > 0, ...). Never defaulted silently: the
 * caller (the target-config step in the UI) always supplies it explicitly.
 */
export type NewRoutineExerciseTarget = {
  targetType: "reps" | "duration"
  targetSets: number
  targetRepsMin: number | null
  targetRepsMax: number | null
  targetDurationSeconds: number | null
  targetWeightKg: number | null
}
