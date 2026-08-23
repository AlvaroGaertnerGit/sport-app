import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";
import { Parallax } from "./motion/parallax";
import { Reveal } from "./motion/reveal";
import { ScreenshotBlock } from "./screenshot-block";

/**
 * Shared shape for Planifica / Entrena / Mejora (brief §7-9) -- three
 * sections with the exact same rhythm (eyebrow, short headline, a couple of
 * bullet points, a real screenshot), differing only in content. A third
 * near-identical case is exactly the project's own "regla de tres" trigger
 * for extracting one component instead of copy-pasting three files.
 * `reverse` alternates the screenshot's side so the PLANIFICA → ENTRENA →
 * MEJORA reading rhythm doesn't feel mechanically repeated (brief §10).
 * The screenshot is the protagonist here (brief §11: ~45% text / 55% image
 * on desktop) -- `md:basis-[45%]`/`md:basis-[55%]` express that split
 * directly rather than leaving it to flex-1's implicit 50/50.
 *
 * Scroll entry: text reveals first; the screenshot reveals slightly after
 * with a small scale-in *and* a small lateral entrance from whichever side
 * it visually sits on (`fromSide` mirrors `reverse`, so it always enters
 * from its own side, never crosses over the text) -- landing v4's own take
 * on brief §22's "screenshot entrando ligeramente desde un lateral." It
 * also carries a gentle scroll-linked Parallax independent of the reveal
 * (brief §24).
 */
export function StorySection({
  id,
  eyebrow,
  heading,
  lead,
  points,
  screenshot,
  reverse = false,
}: {
  id?: string;
  eyebrow: string;
  heading: string;
  lead: string;
  points: readonly string[];
  screenshot: { src: string; alt: string };
  reverse?: boolean;
}) {
  return (
    <section id={id} className={LANDING_SECTION_CLASSNAME}>
      <div className={LANDING_CONTAINER_CLASSNAME}>
        <div
          className={`flex flex-col items-center gap-10 md:gap-16 ${reverse ? "md:flex-row-reverse" : "md:flex-row"}`}
        >
          <Reveal className="flex min-w-0 flex-col items-start gap-5 md:basis-[45%]">
            <p className={EYEBROW_CLASSNAME}>{eyebrow}</p>
            <h2 className={`${DISPLAY_HEADING_CLASSNAME} text-3xl sm:text-4xl`}>{heading}</h2>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">{lead}</p>
            <ul className="flex flex-col gap-2">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-foreground">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delayMs={120}
            scale
            fromSide={reverse ? "left" : "right"}
            className="flex shrink-0 justify-center md:basis-[55%]"
          >
            <Parallax speed={0.08}>
              <ScreenshotBlock src={screenshot.src} alt={screenshot.alt} />
            </Parallax>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
