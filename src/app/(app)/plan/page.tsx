import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import {
  getActivePlan,
  getLastCompletedPlanItemOrder,
  getPlanItems,
  pickNextPlanItem,
} from "@/lib/domain";

import { EmptyPlanState, NoActivePlanState } from "../plan-empty-states";
import { PlanRotationView } from "./plan-rotation-view";

export default async function PlanPage() {
  const user = await requireUser();
  const plan = await getActivePlan(user.id);

  if (!plan) {
    return (
      <div className="flex flex-1 flex-col px-5 pt-8">
        <p className={EYEBROW_CLASSNAME}>Plan</p>
        <NoActivePlanState />
      </div>
    );
  }

  // Two queries total (plan_items list, then the last-completed lookup),
  // never three: `getNextPlanItem` would internally re-fetch the same
  // plan_items list this page already needs for the full rotation --
  // composing `pickNextPlanItem` (pure, already exported) here instead
  // reuses the one fetch for both.
  const items = await getPlanItems(user.id, plan.id);
  const lastCompletedOrder = items.length > 0 ? await getLastCompletedPlanItemOrder(user.id, plan.id) : null;
  const next = pickNextPlanItem(items, lastCompletedOrder);

  return (
    <div className="flex flex-1 flex-col px-5 pt-8">
      <p className={EYEBROW_CLASSNAME}>Plan</p>
      {items.length === 0 ? (
        <EmptyPlanState />
      ) : (
        <PlanRotationView
          planName={plan.name}
          items={items}
          lastCompletedOrder={lastCompletedOrder}
          nextOrder={next?.order ?? null}
        />
      )}
    </div>
  );
}
