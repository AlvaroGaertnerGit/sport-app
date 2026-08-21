import type { ReactNode } from "react";

import { BottomNav } from "@/components/app-shell/bottom-nav";

/**
 * Shell for the authenticated app screens (Today, and later Plan/Historial/
 * Coach) — main content column + bottom nav. A route group, so it adds no
 * segment to the URL. src/app/dashboard is a separate pre-existing
 * placeholder route and intentionally not part of this shell.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
