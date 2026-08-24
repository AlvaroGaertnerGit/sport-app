import Link from "next/link";
import { notFound } from "next/navigation";

import { ProfileLink } from "@/components/app-shell/profile-link";
import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import {
  getActivePlan,
  getLastCompletedPlanItemOrder,
  getPlan,
  getPlanItems,
  pickNextPlanItem,
} from "@/lib/domain";

import { ActivatePlanButton } from "../activate-plan-button";
import { EmptyPlanState } from "../../plan-empty-states";
import { PlanRotationView } from "../plan-rotation-view";

/**
 * The rotation/detail view `/plan` itself used to render (back when it
 * only ever showed the one implicit active plan) -- generalized to any
 * plan by id, active or not. `getLastCompletedPlanItemOrder` is meaningful
 * for any plan regardless of current active status (it reads real session
 * history, never "is this plan active right now"), so `PlanRotationView`
 * needed zero changes to work here unmodified.
 */
export default async function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await requireUser();
  const plan = await getPlan(user.id, planId);

  if (!plan || plan.status === "archived") {
    notFound();
  }

  const isActive = plan.status === "active";
  const [items, activePlan] = await Promise.all([
    getPlanItems(user.id, planId),
    isActive ? Promise.resolve(null) : getActivePlan(user.id),
  ]);
  const lastCompletedOrder = items.length > 0 ? await getLastCompletedPlanItemOrder(user.id, planId) : null;
  const next = pickNextPlanItem(items, lastCompletedOrder);

  return (
    <div className="flex flex-1 flex-col pt-8">
      <div className="flex items-center justify-between">
        <Link
          href="/plan"
          className={`inline-flex min-h-11 items-center font-mono text-xs tracking-widest text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          ← Mis planes
        </Link>
        <ProfileLink />
      </div>

      <div className="mt-4 flex items-center gap-4">
        {isActive ? (
          <span className="flex items-center gap-1.5 font-mono text-xs tracking-widest text-primary uppercase">
            <span aria-hidden="true">●</span> Activo
          </span>
        ) : (
          <ActivatePlanButton planId={plan.planId} planName={plan.name} currentActivePlanName={activePlan?.name ?? null} />
        )}
        <Link
          href={`/plan/${plan.planId}/edit`}
          className={`inline-flex min-h-11 items-center font-mono text-xs tracking-widest text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          Editar
        </Link>
      </div>

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
