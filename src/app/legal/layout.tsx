import Link from "next/link";
import type { ReactNode } from "react";

import { FOCUS_RING_CLASSNAME, TEXT_LINK_CLASSNAME } from "@/components/ui/button";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { LEGAL_ENTITY } from "@/lib/legal/config";

/**
 * Shared shell for every /legal page — deliberately outside the `(app)`
 * route group (no bottom nav, no auth requirement: legal pages must stay
 * reachable whether or not the visitor is signed in, from the landing
 * footer and from Profile alike). Wider than the app's own `max-w-md`
 * single-column shell (legal text reads better with the landing's own
 * editorial width) but still mobile-first and far narrower than the
 * landing's `max-w-5xl` — this is a document, not a marketing layout.
 */
const LEGAL_PAGES = [
  { href: "/legal/aviso-legal", label: "Aviso legal" },
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/terminos", label: "Términos" },
  { href: "/legal/scope-ia", label: "SCOPE e IA" },
] as const;

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className={`font-mono text-sm tracking-widest text-foreground uppercase ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            ← Sport Coach
          </Link>
        </div>
      </header>

      <nav
        aria-label="Documentos legales"
        className="mx-auto flex w-full max-w-2xl flex-wrap gap-x-5 gap-y-2 border-b border-border/60 px-6 py-4"
      >
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={`min-h-11 font-mono text-xs tracking-widest text-muted-foreground uppercase hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary flex items-center`}
          >
            {page.label}
          </Link>
        ))}
      </nav>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-border/60 px-6 py-8 text-center">
        <p className={EYEBROW_CLASSNAME}>Sport Coach</p>
        <p className="mt-2 text-xs text-muted-foreground">
          ¿Dudas sobre estos documentos?{" "}
          <a href={`mailto:${LEGAL_ENTITY.email}`} className={TEXT_LINK_CLASSNAME}>
            {LEGAL_ENTITY.email}
          </a>
        </p>
      </footer>
    </div>
  );
}
