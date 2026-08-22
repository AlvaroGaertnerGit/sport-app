import { ButtonArrow, ButtonLink } from "@/components/ui/button";

/**
 * "You don't have an active plan yet" — shared by Today (`no_plan` case of
 * `getTodayRecommendation()`) and Plan (`getActivePlan()` returning null).
 * The CTA is a real entry point into `/plan/new` now that plan creation
 * exists.
 */
export function NoActivePlanState() {
  return (
    <section className="mt-10 flex animate-fade-in flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-foreground">Todavía no tienes un plan</h2>
        <p className="text-sm text-muted-foreground">Crea un plan de entrenamiento para empezar.</p>
      </div>
      <ButtonLink href="/plan/new">
        Crear plan <ButtonArrow />
      </ButtonLink>
    </section>
  );
}

/**
 * "Your plan has no routines yet" — the plan exists (`getActivePlan()`
 * returned one) but `getPlanItems()` is empty. Distinct from
 * `NoActivePlanState` (no plan at all) — same domain-level distinction
 * `TodayRecommendation`'s `no_plan`/`empty_plan` states already make,
 * shared by Today and Plan.
 */
export function EmptyPlanState() {
  return (
    <section className="mt-10 flex animate-fade-in flex-col gap-3">
      <h2 className="text-2xl font-bold text-foreground">Tu plan está vacío</h2>
      <p className="text-sm text-muted-foreground">Añade una rutina para empezar a entrenar.</p>
    </section>
  );
}
