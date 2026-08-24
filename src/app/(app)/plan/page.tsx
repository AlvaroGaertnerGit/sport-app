import { ProfileLink } from "@/components/app-shell/profile-link";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { getUserPlans } from "@/lib/domain";

import { NoActivePlanState } from "../plan-empty-states";
import { PlanCard } from "./plan-card";

/**
 * "Mis Planes" -- the user's whole library (active + paused; archived
 * plans never show here, see `getUserPlans`), not just "my current plan"
 * anymore. Each card links to `/plan/[planId]` for the full rotation
 * view; `/plan/new` stays the one entry point for creating another.
 */
export default async function PlanPage() {
  const user = await requireUser();
  const plans = await getUserPlans(user.id);
  const activePlanName = plans.find((plan) => plan.status === "active")?.name ?? null;

  return (
    <div className="flex flex-1 flex-col pt-8 pb-10">
      <div className="flex items-center justify-between">
        <p className={EYEBROW_CLASSNAME}>Mis planes</p>
        <ProfileLink />
      </div>

      {plans.length === 0 ? (
        <NoActivePlanState />
      ) : (
        <>
          <div className="mt-8 flex flex-col">
            {plans.map((plan) => (
              <PlanCard key={plan.planId} plan={plan} currentActivePlanName={activePlanName} />
            ))}
          </div>
          <div className="mt-6 border-t border-border pt-6">
            <ButtonLink href="/plan/new" variant="ghost" className="w-auto px-2">
              Crear plan <ButtonArrow />
            </ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}
