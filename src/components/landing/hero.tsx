import { ScopeDock, ScopeGreeting } from "@/components/scope/companion";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME } from "./layout";
import { Reveal } from "./motion/reveal";

/**
 * The most important section on the page (brief §4). Scope appears here,
 * large and *alive* -- the real companion character (src/components/scope/),
 * not the static ScopeMark -- but the headline is about Sport Coach, not
 * about the character, per the brief's explicit "SCOPE es la mascota,
 * Sport Coach es el producto." Still a Server Component -- Reveal and
 * ScopeDock/ScopeGreeting (client leaves) are composed as children the
 * same way any Client Component can be used inside a Server Component.
 *
 * The text's entry animation triggers on load, not on scroll, because Hero
 * sits above the fold -- Reveal's IntersectionObserver simply fires the
 * moment it mounts already-visible. Scope's own dock slot is deliberately
 * NOT wrapped in Reveal/Parallax -- see ScopeDock's own header comment for
 * why a competing transform on the dock slot would strand the companion at
 * its pre-animation offset; Scope is simply present from first paint here,
 * which also matches how the reference character always reads at its own
 * Hero placement (instant, above the fold, not a scroll-reveal).
 */
export function Hero() {
  return (
    <section className={`pt-14 pb-16 sm:pt-20 sm:pb-24 ${LANDING_CONTAINER_CLASSNAME}`}>
      <div className="flex flex-col items-start gap-10 md:flex-row md:items-center md:justify-between md:gap-16">
        <div className="flex min-w-0 flex-col items-start gap-6">
          <Reveal>
            <p className={EYEBROW_CLASSNAME}>Sport Coach</p>
          </Reveal>
          <Reveal delayMs={80}>
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
          </Reveal>
          <Reveal delayMs={160}>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Planificación, entrenamiento guiado, progreso real y un Coach IA — en una única
              aplicación pensada para quien entrena en serio.
            </p>
          </Reveal>
          <Reveal delayMs={240}>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <ButtonLink href="/register" className="sm:w-auto sm:px-8">
                Empezar a entrenar <ButtonArrow />
              </ButtonLink>
              <ButtonLink href="#como-funciona" variant="ghost" className="sm:w-auto">
                Ver cómo funciona
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3 self-center">
          <ScopeDock
            id="hero"
            config={{ mood: "idle", scale: 1.15 }}
            className="size-40 sm:size-48 md:size-56 lg:size-64"
          />
          <ScopeGreeting />
        </div>
      </div>
    </section>
  );
}
