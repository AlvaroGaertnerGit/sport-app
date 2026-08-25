import Link from "next/link";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import type { PlanSummary } from "@/lib/domain";

import { ActivatePlanButton } from "./activate-plan-button";

/**
 * One row in "Mis Planes" -- a `border-b` line row, not a bounded card
 * (this app avoids "card-thinking" outside `ConfirmPanel`'s own legitimate
 * use of it, see `PlanRotationView`/`PlanEditScreen`'s own rotation lists
 * for the same idiom). Name, ● ACTIVO / ○ INACTIVO, the ordered routine
 * names so a visitor can tell plans apart without opening each one, the
 * derived sport badge if uniform, and the primary actions.
 */
export function PlanCard({ plan, currentActivePlanName }: { plan: PlanSummary; currentActivePlanName: string | null }) {
  const isActive = plan.status === "active";

  return (
    <div className="flex flex-col gap-3 border-b border-border py-5">
      <Link
        href={`/plan/${plan.planId}`}
        className={`flex items-center justify-between gap-3 transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        <span className="min-w-0 flex-1 truncate font-sans text-lg font-black text-foreground uppercase">
          {plan.name || "Sin nombre"}
        </span>
        <span
          className={`flex shrink-0 items-center gap-1.5 font-mono text-xs tracking-widest uppercase ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span aria-hidden="true">{isActive ? "●" : "○"}</span>
          {isActive ? "Activo" : "Inactivo"}
        </span>
      </Link>

      {plan.sportName && (
        <p className="font-mono text-xs text-muted-foreground uppercase">{plan.sportName}</p>
      )}

      {plan.routineNames.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {plan.routineCount} {plan.routineCount === 1 ? "rutina" : "rutinas"} · {plan.routineNames.join(" · ")}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Sin rutinas todavía.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/plan/${plan.planId}/edit`}
          className={`inline-flex min-h-11 items-center px-2 font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          Editar
        </Link>
        {!isActive && (
          <ActivatePlanButton
            planId={plan.planId}
            planName={plan.name}
            currentActivePlanName={currentActivePlanName}
          />
        )}
      </div>
    </div>
  );
}
