import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import type { CoachSummary } from "@/lib/domain";

/**
 * The first deterministic Coach: a structured screen, not a chatbot --
 * every line traces to a real domain read (`getCoachSummary`), nothing
 * generated. Same row idiom Progress already uses (name left, mono value
 * right, thin top border between sections) so this reads as a natural
 * extension of Sport Coach, not a new surface with its own language.
 */
export function CoachView({ summary }: { summary: CoachSummary }) {
  if (!summary.hasData) {
    return (
      <section className="mt-10 flex animate-fade-in flex-col gap-3">
        <h2 className="text-2xl font-bold text-foreground">Aún no hay datos</h2>
        <p className="text-sm text-muted-foreground">
          Completa tu primer entrenamiento para que SCOPE pueda decir algo útil.
        </p>
      </section>
    );
  }

  const frequencyParts = [`${summary.workoutsCompleted} en 30 días`];
  if (summary.sessionsPerWeek != null) {
    frequencyParts.push(`${summary.sessionsPerWeek}/semana`);
  }
  frequencyParts.push(`racha ${summary.currentStreakDays}`);

  return (
    <div className="flex flex-col gap-8 pb-4">
      <div className="flex flex-col gap-1">
        <p className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(2.75rem, 13vw, 4.75rem)" }}>
          {summary.workoutsCompleted}
        </p>
        <p className={EYEBROW_CLASSNAME}>Tu entrenamiento</p>
        <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {frequencyParts.join(" · ")}
        </p>
      </div>

      {summary.improving.length > 0 && (
        <div className="flex flex-col border-t border-border pt-6">
          <p className={`mb-1 ${EYEBROW_CLASSNAME}`}>Mejorando</p>
          <div className="flex flex-col">
            {summary.improving.map((exercise) => (
              <div
                key={exercise.exerciseId}
                className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
              >
                <span className="flex-1 truncate font-sans font-bold text-foreground uppercase">
                  {exercise.exerciseName}
                </span>
                <span className="font-mono text-lg font-semibold text-success tabular-nums">{exercise.delta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.maintaining.length > 0 && (
        <div className="flex flex-col border-t border-border pt-6">
          <p className={`mb-1 ${EYEBROW_CLASSNAME}`}>A tener en cuenta</p>
          <div className="flex flex-col">
            {summary.maintaining.map((exercise) => (
              <div key={exercise.exerciseId} className="border-b border-border py-3 last:border-b-0">
                <span className="block truncate font-sans font-bold text-foreground uppercase">
                  {exercise.exerciseName}
                </span>
                <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  Próximo objetivo: {exercise.nextTarget}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.insufficientData.length > 0 && (
        <div className="flex flex-col border-t border-border pt-6">
          <p className={`mb-1 ${EYEBROW_CLASSNAME}`}>Sin datos suficientes</p>
          <p className="mb-2 text-sm text-muted-foreground">Necesitas más sesiones para ver una tendencia.</p>
          <div className="flex flex-col">
            {summary.insufficientData.map((exercise) => (
              <span
                key={exercise.exerciseId}
                className="border-b border-border py-3 font-sans font-bold text-foreground uppercase last:border-b-0"
              >
                {exercise.exerciseName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
