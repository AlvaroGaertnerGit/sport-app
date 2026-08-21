import Link from "next/link";

type NavItem = {
  label: string;
  href?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Hoy", href: "/today" },
  { label: "Plan" },
  { label: "Historial" },
  { label: "Coach" },
];

const ITEM_CLASSNAME =
  "flex h-16 flex-1 flex-col items-center justify-center gap-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

/**
 * "Hoy" is hardcoded as the active item rather than derived from the
 * pathname (no usePathname/"use client" needed): it's the only real
 * destination in the app today, so this nav only ever renders while it's
 * the current page. Revisit with pathname-driven active state once a
 * second real route joins the shell.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      // safe-area-inset-bottom is a device value (iOS home-indicator), not
      // a design-scale magic number -- no spacing token applies here.
      className="fixed inset-x-0 bottom-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch">
        {NAV_ITEMS.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              aria-current="page"
              className={`${ITEM_CLASSNAME} text-primary`}
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              disabled
              aria-label={`${item.label} (próximamente)`}
              className={`${ITEM_CLASSNAME} text-muted-foreground disabled:cursor-not-allowed`}
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
