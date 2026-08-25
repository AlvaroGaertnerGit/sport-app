"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import { useState, useSyncExternalStore } from "react";

import { Button, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { acknowledgeCookieNotice, hasAcknowledgedCurrentCookieNotice } from "@/lib/cookies/consent";

import { ConfigureCookiesLink } from "./configure-cookies-link";

/** No cross-tab event fires for a same-tab localStorage write, so this only needs to catch another tab acknowledging (or clearing, via "Olvidar..." in CookieSettingsPanel) the notice -- same-tab dismissal is handled by local state in the click handler below, not by this store. */
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerAckSnapshot() {
  // SSR/first paint: assume acknowledged (hide) rather than flash the banner in before the real client value is known -- avoids a hydration mismatch, corrected immediately once useSyncExternalStore reads the real client snapshot.
  return true;
}

/** Same hand-drawn, stroke-based idiom as bottom-nav.tsx/profile-link.tsx's icons -- no icon library. Three small dots read as a cookie without needing fill detail at 20px. */
function CookieIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="10" r="7" strokeWidth={1.6} />
      <circle cx="8" cy="7.7" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12.6" cy="9" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9.4" cy="12.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <rect x="5" y="9" width="10" height="7" rx="1.5" strokeWidth={1.5} />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

/**
 * The real inventory (docs/legal/cookie-inventory.md / /legal/cookies §2) —
 * exactly the two entries that exist today, nothing invented. The full
 * table (provider, exact legal basis) stays on /legal/cookies; this is the
 * condensed, at-a-glance version for the banner's "Detalle de las cookies"
 * panel.
 */
const COOKIE_DETAILS = [
  {
    name: "sb-*-auth-token",
    description: "Mantiene tu sesión iniciada.",
    duration: "Hasta cierre de sesión",
  },
  {
    name: "sc-cookie-notice-ack",
    description: "Recuerda que ya viste este aviso.",
    duration: "Hasta que la borres",
  },
] as const;

const SECONDARY_BUTTON_CLASSNAME = `inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-background/40 px-8 text-base font-semibold text-foreground transition duration-150 hover:bg-background/70 active:scale-[0.98] sm:w-auto ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;

/**
 * The real cookie notice for Sport Coach's real inventory — still a slim
 * informational surface, not an "Aceptar/Rechazar" pair (there is nothing
 * optional to accept or reject today, every cookie/storage key found is
 * strictly necessary and exempt from consent under LSSI art. 22.2 — see
 * cookies/page.tsx §3). This phase is a visual redesign only: same trigger
 * (hasAcknowledgedCurrentCookieNotice), same action (acknowledgeCookieNotice
 * + dismiss), same "Configurar cookies" destination (ConfigureCookiesLink →
 * /legal/cookies, where CookieSettingsPanel already lives) — no parallel
 * consent logic introduced.
 *
 * Anchored to the BOTTOM now (was top) to match the reference composition —
 * a deliberate change from the previous "never competes with BottomNav"
 * layout. BottomNav has no z-index of its own, so this (z-50) simply
 * renders above it on the rare authenticated view where the notice is still
 * unacknowledged; the backdrop is `pointer-events-none`, so nothing behind
 * this — including BottomNav — is ever blocked, preserving the existing
 * non-modal behavior (no focus trap, so no `aria-modal` either).
 */
export function CookieNotice() {
  const [dismissed, setDismissed] = useState(false);
  const alreadyAcknowledged = useSyncExternalStore(
    subscribeToStorage,
    hasAcknowledgedCurrentCookieNotice,
    getServerAckSnapshot,
  );

  if (dismissed || alreadyAcknowledged) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="animate-fade-in pointer-events-none fixed inset-0 z-40 bg-background/70 backdrop-blur-[2px]"
      />
      <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
          <div className="animate-fade-in overflow-hidden rounded-t-2xl border border-b-0 border-border bg-elevated shadow-2xl">
            <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[1.3fr_1fr]">
              {/* left -- info */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <CookieIcon className="size-5" stroke="currentColor" aria-hidden="true" />
                  <p className={EYEBROW_CLASSNAME}>Privacidad</p>
                </div>
                <h2 className="text-2xl font-bold text-balance text-foreground sm:text-3xl">
                  Usamos cookies técnicas necesarias
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Solo lo estrictamente necesario para que Sport Coach funcione — mantener tu sesión iniciada. No
                  usamos cookies analíticas ni publicitarias.
                </p>
                <Link
                  href="/legal/cookies"
                  className={`w-fit text-sm text-foreground underline underline-offset-2 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
                >
                  Más información
                </Link>
              </div>

              {/* right -- real cookie detail, nothing invented */}
              <div className="flex flex-col gap-3">
                <p className={EYEBROW_CLASSNAME}>Detalle de las cookies</p>
                <div className="flex flex-col gap-2">
                  {COOKIE_DETAILS.map((cookie) => (
                    <div key={cookie.name} className="rounded-md border border-border bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <code className="font-mono text-xs text-foreground">{cookie.name}</code>
                        <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                          Necesaria
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cookie.description} · {cookie.duration}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8 sm:pt-6">
              <ConfigureCookiesLink href="/legal/cookies" className={SECONDARY_BUTTON_CLASSNAME}>
                Configurar cookies
              </ConfigureCookiesLink>
              <Button
                type="button"
                className="sm:w-auto sm:px-10"
                onClick={() => {
                  acknowledgeCookieNotice();
                  setDismissed(true);
                }}
              >
                Entendido
              </Button>
            </div>

            <div className="flex items-center gap-2 border-t border-border/60 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-8">
              <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">Puedes cambiar tus preferencias cuando quieras.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
