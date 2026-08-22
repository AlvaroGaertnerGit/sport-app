import Link from "next/link";
import type { ReactNode } from "react";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";

const TAB_CLASSNAME =
  `inline-flex min-h-11 items-center border-b-2 pb-2 font-mono text-xs tracking-widest uppercase transition-colors duration-150 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;

const TABS = [
  { value: "progress", label: "Resumen", href: "/history" },
  { value: "sessions", label: "Sesiones", href: "/history/sessions" },
  { value: "calendar", label: "Calendario", href: "/history/calendar" },
] as const;

/**
 * "RESUMEN" (Progress) / "SESIONES" (History list) / "CALENDARIO" -- a
 * segmented control, not a second-level card. Underline, not a filled tab,
 * matching every other active-state-via-line convention already in the app
 * (bottom nav's underline dot, the workout ProgressBar). Plain links:
 * switching tabs is a normal navigation, no client JS needed. Calendario is
 * a new representation of the SAME session data Sesiones already lists --
 * it lives here as a third tab, not as a new bottom-nav item or a separate
 * top-level section.
 */
export function HistoryTabs({
  current,
  trailing,
}: {
  current: "progress" | "sessions" | "calendar";
  /** e.g. ProfileLink -- rendered inside this same bordered row so the divider stays full-width instead of only spanning the tabs. */
  trailing?: ReactNode;
}) {
  return (
    <nav aria-label="Historial" className="flex items-center justify-between gap-4 border-b border-border">
      <div className="flex gap-6 overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={current === tab.value ? "page" : undefined}
            className={`${TAB_CLASSNAME} shrink-0 ${
              current === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {trailing}
    </nav>
  );
}
