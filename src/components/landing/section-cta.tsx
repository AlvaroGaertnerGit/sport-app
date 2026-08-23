import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";
import { Reveal } from "./motion/reveal";

/** Final push before the footer — brief §14's two CTAs, nothing else. */
export function SectionCta() {
  return (
    <section className={`${LANDING_SECTION_CLASSNAME} border-t border-border/60`}>
      <Reveal className={`flex flex-col items-center gap-6 text-center ${LANDING_CONTAINER_CLASSNAME}`}>
        <h2 className={`${DISPLAY_HEADING_CLASSNAME} text-3xl sm:text-4xl`}>Empieza a entrenar con intención.</h2>
        <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href="/register" className="sm:w-auto sm:px-8">
            Empezar a entrenar <ButtonArrow />
          </ButtonLink>
          <ButtonLink href="/login" variant="ghost" className="sm:w-auto">
            Ya tengo cuenta
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
