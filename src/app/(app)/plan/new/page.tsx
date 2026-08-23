import Link from "next/link";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { getActivePlan, getUserRoutines } from "@/lib/domain";

import { CreatePlanWizard } from "./create-plan-wizard";

/**
 * Fetches both the routine picker's source list and the current active
 * plan's name (if any) up front -- the wizard needs the latter to show
 * accurate "you already have a plan" copy from the start, not only after
 * a submit attempt discovers the conflict.
 */
export default async function CreatePlanPage() {
  const user = await requireUser();
  const [routines, activePlan] = await Promise.all([getUserRoutines(user.id), getActivePlan(user.id)]);

  return (
    <div className="flex flex-1 flex-col gap-8 pt-6 pb-10">
      <Link
        href="/plan"
        className={`inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        ← Volver
      </Link>

      {routines.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className={EYEBROW_CLASSNAME}>Crear plan</p>
          <p className="text-sm text-muted-foreground">No tienes rutinas disponibles todavía.</p>
        </div>
      ) : (
        <CreatePlanWizard routines={routines} existingActivePlanName={activePlan?.name ?? null} />
      )}
    </div>
  );
}
