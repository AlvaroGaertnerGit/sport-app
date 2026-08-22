import Link from "next/link";
import type { SVGProps } from "react";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";

/** Same hand-drawn, stroke-based idiom as bottom-nav.tsx's icons — not a photo avatar (profiles has no avatar_url, and the brief explicitly rules out a big circular photo). */
function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="7" r="3" strokeWidth="1.6" />
      <path d="M4 16c0-2.8 2.7-5 6-5s6 2.2 6 5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The one entry point into `/profile` — placed in the header row of each
 * landing page (Today/Plan/History/Progress) rather than a 5th bottom-nav
 * item (would unbalance the existing 4) or a shared `(app)/layout.tsx`
 * header (would also show on the routine/session detail sub-pages, which
 * already have their own focused "← Volver" moment).
 */
export function ProfileLink() {
  return (
    <Link
      href="/profile"
      aria-label="Perfil"
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition duration-150 hover:text-foreground active:scale-90 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
    >
      <ProfileIcon aria-hidden="true" className="size-5" stroke="currentColor" />
    </Link>
  );
}
