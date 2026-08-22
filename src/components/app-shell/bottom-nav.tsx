"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

type NavItem = {
  label: string;
  href?: string;
  Icon: (props: SVGProps<SVGSVGElement> & { active: boolean }) => React.JSX.Element;
};

/**
 * Hand-authored, not a library — four shapes only, 20x20, stroke-based so
 * they inherit color via currentColor. "No instalar librerías nuevas" per
 * the brief; these are the "iconos existentes" going forward.
 *
 * Each icon takes its own `active` flag (not just a color prop): the
 * stroke goes bolder and Today's center dot only fills in when active, so
 * the active state still reads without color (see BottomNav's own note).
 */
function TodayIcon({ active, ...props }: SVGProps<SVGSVGElement> & { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="10" r="7" strokeWidth={active ? 2.2 : 1.6} />
      {active && <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function PlanIcon({ active, ...props }: SVGProps<SVGSVGElement> & { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <line x1="3.5" y1="6" x2="16.5" y2="6" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" />
      <line x1="3.5" y1="10" x2="16.5" y2="10" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" />
      <line x1="3.5" y1="14" x2="12" y2="14" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ active, ...props }: SVGProps<SVGSVGElement> & { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="10" r="7" strokeWidth={active ? 2.2 : 1.6} />
      <path d="M10 6v4l3 2" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoachIcon({ active, ...props }: SVGProps<SVGSVGElement> & { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v4A2.5 2.5 0 0 1 13.5 13H9l-3.2 2.6a.5.5 0 0 1-.8-.4V13a2.5 2.5 0 0 1-1-2Z"
        strokeWidth={active ? 2.2 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Hoy", href: "/today", Icon: TodayIcon },
  { label: "Plan", href: "/plan", Icon: PlanIcon },
  { label: "Historial", href: "/history", Icon: HistoryIcon },
  { label: "Coach", href: "/coach", Icon: CoachIcon },
];

const ITEM_CLASSNAME =
  "flex h-16 flex-1 flex-col items-center justify-center gap-1.5 font-mono text-xs tracking-wide transition duration-150 active:scale-95 disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

/**
 * Active state is derived from the pathname, not hardcoded, now that a
 * second real route (`/history`) exists alongside `/today` -- see the
 * git history on this file for why that wasn't needed before. Never color
 * alone: the icon also goes bolder (and Today's center dot fills in), and
 * a small underline bar appears beneath the label — shape carries the
 * signal, color reinforces it.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      // safe-area-inset-bottom is a device value (iOS home-indicator), not
      // a design-scale magic number -- no spacing token applies here.
      className="fixed inset-x-0 bottom-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch">
        {NAV_ITEMS.map((item) => {
          if (!item.href) {
            return (
              <button
                key={item.label}
                type="button"
                disabled
                aria-label={`${item.label} (próximamente)`}
                className={`${ITEM_CLASSNAME} text-muted-foreground disabled:cursor-not-allowed`}
              >
                <item.Icon active={false} aria-hidden="true" className="size-5" stroke="currentColor" />
                {item.label}
              </button>
            );
          }

          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`${ITEM_CLASSNAME} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <item.Icon active={isActive} aria-hidden="true" className="size-5" stroke="currentColor" />
              <span className="flex flex-col items-center gap-1">
                {item.label}
                {isActive && <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-primary" />}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
