import { ScopeDock } from "@/components/scope/companion";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";
import { Reveal } from "./motion/reveal";

/**
 * Final push before the footer — brief §14's two CTAs, nothing else. Scope
 * rests here too, calm ("idle"), as the closing bookend to the walk that
 * started at Hero -- a plain sibling ahead of the section's own `Reveal`
 * (see ScopeDock's own header comment for why it can't sit inside one).
 */
export function SectionCta() {
  return (
    <section className={`${LANDING_SECTION_CLASSNAME} border-t border-border/60`}>
      <div className="flex justify-center pb-4">
        {/* size-40 sm:size-48, matching CompanionScope's own hardcoded
            render size -- see StorySection's own dock comment for why a
            smaller placeholder here would under-reserve space and let the
            real companion overlap the heading below it. */}
        <ScopeDock id="cta" config={{ mood: "idle", scale: 0.85 }} className="size-40 sm:size-48" />
      </div>
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
