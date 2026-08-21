import { Button, ButtonLink } from "@/components/ui/button";
import type { TodayRecommendation } from "@/lib/domain";

import { StartWorkoutButton } from "./start-workout-button";

const CARD_CLASSNAME =
  "flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm";

type TodayRecommendationCardProps = {
  recommendation: TodayRecommendation;
  /** Only meaningful for the "ready" state; null otherwise. */
  exerciseCount: number | null;
};

/**
 * Renders exactly the state the domain gave us — no business logic here.
 * `getTodayRecommendation()` already decided which of these five states
 * applies; this component only knows how to draw each one.
 */
export function TodayRecommendationCard({
  recommendation,
  exerciseCount,
}: TodayRecommendationCardProps) {
  switch (recommendation.type) {
    case "in_progress":
      return (
        <section aria-labelledby="today-state-heading" className={CARD_CLASSNAME}>
          <p className="text-sm font-medium text-muted-foreground">
            Tienes un entrenamiento en curso
          </p>
          <h2
            id="today-state-heading"
            className="text-2xl font-semibold uppercase tracking-wide text-foreground"
          >
            {recommendation.routineName ?? "Entrenamiento libre"}
          </h2>
          <ButtonLink href={`/workout/${recommendation.sessionId}`}>
            Reanudar entrenamiento
          </ButtonLink>
        </section>
      );

    case "ready":
      return (
        <section aria-labelledby="today-state-heading" className={CARD_CLASSNAME}>
          <h2
            id="today-state-heading"
            className="text-2xl font-semibold uppercase tracking-wide text-foreground"
          >
            {recommendation.routineName}
          </h2>
          {exerciseCount !== null && (
            <p className="text-sm text-muted-foreground">
              {exerciseCount === 1 ? "1 ejercicio" : `${exerciseCount} ejercicios`}
            </p>
          )}
          <StartWorkoutButton planItemId={recommendation.planItemId} />
        </section>
      );

    case "empty_plan":
      return (
        <section className={CARD_CLASSNAME}>
          <h2 className="text-xl font-semibold text-foreground">Tu plan está vacío</h2>
          <p className="text-sm text-muted-foreground">
            Añade una rutina para empezar a entrenar.
          </p>
        </section>
      );

    case "no_plan":
      return (
        <section className={CARD_CLASSNAME}>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-foreground">Todavía no tienes un plan</h2>
            <p className="text-sm text-muted-foreground">
              Crea un plan de entrenamiento para empezar.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button disabled>Crear plan</Button>
            <p className="text-center text-xs text-muted-foreground">Disponible próximamente</p>
          </div>
        </section>
      );

    case "error":
      return (
        <section
          role="alert"
          className={`${CARD_CLASSNAME} border-destructive/30`}
        >
          <h2 className="text-xl font-semibold text-foreground">
            No hemos podido cargar tu entrenamiento
          </h2>
          <p className="text-sm text-muted-foreground">Inténtalo de nuevo en unos minutos.</p>
        </section>
      );

    default: {
      const exhaustiveCheck: never = recommendation;
      return exhaustiveCheck;
    }
  }
}
