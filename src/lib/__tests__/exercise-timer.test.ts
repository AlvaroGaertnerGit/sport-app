import { describe, expect, it } from "vitest";

import {
  exerciseTimerPhase,
  pauseExerciseTimer,
  remainingExerciseMs,
  resumeExerciseTimer,
  restartExerciseTimer,
  startExerciseTimer,
} from "../exercise-timer";

/**
 * Pure math only -- no React, no timers, no localStorage. `now` is always
 * an explicit parameter (never `Date.now()`), which is exactly what makes
 * drift/pause/resume behavior checkable without a real clock or a
 * fake-timers setup.
 */

describe("startExerciseTimer / remainingExerciseMs", () => {
  it("45s: remaining counts down correctly and never negative", () => {
    const now = 1_000_000;
    const record = startExerciseTimer("ex-plank", 45, now);

    expect(remainingExerciseMs(record, now)).toBe(45_000);
    expect(remainingExerciseMs(record, now + 44_000)).toBe(1_000);
    expect(remainingExerciseMs(record, now + 45_000)).toBe(0);
    // Past the end -- clamped to 0, never negative.
    expect(remainingExerciseMs(record, now + 60_000)).toBe(0);
  });

  it("60s: same shape as 45s, just a longer duration", () => {
    const now = 500_000;
    const record = startExerciseTimer("ex-wall-sit", 60, now);

    expect(remainingExerciseMs(record, now)).toBe(60_000);
    expect(remainingExerciseMs(record, now + 30_000)).toBe(30_000);
    expect(remainingExerciseMs(record, now + 60_000)).toBe(0);
  });

  it("drift: a late tick recomputes from the real timestamp, never from an accumulated decrement", () => {
    const now = 0;
    const record = startExerciseTimer("ex-plank", 45, now);

    // The equivalent of "the tab was backgrounded for 5s and only one tick
    // landed on return" -- remaining must reflect real elapsed time (40s
    // left), not "45 - 1 tick" (44s) or some other decrement-based guess.
    const remaining = remainingExerciseMs(record, now + 5_000);
    expect(remaining).toBe(40_000);
  });
});

describe("exerciseTimerPhase", () => {
  it("idle when there is no record", () => {
    expect(exerciseTimerPhase(null, 0)).toBe("idle");
  });

  it("running while time remains and endTime is set", () => {
    const record = startExerciseTimer("ex-plank", 45, 0);
    expect(exerciseTimerPhase(record, 10_000)).toBe("running");
  });

  it("done exactly at and past the target duration", () => {
    const record = startExerciseTimer("ex-plank", 45, 0);
    expect(exerciseTimerPhase(record, 45_000)).toBe("done");
    expect(exerciseTimerPhase(record, 999_999)).toBe("done");
  });

  it("paused when endTime is cleared but time remains", () => {
    const running = startExerciseTimer("ex-plank", 45, 0);
    const paused = pauseExerciseTimer(running, 20_000);
    expect(exerciseTimerPhase(paused, 20_000)).toBe("paused");
    // Phase stays "paused" regardless of how much wall-clock time passes afterward.
    expect(exerciseTimerPhase(paused, 999_999)).toBe("paused");
  });
});

describe("pauseExerciseTimer / resumeExerciseTimer", () => {
  it("freezes the exact remaining time at pause -- the brief's own worked example (45s, pause at 31s, wait 10s, resume shows 31s)", () => {
    const started = startExerciseTimer("ex-plank", 45, 0);
    // 14s elapsed -> 31s remaining.
    const paused = pauseExerciseTimer(started, 14_000);
    expect(remainingExerciseMs(paused, 14_000)).toBe(31_000);

    // 10s pass while paused -- remaining must not move.
    expect(remainingExerciseMs(paused, 24_000)).toBe(31_000);

    // Resume 10s later: remaining is still 31s, not 21s -- the paused
    // duration is never counted against the timer.
    const resumed = resumeExerciseTimer(paused, 24_000);
    expect(remainingExerciseMs(resumed, 24_000)).toBe(31_000);
    expect(exerciseTimerPhase(resumed, 24_000)).toBe("running");
  });

  it("resume creates a brand-new endTime, never reuses the stale one", () => {
    const started = startExerciseTimer("ex-plank", 45, 0);
    const paused = pauseExerciseTimer(started, 14_000);
    const resumed = resumeExerciseTimer(paused, 24_000);

    expect(resumed.endTime).not.toBe(started.endTime);
    expect(resumed.endTime).toBe(24_000 + 31_000);
  });

  it("pause is a no-op when already paused -- never overwrites the frozen remaining time with a stale recomputation", () => {
    const started = startExerciseTimer("ex-plank", 45, 0);
    const paused = pauseExerciseTimer(started, 14_000);
    const pausedAgain = pauseExerciseTimer(paused, 20_000);

    expect(pausedAgain).toEqual(paused);
  });

  it("resume is a no-op when already running", () => {
    const started = startExerciseTimer("ex-plank", 45, 0);
    const stillRunning = resumeExerciseTimer(started, 10_000);

    expect(stillRunning).toEqual(started);
  });
});

describe("restartExerciseTimer", () => {
  it("goes back to the full duration with a fresh endTime, never reusing the old one, whether restarting mid-run or while paused", () => {
    const started = startExerciseTimer("ex-plank", 45, 0);

    const restartedMidRun = restartExerciseTimer(started, 30_000);
    expect(remainingExerciseMs(restartedMidRun, 30_000)).toBe(45_000);
    expect(restartedMidRun.endTime).not.toBe(started.endTime);

    const paused = pauseExerciseTimer(started, 14_000);
    const restartedFromPause = restartExerciseTimer(paused, 50_000);
    expect(exerciseTimerPhase(restartedFromPause, 50_000)).toBe("running");
    expect(remainingExerciseMs(restartedFromPause, 50_000)).toBe(45_000);
  });
});
