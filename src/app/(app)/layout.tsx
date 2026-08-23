import type { ReactNode } from "react";

import { BottomNav } from "@/components/app-shell/bottom-nav";

/**
 * Shell for the authenticated app screens (Today, and later Plan/Historial/
 * Coach) — main content column + bottom nav. A route group, so it adds no
 * segment to the URL.
 *
 * `pb-24` alone reserves exactly the nav's own height in a normal browser
 * tab, but `BottomNav` itself grows taller on a notched/home-indicator
 * device (it adds `env(safe-area-inset-bottom)` on top of its content) --
 * a fixed 96px can then be a few px short of clearing the taller bar in a
 * PWA standalone window, hiding the very end of a page's content behind
 * it. Adding the same inset on top of the fixed reservation keeps content
 * clear of the nav on every device (0 extra wherever there's no inset).
 *
 * `px-6` is the one horizontal-padding source for every screen in this
 * shell -- previously each of the ~24 pages repeated its own `px-5`
 * (mobile-spacing phase: content read as pinned to the physical screen
 * edge). Centralizing it here means every screen gained the same breathing
 * room in one place, not twenty-odd near-identical edits. `BottomNav`
 * intentionally isn't under `<main>` and keeps its own edge-to-edge width
 * -- large full-bleed tap targets are the point there, not a page column.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
