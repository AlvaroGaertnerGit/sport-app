"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  exerciseTimerPhase,
  pauseExerciseTimer,
  remainingExerciseMs,
  resumeExerciseTimer,
  restartExerciseTimer,
  startExerciseTimer,
  type ExerciseTimerPhase,
  type ExerciseTimerRecord,
} from "@/lib/exercise-timer";

const TICK_MS = 1000;

// Own namespace, deliberately distinct from `use-rest-timer.ts`'s
// `sport-coach:rest:...` keys -- the two timers are scoped per exercise
// independently and must never collide or be confused for one another.
function storageKey(sessionId: string, exerciseId: string) {
  return `sport-coach:extimer:${sessionId}:${exerciseId}`;
}

function changeEventName(sessionId: string, exerciseId: string) {
  return `sport-coach:extimer:${sessionId}:${exerciseId}:change`;
}

function parseRecord(raw: string | null): ExerciseTimerRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ExerciseTimerRecord>;
    if (typeof parsed.exerciseId === "string" && typeof parsed.durationSeconds === "number") {
      return {
        exerciseId: parsed.exerciseId,
        durationSeconds: parsed.durationSeconds,
        endTime: typeof parsed.endTime === "number" ? parsed.endTime : null,
        pausedRemainingMs: typeof parsed.pausedRemainingMs === "number" ? parsed.pausedRemainingMs : null,
      };
    }
  } catch {
    // Corrupted value -- treat as absent rather than throwing.
  }
  return null;
}

// Same useSyncExternalStore-needs-a-stable-snapshot cache use-rest-timer.ts
// already relies on -- re-parsing localStorage fresh every call would
// return a new object each time and defeat that.
const snapshotCache = new Map<string, { raw: string | null; parsed: ExerciseTimerRecord | null }>();

function getSnapshot(sessionId: string, exerciseId: string | undefined): ExerciseTimerRecord | null {
  if (!exerciseId) return null;
  const cacheKey = storageKey(sessionId, exerciseId);
  const raw = window.localStorage.getItem(cacheKey);
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.raw === raw) {
    return cached.parsed;
  }
  const parsed = parseRecord(raw);
  snapshotCache.set(cacheKey, { raw, parsed });
  return parsed;
}

function writeRecord(sessionId: string, exerciseId: string, record: ExerciseTimerRecord | null) {
  if (record) {
    window.localStorage.setItem(storageKey(sessionId, exerciseId), JSON.stringify(record));
  } else {
    window.localStorage.removeItem(storageKey(sessionId, exerciseId));
  }
  // The native "storage" event only fires in *other* tabs -- dispatch a
  // same-tab event so this tab's own subscription notices immediately.
  window.dispatchEvent(new Event(changeEventName(sessionId, exerciseId)));
}

function subscribeToStorage(sessionId: string, exerciseId: string | undefined, onChange: () => void) {
  if (!exerciseId) return () => {};
  const eventName = changeEventName(sessionId, exerciseId);
  window.addEventListener("storage", onChange);
  window.addEventListener(eventName, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(eventName, onChange);
  };
}

/**
 * Timed-exercise countdown (Plank 45s, etc.), scoped per (session,
 * exercise) exactly like `useRestTimer` -- persisted to `localStorage` so
 * a reload/app-switch/screen-lock recomputes correctly from the stored
 * timestamp instead of losing the countdown. `endTime` (not a ticking
 * counter) is the only source of truth for `remaining`; the interval below
 * only forces a re-render, and `visibilitychange` forces one more the
 * instant a backgrounded tab becomes visible again, since `setInterval`
 * callbacks are not guaranteed to fire on schedule (or at all) while
 * hidden -- without it, returning to the tab could still show a
 * momentarily stale value until the next natural tick.
 */
export function useExerciseTimer(sessionId: string, exerciseId: string | undefined) {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeToStorage(sessionId, exerciseId, onChange),
    [sessionId, exerciseId],
  );
  const getClientSnapshot = useCallback(() => getSnapshot(sessionId, exerciseId), [sessionId, exerciseId]);
  const record = useSyncExternalStore(subscribe, getClientSnapshot, () => null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Only while actually counting down -- idle/paused/done never need a
    // ticking `now`, and stopping the interval there is what makes
    // "cleanup on pause/exercise-change/unmount" (brief §9) automatic
    // rather than a separate thing to remember to do.
    if (!record || record.endTime == null) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    function onVisibility() {
      if (document.visibilityState === "visible") setNow(Date.now());
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [record]);

  const remainingMs = record ? remainingExerciseMs(record, now) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const phase: ExerciseTimerPhase = exerciseTimerPhase(record, now);

  const start = useCallback(
    (targetExerciseId: string, durationSeconds: number) => {
      const t = Date.now();
      setNow(t);
      writeRecord(sessionId, targetExerciseId, startExerciseTimer(targetExerciseId, durationSeconds, t));
    },
    [sessionId],
  );

  const pause = useCallback(() => {
    if (!record || !exerciseId) return;
    writeRecord(sessionId, exerciseId, pauseExerciseTimer(record, Date.now()));
  }, [sessionId, exerciseId, record]);

  const resume = useCallback(() => {
    if (!record || !exerciseId) return;
    const t = Date.now();
    setNow(t);
    writeRecord(sessionId, exerciseId, resumeExerciseTimer(record, t));
  }, [sessionId, exerciseId, record]);

  const restart = useCallback(() => {
    if (!record || !exerciseId) return;
    const t = Date.now();
    setNow(t);
    writeRecord(sessionId, exerciseId, restartExerciseTimer(record, t));
  }, [sessionId, exerciseId, record]);

  const clear = useCallback(() => {
    if (!exerciseId) return;
    writeRecord(sessionId, exerciseId, null);
  }, [sessionId, exerciseId]);

  return {
    phase,
    remainingSeconds,
    totalSeconds: record?.durationSeconds ?? 0,
    start,
    pause,
    resume,
    restart,
    clear,
  };
}
