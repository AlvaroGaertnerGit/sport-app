import Link from "next/link";
import type { SVGProps } from "react";

type NavItem = {
  label: string;
  href?: string;
  Icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
};

/**
 * Hand-authored, not a library — four shapes only, 20x20, stroke-based so
 * they inherit color via currentColor. "No instalar librerías nuevas" per
 * the brief; these are the "iconos existentes" going forward.
 */
function TodayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="10" r="7" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PlanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <line x1="3.5" y1="6" x2="16.5" y2="6" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="3.5" y1="10" x2="16.5" y2="10" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="3.5" y1="14" x2="12" y2="14" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="10" r="7" strokeWidth="1.6" />
      <path d="M10 6v4l3 2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoachIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v4A2.5 2.5 0 0 1 13.5 13H9l-3.2 2.6a.5.5 0 0 1-.8-.4V13a2.5 2.5 0 0 1-1-2Z"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Hoy", href: "/today", Icon: TodayIcon },
  { label: "Plan", Icon: PlanIcon },
  { label: "Historial", Icon: HistoryIcon },
  { label: "Coach", Icon: CoachIcon },
];

const ITEM_CLASSNAME =
  "flex h-16 flex-1 flex-col items-center justify-center gap-1.5 font-mono text-xs tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

/**
 * "Hoy" is hardcoded as the active item rather than derived from the
 * pathname (no usePathname/"use client" needed): it's the only real
 * destination in the app today, so this nav only ever renders while it's
 * the current page. Revisit with pathname-driven active state once a
 * second real route joins the shell.
 *
 * Active state is never color alone: the icon also switches from outline
 * to a filled center dot, and a small underline bar appears beneath the
 * label — shape carries the signal, color reinforces it.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      // safe-area-inset-bottom is a device value (iOS home-indicator), not
      // a design-scale magic number -- no spacing token applies here.
      className="fixed inset-x-0 bottom-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch">
        {NAV_ITEMS.map((item) =>
          item.href ? (
            <Link key={item.label} href={item.href} aria-current="page" className={`${ITEM_CLASSNAME} text-primary`}>
              <item.Icon aria-hidden="true" className="size-5" stroke="currentColor" />
              <span className="flex flex-col items-center gap-1">
                {item.label}
                <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-primary" />
              </span>
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              disabled
              aria-label={`${item.label} (próximamente)`}
              className={`${ITEM_CLASSNAME} text-muted-foreground disabled:cursor-not-allowed`}
            >
              <item.Icon aria-hidden="true" className="size-5" stroke="currentColor" />
              {item.label}
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
