import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";
import { PhoneShot } from "./phone-shot";
import { ScopeMark } from "./scope-mark";

const CAPABILITIES = [
  "Entender tu progreso real, no una sensación.",
  "Analizar cómo va un ejercicio concreto.",
  "Crear una rutina nueva contigo.",
  "Proponer cambios sobre una rutina existente.",
  "Buscar el ejercicio adecuado en el catálogo.",
] as const;

/**
 * Brief §10: one of the most important sections, and the one place the
 * "propone / tú decides / confirmación" architecture has to be stated
 * plainly -- not as an implementation detail, as the actual pitch. SCOPE
 * appears here as the companion doing the proposing, not as decoration.
 */
export function SectionCoach() {
  return (
    <section className={`${LANDING_SECTION_CLASSNAME} border-t border-border/60`}>
      <div className={LANDING_CONTAINER_CLASSNAME}>
        <div className="flex flex-col items-center gap-10 sm:flex-row sm:gap-16">
          <div className="flex flex-1 flex-col items-start gap-5">
            <p className={EYEBROW_CLASSNAME}>Coach IA</p>
            <h2 className={`${DISPLAY_HEADING_CLASSNAME} text-3xl sm:text-4xl`}>
              Tu coach.
              <br />
              Tus decisiones.
            </h2>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              SCOPE es tu coach dentro de la app: entiende tu plan, tu historial y tu progreso
              real, y te ayuda a decidir qué hacer después.
            </p>
            <ul className="flex flex-col gap-2">
              {CAPABILITIES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-2 max-w-md rounded-md border border-border bg-elevated p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">El Coach propone. Tú decides.</span>{" "}
              Cualquier cambio real sobre tu plan o tus rutinas se te muestra antes de aplicarse —
              nada se guarda sin que lo confirmes tú.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-6">
            <ScopeMark size={96} className="size-20 sm:size-24" />
            <PhoneShot src="/marketing/coach.jpg" alt="Resumen de progreso y sugerencias del Coach IA en Sport Coach" />
          </div>
        </div>
      </div>
    </section>
  );
}
