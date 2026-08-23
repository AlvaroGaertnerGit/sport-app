import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";
import { Reveal } from "./motion/reveal";

/**
 * Pricing v3 (this replaces v2's 8,99€/69,99€ entirely, not an addition to
 * it): FREE 0€/mes, PRO 2,99€/mes, PRO ANUAL 24,99€/año -- exact figures
 * given, not derived here. Savings check (so "Ahorra 30%" stays a real
 * number, not marketing rounding): 2.99 × 12 = 35.88; (35.88 − 24.99) /
 * 35.88 ≈ 30.35% → "Ahorra 30%" is accurate, not rounded up from a lower
 * true value. 24.99 / 12 ≈ 2.0825 → "≈ 2,08 €/mes" likewise exact.
 *
 * The real per-request OpenAI cost that justified going this low is an
 * internal pricing input, not landing copy -- it never appears here or
 * anywhere user-facing, and no cost/token/margin figure is hardcoded
 * anywhere in the app.
 *
 * No billing exists (no Stripe/checkout/subscriptions this phase). Pro's
 * CTA is therefore inert by construction -- `<span>`, not a link or button
 * with an onClick -- rather than a real control that goes nowhere; that's
 * the difference between "not implemented yet" and "looks broken."
 */
const FREE_FEATURES = [
  "Crear y editar planes y rutinas.",
  "Catálogo y búsqueda de ejercicios.",
  "Añadir, quitar y reordenar ejercicios.",
  "Editar series, reps, peso y duración.",
  "Workout completo con Smart Targets.",
  "Timers de ejercicio y descanso.",
  "Historial, calendario y progreso.",
  "Sin tarjeta.",
] as const;

const PRO_FEATURES = [
  "Todo lo de Free.",
  "SCOPE incluido — Coach IA completo.",
  "Análisis inteligente de tu entrenamiento.",
  "Crear y modificar rutinas con SCOPE.",
  "Añadir, sustituir y reordenar ejercicios con SCOPE.",
  "Modificar series y objetivos con SCOPE.",
  "Recomendaciones personalizadas.",
] as const;

const COMPARISON_ROWS = [
  { label: "Planes", free: true, pro: true },
  { label: "Rutinas", free: true, pro: true },
  { label: "Catálogo de ejercicios", free: true, pro: true },
  { label: "Workout", free: true, pro: true },
  { label: "Smart Targets", free: true, pro: true },
  { label: "Timers", free: true, pro: true },
  { label: "Historial", free: true, pro: true },
  { label: "Calendario", free: true, pro: true },
  { label: "Progress", free: true, pro: true },
  { label: "Coach IA SCOPE", free: false, pro: true },
  { label: "Crear rutinas con SCOPE", free: false, pro: true },
  { label: "Modificar rutinas con SCOPE", free: false, pro: true },
  { label: "Análisis inteligente", free: false, pro: true },
  { label: "Recomendaciones personalizadas", free: false, pro: true },
] as const;

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={on ? "font-bold text-primary" : "text-muted-foreground/40"}
    >
      {on ? "✓" : "—"}
    </span>
  );
}

export function SectionPricing() {
  return (
    <section id="precio" className={`${LANDING_SECTION_CLASSNAME} border-t border-border/60`}>
      <div className={LANDING_CONTAINER_CLASSNAME}>
        <Reveal className="flex flex-col items-start gap-3">
          <p className={EYEBROW_CLASSNAME}>Precio</p>
          <h2 className={`${DISPLAY_HEADING_CLASSNAME} text-3xl sm:text-4xl`}>
            Entrena gratis. Piensa con SCOPE cuando quieras.
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Sport Coach es una aplicación de entrenamiento completa sin pagar nada. Pro añade a
            SCOPE como coach real dentro de la app, por menos de 3 €.
          </p>
        </Reveal>

        {/* Pricing cards */}
        <Reveal delayMs={100} className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* FREE */}
          <div className={cardClassName("flex flex-col gap-5 transition-transform duration-300 ease-out hover:-translate-y-1")}>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-foreground uppercase">Free</h3>
              <p className="text-sm text-muted-foreground">Todo lo necesario para entrenar.</p>
              <p className="text-sm text-muted-foreground">
                Construye tu plan, entrena, registra tus series y entiende tu progreso.
              </p>
            </div>
            <div>
              <span className={`${DISPLAY_HEADING_CLASSNAME} text-4xl`}>0 €</span>
              <span className="ml-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                /mes
              </span>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {FREE_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check on />
                  {item}
                </li>
              ))}
            </ul>
            <ButtonLink href="/register" variant="ghost" className="border border-border">
              Empezar gratis <ButtonArrow />
            </ButtonLink>
          </div>

          {/* PRO monthly */}
          <div className={cardClassName("flex flex-col gap-5 transition-transform duration-300 ease-out hover:-translate-y-1")}>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-foreground uppercase">Pro</h3>
              <p className="text-sm text-muted-foreground">Entrena con SCOPE a tu lado.</p>
              <p className="text-sm text-muted-foreground">
                Convierte tus datos de entrenamiento en decisiones más inteligentes.
              </p>
            </div>
            <div>
              <span className={`${DISPLAY_HEADING_CLASSNAME} text-4xl`}>2,99 €</span>
              <span className="ml-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                /mes
              </span>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check on />
                  {item}
                </li>
              ))}
            </ul>
            <span className="inline-flex min-h-12 w-full cursor-default items-center justify-center rounded-md border border-border font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Próximamente
            </span>
          </div>

          {/* PRO ANUAL — highlighted */}
          <div
            className={cardClassName(
              "relative flex flex-col gap-5 border-primary bg-elevated transition-transform duration-300 ease-out hover:-translate-y-1",
            )}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-primary-foreground uppercase">
              Mejor valor
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-foreground uppercase">Pro anual</h3>
              <p className="text-sm text-muted-foreground">El mejor valor.</p>
              <p className="text-sm text-muted-foreground">Todo Pro por 24,99 € al año.</p>
            </div>
            <div className="flex flex-col gap-1">
              <div>
                <span className={`${DISPLAY_HEADING_CLASSNAME} text-4xl`}>24,99 €</span>
                <span className="ml-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  /año
                </span>
              </div>
              <p className="font-mono text-xs tracking-wide text-muted-foreground">
                ≈ 2,08 €/mes ·{" "}
                <span className="font-bold text-primary">Ahorra 30%</span>
              </p>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check on />
                  {item}
                </li>
              ))}
            </ul>
            <span className="inline-flex min-h-12 w-full cursor-default items-center justify-center rounded-md bg-primary font-bold text-primary-foreground uppercase">
              Próximamente
            </span>
          </div>
        </Reveal>

        {/* Comparison — table at md:+, stacked cards below to avoid any risk of table overflow on mobile */}
        <Reveal delayMs={100} className="mt-14">
          <p className={`${EYEBROW_CLASSNAME} mb-4`}>Free frente a Pro</p>

          <div className="hidden overflow-hidden rounded-md border border-border md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-elevated">
                  <th className="px-4 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    Función
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    Free
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{row.label}</td>
                    <td className="px-4 py-3 text-center">
                      <Check on={row.free} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Check on={row.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {COMPARISON_ROWS.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
              >
                <span className="text-foreground">{row.label}</span>
                <span className="flex items-center gap-3 font-mono text-xs tracking-widest uppercase">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    Free <Check on={row.free} />
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    Pro <Check on={row.pro} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <p className="mt-8 max-w-lg text-xs text-muted-foreground">
          El uso de SCOPE está sujeto a un uso razonable.
        </p>
      </div>
    </section>
  );
}
