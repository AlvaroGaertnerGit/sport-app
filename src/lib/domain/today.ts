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
 *
 * One bounded retry (2 attempts total, fixed 400ms gap) wraps the whole
 * read chain: a real auth/permission failure never reaches this function in
 * the first place (`requireUser()` has already redirected before Today
 * calls this), so in practice everything this can catch is infra-shaped —
 * a transient Supabase/network blip, not a logical error — which is exactly
 * the "occasionally, on open, the plan fails to load" report this retry was
 * added for (see docs' investigation notes). NOT a polling loop and NOT
 * unbounded: exactly one retry, then the real `{ type: "error" }` if the
 * second attempt also fails, so a genuine outage still surfaces as an error
 * rather than hanging.
 */
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

async function readTodayRecommendation(userId: string): Promise<TodayRecommendation> {
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
}

export async function getTodayRecommendation(userId: string): Promise<TodayRecommendation> {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await readTodayRecommendation(userId);
    } catch (err) {
      if (attempt === RETRY_ATTEMPTS) {
        return {
          type: "error",
          reason: err instanceof Error ? err.message : "Unknown error in getTodayRecommendation",
        };
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  // Unreachable — the loop above always returns on its final attempt.
  throw new Error("getTodayRecommendation: unreachable");
}
