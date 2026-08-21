/**
 * Pure rest-timer math — no React, no storage, no clock of its own.
 * Mirrors the project's other "derive, don't store a pointer" pieces
 * (`deriveCurrentExerciseIndex`, `pickNextPlanItem`): remaining time is
 * always recomputed from a start timestamp + a duration, never from a
 * ticking counter, so it survives a reload/app-switch/tab-close without
 * losing accuracy. `now` is a parameter (not `Date.now()` internally) so
 * this stays trivially testable.
 */

export type RestRecord = {
  exerciseId: string
  /** epoch ms */
  startedAt: number
  durationSeconds: number
}

export function remainingRestSeconds(record: RestRecord, now: number): number {
  const elapsedSeconds = (now - record.startedAt) / 1000
  return Math.max(0, Math.ceil(record.durationSeconds - elapsedSeconds))
}

export function formatRestClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
