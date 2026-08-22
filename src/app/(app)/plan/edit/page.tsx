import Link from "next/link";
import { notFound } from "next/navigation";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { getActivePlan, getPlanItems, getUserRoutines } from "@/lib/domain";

import { addRoutineToPlanAction, movePlanItemAction } from "../actions";
import { ArchivePlanButton } from "./archive-plan-button";
import { RemoveItemButton } from "./remove-item-button";
import { RenamePlanForm } from "./rename-plan-form";

/**
 * Reading + navigation this whole editor is not: rename, reorder (move
 * up/down -- no drag-and-drop, no new dependency), add an existing
 * routine, remove one, archive the plan. Nothing here is a routine editor
 * -- routines/exercises themselves stay read-only, exactly as `/plan`
 * already treats them.
 */
export default async function PlanEditPage() {
  const user = await requireUser();
  const plan = await getActivePlan(user.id);

  if (!plan) {
    notFound();
  }

  const [items, routines] = await Promise.all([
    getPlanItems(user.id, plan.id),
    getUserRoutines(user.id),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8 px-5 pt-6 pb-10">
      <Link
        href="/plan"
        className={`inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
      >
        ← Volver
      </Link>

      <RenamePlanForm planId={plan.id} currentName={plan.name} />

      <div className="flex flex-col border-t border-border pt-6">
        <p className={`mb-3 ${EYEBROW_CLASSNAME}`}>Rotación</p>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Añade una rutina para empezar.</p>
        ) : (
          <div className="flex flex-col">
            {items.map((item, index) => (
              <div key={item.planItemId} className="flex flex-col gap-2 border-b border-border py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                    {String(item.order).padStart(2, "0")}
                  </span>
                  <span className="flex-1 truncate font-sans font-bold text-foreground uppercase">
                    {item.routineName}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <form action={movePlanItemAction}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="planItemId" value={item.planItemId} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={index === 0}
                        aria-label={`Subir ${item.routineName}`}
                        className={`flex size-11 items-center justify-center rounded-md border border-border font-mono text-foreground transition duration-150 hover:border-primary hover:text-primary active:scale-90 disabled:opacity-30 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
                      >
                        ↑
                      </button>
                    </form>
                    <form action={movePlanItemAction}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="planItemId" value={item.planItemId} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={index === items.length - 1}
                        aria-label={`Bajar ${item.routineName}`}
                        className={`flex size-11 items-center justify-center rounded-md border border-border font-mono text-foreground transition duration-150 hover:border-primary hover:text-primary active:scale-90 disabled:opacity-30 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
                      >
                        ↓
                      </button>
                    </form>
                  </div>
                  <RemoveItemButton planId={plan.id} planItemId={item.planItemId} />
                </div>
                <Link
                  href={`/plan/edit/routines/${item.routineId}`}
                  className={`inline-flex min-h-11 w-fit items-center pl-9 font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
                >
                  Configurar →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col border-t border-border pt-6">
        <p className={`mb-3 ${EYEBROW_CLASSNAME}`}>Añadir rutina</p>
        {routines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes rutinas todavía.</p>
        ) : (
          <div className="flex flex-col">
            {routines.map((routine) => (
              <form
                key={routine.routineId}
                action={addRoutineToPlanAction}
                className="flex items-center gap-3 border-b border-border py-3"
              >
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="routineId" value={routine.routineId} />
                <span className="flex-1 truncate font-sans font-bold text-foreground uppercase">
                  {routine.name}
                </span>
                {routine.sportName && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground uppercase">
                    {routine.sportName}
                  </span>
                )}
                <button
                  type="submit"
                  className={`inline-flex min-h-11 items-center px-2 font-mono text-xs tracking-wide text-primary uppercase transition duration-150 hover:text-primary/80 active:scale-95 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
                >
                  Añadir
                </button>
              </form>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <Link
          href="/plan/new"
          className={`inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          Crear plan nuevo →
        </Link>
        <ArchivePlanButton planId={plan.id} />
      </div>
    </div>
  );
}
