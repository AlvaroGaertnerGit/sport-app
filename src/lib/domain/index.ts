export { buildCalendarWeeks, getTrainingCalendarMonth, type CalendarCell } from "./calendar";
export { formatExerciseTarget, isExerciseSetsDone } from "./exercise-progress";
export { searchExercises } from "./exercises";
export { getRecentSessionsForMuscleGroups, getSessionHistory } from "./history";
export {
  activatePlan,
  addRoutineToPlan,
  archivePlan,
  createPlan,
  getActivePlan,
  getLastCompletedPlanItemOrder,
  getNextPlanItem,
  getPlan,
  getPlanItems,
  getUserPlans,
  movePlanItem,
  pickNextPlanItem,
  removePlanItem,
  renamePlan,
  reorderPlanItem,
  type CreatePlanResult,
  type RemovePlanItemResult,
} from "./plans";
export { computeStreaks, getPeriodStartISO, getProgressSummary } from "./progress";
export {
  computeExerciseProgression,
  getActivePlanExerciseProgressions,
  getRoutineExerciseProgressions,
  selectImprovingHighlights,
  type ExerciseProgression,
  type PlanExerciseProgression,
  type ProgressionExerciseInput,
  type ProgressionExerciseTarget,
  type ProgressionSession,
  type ProgressionStatus,
  type ProgressionTarget,
} from "./progression";
export { getCoachSummary } from "./coach";
export {
  addExerciseToRoutine,
  createRoutine,
  getRoutineDetail,
  getRoutineExerciseCount,
  getRoutineExerciseNames,
  getUserRoutines,
  removeExerciseFromRoutine,
  replaceExerciseInRoutine,
  reorderRoutineExercise,
  restoreRoutineExerciseAt,
  updateRoutineExerciseTarget,
  type NewRoutineInput,
} from "./routines";
export { getInProgressSession } from "./sessions";
export { getTodayRecommendation } from "./today";
export {
  abandonWorkoutSession,
  completeWorkoutSession,
  createWorkoutSession,
  deriveCurrentExerciseIndex,
  getWorkoutSession,
  logSet,
} from "./workout-session";
export type {
  ActivePlan,
  ActivityBucket,
  CalendarDaySession,
  CoachExerciseNote,
  CoachSummary,
  ExerciseHighlight,
  ExerciseSearchResult,
  HistorySessionSummary,
  InProgressSession,
  MuscleGroupSessionSummary,
  NewRoutineExerciseTarget,
  NextPlanItem,
  PersonalBestStat,
  PlanItemSummary,
  PlanStatus,
  PlanSummary,
  ProgressPeriod,
  ProgressSummary,
  RoutineDetail,
  RoutineDetailExercise,
  RoutineSummary,
  TodayRecommendation,
  TopExerciseStat,
  TrainingCalendarMonth,
  WorkoutSessionDetail,
  WorkoutSessionExercise,
  WorkoutSessionStatus,
  WorkoutSetLog,
} from "./types";
