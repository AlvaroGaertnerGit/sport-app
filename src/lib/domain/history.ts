import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HistorySessionSummary } from "./types";

const DEFAULT_LIMIT = 30;

/**
 * The user's finished sessions, most recent first — never the live
 * `in_progress` one (that belongs to Today/Workout, not History; the DB
 * guarantees at most one anyway). Capped at `limit` rather than loading the
 * user's entire history, per the brief's own performance rule.
 *
 * Two queries total, never N+1:
 *   1. workout_sessions + routine name, for the page itself.
 *   2. set_logs for exactly those session ids, to derive "how many
 *      exercises were actually touched" per session — distinct exercise_id
 *      count, not the routine's template count, so it stays correct even
 *      for a routine-less session and reflects what really happened.
 */
export async function getSessionHistory(
  userId: string,
  limit = DEFAULT_LIMIT,
): Promise<HistorySessionSummary[]> {
  const supabase = await createClient();

  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("id, status, started_at, completed_at, routines(name)")
    .eq("user_id", userId)
    .in("status", ["completed", "abandoned"])
    .order("started_at", { ascending: false })
    .limit(limit);

  if (sessionsError) {
    throw new Error(`getSessionHistory: ${sessionsError.message}`);
  }
  if (!sessions || sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);
  const { data: setLogs, error: setLogsError } = await supabase
    .from("set_logs")
    .select("workout_session_id, exercise_id")
    .in("workout_session_id", sessionIds);

  if (setLogsError) {
    throw new Error(`getSessionHistory: ${setLogsError.message}`);
  }

  const exerciseIdsBySession = new Map<string, Set<string>>();
  for (const log of setLogs ?? []) {
    const set = exerciseIdsBySession.get(log.workout_session_id) ?? new Set<string>();
    set.add(log.exercise_id);
    exerciseIdsBySession.set(log.workout_session_id, set);
  }

  return sessions.map((session) => {
    const status = session.status as HistorySessionSummary["status"];
    const durationMinutes =
      status === "completed" && session.completed_at
        ? Math.round(
            (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000,
          )
        : null;

    return {
      sessionId: session.id,
      routineName: session.routines?.name ?? null,
      status,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      durationMinutes,
      exerciseCount: exerciseIdsBySession.get(session.id)?.size ?? 0,
    };
  });
}
