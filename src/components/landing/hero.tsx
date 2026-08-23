import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME } from "./layout";
import { ScopeMark } from "./scope-mark";

/**
 * The most important section on the page (brief §4). SCOPE appears here,
 * large -- but the headline is about Sport Coach, not about the character,
 * per the brief's explicit "SCOPE es la mascota, Sport Coach es el
 * producto." Server Component: no interactivity here at all.
 */
export function Hero() {
  return (
    <section className={`pt-14 pb-16 sm:pt-20 sm:pb-24 ${LANDING_CONTAINER_CLASSNAME}`}>
      <div className="flex flex-col items-start gap-10 md:flex-row md:items-center md:justify-between md:gap-16">
        <div className="flex min-w-0 flex-col items-start gap-6">
          <p className={EYEBROW_CLASSNAME}>Sport Coach</p>
          <h1
            className={`${DISPLAY_HEADING_CLASSNAME} text-balance`}
            // Lower floor than the app's own display headings (which are
            // always multi-word and can wrap) -- "ENTRENAMIENTO" is one
            // unbreakable word and overflowed at 375-390px with a 2.75rem
            // floor (verified: 45px/30px real horizontal overflow).
            style={{ fontSize: "clamp(2rem, 9vw, 4.75rem)" }}
          >
            Tu entrenamiento.
            <br />
            Más inteligente.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Planificación, entrenamiento guiado, progreso real y un Coach IA — en una única
            aplicación pensada para quien entrena en serio.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/register" className="sm:w-auto sm:px-8">
              Empezar a entrenar <ButtonArrow />
            </ButtonLink>
            <ButtonLink href="#como-funciona" variant="ghost" className="sm:w-auto">
              Ver cómo funciona
            </ButtonLink>
          </div>
        </div>

        <div className="shrink-0 self-center">
          <ScopeMark size={240} priority className="size-40 sm:size-48 md:size-56 lg:size-64" />
        </div>
      </div>
    </section>
  );
}
