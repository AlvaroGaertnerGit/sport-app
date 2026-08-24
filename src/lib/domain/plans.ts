import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActivePlan, PlanItemSummary, PlanStatus, PlanSummary } from "./types";

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
 * Every plan the user has, active or paused -- "Mis Planes"' whole data
 * source. Archived plans never appear here: they're the "Delete Plan"
 * outcome (see `archivePlan`), not a state a library view should surface.
 * Two queries total, never N+1 per plan (same "batched, no N+1" shape
 * `getRoutineExerciseNames` already establishes): the plans themselves,
 * then every plan_item across all of them in one call, reduced to
 * per-plan routine lists in JS.
 *
 * `sportName` is deliberately derived here, never a stored column on
 * `plans` (there isn't one, and there shouldn't be -- only `routines.
 * primary_sport_id` exists): non-null only when every routine in the plan
 * shares the same sport, so a mixed-sport plan just omits the badge
 * rather than guessing which one to show.
 */
export async function getUserPlans(userId: string): Promise<PlanSummary[]> {
  const supabase = await createClient();

  const { data: plans, error: plansError } = await supabase
    .from("plans")
    .select("id, name, status")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: true });
  if (plansError) {
    throw new Error(`getUserPlans: ${plansError.message}`);
  }

  const planRows = plans ?? [];
  if (planRows.length === 0) {
    return [];
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("plan_items")
    .select("plan_id, order, routines(name, sports(name)), plans!inner(user_id)")
    .in(
      "plan_id",
      planRows.map((plan) => plan.id),
    )
    .eq("plans.user_id", userId)
    .order("order", { ascending: true });
  if (itemsError) {
    throw new Error(`getUserPlans: ${itemsError.message}`);
  }

  const itemsByPlan = new Map<string, { routineName: string; sportName: string | null }[]>();
  for (const row of itemRows ?? []) {
    const list = itemsByPlan.get(row.plan_id) ?? [];
    list.push({
      routineName: row.routines?.name ?? "Rutina",
      sportName: row.routines?.sports?.name ?? null,
    });
    itemsByPlan.set(row.plan_id, list);
  }

  return planRows.map((plan) => {
    const items = itemsByPlan.get(plan.id) ?? [];
    const sports = new Set(items.map((item) => item.sportName).filter((sport): sport is string => sport !== null));
    return {
      planId: plan.id,
      name: plan.name,
      status: plan.status as PlanStatus,
      routineCount: items.length,
      routineNames: items.map((item) => item.routineName),
      sportName: items.length > 0 && sports.size === 1 ? [...sports][0] : null,
    };
  });
}

/**
 * A single plan's own metadata by id -- unlike `getActivePlan`, which only
 * ever finds "the" active one, this addresses any plan the user owns
 * (active, paused, or archived), for pages/actions that already know
 * which `planId` they mean (edit/view screens, SCOPE's name-resolved
 * plan ops).
 */
export async function getPlan(
  userId: string,
  planId: string,
): Promise<{ planId: string; name: string | null; status: PlanStatus } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, status")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`getPlan: ${error.message}`);
  }
  return data ? { planId: data.id, name: data.name, status: data.status as PlanStatus } : null;
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

const FOREIGN_KEY_VIOLATION = "23503";

export async function renamePlan(userId: string, planId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update({ name })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`renamePlan: ${error.message}`);
  }
  if (!data) {
    throw new Error("renamePlan: plan not found");
  }
}

/**
 * "Delete Plan", for real: `plans.status = 'archived'` is an existing,
 * valid value (`plans_status_check`), not a new concept. A true `DELETE`
 * would cascade into `plan_items`, but `workout_sessions.plan_item_id`
 * references those with `ON DELETE RESTRICT` — Postgres refuses the
 * cascade the moment any session has ever been logged against the plan
 * (confirmed via `information_schema.referential_constraints`, not
 * assumed), which is the normal case, not an edge case. Archiving instead
 * preserves every relationship and every historical session untouched;
 * `getActivePlan()` already only looks for `status = 'active'`, so this
 * alone is what makes Today/Plan fall back to the "no active plan" empty
 * state, with zero changes needed there.
 */
export async function archivePlan(userId: string, planId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update({ status: "archived" })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`archivePlan: ${error.message}`);
  }
  if (!data) {
    throw new Error("archivePlan: plan not found");
  }
}

/**
 * Deactivates a plan WITHOUT archiving it -- `status: 'paused'`, the
 * "sitting inactive in the library" state, distinct from `archivePlan`'s
 * "removed from Mis Planes" outcome. This is the one used whenever a plan
 * stops being active because a *different* plan became active instead
 * (`activatePlan`, `createPlan`'s activate-on-create path) -- archiving it
 * there would be a real bug: switching your active plan should never look
 * like deleting the one you switched away from.
 */
async function pausePlan(userId: string, planId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update({ status: "paused" })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`pausePlan: ${error.message}`);
  }
  if (!data) {
    throw new Error("pausePlan: plan not found");
  }
}

/**
 * Explicitly switches which plan is active -- the same "deactivate the old
 * one, then activate the target" sequence `createPlan`'s own
 * activate-on-create path uses, extracted so both share one
 * implementation rather than two copies of the same atomicity concern.
 * "Deactivate" is `pausePlan`, never `archivePlan` -- switching your active
 * plan must never look like deleting the one you switched away from. No-op
 * (not an error) if `planId` is already active -- SCOPE's `activate_plan`
 * op can be safely re-confirmed. Order matters (pause before activate)
 * because of `plans_one_active_per_user`, the partial unique index on
 * `(user_id) WHERE status = 'active'`; if activation fails after the
 * previous plan was paused, that pause is undone as compensation so a
 * failure never leaves the user with zero active plans over something that
 * wasn't their fault -- and never, at any point, with two.
 */
export async function activatePlan(userId: string, planId: string): Promise<void> {
  const supabase = await createClient();

  const { data: target, error: targetError } = await supabase
    .from("plans")
    .select("id, status")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (targetError) {
    throw new Error(`activatePlan: ${targetError.message}`);
  }
  if (!target) {
    throw new Error("activatePlan: plan not found");
  }
  if (target.status === "active") {
    return;
  }

  const current = await getActivePlan(userId);
  if (current && current.id !== planId) {
    await pausePlan(userId, current.id);
  }

  const { data, error } = await supabase
    .from("plans")
    .update({ status: "active" })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (current && current.id !== planId) {
      await supabase.from("plans").update({ status: "active" }).eq("id", current.id).eq("user_id", userId);
    }
    throw new Error(`activatePlan: ${error?.message ?? "plan not found"}`);
  }
}

/**
 * Swaps two adjacent items' `order` via three sequential updates (temp
 * sentinel, then the two final values) rather than one combined statement
 * — `plan_items_plan_id_order_key` is a plain (non-deferrable) unique
 * constraint, so this is the version that can't collide regardless of
 * exactly when Postgres checks it. Rotation math is unaffected: sessions
 * reference an immutable `plan_item_id`, never a stored order number, so
 * `getNextPlanItem` simply re-reads whichever order each plan_item has
 * *now* — no historical session is touched or reinterpreted.
 */
export async function movePlanItem(
  userId: string,
  planId: string,
  planItemId: string,
  direction: "up" | "down",
): Promise<void> {
  const items = await getPlanItems(userId, planId);
  const index = items.findIndex((item) => item.planItemId === planItemId);
  if (index === -1) {
    throw new Error("movePlanItem: plan item not found");
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) {
    return; // Already at that end -- a no-op, not an error.
  }

  const current = items[index];
  const other = items[swapIndex];
  const supabase = await createClient();

  const steps = [
    supabase.from("plan_items").update({ order: -1 }).eq("id", current.planItemId),
    supabase.from("plan_items").update({ order: current.order }).eq("id", other.planItemId),
    supabase.from("plan_items").update({ order: other.order }).eq("id", current.planItemId),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) {
      throw new Error(`movePlanItem: ${error.message}`);
    }
  }
}

/**
 * Moves a plan_item to an arbitrary 1-based position within its plan --
 * the arbitrary-position sibling of `movePlanItem` (adjacent swap only),
 * the same relationship `reorderRoutineExercise` has to a hypothetical
 * adjacent-only routine-exercise mover. The manual `/plan/[planId]/edit`
 * UI keeps using `movePlanItem`'s up/down buttons (already satisfies the
 * accessible-alternative-to-drag-and-drop requirement); this exists for
 * SCOPE's `reorder_plan_item` op, which needs to resolve natural-language
 * positions ("primero", "antes de Push") to an absolute target, not just
 * one step. Same sentinel-then-final two-pass technique as
 * `reorderRoutineExercise`, for the same reason
 * (`plan_items_plan_id_order_key` is a plain, non-deferrable unique
 * constraint). `toPosition` out of range is defensively clamped here --
 * the real rejection with a clear message happens earlier, at resolution.
 */
export async function reorderPlanItem(
  userId: string,
  planId: string,
  planItemId: string,
  toPosition: number,
): Promise<void> {
  const items = await getPlanItems(userId, planId); // already ordered + ownership-checked
  const fromIndex = items.findIndex((item) => item.planItemId === planItemId);
  if (fromIndex === -1) {
    throw new Error("reorderPlanItem: plan item not found");
  }

  const rows = [...items];
  const [moved] = rows.splice(fromIndex, 1);
  const clampedIndex = Math.max(0, Math.min(rows.length, toPosition - 1));
  rows.splice(clampedIndex, 0, moved);

  const supabase = await createClient();

  const sentinelUpdates = rows.map((row, index) =>
    supabase.from("plan_items").update({ order: -(index + 1) }).eq("id", row.planItemId),
  );
  for (const step of sentinelUpdates) {
    const { error } = await step;
    if (error) {
      throw new Error(`reorderPlanItem: ${error.message}`);
    }
  }

  const finalUpdates = rows.map((row, index) =>
    supabase.from("plan_items").update({ order: index + 1 }).eq("id", row.planItemId),
  );
  for (const step of finalUpdates) {
    const { error } = await step;
    if (error) {
      throw new Error(`reorderPlanItem: ${error.message}`);
    }
  }
}

/**
 * Appends an existing routine to the plan at the next `order` slot. The
 * same routine can legitimately appear more than once in one plan (no
 * constraint stops it, e.g. repeating a routine twice in a 4-day
 * rotation) — this never checks for that, by design.
 */
export async function addRoutineToPlan(
  userId: string,
  planId: string,
  routineId: string,
): Promise<{ planItemId: string }> {
  const supabase = await createClient();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (planError) {
    throw new Error(`addRoutineToPlan: ${planError.message}`);
  }
  if (!plan) {
    throw new Error("addRoutineToPlan: plan not found");
  }

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle();
  if (routineError) {
    throw new Error(`addRoutineToPlan: ${routineError.message}`);
  }
  if (!routine) {
    throw new Error("addRoutineToPlan: routine not found");
  }

  const items = await getPlanItems(userId, planId);
  const nextOrder = items.length === 0 ? 1 : Math.max(...items.map((item) => item.order)) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("plan_items")
    .insert({ plan_id: planId, routine_id: routineId, order: nextOrder })
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(`addRoutineToPlan: ${insertError?.message ?? "insert returned no row"}`);
  }

  return { planItemId: inserted.id };
}

export type CreatePlanResult = { status: "created"; planId: string; activated: boolean };

/**
 * Creates a new plan. Creating a second (third, fourth...) plan is no
 * longer a conflict -- "Mis Planes" is a real library now -- so this
 * always succeeds (barring an actual DB error); whether the new plan
 * becomes the active one follows one rule:
 *
 * - If the user currently has NO active plan at all (their first plan
 *   ever, or their only active plan was archived), the new plan always
 *   becomes active -- leaving a real user with zero operative plans for
 *   no reason serves no one, regardless of what the caller asked for.
 * - Otherwise, only if the caller explicitly asks (`activateOnCreate`),
 *   the existing active plan is archived first and the new one becomes
 *   active instead.
 * - Otherwise the new plan is created `paused` -- sitting in the library,
 *   inactive, exactly like any plan the user hasn't activated yet.
 *
 * `plans_one_active_per_user` is a real partial unique index
 * (`UNIQUE (user_id) WHERE status = 'active'`) -- invisible to a
 * `pg_constraint` lookup (partial uniqueness can only exist as an index,
 * never a table constraint), which is why it wasn't in this file's earlier
 * research notes; confirmed via `pg_indexes` after the first version of
 * this function hit it live. So whenever this activates the new plan by
 * replacing an existing one, that old plan must be paused (`pausePlan`,
 * never `archivePlan` -- the old plan is still a real plan in the
 * library, just no longer active) *before* the new one is inserted, not
 * after, or the insert itself violates the index -- same atomic sequence
 * `activatePlan` also uses.
 *
 * Atomicity: the `plan_items` insert (when `routineIds` is non-empty --
 * see §37, an empty plan is a legitimate in-progress state) is a single
 * multi-row `INSERT`, one Postgres statement, all-or-nothing by itself, no
 * explicit transaction needed. If it fails, or if the `plans` insert
 * itself fails, everything this call did is undone via compensating
 * actions (delete the new plan row / reinstate the old plan's `active`
 * status) rather than a pretend client-side transaction -- so a failure
 * here always leaves the user exactly where they started, never with zero
 * active plans and never with a plan missing its items.
 */
export async function createPlan(
  userId: string,
  input: { name: string; routineIds: string[] },
  options: { activateOnCreate: boolean },
): Promise<CreatePlanResult> {
  const existing = await getActivePlan(userId);
  const willActivate = !existing || options.activateOnCreate;

  const supabase = await createClient();

  if (existing && willActivate) {
    await pausePlan(userId, existing.id);
  }

  async function restoreExistingIfPaused() {
    if (existing && willActivate) {
      await supabase.from("plans").update({ status: "active" }).eq("id", existing.id).eq("user_id", userId);
    }
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({ user_id: userId, name: input.name, status: willActivate ? "active" : "paused" })
    .select("id")
    .single();
  if (planError || !plan) {
    await restoreExistingIfPaused();
    throw new Error(`createPlan: ${planError?.message ?? "insert returned no row"}`);
  }

  if (input.routineIds.length > 0) {
    const { error: itemsError } = await supabase.from("plan_items").insert(
      input.routineIds.map((routineId, index) => ({
        plan_id: plan.id,
        routine_id: routineId,
        order: index + 1,
      })),
    );
    if (itemsError) {
      await supabase.from("plans").delete().eq("id", plan.id);
      await restoreExistingIfPaused();
      throw new Error(`createPlan: ${itemsError.message}`);
    }
  }

  return { status: "created", planId: plan.id, activated: willActivate };
}

export type RemovePlanItemResult = { removed: true } | { removed: false; reason: "has_history" };

/**
 * Removes one routine from the plan's rotation. `workout_sessions.plan_item_id`
 * references `plan_items` with `ON DELETE RESTRICT` (same constraint that
 * blocks a hard plan delete, see `archivePlan`) -- so this fails by design
 * the moment any session (completed, abandoned, or in_progress) was ever
 * logged against this exact plan_item. That's an expected, explainable
 * domain outcome, not an infra error, so it's returned as a typed result
 * instead of thrown.
 */
export async function removePlanItem(
  userId: string,
  planId: string,
  planItemId: string,
): Promise<RemovePlanItemResult> {
  const supabase = await createClient();

  // Supabase-js can't filter a delete/update on a joined table's column the
  // way `getPlanItems`'s select can -- verify ownership of `planId` first,
  // same defense-in-depth role, just as its own step. RLS
  // (`plan_items_delete_own`) is still the real authorization boundary.
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (planError) {
    throw new Error(`removePlanItem: ${planError.message}`);
  }
  if (!plan) {
    throw new Error("removePlanItem: plan not found");
  }

  const { error } = await supabase.from("plan_items").delete().eq("id", planItemId).eq("plan_id", planId);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { removed: false, reason: "has_history" };
    }
    throw new Error(`removePlanItem: ${error.message}`);
  }

  return { removed: true };
}
