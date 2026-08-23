import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME } from "@/components/ui/typography";
import type { TodayRecommendation } from "@/lib/domain";

import { EmptyPlanState, NoActivePlanState } from "../plan-empty-states";
import { StartWorkoutButton } from "./start-workout-button";

/** The routine name is the whole point of this screen -- it must dominate, so it's the one place in the app scaling with clamp() rather than a fixed step. */
const ROUTINE_NAME_STYLE = { fontSize: "clamp(2.75rem, 13vw, 5.5rem)" };

type TodayRecommendationCardProps = {
  recommendation: TodayRecommendation;
  /** Only meaningful for the "ready" state; null otherwise. */
  exerciseCount: number | null;
};

/**
 * Renders exactly the state the domain gave us — no business logic here.
 * `getTodayRecommendation()` already decided which of these five states
 * applies; this component only knows how to draw each one. No card
 * surface anywhere here on purpose — the routine name itself is the
 * dominant element on the page (see docs/style-reference).
 */
export function TodayRecommendationCard({
  recommendation,
  exerciseCount,
}: TodayRecommendationCardProps) {
  switch (recommendation.type) {
    case "in_progress":
      return (
        <section
          aria-labelledby="today-state-heading"
          className="mt-10 flex animate-fade-in flex-col items-start gap-8"
        >
          {/* Not EYEBROW_CLASSNAME -- this needs text-primary instead of
              its baked-in text-muted-foreground, and Tailwind utility
              order in the generated stylesheet isn't guaranteed to let a
              later class in the string win over an earlier one. */}
          <p className="font-mono text-xs tracking-widest text-primary uppercase">Entrenamiento en curso</p>
          <h1
            id="today-state-heading"
            className={DISPLAY_HEADING_CLASSNAME}
            style={ROUTINE_NAME_STYLE}
          >
            {recommendation.routineName ?? "Entrenamiento libre"}
          </h1>
          <ButtonLink href={`/workout/${recommendation.sessionId}`} className="mt-2">
            Reanudar entrenamiento <ButtonArrow />
          </ButtonLink>
        </section>
      );

    case "ready":
      return (
        <section
          aria-labelledby="today-state-heading"
          className="mt-10 flex animate-fade-in flex-col items-start gap-8"
        >
          <h1
            id="today-state-heading"
            className={DISPLAY_HEADING_CLASSNAME}
            style={ROUTINE_NAME_STYLE}
          >
            {recommendation.routineName}
          </h1>
          {exerciseCount !== null && (
            <p className="font-mono text-sm tracking-wide text-muted-foreground tabular-nums uppercase">
              {String(exerciseCount).padStart(2, "0")} {exerciseCount === 1 ? "ejercicio" : "ejercicios"}
            </p>
          )}
          <StartWorkoutButton planItemId={recommendation.planItemId} />
        </section>
      );

    case "empty_plan":
      return <EmptyPlanState />;

    case "no_plan":
      return <NoActivePlanState />;

    case "error":
      return (
        <section role="alert" className="mt-10 flex animate-fade-in flex-col gap-3 border-l-2 border-destructive pl-4">
          <h2 className="text-2xl font-bold text-foreground">No hemos podido cargar tu entrenamiento</h2>
          <p className="text-sm text-muted-foreground">Inténtalo de nuevo en unos minutos.</p>
          <ButtonLink href="/today" variant="ghost" className="mt-2 w-fit px-0">
            Reintentar <ButtonArrow />
          </ButtonLink>
        </section>
      );

    default: {
      const exhaustiveCheck: never = recommendation;
      return exhaustiveCheck;
    }
  }
}
