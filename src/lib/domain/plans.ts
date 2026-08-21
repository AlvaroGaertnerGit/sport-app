import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActivePlan, PlanItemSummary } from "./types";

/**
 * The user's single active plan, or null if they don't have one — a valid,
 * expected state, not an error. Takes only `userId`: which plan is "active"
 * is derived entirely server-side (the DB guarantees at most one `active`
 * plan per user), never trusted from a client-supplied `planId`.
 *
 * RLS (`plans_select_own`) is the actual authorization boundary; the
 * `user_id` filter here is defense-in-depth / query shaping, not a
 * re-implementation of ownership checks (see src/lib/README.md).
 */
export async function getActivePlan(userId: string): Promise<ActivePlan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, name")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`getActivePlan: ${error.message}`);
  }

  return data ? { id: data.id, name: data.name } : null;
}

/**
 * Pure rotation rule, isolated from data access so it can be reasoned about
 * (and verified) on its own: `order` values are neither contiguous nor
 * zero-based (deleting a plan_item leaves gaps), so "next" is never
 * `lastCompletedOrder + 1` — it's the smallest existing `order` greater
 * than the last completed one, wrapping to the smallest overall `order`
 * when there is none (including the "never completed anything yet" case).
 */
export function pickNextPlanItem<T extends { order: number }>(
  itemsSortedAsc: readonly T[],
  lastCompletedOrder: number | null,
): T | null {
  if (itemsSortedAsc.length === 0) {
    return null;
  }
  if (lastCompletedOrder === null) {
    return itemsSortedAsc[0];
  }
  return itemsSortedAsc.find((item) => item.order > lastCompletedOrder) ?? itemsSortedAsc[0];
}

/**
 * Every plan_item in `planId`, in rotation order — the full structure
 * Plan's rotation list needs. `getNextPlanItem` below is built on top of
 * this rather than running its own near-identical query (this used to be
 * inlined there, back when nothing needed the full list).
 */
export async function getPlanItems(userId: string, planId: string): Promise<PlanItemSummary[]> {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("plan_items")
    .select("id, order, routine_id, routines(name), plans!inner(user_id)")
    .eq("plan_id", planId)
    .eq("plans.user_id", userId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(`getPlanItems: ${error.message}`);
  }

  return (items ?? []).map((item) => ({
    planItemId: item.id,
    routineId: item.routine_id,
    routineName: item.routines?.name ?? "",
    order: item.order,
  }));
}

/**
 * The `order` of the plan_item behind the most recently completed session
 * in `planId`, or null if none has ever been completed. Only `completed`
 * counts — `in_progress`/`abandoned` sessions and `activities` never move
 * the rotation (activities can't: they have no plan_item_id at all).
 *
 * Exported (not just an internal step of `getNextPlanItem`) so a caller
 * that already has the full `getPlanItems()` list — Plan's rotation view —
 * can derive "which one is next" via `pickNextPlanItem` itself instead of
 * fetching `plan_items` a second time through `getNextPlanItem`.
 */
export async function getLastCompletedPlanItemOrder(userId: string, planId: string): Promise<number | null> {
  const supabase = await createClient();

  const { data: lastCompleted, error } = await supabase
    .from("workout_sessions")
    .select("plan_items!inner(order, plan_id)")
    .eq("user_id", userId)
    .eq("status", "completed")
    .eq("plan_items.plan_id", planId)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`getLastCompletedPlanItemOrder: ${error.message}`);
  }

  return lastCompleted?.plan_items?.order ?? null;
}

/** The next plan_item in the rotation for `planId`, per `pickNextPlanItem`'s rule. */
export async function getNextPlanItem(
  userId: string,
  planId: string,
): Promise<PlanItemSummary | null> {
  const items = await getPlanItems(userId, planId);
  if (items.length === 0) {
    return null;
  }

  const lastCompletedOrder = await getLastCompletedPlanItemOrder(userId, planId);
  return pickNextPlanItem(items, lastCompletedOrder);
}
