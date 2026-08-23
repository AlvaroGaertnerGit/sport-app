/**
 * Pure exercise-duration-timer math — no React, no storage, no clock of
 * its own. Sibling of `rest-timer.ts`, not a merge with it: this record
 * needs a pause/resume shape (`endTime` + `pausedRemainingMs`) that
 * `RestRecord`'s simpler `startedAt`-only shape doesn't, and `rest-timer.ts`
 * already backs a shipped, verified feature (Fase 1's rest timer) — adding
 * a pause field to it would mean every existing `RestRecord` sitting in a
 * real user's localStorage (from an in-progress workout, mid-deploy) is
 * suddenly missing fields the new code expects. Two small, independent
 * modules is the safer trade than one shared one that risks that.
 *
 * The shared, actually-reused mechanism is the *pattern*, not one file:
 * always derive `remaining` from a target timestamp + `now`, never from a
 * ticking counter (`rest-timer.ts`'s own doc comment states the same
 * rule) — and the on-screen countdown ring (`RestRing` in
 * exercise-panel.tsx) is the literal same component for both.
 */

export type ExerciseTimerPhase = "idle" | "running" | "paused" | "done"

export type ExerciseTimerRecord = {
  exerciseId: string
  durationSeconds: number
  /** epoch ms this run reaches zero — null while paused (or already done via pause-at-zero). */
  endTime: number | null
  /** frozen remaining ms, set only while paused; null while running. */
  pausedRemainingMs: number | null
}

export function remainingExerciseMs(record: ExerciseTimerRecord, now: number): number {
  if (record.endTime == null) {
    return Math.max(0, record.pausedRemainingMs ?? 0)
  }
  return Math.max(0, record.endTime - now)
}

export function exerciseTimerPhase(record: ExerciseTimerRecord | null, now: number): ExerciseTimerPhase {
  if (!record) return "idle"
  if (remainingExerciseMs(record, now) <= 0) return "done"
  return record.endTime == null ? "paused" : "running"
}

export function startExerciseTimer(exerciseId: string, durationSeconds: number, now: number): ExerciseTimerRecord {
  return { exerciseId, durationSeconds, endTime: now + durationSeconds * 1000, pausedRemainingMs: null }
}

/** No-op if already paused/done — never overwrites a frozen `pausedRemainingMs` with a stale recomputation. */
export function pauseExerciseTimer(record: ExerciseTimerRecord, now: number): ExerciseTimerRecord {
  if (record.endTime == null) return record
  return { ...record, endTime: null, pausedRemainingMs: Math.max(0, record.endTime - now) }
}

/** Always creates a fresh `endTime` from `now` — the paused duration itself is never counted against the timer, matching the brief's own worked example (pause at 31s, wait 10s, resume still shows 31s). */
export function resumeExerciseTimer(record: ExerciseTimerRecord, now: number): ExerciseTimerRecord {
  if (record.endTime != null) return record
  const remainingMs = record.pausedRemainingMs ?? record.durationSeconds * 1000
  return { ...record, endTime: now + remainingMs, pausedRemainingMs: null }
}

/** Back to the full `durationSeconds`, a brand-new `endTime` — never reuses the old one. */
export function restartExerciseTimer(record: ExerciseTimerRecord, now: number): ExerciseTimerRecord {
  return startExerciseTimer(record.exerciseId, record.durationSeconds, now)
}
