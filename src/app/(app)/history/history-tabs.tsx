import Link from "next/link";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";

const TAB_CLASSNAME =
  `inline-flex min-h-11 items-center border-b-2 pb-2 font-mono text-xs tracking-widest uppercase transition-colors duration-150 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;

/**
 * "RESUMEN" (Progress) / "SESIONES" (History) -- a segmented control, not
 * a second-level card. Underline, not a filled tab, matching every other
 * active-state-via-line convention already in the app (bottom nav's
 * underline dot, the workout ProgressBar). Plain links: switching tabs is
 * a normal navigation, no client JS needed.
 */
export function HistoryTabs({ current }: { current: "progress" | "sessions" }) {
  return (
    <nav aria-label="Historial" className="flex gap-6 border-b border-border">
      <Link
        href="/history"
        aria-current={current === "progress" ? "page" : undefined}
        className={`${TAB_CLASSNAME} ${
          current === "progress"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Resumen
      </Link>
      <Link
        href="/history/sessions"
        aria-current={current === "sessions" ? "page" : undefined}
        className={`${TAB_CLASSNAME} ${
          current === "sessions"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Sesiones
      </Link>
    </nav>
  );
}
