import { Button } from "@/components/ui/button";

/**
 * "You don't have an active plan yet" — shared by Today (`no_plan` case of
 * `getTodayRecommendation()`) and Plan (`getActivePlan()` returning null).
 * No plan-creation flow exists yet, so the CTA stays honestly disabled
 * rather than faking one — see the brief's own rule against inventing a
 * fake flow.
 */
export function NoActivePlanState() {
  return (
    <section className="mt-10 flex animate-fade-in flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-foreground">Todavía no tienes un plan</h2>
        <p className="text-sm text-muted-foreground">Crea un plan de entrenamiento para empezar.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button disabled>Crear plan</Button>
        <p className="text-center text-xs text-muted-foreground">Disponible próximamente</p>
      </div>
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
