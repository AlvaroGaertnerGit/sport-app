import "server-only";

import { createClient } from "@/lib/supabase/server";
import { toUTCDateKey } from "./progress";
import type { CalendarDaySession, TrainingCalendarMonth } from "./types";

/**
 * One bounded query for exactly the requested UTC month — never the user's
 * whole history (see the brief's own "no descargar innecesariamente todo
 * el historial" rule). Same `in_progress`-excluded semantics as
 * `getSessionHistory`: a live session belongs to Today/Workout, not
 * History/Calendar, and the DB guarantees at most one anyway.
 *
 * `month` is 1-12. Multiple sessions on the same day are never collapsed —
 * `sessionsByDate` is a day -> array map specifically so a real account
 * with two sessions in one day (confirmed to exist in this dataset) keeps
 * both.
 */
export async function getTrainingCalendarMonth(
  userId: string,
  year: number,
  month: number,
): Promise<TrainingCalendarMonth> {
  const supabase = await createClient();
  const rangeStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const rangeEnd = new Date(Date.UTC(year, month, 1)).toISOString();

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, status, started_at, routines(name)")
    .eq("user_id", userId)
    .in("status", ["completed", "abandoned"])
    .gte("started_at", rangeStart)
    .lt("started_at", rangeEnd)
    .order("started_at", { ascending: true });

  if (error) {
    throw new Error(`getTrainingCalendarMonth: ${error.message}`);
  }

  const sessionsByDate: Record<string, CalendarDaySession[]> = {};
  for (const row of data ?? []) {
    const dateKey = toUTCDateKey(row.started_at);
    const entry: CalendarDaySession = {
      sessionId: row.id,
      routineName: row.routines?.name ?? null,
      status: row.status as CalendarDaySession["status"],
      startedAt: row.started_at,
    };
    (sessionsByDate[dateKey] ??= []).push(entry);
  }

  return { year, month, sessionsByDate };
}

export type CalendarCell = {
  dateKey: string
  day: number
  inMonth: boolean
}

/**
 * Pure, exported so the grid shape can be reasoned about independently of
 * data access (same spirit as `computeStreaks`/`buildDailyBuckets`).
 * Monday-start, with leading/trailing days from the adjacent months so
 * every week row has exactly 7 cells. Relies on `Date.UTC` normalizing an
 * out-of-range day (0, or > days-in-month) into the adjacent month itself,
 * instead of hand-rolling month/year rollover branching.
 */
export function buildCalendarWeeks(year: number, month: number): CalendarCell[][] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstWeekday + 1;
    const date = new Date(Date.UTC(year, month - 1, dayOffset));
    cells.push({
      dateKey: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: dayOffset >= 1 && dayOffset <= daysInMonth,
    });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
