import "server-only";

import { getActivePlan, getNextPlanItem } from "./plans";
import { getInProgressSession } from "./sessions";
import type { TodayRecommendation } from "./types";

/**
 * Composes the other domain reads into the single answer the Today screen
 * needs. Deterministic — no AI, fatigue, scoring, recovery, or duration
 * estimation. Evaluation order matters and is not just a stylistic choice:
 *
 *   1. in_progress   — the DB physically forbids starting a second session
 *                       while one is open, so this always wins regardless
 *                       of what the plan's rotation would say is "next".
 *   2. no_plan        — no active plan to consult at all.
 *   3. empty_plan     — plan exists but has no plan_items yet.
 *   4. ready          — the rotation's next plan_item.
 *
 * There is deliberately no "completed_today" state: rotation depends on
 * completed sessions, not calendar days (completing Espalda this morning
 * still means `ready -> Pecho` this evening).
 *
 * Only this function catches errors from the reads below and turns them
 * into `{ type: "error" }` — getActivePlan/getInProgressSession/
 * getNextPlanItem throw on real infra failures rather than returning null,
 * so a Supabase error is never silently reinterpreted as "no_plan".
 */
export async function getTodayRecommendation(userId: string): Promise<TodayRecommendation> {
  try {
    const inProgress = await getInProgressSession(userId);
    if (inProgress) {
      return {
        type: "in_progress",
        sessionId: inProgress.sessionId,
        planItemId: inProgress.planItemId,
        routineId: inProgress.routineId,
        routineName: inProgress.routineName,
      };
    }

    const plan = await getActivePlan(userId);
    if (!plan) {
      return { type: "no_plan" };
    }

    const nextItem = await getNextPlanItem(userId, plan.id);
    if (!nextItem) {
      return { type: "empty_plan", planId: plan.id };
    }

    return {
      type: "ready",
      planId: plan.id,
      planItemId: nextItem.planItemId,
      routineId: nextItem.routineId,
      routineName: nextItem.routineName,
    };
  } catch (err) {
    return {
      type: "error",
      reason: err instanceof Error ? err.message : "Unknown error in getTodayRecommendation",
    };
  }
}
