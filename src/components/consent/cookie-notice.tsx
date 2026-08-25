"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Button, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { acknowledgeCookieNotice, hasAcknowledgedCurrentCookieNotice } from "@/lib/cookies/consent";

/** No cross-tab event fires for a same-tab localStorage write, so this only needs to catch another tab acknowledging (or clearing, via "Olvidar..." in CookieSettingsPanel) the notice -- same-tab dismissal is handled by local state in the click handler below, not by this store. */
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerAckSnapshot() {
  // SSR/first paint: assume acknowledged (hide) rather than flash the banner in before the real client value is known -- avoids a hydration mismatch, corrected immediately once useSyncExternalStore reads the real client snapshot.
  return true;
}

/**
 * The real cookie notice for Sport Coach's real inventory (docs/legal/
 * cookie-inventory.md): a slim, non-blocking, informational bar -- never a
 * modal, never an "Aceptar/Rechazar" pair, because there is nothing
 * optional to accept or reject today (every cookie/storage key found is
 * strictly necessary and exempt from consent under LSSI art. 22.2).
 * Offering a fake "Rechazar" that behaves identically to "Entendido" would
 * itself be a dark pattern (a false choice) -- see cookies/page.tsx §3 for
 * the same reasoning stated to the user. One acknowledgement action, plus a
 * link to the real settings (/legal/cookies#configurar, via
 * CookieSettingsPanel) for anyone who wants the detail.
 *
 * Fixed to the TOP (not bottom) so it never competes with BottomNav's own
 * fixed bottom bar in the authenticated app shell -- this renders from the
 * root layout, above both the landing and the app shell.
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
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-elevated/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          Usamos cookies técnicas necesarias para el funcionamiento de Sport Coach (mantener tu sesión iniciada). No
          usamos cookies analíticas ni publicitarias.{" "}
          <Link href="/legal/cookies" className={`underline underline-offset-2 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}>
            Más información
          </Link>
        </p>
        <Button
          type="button"
          variant="ghost"
          className="w-auto min-h-11 shrink-0 px-5"
          onClick={() => {
            acknowledgeCookieNotice();
            setDismissed(true);
          }}
        >
          Entendido
        </Button>
      </div>
    </div>
  );
}
