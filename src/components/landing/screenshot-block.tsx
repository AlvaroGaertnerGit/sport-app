import Image from "next/image";

/**
 * Landing v4: replaces the old iPhone-frame `PhoneMockup`. Real device
 * mockups kept forcing a fixed aspect box around the screenshot -- on
 * mobile that meant either upscaling past the source file's real
 * resolution (soft/blurry) or cropping the app UI to fit the frame,
 * exactly the two failure modes the brief ruled out. A plain, well-framed
 * rectangle sidesteps both: intrinsic `width`/`height` (the file's own
 * real pixel size) lets `next/image` size the `<img>` to the screenshot's
 * true aspect ratio with no cropping and no upscaling past native
 * resolution at any width this ever renders at.
 *
 * TEMPORARY: still 315x683, the original capture resolution -- confirmed
 * too low for a real 2x/3x-DPR phone at this block's display width (root
 * cause of the "blurry on mobile" report, not a CSS/object-fit issue).
 * Recapture at real iPhone 3x resolution (1170x2532) is blocked on an
 * authenticated session this pass couldn't obtain (see phase notes) --
 * update these two constants the moment the four files under
 * public/marketing/ are replaced with higher-resolution captures.
 */
const SHOT_WIDTH = 315;
const SHOT_HEIGHT = 683;

export function ScreenshotBlock({
  src,
  alt,
  priority,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`w-full max-w-[300px] rounded-2xl border border-border bg-elevated p-2 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out hover:-translate-y-1 sm:max-w-[260px] md:max-w-[280px] lg:max-w-[320px] ${className ?? ""}`}
    >
      <Image
        src={src}
        alt={alt}
        width={SHOT_WIDTH}
        height={SHOT_HEIGHT}
        priority={priority}
        sizes="(min-width: 1024px) 320px, (min-width: 640px) 280px, min(80vw, 300px)"
        className="h-auto w-full rounded-xl object-contain"
      />
    </div>
  );
}
