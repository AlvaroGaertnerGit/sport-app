import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";
import { Reveal } from "./motion/reveal";

// Brief §11 — the five steps verbatim, kept as plain commercial language.
// Deliberately does NOT say the app "learns" via machine learning: nothing
// here is ML, it's a deterministic rotation engine + a real history read —
// see the domain's own progression-engine, not a model.
const STEPS = [
  { n: "01", label: "Crea tu plan." },
  { n: "02", label: "Entrena." },
  { n: "03", label: "Registra tus series." },
  { n: "04", label: "Sport Coach construye tu historial real." },
  { n: "05", label: "SCOPE te ayuda a decidir qué hacer después." },
] as const;

export function SectionHow() {
  return (
    <section id="como-funciona" className={`${LANDING_SECTION_CLASSNAME} border-t border-border/60`}>
      <div className={LANDING_CONTAINER_CLASSNAME}>
        <div className="flex flex-col gap-10 sm:gap-12">
          <Reveal className="flex flex-col items-start gap-3">
            <p className={EYEBROW_CLASSNAME}>Cómo funciona</p>
            <h2 className={`${DISPLAY_HEADING_CLASSNAME} text-3xl sm:text-4xl`}>Sin fricción.</h2>
          </Reveal>

          <Reveal delayMs={100}>
            <ol className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((step) => (
                <li key={step.n} className="flex flex-col gap-2 border-l-2 border-primary pl-4">
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">{step.n}</span>
                  <p className="text-base font-semibold text-foreground">{step.label}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
