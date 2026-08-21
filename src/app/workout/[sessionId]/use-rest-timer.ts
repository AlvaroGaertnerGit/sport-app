"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { remainingRestSeconds, type RestRecord } from "@/lib/rest-timer";

const TICK_MS = 1000;
const DEFAULT_REST_SECONDS = 60;

// Scoped per exercise, not just per session: an earlier version used one
// session-wide slot, so starting a rest for one exercise silently
// overwrote (or clearing it silently wiped) another exercise's still-
// ticking rest record when the user browsed between exercises mid-rest.
function storageKey(sessionId: string, exerciseId: string) {
  return `sport-coach:rest:${sessionId}:${exerciseId}`;
}

function changeEventName(sessionId: string, exerciseId: string) {
  return `sport-coach:rest:${sessionId}:${exerciseId}:change`;
}

function parseRecord(raw: string | null): RestRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RestRecord>;
    if (
      typeof parsed.exerciseId === "string" &&
      typeof parsed.startedAt === "number" &&
      typeof parsed.durationSeconds === "number"
    ) {
      return parsed as RestRecord;
    }
  } catch {
    // Corrupted value -- treat as absent rather than throwing.
  }
  return null;
}

// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing changed (JSON.parse-ing localStorage fresh
// every call would return a new object each time and defeat that). This
// caches the last raw string -> parsed result per (session, exercise) so
// unchanged storage keeps returning the same reference.
const snapshotCache = new Map<string, { raw: string | null; parsed: RestRecord | null }>();

function getSnapshot(sessionId: string, exerciseId: string | undefined): RestRecord | null {
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

function writeRecord(sessionId: string, exerciseId: string, record: RestRecord | null) {
  if (record) {
    window.localStorage.setItem(storageKey(sessionId, exerciseId), JSON.stringify(record));
  } else {
    window.localStorage.removeItem(storageKey(sessionId, exerciseId));
  }
  // The native "storage" event only fires in *other* tabs, never this
  // one -- dispatch a same-tab event so the subscription below notices
  // the change immediately instead of waiting for the next tick.
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

export type RestPhase = "idle" | "resting" | "done";

/**
 * Rest-timer state for one exercise, persisted client-side only (see
 * session-view.tsx for why this isn't a Supabase column). `localStorage`
 * is read through `useSyncExternalStore` -- React's own mechanism for
 * subscribing to an external mutable source -- rather than mirroring it
 * into state via useState+useEffect. That gives: a reload, the phone
 * locking mid-rest, or switching exercises and back all recompute
 * correctly from the stored timestamp pair, per src/lib/rest-timer.ts's
 * derive-don't-store approach; and it's automatically SSR-safe (the
 * third argument below is the server snapshot).
 */
export function useRestTimer(sessionId: string, exerciseId: string | undefined) {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeToStorage(sessionId, exerciseId, onChange),
    [sessionId, exerciseId],
  );
  const getClientSnapshot = useCallback(() => getSnapshot(sessionId, exerciseId), [sessionId, exerciseId]);
  const record = useSyncExternalStore(subscribe, getClientSnapshot, () => null);

  // Drives the once-a-second re-render while resting so `now` (and thus
  // `remainingSeconds`) advances. `now` is only ever set from inside this
  // effect's interval callback, never read directly during render, so
  // Date.now() (impure) never runs in the render body itself -- the
  // tradeoff is that the very first render after a rest period starts can
  // show up to 1s of staleness until the first tick, self-correcting
  // immediately after.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!record) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [record]);

  const remainingSeconds = record ? remainingRestSeconds(record, now) : 0;
  const phase: RestPhase = !record ? "idle" : remainingSeconds > 0 ? "resting" : "done";

  // Vibrate exactly once, right when a countdown reaches zero (naturally
  // or via skip()) -- never on every render while phase stays "done". No
  // sound yet: Web Audio's autoplay rules make a reliable chime more
  // involved than this phase needs (see session-view.tsx's note); this is
  // the hook point for it later.
  const prevPhaseRef = useRef<RestPhase>(phase);
  useEffect(() => {
    if (prevPhaseRef.current === "resting" && phase === "done") {
      try {
        navigator.vibrate?.(200);
      } catch {
        // Unsupported/blocked -- never depend on it.
      }
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // `targetExerciseId` is an explicit parameter, not the hook's bound
  // `exerciseId` -- start() always writes to *that* exercise's own slot,
  // so even a stale caller can never stomp on whichever exercise's record
  // this hook instance is currently reading.
  const start = useCallback(
    (targetExerciseId: string, durationSeconds: number) => {
      writeRecord(sessionId, targetExerciseId, {
        exerciseId: targetExerciseId,
        startedAt: Date.now(),
        // durationSeconds === 0 is a legitimate "no rest" value from
        // routine_exercises.rest_seconds -- only an invalid (NaN/negative)
        // value falls back to the default.
        durationSeconds: Number.isFinite(durationSeconds) && durationSeconds >= 0
          ? durationSeconds
          : DEFAULT_REST_SECONDS,
      });
    },
    [sessionId],
  );

  const addSeconds = useCallback(
    (seconds: number) => {
      if (!record || !exerciseId) return;
      writeRecord(sessionId, exerciseId, { ...record, durationSeconds: record.durationSeconds + seconds });
    },
    [sessionId, exerciseId, record],
  );

  /** Fast-forwards to the end of the rest without deleting the record — still lands on "done", not "idle". */
  const skip = useCallback(() => {
    if (!record || !exerciseId) return;
    writeRecord(sessionId, exerciseId, { ...record, startedAt: Date.now() - record.durationSeconds * 1000 });
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
    addSeconds,
    skip,
    clear,
  };
}

export { DEFAULT_REST_SECONDS };
