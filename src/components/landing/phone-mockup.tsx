import Image from "next/image";

/**
 * A clean, minimal phone frame around a real Sport Coach screenshot.
 * Screen aspect ratio is 315:683 (≈0.4612) -- a real iPhone-width capture
 * (390×844 CSS px, ≈0.4621), not the old 492:859 (≈0.573) desktop-viewport
 * crop that left a visibly empty black zone at the bottom of the frame
 * (landing v2 phase: the source screenshots simply didn't have enough real
 * content to fill that stubbier ratio). The four screenshots in
 * public/marketing/ were recaptured at this exact ratio specifically so
 * the fit is exact -- no cropping, no stretching, and (per this phase's
 * explicit instruction) no `scale()`/`object-fit: fill` tricks papering
 * over a mismatch.
 *
 * Sizing is intentionally two different strategies below one breakpoint
 * split, not one property scaled the same way everywhere: on mobile the
 * phone must "ocupar una parte importante de la pantalla" (brief §12) --
 * driven by *width* (`min(80vw, 320px)`, the brief's own suggested
 * shape) so it scales with the viewport and can never overflow it. From
 * `sm:` up, where the phone sits beside text rather than filling the
 * screen, it switches to a *height* cap (the brief's "380-500px de alto
 * según viewport", §11) with `sm:w-auto` handing width back to the fixed
 * aspect ratio. Both dimensions are never set at once, so aspect-ratio
 * always determines the other one -- and since it's a single shared
 * component rather than each caller repeating this split, both usages
 * (story-section.tsx, section-coach.tsx) stay in sync automatically.
 */
export function PhoneMockup({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative aspect-[315/683] w-[min(80vw,320px)] shrink-0 rounded-[2.75rem] bg-[#161616] p-2.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10 transition-transform duration-300 ease-out hover:-translate-y-1 sm:h-[400px] sm:w-auto md:h-[440px] lg:h-[480px]">
      {/* Dynamic Island -- purely decorative, so it stays out of the accessible name of the screenshot below. */}
      <div
        aria-hidden="true"
        className="absolute top-4 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[#161616]"
      />
      <div className="relative h-full w-full overflow-hidden rounded-[2.125rem] bg-background">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 275px, (min-width: 640px) 250px, min(80vw, 320px)"
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}
