import Image from "next/image";

/**
 * Real app screenshots only (brief: "NO inventar interfaces que no
 * existen") -- these are actual captures of Today/Plan Editor/Workout/
 * Progress/Coach, taken from a real production build against the real
 * seeded test account, saved under public/marketing/. Each source image is
 * a full browser viewport with the app's own centered mobile column in the
 * middle (the app is `max-w-md`-constrained even on a wide screen) --
 * `object-fit: cover` on a phone-proportioned frame crops straight to that
 * column without needing a separate image-processing step.
 */
export function PhoneShot({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div
      // Explicit width, not `w-full` -- this sits inside an auto-sized flex
      // item (story-section.tsx's image wrapper); a percentage width there
      // has nothing definite to resolve against and Chrome collapses the
      // aspect-ratio box to ~0px. A fixed width sidesteps that entirely.
      className={`relative aspect-[9/16] w-56 shrink-0 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_0_0_1px_rgba(0,0,0,0.4)] sm:w-64 ${className ?? ""}`}
    >
      <Image src={src} alt={alt} fill sizes="(min-width: 640px) 256px, 224px" className="object-cover object-top" />
    </div>
  );
}
