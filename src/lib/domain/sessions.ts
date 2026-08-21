import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { InProgressSession } from "./types";

/**
 * The user's single in_progress workout_session, or null if they don't
 * have one. The DB guarantees at most one per user
 * (workout_sessions_one_in_progress_per_user), so this is a plain lookup,
 * not a "which one" decision.
 */
export async function getInProgressSession(
  userId: string,
): Promise<InProgressSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, plan_item_id, routine_id, started_at, routines(name)")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (error) {
    throw new Error(`getInProgressSession: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  return {
    sessionId: data.id,
    planItemId: data.plan_item_id,
    routineId: data.routine_id,
    routineName: data.routines?.name ?? null,
    status: "in_progress",
    startedAt: data.started_at,
  };
}
