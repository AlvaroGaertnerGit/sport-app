"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, ButtonLink, FOCUS_RING_CLASSNAME } from "@/components/ui/button";

import { LANDING_CONTAINER_CLASSNAME } from "./layout";
import { ScopeMark } from "@/components/ui/scope-mark";

const NAV_LINKS = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#precio", label: "Precio" },
] as const;

/**
 * Client only because of the mobile menu toggle -- everything else here is
 * static. Kept as one small file rather than split further: a navbar this
 * simple (brief: "no crear una navegación compleja") doesn't clear the
 * project's own "regla de tres" for extracting sub-pieces.
 */
export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-sm">
      <div className={`flex h-16 items-center justify-between ${LANDING_CONTAINER_CLASSNAME}`}>
        <Link
          href="/"
          className={`flex min-h-11 items-center gap-2 font-mono text-sm tracking-widest text-foreground uppercase ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          <ScopeMark size={28} className="rounded-md" />
          Sport Coach
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`font-mono text-xs tracking-widest whitespace-nowrap text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className={`font-mono text-xs tracking-widest whitespace-nowrap text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            Iniciar sesión
          </Link>
          <ButtonLink href="/register" className="min-h-10 w-auto px-5 text-base">
            Empezar
          </ButtonLink>
        </nav>

        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="landing-mobile-menu"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          className="w-11 min-h-11 md:hidden"
        >
          <span aria-hidden="true">{mobileOpen ? "✕" : "☰"}</span>
        </Button>
      </div>

      {mobileOpen && (
        <nav
          id="landing-mobile-menu"
          aria-label="Principal"
          className="flex flex-col gap-1 border-t border-border/60 px-5 py-4 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`min-h-11 py-3 font-mono text-sm tracking-widest text-muted-foreground uppercase ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className={`min-h-11 py-3 font-mono text-sm tracking-widest text-muted-foreground uppercase ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            Iniciar sesión
          </Link>
          <ButtonLink href="/register" className="mt-2">
            Empezar
          </ButtonLink>
        </nav>
      )}
    </header>
  );
}
