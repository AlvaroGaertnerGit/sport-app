import Link from "next/link";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import type { PlanItemSummary } from "@/lib/domain";

const ROUTINE_NAME_STYLE = { fontSize: "clamp(2.75rem, 13vw, 5.5rem)" };

type PlanRotationViewProps = {
  planName: string | null;
  items: PlanItemSummary[];
  /** The `order` behind the most recently completed session in this plan, or null if none yet. */
  lastCompletedOrder: number | null;
  /** The `order` `pickNextPlanItem` picked -- same rotation math Today uses, never recomputed differently here. */
  nextOrder: number | null;
};

/**
 * One dominant thing (the next routine, same display-heading treatment as
 * Today's hero) then the full ordered structure below it as lines, not
 * cards. `isCompleted`/`isNext` are independent booleans, not a mutually
 * exclusive switch: with a single-routine plan they're the same item
 * (just completed, and immediately next again in the rotation) -- both
 * badges are meant to show together in that case, not hide one another.
 */
export function PlanRotationView({ planName, items, lastCompletedOrder, nextOrder }: PlanRotationViewProps) {
  const nextItem = items.find((item) => item.order === nextOrder) ?? null;

  return (
    <div className="mt-10 flex flex-col gap-8">
      {planName && <p className={EYEBROW_CLASSNAME}>{planName}</p>}

      {nextItem && (
        <Link
          href={`/plan/routines/${nextItem.routineId}`}
          className={`flex flex-col gap-2 transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          <h1 className={DISPLAY_HEADING_CLASSNAME} style={ROUTINE_NAME_STYLE}>
            {nextItem.routineName}
          </h1>
          <p className="font-mono text-xs tracking-widest text-primary uppercase">Siguiente →</p>
        </Link>
      )}

      <div className="flex flex-col border-t border-border">
        {items.map((item) => {
          const isCompleted = item.order === lastCompletedOrder;
          const isNext = item.order === nextOrder;
          return (
            <Link
              key={item.planItemId}
              href={`/plan/routines/${item.routineId}`}
              className={`flex min-h-14 items-center gap-4 border-b border-border py-3 transition duration-150 active:scale-[0.98] ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
            >
              <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                {String(item.order).padStart(2, "0")}
              </span>
              <span
                className={`flex-1 truncate font-sans font-bold uppercase ${
                  isCompleted ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {item.routineName}
              </span>
              {isCompleted && (
                <span aria-hidden="true" className="text-lg text-success">
                  ✓
                </span>
              )}
              {isNext && (
                <span className="font-mono text-xs tracking-widest text-primary uppercase">
                  Siguiente →
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
