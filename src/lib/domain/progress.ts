import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActivityBucket, PersonalBestStat, ProgressPeriod, ProgressSummary, TopExerciseStat } from "./types";

const DAY_MS = 86_400_000;
const PERIOD_DAYS: Record<Exclude<ProgressPeriod, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "1y": 365,
};
/** Only these two periods get a daily activity bar — a 90 or 365-cell row isn't legible on a phone. */
const BUCKETED_PERIODS = new Set<ProgressPeriod>(["7d", "30d"]);
const TOP_EXERCISES_LIMIT = 5;

/** UTC calendar date ("YYYY-MM-DD") — the app has no per-user timezone-aware date logic anywhere yet (Today doesn't either), so this is a documented simplification, not a hidden bug. */
function toUTCDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function toEpochDay(dateKey: string): number {
  return Math.floor(new Date(`${dateKey}T00:00:00Z`).getTime() / DAY_MS);
}

/** Start of the period as an ISO timestamp, or null for "all" (no lower bound). */
export function getPeriodStartISO(period: ProgressPeriod, now: Date): string | null {
  if (period === "all") return null;
  return new Date(now.getTime() - PERIOD_DAYS[period] * DAY_MS).toISOString();
}

/**
 * Pure, exported so the rule can be reasoned about independently of data
 * access (same spirit as `pickNextPlanItem`). `dateKeys` need not be sorted
 * or deduplicated -- both are done here.
 *
 * "Current streak" is 0 the moment the most recent active day is 2+ days
 * before `todayKey` (the streak is broken, not just "paused") -- otherwise
 * it's the length of the consecutive run ending on that most recent day.
 */
export function computeStreaks(
  dateKeys: readonly string[],
  todayKey: string,
): { current: number; best: number } {
  const uniqueSortedDays = [...new Set(dateKeys)].map(toEpochDay).sort((a, b) => a - b);
  if (uniqueSortedDays.length === 0) {
    return { current: 0, best: 0 };
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < uniqueSortedDays.length; i++) {
    run = uniqueSortedDays[i] === uniqueSortedDays[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const lastActiveDay = uniqueSortedDays[uniqueSortedDays.length - 1];
  if (toEpochDay(todayKey) - lastActiveDay > 1) {
    return { current: 0, best };
  }

  let current = 1;
  for (let i = uniqueSortedDays.length - 1; i > 0; i--) {
    if (uniqueSortedDays[i] === uniqueSortedDays[i - 1] + 1) {
      current += 1;
    } else {
      break;
    }
  }
  return { current, best };
}

function buildDailyBuckets(activeDayKeys: ReadonlySet<string>, days: number, now: Date): ActivityBucket[] {
  const todayDay = Math.floor(now.getTime() / DAY_MS);
  const buckets: ActivityBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = new Date((todayDay - i) * DAY_MS).toISOString().slice(0, 10);
    buckets.push({ label: dateKey, active: activeDayKeys.has(dateKey) });
  }
  return buckets;
}

/**
 * The Progress dashboard's one aggregate, two queries total (never one per
 * exercise/session):
 *
 *   1. workout_sessions (id, status, started_at, completed_at) for the
 *      period -- drives everything date/status-shaped: counts, training
 *      time, active days, streaks, frequency.
 *   2. set_logs joined to exercises + workout_sessions (skipped entirely
 *      when there are zero completed sessions) -- drives the two
 *      exercise-level sections. A set_log's own populated column (`reps` vs
 *      `duration_seconds`) tells you its type; no join to
 *      routine_exercises.target_type is needed to keep the two apart.
 *
 * Volume (Σ weight_kg × reps) is summed only over sets that logged both a
 * weight and reps -- a duration set or a bodyweight rep never contributes,
 * so this never blends unrelated units into one misleading number.
 */
export async function getProgressSummary(userId: string, period: ProgressPeriod): Promise<ProgressSummary> {
  const supabase = await createClient();
  const now = new Date();
  const periodStart = getPeriodStartISO(period, now);

  let sessionsQuery = supabase
    .from("workout_sessions")
    .select("id, status, started_at, completed_at")
    .eq("user_id", userId);
  if (periodStart) {
    sessionsQuery = sessionsQuery.gte("started_at", periodStart);
  }
  const { data: sessions, error: sessionsError } = await sessionsQuery;
  if (sessionsError) {
    throw new Error(`getProgressSummary: ${sessionsError.message}`);
  }

  const rows = sessions ?? [];
  const hasData = rows.length > 0;

  let workoutsCompleted = 0;
  let workoutsAbandoned = 0;
  let trainingMs = 0;
  const activeDayKeys = new Set<string>();

  for (const row of rows) {
    activeDayKeys.add(toUTCDateKey(row.started_at));
    if (row.status === "completed") {
      workoutsCompleted += 1;
      if (row.completed_at) {
        trainingMs += new Date(row.completed_at).getTime() - new Date(row.started_at).getTime();
      }
    } else if (row.status === "abandoned") {
      workoutsAbandoned += 1;
    }
  }

  const trainingMinutes = Math.round(trainingMs / 60_000);
  const averageDurationMinutes = workoutsCompleted > 0 ? Math.round(trainingMinutes / workoutsCompleted) : null;

  const { current: currentStreakDays, best: bestStreakDays } = computeStreaks(
    [...activeDayKeys],
    toUTCDateKey(now.toISOString()),
  );

  // rows.length > 0 check before Math.min avoids -Infinity; not relying on
  // rows[0] being the earliest -- the query has no ORDER BY, so Postgres
  // doesn't guarantee row order.
  const periodDays =
    period === "all"
      ? rows.length > 0
        ? (now.getTime() - Math.min(...rows.map((row) => new Date(row.started_at).getTime()))) / DAY_MS
        : null
      : PERIOD_DAYS[period];
  // Extrapolating a weekly rate from less than a week of real history would
  // be exactly the "aproximación engañosa" the brief rules out (e.g. one
  // session on day one of a brand-new account reading as "7/week") -- omit
  // it rather than show a number that isn't earned yet.
  const sessionsPerWeek =
    rows.length > 0 && periodDays && periodDays >= 7 ? Math.round((rows.length / (periodDays / 7)) * 10) / 10 : null;

  const activityBuckets = BUCKETED_PERIODS.has(period)
    ? buildDailyBuckets(activeDayKeys, PERIOD_DAYS[period as "7d" | "30d"], now)
    : null;

  let topExercises: TopExerciseStat[] = [];
  let personalBests: PersonalBestStat[] = [];
  let totalReps = 0;
  let totalDurationSeconds = 0;
  let totalVolumeKg = 0;

  if (workoutsCompleted > 0) {
    let setLogsQuery = supabase
      .from("set_logs")
      .select("exercise_id, reps, duration_seconds, weight_kg, exercises(name), workout_sessions!inner(user_id, status, started_at)")
      .eq("workout_sessions.user_id", userId)
      .eq("workout_sessions.status", "completed");
    if (periodStart) {
      setLogsQuery = setLogsQuery.gte("workout_sessions.started_at", periodStart);
    }
    const { data: setLogRows, error: setLogsError } = await setLogsQuery;
    if (setLogsError) {
      throw new Error(`getProgressSummary: ${setLogsError.message}`);
    }

    const exerciseStats = new Map<
      string,
      {
        name: string;
        count: number;
        maxReps: number | null;
        maxDurationSeconds: number | null;
        maxWeightKg: number | null;
        repsAtMaxWeight: number | null;
      }
    >();

    for (const log of setLogRows ?? []) {
      if (log.reps != null) totalReps += log.reps;
      if (log.duration_seconds != null) totalDurationSeconds += log.duration_seconds;
      if (log.weight_kg != null && log.reps != null) totalVolumeKg += log.weight_kg * log.reps;

      const entry = exerciseStats.get(log.exercise_id) ?? {
        name: log.exercises?.name ?? "Ejercicio",
        count: 0,
        maxReps: null,
        maxDurationSeconds: null,
        maxWeightKg: null,
        repsAtMaxWeight: null,
      };
      entry.count += 1;
      if (log.reps != null) {
        entry.maxReps = entry.maxReps == null ? log.reps : Math.max(entry.maxReps, log.reps);
      }
      if (log.duration_seconds != null) {
        entry.maxDurationSeconds =
          entry.maxDurationSeconds == null ? log.duration_seconds : Math.max(entry.maxDurationSeconds, log.duration_seconds);
      }
      if (log.weight_kg != null && (entry.maxWeightKg == null || log.weight_kg > entry.maxWeightKg)) {
        entry.maxWeightKg = log.weight_kg;
        entry.repsAtMaxWeight = log.reps;
      }
      exerciseStats.set(log.exercise_id, entry);
    }

    topExercises = [...exerciseStats.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, TOP_EXERCISES_LIMIT)
      .map(([exerciseId, stat]) => ({ exerciseId, name: stat.name, timesPerformed: stat.count }));

    // A weighted exercise's PR is the heaviest single set moved (the
    // standard informal definition) — checked first since a set can have
    // both reps and a weight, and weight is the more meaningful ceiling.
    personalBests = topExercises
      .map((exercise): PersonalBestStat | null => {
        const stat = exerciseStats.get(exercise.exerciseId)!;
        if (stat.maxWeightKg != null) {
          return {
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            targetType: "weight",
            bestValue: stat.maxWeightKg,
            repsAtBestWeight: stat.repsAtMaxWeight ?? undefined,
          };
        }
        if (stat.maxReps != null) {
          return { exerciseId: exercise.exerciseId, name: exercise.name, targetType: "reps", bestValue: stat.maxReps };
        }
        if (stat.maxDurationSeconds != null) {
          return {
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            targetType: "duration",
            bestValue: stat.maxDurationSeconds,
          };
        }
        return null;
      })
      .filter((entry): entry is PersonalBestStat => entry !== null);
  }

  return {
    period,
    hasData,
    workoutsCompleted,
    workoutsAbandoned,
    trainingMinutes,
    averageDurationMinutes,
    totalReps,
    totalDurationSeconds,
    totalVolumeKg,
    activeDays: activeDayKeys.size,
    currentStreakDays,
    bestStreakDays,
    sessionsPerWeek,
    topExercises,
    personalBests,
    activityBuckets,
  };
}
