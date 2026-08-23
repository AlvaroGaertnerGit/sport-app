import Image from "next/image";

/**
 * The official SCOPE character -- the exact asset already generated for
 * the app icon (public/icon-512.png), reused as-is. Never re-rendered or
 * redrawn here: one source of truth for the mark, same rule the app's own
 * icon set already follows. Its background is already the project's own
 * near-black (`#080808`-adjacent), so it blends into the landing page's
 * dark background without needing a frame.
 */
export function ScopeMark({ size, className, priority }: { size: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/icon-512.png"
      alt="SCOPE, la identidad de Sport Coach"
      width={size}
      height={size}
      priority={priority}
      className={className ? `rounded-2xl ${className}` : "rounded-2xl"}
    />
  );
}
