import { cardClassName } from "@/components/ui/card";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";

/**
 * Brief §13: this project never made a real pricing decision (checked —
 * nothing in docs/ or the codebase), and no billing integration exists
 * (no Stripe, no checkout, no subscriptions). Both tiers are therefore
 * presented as "Próximamente" placeholders, not real prices — inventing a
 * number here would be exactly the "no crear lógica falsa" the brief
 * explicitly forbids. Neither card is a link/button to anywhere; the only
 * real CTA on this page stays the register button.
 */
const TIERS = [
  {
    name: "Free",
    blurb: "Lo esencial para planificar y entrenar.",
  },
  {
    name: "Pro",
    blurb: "Coach IA sin límites y funciones avanzadas.",
  },
] as const;

export function SectionPricing() {
  return (
    <section id="precio" className={`${LANDING_SECTION_CLASSNAME} border-t border-border/60`}>
      <div className={LANDING_CONTAINER_CLASSNAME}>
        <div className="flex flex-col items-start gap-3">
          <p className={EYEBROW_CLASSNAME}>Precio</p>
          <h2 className={`${DISPLAY_HEADING_CLASSNAME} text-3xl sm:text-4xl`}>Planes próximamente.</h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Sport Coach todavía no tiene planes de pago activos. Puedes registrarte y empezar a
            entrenar gratis mientras tanto.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TIERS.map((tier) => (
            <div key={tier.name} className={cardClassName("flex flex-col gap-3")}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground uppercase">{tier.name}</h3>
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Próximamente
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{tier.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
