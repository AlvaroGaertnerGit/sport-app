import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";
import { PhoneShot } from "./phone-shot";

/**
 * Shared shape for Planifica / Entrena / Mejora (brief §7-9) -- three
 * sections with the exact same rhythm (eyebrow, short headline, a couple of
 * bullet points, a real screenshot), differing only in content. A third
 * near-identical case is exactly the project's own "regla de tres" trigger
 * for extracting one component instead of copy-pasting three files.
 * `reverse` alternates the screenshot side so the PLANIFICA → ENTRENA →
 * MEJORA reading rhythm doesn't feel mechanically repeated.
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
          className={`flex flex-col items-center gap-10 sm:gap-16 ${reverse ? "sm:flex-row-reverse" : "sm:flex-row"}`}
        >
          <div className="flex flex-1 flex-col items-start gap-5">
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
          </div>

          <div className="flex shrink-0 justify-center">
            <PhoneShot src={screenshot.src} alt={screenshot.alt} />
          </div>
        </div>
      </div>
    </section>
  );
}
